import { bin } from "d3-array";
import { requireMetric } from "./metrics.js";
import type { HistogramBucket, Sample, Sensor, Series, Snapshot, TrendRange } from "./types.js";

const HOUR_MS = 3_600_000;
const rangeHours: Record<TrendRange, number> = { "24h": 24, "7d": 168, "30d": 720 };
const gapHours = new Set([8, 9, 39, 40, 201, 202, 385, 386, 600, 601]);
const snapshotField: Readonly<Record<string, string>> = {
  Temperature: "average",
  PosSeqMag: "positiveSequenceMagnitude",
  PosSeqAng: "positiveSequenceAngle",
  AMag: "phaseA.magnitude",
  BMag: "phaseB.magnitude",
  CMag: "phaseC.magnitude",
  AAng: "phaseA.angle",
  BAng: "phaseB.angle",
  CAng: "phaseC.angle",
  Frequency: "frequency",
  THD: "totalHarmonicDistortion",
};

function eventSamples(
  snapshot: Snapshot,
  sensor: Sensor,
  metric: string,
): Map<number, number | null> {
  const samples = new Map<number, number | null>();
  for (const event of snapshot.events) {
    if (!event.sensorIds.includes(sensor.id)) continue;
    for (const series of event.series) {
      // These mappings are authored demo-fixture associations only, not live
      // event unit inference. a_mag remains unit-unknown in the event inspector.
      const temperature = series.label === "t_average" && metric === "Temperature";
      const sheath = series.label === "a_mag" && (metric === "AMag" || metric === "PosSeqMag");
      if (!temperature && !sheath) continue;
      for (const sample of series.samples) samples.set(sample.time, sample.value);
    }
  }
  return samples;
}

function variationAmplitude(metric: string, baseline: number | null): number {
  if (metric === "Temperature") return 3.2;
  if (metric === "Frequency") return 0.025;
  if (metric === "THD") return 0.2;
  if (metric.endsWith("Ang")) return 0.4;
  return Math.abs(baseline ?? 0) * 0.09;
}

export function demoTrend(
  snapshot: Snapshot,
  sensor: Sensor,
  key: string,
  range: TrendRange,
): Series {
  const metric = requireMetric(sensor, key);
  const epoch = Date.parse(snapshot.updatedAt ?? "");
  if (!Number.isFinite(epoch)) throw new Error("Demonstration reference date is missing.");
  const reading = snapshot.measurements.find((candidate) => candidate.id === sensor.measurementId);
  const field = reading?.fields.find((candidate) => candidate.name === snapshotField[key]);
  let baseline = typeof field?.value === "number" ? field.value : null;
  // Snapshot angles are rad; synthetic historical electrical angles are °.
  if (baseline !== null && field?.unit === "rad") baseline = (baseline * 180) / Math.PI;
  const seed = [...sensor.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const phase = (seed % 17) / 17;
  const authored = eventSamples(snapshot, sensor, key);
  const amplitude = variationAmplitude(key, baseline);
  const count = rangeHours[range];
  const samples: Sample[] = Array.from({ length: count + 1 }, (_, index) => {
    const hoursAgo = count - index;
    const time = epoch - hoursAgo * HOUR_MS;
    if (authored.has(time)) return { time, value: authored.get(time) ?? null };
    if (gapHours.has(hoursAgo) || baseline === null) return { time, value: null };
    // This is a fixed synthetic shape, not playback of or a substitute for live data.
    const wave = Math.sin(2 * Math.PI * (-hoursAgo / 24 + phase)) - Math.sin(2 * Math.PI * phase);
    const weekly = Math.sin((2 * Math.PI * -hoursAgo) / 168) * 0.25;
    const value =
      hoursAgo === 0 || baseline === 0 ? baseline : baseline + amplitude * (wave + weekly);
    return { time, value: Number(value.toFixed(4)) };
  });
  return {
    id: `${sensor.id}:${key}`,
    label: `${sensor.name} · ${metric.label}`,
    unit: metric.unit,
    samples,
  };
}

export function demoHistogram(snapshot: Snapshot, sensor: Sensor): HistogramBucket[] {
  const primary = sensor.metrics[0];
  if (!primary)
    throw new Error(
      `Demonstration histograms are unsupported for ${sensor.kind}; current evidence only.`,
    );
  const series = demoTrend(snapshot, sensor, primary.key, "7d");
  const values = series.samples.flatMap((sample) => (sample.value === null ? [] : [sample.value]));
  if (values.length === 0) return [];
  const buckets = bin().thresholds(8)(values);
  return buckets.map((bucket, index) => {
    const lower = bucket.x0;
    const upper = bucket.x1;
    if (lower === upper) return { label: `= ${lower} ${series.unit}`, count: bucket.length };
    const close = index === buckets.length - 1 ? "]" : ")";
    return { label: `[${lower}, ${upper}${close} ${series.unit}`, count: bucket.length };
  });
}
