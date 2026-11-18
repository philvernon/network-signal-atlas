import {
  ZERO_UUID,
  classifyEventLevel,
  classifyEventType,
  describeEventType,
  eventSeriesMetadata,
  isEventAssociatedWithCable,
  measurementUnits,
  selectCableSectionByRef,
  selectCableSectionRefsByEvent,
  selectCableSections,
  selectMeasurementsBySensor,
  type ElectricalTrendBucket,
  type NormalizedCableState,
  type NormalizedMapState,
  type NormalizedMeasurement,
  type NormalizedSensor,
  type NormalizedSynthesisState,
  type SensorTrend,
  type VisualizationEvent,
} from "@philvernon/grid-data-kit-core";
import { metricsForKind, requireMetric } from "./metrics.js";
import type {
  Asset,
  GridEvent,
  Measurement,
  ReadingField,
  Sensor,
  Series,
  Snapshot,
} from "./types.js";

export function assignedId(id: string | undefined): string | null {
  return id && id !== ZERO_UUID ? id : null;
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function readingAtPath(value: NormalizedMeasurement, path: string): ReadingField["value"] {
  const field = path.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Readonly<Record<string, unknown>>)[key];
  }, value);
  return fieldValue(field);
}

function fieldValue(value: unknown): ReadingField["value"] {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  // Keep aligned DTS vectors intact, including empty arrays and trailing zeros.
  if (Array.isArray(value)) return JSON.stringify(value);
  throw new Error("Unsupported normalized measurement field value");
}

export function adaptMeasurement(
  reading: NormalizedMeasurement,
  sensorIds: string[] = [],
): Measurement {
  const fields: ReadingField[] = Object.entries(measurementUnits[reading.kind]).map(
    ([name, metadata]) => ({
      name,
      value: readingAtPath(reading, name),
      unit: metadata.unit,
    }),
  );
  // Codes and flags are not physical reading units.
  if (reading.kind === "current" || reading.kind === "voltage") {
    for (const phase of ["phaseA", "phaseB", "phaseC"] as const) {
      fields.push({ name: `${phase}.quality`, value: reading[phase].quality, unit: "code" });
    }
  }
  if ("quality" in reading) {
    fields.push(
      { name: "quality.current", value: reading.quality.current ?? null, unit: "code" },
      { name: "quality.latched", value: reading.quality.latched ?? null, unit: "code" },
    );
  }
  if ("lowValue" in reading)
    fields.push({ name: "lowValue", value: String(reading.lowValue), unit: "flag" });
  return {
    id: reading.id,
    name: reading.label,
    kind: reading.kind,
    timestamp: reading.timestamp,
    locationId: assignedId(reading.locationId),
    sensorIds,
    fields,
  };
}

export function adaptSensor(sensor: NormalizedSensor, state: NormalizedSynthesisState): Sensor {
  const reading = selectMeasurementsBySensor(state, sensor.id)[0];
  return {
    id: sensor.id,
    name: reading?.label ?? sensor.id,
    kind: sensor.measurementKind,
    locationId: assignedId(sensor.locationId),
    measurementId: assignedId(sensor.measurementId),
    metrics: metricsForKind(sensor.measurementKind),
  };
}

export function adaptAssets(cables: NormalizedCableState): Asset[] {
  return cables.cableAssetIds.flatMap((id) => {
    const cable = cables.cableAssets.get(id);
    if (!cable) return [];
    const sections = selectCableSections(cables, id);
    return [
      {
        id: cable.id,
        name: cable.name,
        locationIds: unique(sections.flatMap((section) => assignedId(section.locationId) ?? [])),
        sensorIds: unique([...cable.currentSensorIds, ...cable.temperatureSensorIds]),
        sections: sections.map((section) => ({
          id: section.id,
          name: section.name,
          locationIds: assignedId(section.locationId) ? [section.locationId] : [],
          measurementIds: [...section.measurementIds],
        })),
      },
    ];
  });
}

export function adaptEvent(
  event: VisualizationEvent,
  state: NormalizedSynthesisState,
  cables: NormalizedCableState,
): GridEvent {
  const associationState = { ...cables, sensors: state.sensors };
  const cableIds = cables.cableAssetIds.filter((id) =>
    isEventAssociatedWithCable(cables, event, id),
  );
  const locationIds = cableIds.flatMap((cableId) => {
    const refs = selectCableSectionRefsByEvent(associationState, cableId, event);
    const sections = refs.length
      ? refs.flatMap((ref) => selectCableSectionByRef(cables, ref) ?? [])
      : selectCableSections(cables, cableId);
    return sections.flatMap((section) => assignedId(section.locationId) ?? []);
  });
  // A present asset identity takes precedence even when it cannot be resolved.
  if (event.assetId === undefined && cableIds.length === 0) {
    locationIds.push(
      ...event.sensorIds.flatMap((id) => assignedId(state.sensors.get(id)?.locationId) ?? []),
    );
  }
  const type = classifyEventType(event.type);
  const severity = classifyEventLevel(event.level);
  return {
    id: event.id,
    title: event.description || describeEventType(event.type),
    type: type === "unknown" ? `unknown (${event.type})` : type,
    severity: severity === "unknown" ? `unknown (${event.level})` : severity,
    timestamp: event.startTime || null,
    endTime: event.endTime || null,
    sensorIds: [...event.sensorIds],
    assetId: event.assetId ?? (cableIds.length === 1 ? (cableIds[0] ?? null) : null),
    associatedAssetIds: cableIds,
    locationIds: unique(locationIds),
    seen: event.seen,
    archived: event.archived,
    description: event.description,
    outlier: type === "temperature-outlier" || type === "sheath-outlier",
    series: (event.series ?? []).map((series, index) => {
      if (series.times.length !== series.values.length)
        throw new Error(`Unpaired event samples: ${event.id}`);
      const metadata = eventSeriesMetadata(series.metric);
      return {
        id: `${event.id}:${series.sensorId}:${series.metric}:${index}`,
        label: series.name || series.metric,
        unit: metadata.value.status === "known" ? metadata.value.unit : "unknown",
        samples: series.times.map((time, sampleIndex) => ({
          time,
          value: series.values[sampleIndex] ?? null,
        })),
      };
    }),
  };
}

export function adaptSnapshot(
  state: NormalizedSynthesisState,
  maps: NormalizedMapState,
  cables: NormalizedCableState,
  events: readonly VisualizationEvent[],
  notes: string[],
): Snapshot {
  const sensors = state.sensorIds.flatMap((id) => {
    const sensor = state.sensors.get(id);
    return sensor ? [adaptSensor(sensor, state)] : [];
  });
  const sensorsByMeasurement = new Map<string, string[]>();
  for (const sensor of sensors) {
    for (const reading of selectMeasurementsBySensor(state, sensor.id)) {
      sensorsByMeasurement.set(reading.id, [
        ...(sensorsByMeasurement.get(reading.id) ?? []),
        sensor.id,
      ]);
    }
  }
  // /all remains canonical; independent optional resources may add evidence it lacks.
  const measurements = new Map<string, NormalizedMeasurement>();
  for (const resource of [state, maps, cables]) {
    for (const id of resource.measurementIds) {
      const reading = resource.measurements.get(id);
      if (reading && !measurements.has(id)) measurements.set(id, reading);
    }
  }
  const readings = [...measurements.values()].map((reading) =>
    adaptMeasurement(reading, sensorsByMeasurement.get(reading.id)),
  );
  const timestamps = readings.flatMap((reading) =>
    reading.timestamp && Number.isFinite(Date.parse(reading.timestamp)) ? [reading.timestamp] : [],
  );
  const updatedAt = timestamps.reduce<string | null>(
    (latest, time) => (latest === null || Date.parse(time) > Date.parse(latest) ? time : latest),
    null,
  );
  const locations = maps.locationIds.flatMap((id) => {
    const location = maps.locations.get(id);
    return location
      ? [{ id, name: location.name, description: "Source-authored map location" }]
      : [];
  });
  const assets = adaptAssets(cables);
  const unresolvedLocations = unique(assets.flatMap((asset) => asset.locationIds)).filter(
    (id) => !maps.locations.has(id),
  );
  const unresolvedSensors = unique([
    ...assets.flatMap((asset) => asset.sensorIds),
    ...events.flatMap((event) => event.sensorIds),
  ]).filter((id) => !state.sensors.has(id));
  const unresolvedMeasurements = unique([
    ...assets.flatMap((asset) => asset.sections.flatMap((section) => section.measurementIds)),
    ...sensors.flatMap((sensor) => sensor.measurementId ?? []),
  ]).filter((id) => !measurements.has(id));
  const missingEventPlots = events.flatMap((event) =>
    event.series === undefined ? [event.id] : [],
  );
  return {
    mode: "live",
    updatedAt,
    locations,
    assets,
    sensors,
    measurements: readings,
    events: events.map((event) => adaptEvent(event, state, cables)),
    notes: [
      ...notes,
      "Snapshot timestamp is the latest returned measurement timestamp, not a server refresh time.",
      ...(unresolvedLocations.length
        ? [`Unresolved cable location IDs: ${unresolvedLocations.join(", ")}`]
        : []),
      ...(unresolvedSensors.length
        ? [`Unresolved cable/event sensor IDs: ${unresolvedSensors.join(", ")}`]
        : []),
      ...(unresolvedMeasurements.length
        ? [`Unresolved measurement IDs: ${unresolvedMeasurements.join(", ")}`]
        : []),
      ...(missingEventPlots.length
        ? [
            `Event list plot series absent for ${missingEventPlots.join(", ")}; request event detail for authored plot evidence.`,
          ]
        : []),
    ],
  };
}

function electricalValue(bucket: ElectricalTrendBucket, metric: string): number | null {
  switch (metric) {
    case "PosSeqMag":
      return bucket.positiveSequenceMagnitude ?? null;
    case "PosSeqAng":
      return bucket.positiveSequenceAngle ?? null;
    case "Frequency":
      return bucket.frequency ?? null;
    case "THD":
      return bucket.totalHarmonicDistortion ?? null;
    default:
      break;
  }
  const phase = { A: 0, B: 1, C: 2 }[metric[0] ?? ""];
  if (phase === undefined) throw new Error(`Unsupported electrical bucket metric: ${metric}`);
  if (metric.endsWith("Ang")) return bucket.phaseAngles[phase] ?? null;
  return bucket.phaseMagnitudes[phase] ?? null;
}

export function adaptTrend(trend: SensorTrend, sensor: Sensor, key: string): Series {
  const metric = requireMetric(sensor, key);
  if (trend.sensorId !== sensor.id)
    throw new Error("Trend response sensor identity does not match the request.");
  if (trend.buckets === undefined)
    throw new Error("Trend samples are missing from the response (not an empty series).");
  return {
    id: `${sensor.id}:${key}`,
    label: `${sensor.name} · ${metric.label}`,
    unit: metric.unit,
    samples: trend.buckets.map((bucket) => {
      if (bucket.sensorId !== sensor.id)
        throw new Error("Trend bucket sensor identity does not match the request.");
      const time = Date.parse(bucket.timestamp);
      if (!Number.isFinite(time)) throw new Error(`Invalid trend timestamp: ${bucket.timestamp}`);
      if ((sensor.kind === "temperature") !== (bucket.variant === "temperature"))
        throw new Error("Trend bucket kind does not match the sensor.");
      return {
        time,
        value:
          bucket.variant === "temperature"
            ? (bucket.temperature ?? null)
            : electricalValue(bucket, key),
      };
    }),
  };
}
