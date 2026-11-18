import {
  EventType,
  ZERO_UUID,
  normalizeAllResponse,
  normalizeCableAssets,
  normalizeMaps,
  type CableSectionKey,
  type DtsMeasurement,
  type ElectricalMeasurement,
  type NormalizedCableState,
  type NormalizedSynthesisState,
  type SensorTrend,
  type StrainMeasurement,
  type TemperatureMeasurement,
  type VisualizationEvent,
  type WavelengthMeasurement,
} from "@philvernon/grid-data-kit-core";
import { describe, expect, it } from "vitest";
import {
  adaptAssets,
  adaptEvent,
  adaptMeasurement,
  adaptSensor,
  adaptSnapshot,
  adaptTrend,
} from "./adapters";
import { metricsForKind } from "./metrics";
import type { Sensor } from "./types";

const identity = {
  id: "measurement-1",
  deviceId: "device-1",
  dataSourceId: "source-1",
  locationId: "location-1",
  label: "Source label",
  timestamp: "2026-06-18T10:30:00Z",
};
const electrical: ElectricalMeasurement = {
  ...identity,
  kind: "current",
  phaseA: { magnitude: 0, angle: 0, quality: 0 },
  phaseB: { magnitude: 2, angle: -2.09, quality: 1 },
  phaseC: { magnitude: 3, angle: 2.09, quality: 2 },
  positiveSequenceMagnitude: 0,
  positiveSequenceAngle: 0,
  frequency: 50,
  rateOfChangeOfFrequency: 0,
  totalHarmonicDistortion: 0,
  unbalance: 0,
  lowValue: false,
};
const temperature: TemperatureMeasurement = {
  ...identity,
  kind: "temperature",
  average: 0,
  normalizedAverage: 1.8,
  minimum: -1,
  maximum: 1,
  standardDeviation: 0,
  precision: 0,
  quality: { current: 0 },
  lowValue: false,
};
const selected: Sensor = {
  id: "sensor-1",
  name: "Phase current",
  kind: "current",
  locationId: "location-1",
  measurementId: "measurement-1",
  metrics: metricsForKind("current"),
};

function stateWithSensor(): NormalizedSynthesisState {
  const empty = normalizeAllResponse({ Devices: [] });
  return {
    ...empty,
    sensors: new Map([
      [
        "sensor-1",
        {
          id: "sensor-1",
          deviceId: "device-1",
          dataSourceId: "source-1",
          locationId: "location-1",
          sensorType: "Current",
          measurementId: "measurement-1",
          measurementKind: "current",
        },
      ],
    ]),
    sensorIds: ["sensor-1"],
    measurements: new Map([[electrical.id, electrical]]),
    measurementIds: [electrical.id],
    measurementIndexes: {
      ...empty.measurementIndexes,
      bySensor: new Map([["sensor-1", [electrical]]]),
    },
  };
}

function cableState(): NormalizedCableState {
  const empty = normalizeCableAssets([]);
  const key = "snapshot-local-section-key" as CableSectionKey;
  return {
    ...empty,
    cableAssetIds: ["cable-1"],
    cableSectionKeys: [key],
    cableAssets: new Map([
      [
        "cable-1",
        {
          id: "cable-1",
          name: "Authored cable",
          phaseCurrentMeasurementId: "measurement-1",
          currentSensorIds: ["sensor-1"],
          temperatureSensorIds: [],
          sectionKeys: [key],
        },
      ],
    ]),
    cableSections: new Map([
      [
        key,
        {
          id: "backend-section-id",
          key,
          cableAssetId: "cable-1",
          index: 0,
          name: "Authored joint",
          type: "joint",
          locationId: "location-1",
          measurementIds: ["measurement-1"],
          assetTemperatureMeasurementIds: {
            phaseA: undefined,
            phaseB: undefined,
            phaseC: undefined,
          },
          sheathLeftMeasurementId: "measurement-1",
          sheathRightMeasurementId: ZERO_UUID,
          ambientTemperatureMeasurementId: ZERO_UUID,
          earthingPointTemperatureMeasurementId: ZERO_UUID,
          sheathDifferenceScalar: [],
          sheathDifferenceVector: [],
          sheathRatioLeft: [],
          sheathRatioRight: [],
          correctedDts: { distances: null, phaseA: null, phaseB: null, phaseC: null },
        },
      ],
    ]),
  };
}

function eventFixture(overrides: Partial<VisualizationEvent> = {}): VisualizationEvent {
  return {
    id: "event-1",
    description: "Authored event",
    startTime: "2026-06-18T09:30:00Z",
    endTime: "2026-06-18T10:30:00Z",
    type: EventType.TemperatureOutlier,
    archived: false,
    seen: false,
    sensorIds: ["sensor-1"],
    level: 2,
    numericStartTime: 123,
    numericEndTime: 456,
    ...overrides,
  };
}

function electricalTrend(): SensorTrend {
  return {
    sensorId: "sensor-1",
    locationId: "location-1",
    buckets: [
      {
        variant: "electrical",
        sensorId: "sensor-1",
        timestamp: "2026-06-18T10:30:00Z",
        phaseMagnitudes: [0, 2],
        phaseAngles: [0, -120],
        positiveSequenceMagnitude: 0,
        positiveSequenceAngle: 0,
        frequency: 50,
        totalHarmonicDistortion: 0,
        harmonicMagnitudes: { phaseA: [], phaseB: [], phaseC: [] },
      },
    ],
  };
}

describe("public normalized snapshot adapters", () => {
  it("preserves electrical zero readings, radians, codes and flags", () => {
    const reading = adaptMeasurement(electrical, ["sensor-1"]);
    expect(reading.sensorIds).toEqual(["sensor-1"]);
    expect(reading.timestamp).toBe(identity.timestamp);
    expect(reading.fields).toContainEqual({ name: "phaseA.magnitude", value: 0, unit: "A" });
    expect(reading.fields).toContainEqual({ name: "phaseB.angle", value: -2.09, unit: "rad" });
    expect(reading.fields).toContainEqual({
      name: "rateOfChangeOfFrequency",
      value: 0,
      unit: "Hz/s",
    });
    expect(reading.fields).toContainEqual({ name: "phaseA.quality", value: 0, unit: "code" });
    expect(reading.fields).toContainEqual({ name: "lowValue", value: "false", unit: "flag" });
    expect(adaptMeasurement({ ...electrical, kind: "voltage" }).fields).toContainEqual({
      name: "phaseA.magnitude",
      value: 0,
      unit: "V",
    });
  });

  it("retains absent quality, dimensionless normalized temperature and exact small strain", () => {
    const reading = adaptMeasurement(temperature);
    expect(reading.fields).toContainEqual({ name: "average", value: 0, unit: "°C" });
    expect(reading.fields).toContainEqual({ name: "normalizedAverage", value: 1.8, unit: "1" });
    expect(reading.fields).toContainEqual({ name: "quality.current", value: 0, unit: "code" });
    expect(reading.fields).toContainEqual({ name: "quality.latched", value: null, unit: "code" });
    const strain: StrainMeasurement = {
      ...identity,
      kind: "strain",
      average: 0,
      minimum: -0.00001,
      maximum: 0.00002,
      quality: {},
    };
    expect(adaptMeasurement(strain).fields).toContainEqual({
      name: "minimum",
      value: -0.00001,
      unit: "m/m",
    });
  });

  it("keeps wavelength units and aligned raw DTS vectors including trailing zeros", () => {
    const wavelength: WavelengthMeasurement = {
      ...identity,
      kind: "wavelength",
      average: 1550,
      minimum: 1549,
      maximum: 1551,
      standardDeviation: 0,
      fftMagnitude: 0,
      fftAngle: 0,
      fftMean: 1550,
      quality: {},
    };
    expect(adaptMeasurement(wavelength).fields).toContainEqual({
      name: "fftAngle",
      value: 0,
      unit: "°",
    });
    expect(adaptMeasurement(wavelength).fields).toContainEqual({
      name: "fftMagnitude",
      value: 0,
      unit: "nm",
    });
    const dts: DtsMeasurement = {
      ...identity,
      kind: "dts",
      series: { distances: [0, 10, 20], temperatures: [22, 25, 0], length: 3 },
    };
    expect(adaptMeasurement(dts).fields).toEqual([
      { name: "series.distances", value: "[0,10,20]", unit: "m" },
      { name: "series.temperatures", value: "[22,25,0]", unit: "°C" },
    ]);
  });

  it("uses SDK sensor selectors and backend section IDs, not positional keys", () => {
    const state = stateWithSensor();
    expect(adaptSensor(state.sensors.get("sensor-1")!, state)).toEqual({
      ...selected,
      name: "Source label",
    });
    const assets = adaptAssets(cableState());
    expect(assets[0]?.sections[0]?.id).toBe("backend-section-id");
    expect(assets[0]?.sections[0]?.measurementIds).toEqual(["measurement-1"]);
    expect(assets[0]?.locationIds).toEqual(["location-1"]);
  });

  it("retains source timestamps and optional-resource notes without inventing freshness", () => {
    const notes = ["Maps unavailable"];
    const snapshot = adaptSnapshot(stateWithSensor(), normalizeMaps([]), cableState(), [], notes);
    expect(snapshot.updatedAt).toBe(identity.timestamp);
    expect(snapshot.mode).toBe("live");
    expect(snapshot.notes).toContain("Maps unavailable");
    expect(
      snapshot.notes.some((note) => note.includes("Unresolved cable location IDs: location-1")),
    ).toBe(true);
    expect(notes).toEqual(["Maps unavailable"]);
    expect(snapshot.measurements[0]?.sensorIds).toEqual(["sensor-1"]);
    expect(
      adaptSnapshot(
        normalizeAllResponse({ Devices: [] }),
        normalizeMaps([]),
        normalizeCableAssets([]),
        [],
        [],
      ).updatedAt,
    ).toBeNull();
  });
});

describe("authored event adaptation", () => {
  it("uses public cable/sensor associations only when assetId is absent", () => {
    const state = stateWithSensor();
    const cables = cableState();
    const inferred = adaptEvent(eventFixture(), state, cables);
    expect(inferred.assetId).toBe("cable-1");
    expect(inferred.associatedAssetIds).toEqual(["cable-1"]);
    expect(inferred.locationIds).toEqual(["location-1"]);
    const explicitForeign = adaptEvent(
      eventFixture({ assetId: "unresolved-cable" }),
      state,
      cables,
    );
    expect(explicitForeign.assetId).toBe("unresolved-cable");
    expect(explicitForeign.associatedAssetIds).toEqual([]);
    expect(explicitForeign.locationIds).toEqual([]);
    expect(explicitForeign.sensorIds).toEqual(["sensor-1"]);
  });

  it("preserves every inferred cable association instead of requiring a singleton", () => {
    const cables = cableState();
    const original = cables.cableAssets.get("cable-1")!;
    const multi: NormalizedCableState = {
      ...cables,
      cableAssetIds: ["cable-1", "cable-2"],
      cableAssets: new Map([
        ...cables.cableAssets,
        ["cable-2", { ...original, id: "cable-2", name: "Second cable", sectionKeys: [] }],
      ]),
    };
    const result = adaptEvent(eventFixture(), stateWithSensor(), multi);
    expect(result.assetId).toBeNull();
    expect(result.associatedAssetIds).toEqual(["cable-1", "cable-2"]);
  });

  it("uses milliseconds and confirmed event metadata without sorting or converting values", () => {
    const times = [3000, 1000, 2000];
    const input = eventFixture({
      series: [
        {
          metric: "t_average",
          name: "Temperature evidence",
          sensorId: "sensor-1",
          times,
          values: [0, 2, 1],
        },
        {
          metric: "Temperature",
          name: "Unknown event units",
          sensorId: "sensor-1",
          times: [0],
          values: [0],
        },
      ],
    });
    const output = adaptEvent(input, stateWithSensor(), cableState());
    expect(output.outlier).toBe(true);
    expect(output.series[0]?.unit).toBe("°C");
    expect(output.series[0]?.samples).toEqual([
      { time: 3000, value: 0 },
      { time: 1000, value: 2 },
      { time: 2000, value: 1 },
    ]);
    expect(output.series[1]?.unit).toBe("unknown");
    expect(output.series[1]?.samples).toEqual([{ time: 0, value: 0 }]);
    expect(output.timestamp).toBe(input.startTime);
    expect(times).toEqual([3000, 1000, 2000]);
  });

  it("does not classify future/unspecified event types as outliers or hide numeric values", () => {
    const unknown = adaptEvent(
      eventFixture({ type: 99 as EventType, level: 99 }),
      stateWithSensor(),
      cableState(),
    );
    expect(unknown.type).toBe("unknown (99)");
    expect(unknown.severity).toBe("unknown (99)");
    expect(unknown.outlier).toBe(false);
    const ordinary = adaptEvent(
      eventFixture({ type: EventType.Unspecified }),
      stateWithSensor(),
      cableState(),
    );
    expect(ordinary.outlier).toBe(false);
  });

  it("rejects unequal time/value lengths rather than inventing missing samples", () => {
    const input = eventFixture({
      series: [
        {
          metric: "t_average",
          name: "Bad pairing",
          sensorId: "sensor-1",
          times: [1, 2],
          values: [0],
        },
      ],
    });
    expect(() => adaptEvent(input, stateWithSensor(), cableState())).toThrow(
      "Unpaired event samples",
    );
  });
});

describe("physical trend adaptation", () => {
  it("uses SDK physical units, preserves zero and does not invent absent phase readings", () => {
    const input = electricalTrend();
    expect(
      adaptTrend(
        input,
        { ...selected, metrics: [{ key: "AMag", label: "Wrong", unit: "made-up" }] },
        "AMag",
      ).unit,
    ).toBe("A");
    expect(adaptTrend(input, selected, "AMag").samples[0]?.value).toBe(0);
    expect(adaptTrend(input, selected, "CMag").samples[0]?.value).toBeNull();
    expect(adaptTrend(input, selected, "BAng")).toMatchObject({
      unit: "°",
      samples: [{ value: -120 }],
    });
    expect(adaptTrend(input, { ...selected, kind: "voltage" }, "AMag").unit).toBe("V");
  });

  it("preserves authored order, zero temperature and empty-versus-missing collections", () => {
    const sensor: Sensor = { ...selected, kind: "temperature" };
    const trend: SensorTrend = {
      sensorId: sensor.id,
      locationId: "location-1",
      buckets: [
        {
          variant: "temperature",
          sensorId: sensor.id,
          timestamp: "2026-06-18T10:30:00Z",
          temperature: 0,
          unit: "°C",
        },
        {
          variant: "temperature",
          sensorId: sensor.id,
          timestamp: "2026-06-18T09:30:00Z",
          temperature: 2,
          unit: "°C",
        },
      ],
    };
    expect(adaptTrend(trend, sensor, "Temperature").samples.map((sample) => sample.value)).toEqual([
      0, 2,
    ]);
    expect(adaptTrend({ ...trend, buckets: [] }, sensor, "Temperature").samples).toEqual([]);
    expect(() =>
      adaptTrend({ sensorId: sensor.id, locationId: "location-1" }, sensor, "Temperature"),
    ).toThrow("missing from the response");
  });

  it("rejects unsupported metrics and mismatched sensor identities", () => {
    expect(() => adaptTrend(electricalTrend(), selected, "Temperature")).toThrow("Unsupported");
    expect(() => adaptTrend(electricalTrend(), selected, "Unbalance")).toThrow("Unsupported");
    expect(() => adaptTrend(electricalTrend(), { ...selected, id: "other" }, "AMag")).toThrow(
      "identity",
    );
    expect(metricsForKind("strain")).toEqual([]);
    expect(metricsForKind("wavelength")).toEqual([]);
    expect(metricsForKind("dts")).toEqual([]);
  });
});
