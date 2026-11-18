import {
  electricalTrendMetrics,
  trendMetricMetadata,
  type TrendMetric,
  type TrendSensorType,
} from "@philvernon/grid-data-kit-core";
import type { MeasurementKind, Sensor } from "./types.js";

const electricalLabels: Readonly<Record<string, string>> = {
  PosSeqMag: "Positive-sequence magnitude",
  PosSeqAng: "Positive-sequence angle",
  AMag: "Phase A magnitude",
  BMag: "Phase B magnitude",
  CMag: "Phase C magnitude",
  AAng: "Phase A angle",
  BAng: "Phase B angle",
  CAng: "Phase C angle",
  Frequency: "Frequency",
  THD: "Total harmonic distortion",
};

export function trendSensorType(kind: MeasurementKind): TrendSensorType {
  if (kind === "temperature") return "Temperature";
  if (kind === "current") return "Current";
  if (kind === "voltage") return "Voltage";
  throw new Error(
    `Historical trends are unsupported for ${kind}; inspect its current measurement.`,
  );
}

export function metricsForKind(kind: MeasurementKind): Sensor["metrics"] {
  if (kind !== "temperature" && kind !== "current" && kind !== "voltage") return [];
  const sensorType = trendSensorType(kind);
  // No normalized unbalance field or verified harmonic-vector index mapping.
  const keys: readonly TrendMetric[] =
    kind === "temperature"
      ? ["Temperature"]
      : electricalTrendMetrics.filter(
          (metric) => metric !== "Unbalance" && !metric.includes("Harmonic"),
        );
  return keys.map((key) => {
    const metadata = trendMetricMetadata(sensorType, key, { normalize: false });
    if (metadata.status !== "known") throw new Error(`Unknown physical trend unit: ${key}`);
    return {
      key,
      label: key === "Temperature" ? "Temperature" : (electricalLabels[key] ?? key),
      unit: metadata.unit,
    };
  });
}

/** Validate against SDK-backed capabilities, not caller-supplied unit strings. */
export function requireMetric(
  sensor: Sensor,
  key: string,
): Sensor["metrics"][number] & { key: TrendMetric } {
  const metric = metricsForKind(sensor.kind).find((candidate) => candidate.key === key);
  if (!metric) throw new Error(`Unsupported ${sensor.kind} trend metric: ${key}`);
  // Every key in metricsForKind comes from the public SDK metric declarations.
  return { ...metric, key: metric.key as TrendMetric };
}
