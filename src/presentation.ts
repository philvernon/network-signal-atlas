import type { GridEvent, Measurement, Snapshot } from "./data/types";
export function dateTime(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Time unavailable";
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
export function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]/g, " ")
    .replace(/^./, (s) => s.toUpperCase());
}
export function valueText(value: number | string | null, unit = ""): string {
  if (value === null) return "Unavailable";
  return `${typeof value === "number" ? new Intl.NumberFormat("en-GB", { maximumFractionDigits: 6 }).format(value) : value}${unit && unit !== "1" ? ` ${unit}` : ""}`;
}
export function exactValueText(value: number | string | null): string {
  return value === null ? "Unavailable" : String(value);
}
export function eventAssetIds(event: GridEvent): string[] {
  return event.assetId ? [event.assetId] : (event.associatedAssetIds ?? []);
}
export function eventFailure(snapshot: Snapshot): string | undefined {
  return snapshot.eventAvailability?.status === "unavailable"
    ? snapshot.eventAvailability.message
    : undefined;
}
export function primaryReading(measurement: Measurement): string {
  const first =
    measurement.fields.find((f) => f.name === "average" || f.name === "phaseA.magnitude") ??
    measurement.fields[0];
  return first ? valueText(first.value, first.unit) : "Unavailable";
}
export function locationName(snapshot: Snapshot, id: string | null): string {
  return snapshot.locations.find((location) => location.id === id)?.name ?? "Location unresolved";
}
export function eventSensorName(snapshot: Snapshot, event: GridEvent): string {
  return (
    snapshot.sensors.find((sensor) => event.sensorIds.includes(sensor.id))?.name ??
    "Sensor unresolved"
  );
}
export function errorText(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "The requested evidence could not be loaded.";
}
