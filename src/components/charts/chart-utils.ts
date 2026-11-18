import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import type { ScaleTime } from "d3-scale";
import { line } from "d3-shape";
import type { Sample, Series } from "../../data/types";

export function hasReading(sample: Sample): sample is Sample & { value: number } {
  return sample.value !== null && Number.isFinite(sample.value);
}

/** Copy before ordering: table/export retain the source's authored order. */
export function chronological(samples: Sample[]): Sample[] {
  return samples
    .filter((sample) => Number.isFinite(sample.time) && Math.abs(sample.time) <= 8.64e15)
    .sort((a, b) => a.time - b.time);
}

export function timeDomain(samples: Sample[]): [number, number] {
  const [first, last] = extent(samples, (sample) => sample.time);
  if (first === undefined || last === undefined) return [0, 1];
  return first === last ? [first - 30_000, last + 30_000] : [first, last];
}

export function valueScale(samples: Sample[], range: [number, number], includeZero = false) {
  const [low = 0, high = 1] = extent(samples.filter(hasReading), (sample) => sample.value);
  let min = includeZero ? Math.min(0, low) : low;
  let max = includeZero ? Math.max(0, high) : high;
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  return scaleLinear().domain([min, max]).nice(4).range(range);
}

export function linePath(
  samples: Sample[],
  x: ScaleTime<number, number>,
  y: ReturnType<typeof valueScale>,
) {
  return (
    line<Sample>()
      .defined(hasReading)
      .x((sample) => x(sample.time))
      .y((sample) => y(sample.value ?? 0))(samples) ?? ""
  );
}

export function compatibleComparison(series: Series, comparison?: Series): Series | undefined {
  const unit = series.unit.trim();
  if (!unit || /unknown|unconfirmed|unspecified/i.test(unit)) return undefined;
  return comparison?.unit.trim() === unit ? comparison : undefined;
}

export function exactTime(time: number): string {
  return Number.isFinite(time) && Math.abs(time) <= 8.64e15
    ? new Date(time).toISOString()
    : "Invalid timestamp";
}

export function exactValue(sample: Sample | undefined, unit: string): string {
  if (!sample) return "No sample";
  if (!hasReading(sample)) return "Missing reading";
  const suffix = unit ? ` ${unit}` : " (unit unknown)";
  return `${sample.value}${suffix}`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hourCycle: "h23",
});
export const axisDate = (date: Date) => dateFormat.format(date);
export const axisClock = (date: Date) => clockFormat.format(date);

function csvText(text: string): string {
  // Quoting alone does not prevent spreadsheet formula execution.
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function seriesCsv(series: Series): string {
  const rows = series.samples.map((sample) =>
    [
      Number.isFinite(sample.time) ? String(sample.time) : "",
      csvText(exactTime(sample.time)),
      hasReading(sample) ? String(sample.value) : "",
      csvText(series.unit),
      csvText(series.label),
    ].join(","),
  );
  return ["time_ms,timestamp_utc,value,unit,series", ...rows].join("\r\n");
}

export const chartButton =
  "min-h-11 px-3 text-sm font-medium text-ink underline-offset-4 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-activity disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60";
