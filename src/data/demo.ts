import { metricsForKind } from "./metrics.js";
import { demoHistogram, demoTrend } from "./demo-history.js";
import type {
  Asset,
  EvidenceSource,
  GridEvent,
  Measurement,
  MeasurementKind,
  ReadingField,
  Sensor,
  Snapshot,
} from "./types.js";

export const DEMO_TIMESTAMP = "2026-06-18T10:30:00.000Z";
export const DEMO_EPOCH = Date.parse(DEMO_TIMESTAMP);
const hour = 3_600_000;

interface DemoReading {
  key: string;
  name: string;
  kind: MeasurementKind;
  locationId: string;
  fields: ReadingField[];
}

function field(name: string, value: number | string | null, unit: string): ReadingField {
  return { name, value, unit };
}

function temperature(average: number | null): ReadingField[] {
  return [
    field("average", average, "°C"),
    field("minimum", average === null ? null : average - 0.7, "°C"),
    field("maximum", average === null ? null : average + 0.9, "°C"),
    field("standardDeviation", average === null ? null : 0.3, "°C"),
    field("normalizedAverage", null, "1"),
    field("precision", 0.1, "°C"),
  ];
}

function electrical(magnitude: number, unit: "A" | "V", missingAngle = false): ReadingField[] {
  const phaseCAngle = magnitude === 0 ? 0 : 2.0944;
  return [
    field("phaseA.magnitude", magnitude, unit),
    field("phaseB.magnitude", Number((magnitude * 0.992).toFixed(2)), unit),
    field("phaseC.magnitude", Number((magnitude * 1.006).toFixed(2)), unit),
    field("phaseA.angle", 0, "rad"),
    field("phaseB.angle", magnitude === 0 ? 0 : -2.0944, "rad"),
    field("phaseC.angle", missingAngle ? null : phaseCAngle, "rad"),
    field("positiveSequenceMagnitude", magnitude, unit),
    field("positiveSequenceAngle", 0, "rad"),
    field("frequency", magnitude === 0 ? 0 : 50.01, "Hz"),
    field("rateOfChangeOfFrequency", 0, "Hz/s"),
    field("totalHarmonicDistortion", magnitude === 0 ? 0 : 1.2, "%"),
    field("unbalance", magnitude === 0 ? 0 : 0.7, "%"),
  ];
}

const readings: DemoReading[] = [
  {
    key: "nq-temperature",
    name: "North Quay · termination temperature",
    kind: "temperature",
    locationId: "loc-north-quay",
    fields: temperature(47.8),
  },
  {
    key: "canal-temperature",
    name: "Canal · joint temperature",
    kind: "temperature",
    locationId: "loc-canal",
    fields: temperature(51.2),
  },
  {
    key: "foundry-temperature",
    name: "Foundry · phase A joint temperature",
    kind: "temperature",
    locationId: "loc-foundry",
    fields: temperature(66.8),
  },
  {
    key: "riverside-temperature",
    name: "Riverside · termination temperature",
    kind: "temperature",
    locationId: "loc-riverside",
    fields: temperature(49.6),
  },
  {
    key: "east-temperature",
    name: "East Bank · spare termination temperature",
    kind: "temperature",
    locationId: "loc-east-bank",
    fields: temperature(null),
  },
  {
    key: "nq-current",
    name: "North Quay · feeder current",
    kind: "current",
    locationId: "loc-north-quay",
    fields: electrical(386.2, "A"),
  },
  {
    key: "canal-current",
    name: "Canal · feeder current",
    kind: "current",
    locationId: "loc-canal",
    fields: electrical(382.7, "A"),
  },
  {
    key: "foundry-current",
    name: "Foundry · feeder current",
    kind: "current",
    locationId: "loc-foundry",
    fields: electrical(379.4, "A"),
  },
  {
    key: "foundry-sheath",
    name: "Foundry · left sheath current",
    kind: "current",
    locationId: "loc-foundry",
    fields: electrical(16.8, "A"),
  },
  {
    key: "riverside-current",
    name: "Riverside · East Bank spare feeder current",
    kind: "current",
    locationId: "loc-riverside",
    fields: electrical(0, "A", true),
  },
  {
    key: "nq-voltage",
    name: "North Quay · phase-to-earth voltage",
    kind: "voltage",
    locationId: "loc-north-quay",
    fields: electrical(38120, "V"),
  },
  {
    key: "riverside-voltage",
    name: "Riverside · phase-to-earth voltage",
    kind: "voltage",
    locationId: "loc-riverside",
    fields: electrical(37980, "V"),
  },
  {
    key: "east-voltage",
    name: "East Bank · isolated bus voltage",
    kind: "voltage",
    locationId: "loc-east-bank",
    fields: electrical(0, "V", true),
  },
  {
    key: "canal-strain",
    name: "Canal · joint support strain",
    kind: "strain",
    locationId: "loc-canal",
    fields: [
      field("average", 0, "m/m"),
      field("minimum", -0.000012, "m/m"),
      field("maximum", 0.000018, "m/m"),
    ],
  },
  {
    key: "foundry-wavelength",
    name: "Foundry · optical reference wavelength",
    kind: "wavelength",
    locationId: "loc-foundry",
    fields: [
      field("average", 1550.243, "nm"),
      field("minimum", 1550.239, "nm"),
      field("maximum", 1550.248, "nm"),
      field("standardDeviation", 0.002, "nm"),
      field("fftMagnitude", 0, "nm"),
      field("fftAngle", 0, "°"),
      field("fftMean", 1550.243, "nm"),
    ],
  },
  {
    key: "riverside-dts",
    name: "Riverside · distributed cable temperature",
    kind: "dts",
    locationId: "loc-riverside",
    fields: [
      field("series.distances", "[0,250,500,750,1000,1250]", "m"),
      field("series.temperatures", "[28.4,31.2,34.8,36.1,32.6,0]", "°C"),
    ],
  },
];

function section(
  id: string,
  name: string,
  locationId: string,
  keys: string[],
): Asset["sections"][number] {
  return {
    id,
    name,
    locationIds: [locationId],
    measurementIds: keys.map((key) => `reading-${key}`),
  };
}

const assets: Asset[] = [
  {
    id: "cable-quay-canal",
    name: "C01 · North Quay — Canal · 66 kV XLPE",
    locationIds: ["loc-north-quay", "loc-canal"],
    sensorIds: [
      "nq-temperature",
      "nq-current",
      "nq-voltage",
      "canal-temperature",
      "canal-strain",
    ].map((key) => `sensor-${key}`),
    sections: [
      section("section-c01-termination", "North Quay outdoor termination · 0 m", "loc-north-quay", [
        "nq-temperature",
        "nq-current",
        "nq-voltage",
      ]),
      section("section-c01-joint", "Canal joint bay · 820 m", "loc-canal", [
        "canal-temperature",
        "canal-strain",
      ]),
    ],
  },
  {
    id: "cable-canal-foundry",
    name: "C02 · Canal — Foundry · 66 kV XLPE",
    locationIds: ["loc-canal", "loc-foundry"],
    sensorIds: [
      "canal-current",
      "canal-temperature",
      "foundry-temperature",
      "foundry-sheath",
      "foundry-wavelength",
    ].map((key) => `sensor-${key}`),
    sections: [
      section("section-c02-canal", "Canal joint and sheath bond · 0 m", "loc-canal", [
        "canal-current",
        "canal-temperature",
      ]),
      section("section-c02-foundry", "Foundry cross-bonding link box · 1,140 m", "loc-foundry", [
        "foundry-temperature",
        "foundry-sheath",
        "foundry-wavelength",
      ]),
    ],
  },
  {
    id: "cable-foundry-riverside",
    name: "C03 · Foundry — Riverside · 66 kV XLPE",
    locationIds: ["loc-foundry", "loc-riverside"],
    sensorIds: [
      "foundry-current",
      "foundry-temperature",
      "riverside-temperature",
      "riverside-voltage",
      "riverside-dts",
    ].map((key) => `sensor-${key}`),
    sections: [
      section("section-c03-foundry", "Foundry feeder joint · 0 m", "loc-foundry", [
        "foundry-current",
        "foundry-temperature",
      ]),
      section("section-c03-riverside", "Riverside indoor termination · 1,250 m", "loc-riverside", [
        "riverside-temperature",
        "riverside-voltage",
        "riverside-dts",
      ]),
    ],
  },
  {
    id: "cable-riverside-east",
    name: "C04 · Riverside — East Bank · isolated 66 kV spare",
    locationIds: ["loc-riverside", "loc-east-bank"],
    sensorIds: ["riverside-current", "east-temperature", "east-voltage"].map(
      (key) => `sensor-${key}`,
    ),
    sections: [
      section(
        "section-c04-riverside",
        "Riverside spare feeder termination · 0 m",
        "loc-riverside",
        ["riverside-current"],
      ),
      section("section-c04-east", "East Bank isolated termination · 960 m", "loc-east-bank", [
        "east-temperature",
        "east-voltage",
      ]),
    ],
  },
];

interface AuthoredEvent {
  id: string;
  title: string;
  hoursAgo: number;
  type: string;
  severity: string;
  sensor: string;
  relatedSensors?: string[];
  asset: string;
  location: string;
  description: string;
  seen: boolean;
  archived?: boolean;
  metric?: string;
  values?: number[];
}

const authoredEvents: AuthoredEvent[] = [
  {
    id: "event-foundry-temperature",
    title: "Foundry joint temperature outlier",
    hoursAgo: 1,
    type: "temperature-outlier",
    severity: "warning",
    sensor: "foundry-temperature",
    asset: "cable-canal-foundry",
    location: "loc-foundry",
    seen: false,
    description:
      "Authored demonstration TemperatureOutlier. Inspect the joint temperature samples; no cause or operating threshold is asserted.",
    metric: "t_average",
    values: [62.1, 65.7, 74.2, 66.8],
  },
  {
    id: "event-foundry-sheath",
    title: "Foundry sheath current outlier",
    hoursAgo: 3,
    type: "sheath-outlier",
    severity: "critical",
    sensor: "foundry-sheath",
    asset: "cable-canal-foundry",
    location: "loc-foundry",
    seen: false,
    description:
      "Authored demonstration SheathOutlier. Event a_mag units are unverified; inspect physical current history separately.",
    metric: "a_mag",
    values: [16.2, 23.4, 19.8, 16.9],
  },
  {
    id: "event-canal-review",
    title: "Canal joint inspection recorded",
    hoursAgo: 12,
    type: "inspection",
    severity: "information",
    sensor: "canal-temperature",
    asset: "cable-quay-canal",
    location: "loc-canal",
    seen: true,
    description: "Synthetic inspection record; not an outlier or automated diagnosis.",
  },
  {
    id: "event-east-isolation",
    title: "East Bank spare feeder isolation recorded",
    hoursAgo: 20,
    type: "switching-record",
    severity: "information",
    sensor: "east-voltage",
    asset: "cable-riverside-east",
    location: "loc-east-bank",
    seen: true,
    description:
      "Synthetic switching record for the isolated spare. Zero voltage is an authored reading, not missing data.",
  },
  {
    id: "event-riverside-temperature",
    title: "Riverside termination temperature outlier",
    hoursAgo: 48,
    type: "temperature-outlier",
    severity: "warning",
    sensor: "riverside-temperature",
    asset: "cable-foundry-riverside",
    location: "loc-riverside",
    seen: true,
    description:
      "Earlier authored TemperatureOutlier retained for multi-day comparison; no causal interpretation.",
    metric: "t_average",
    values: [48.2, 49.3, 61.8, 52.4],
  },
  {
    id: "event-nq-check",
    title: "North Quay voltage check recorded",
    hoursAgo: 96,
    type: "measurement-check",
    severity: "information",
    sensor: "nq-voltage",
    asset: "cable-quay-canal",
    location: "loc-north-quay",
    seen: true,
    description: "Synthetic measurement check, not an outlier.",
  },
  {
    id: "event-canal-optical",
    title: "Canal optical support inspection",
    hoursAgo: 144,
    type: "inspection",
    severity: "information",
    sensor: "canal-temperature",
    relatedSensors: ["canal-strain"],
    asset: "cable-quay-canal",
    location: "loc-canal",
    seen: true,
    description:
      "Synthetic inspection associated with current strain evidence. No historical strain API is implied.",
  },
  {
    id: "event-nq-temperature",
    title: "North Quay temperature outlier · archived",
    hoursAgo: 480,
    type: "temperature-outlier",
    severity: "warning",
    sensor: "nq-temperature",
    asset: "cable-quay-canal",
    location: "loc-north-quay",
    seen: true,
    archived: true,
    description: "Archived authored TemperatureOutlier in the 30-day investigation window.",
    metric: "t_average",
    values: [46.2, 48.1, 59.6, 50.2],
  },
];

const events: GridEvent[] = authoredEvents.map((event) => {
  const time = DEMO_EPOCH - event.hoursAgo * hour;
  const eventUnit = event.metric === "t_average" ? "°C" : "unknown";
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    severity: event.severity,
    timestamp: new Date(time).toISOString(),
    endTime: new Date(time + hour).toISOString(),
    sensorIds: [event.sensor, ...(event.relatedSensors ?? [])].map((key) => `sensor-${key}`),
    assetId: event.asset,
    locationIds: [event.location],
    seen: event.seen,
    archived: event.archived ?? false,
    description: event.description,
    outlier: event.type === "temperature-outlier" || event.type === "sheath-outlier",
    series: event.values
      ? [
          {
            id: `${event.id}:${event.metric}`,
            label: event.metric ?? "Unknown event metric",
            unit: eventUnit,
            samples: event.values.map((value, index) => ({
              time: time + (index - 2) * hour,
              value,
            })),
          },
        ]
      : [],
  };
});

const sensors: Sensor[] = readings.map((reading) => ({
  id: `sensor-${reading.key}`,
  name: reading.name,
  kind: reading.kind,
  locationId: reading.locationId,
  measurementId: `reading-${reading.key}`,
  metrics: metricsForKind(reading.kind),
}));
const measurements: Measurement[] = readings.map((reading) => ({
  id: `reading-${reading.key}`,
  name: reading.name,
  kind: reading.kind,
  timestamp: DEMO_TIMESTAMP,
  locationId: reading.locationId,
  sensorIds: [`sensor-${reading.key}`],
  fields: reading.fields,
}));

/** Fixed synthetic evidence, never presented as a live-service response. */
export const demoSnapshot: Snapshot = {
  mode: "demo",
  updatedAt: DEMO_TIMESTAMP,
  locations: [
    {
      id: "loc-north-quay",
      name: "North Quay Primary",
      description: "Synthetic 66 kV primary substation and outdoor cable terminations.",
    },
    {
      id: "loc-canal",
      name: "Canal Joint Bay",
      description: "Synthetic joint bay beside the canal crossing.",
    },
    {
      id: "loc-foundry",
      name: "Foundry Link Box",
      description: "Synthetic cross-bonded sheath link box and phase A cable joint.",
    },
    {
      id: "loc-riverside",
      name: "Riverside Substation",
      description: "Synthetic indoor terminations and distributed temperature sensing.",
    },
    {
      id: "loc-east-bank",
      name: "East Bank Terminal",
      description:
        "Synthetic isolated spare feeder termination; zero electrical values are deliberate.",
    },
  ],
  assets,
  sensors,
  measurements,
  events,
  notes: [
    "Deterministic synthetic demonstration · 18 Jun 2026, 10:30 UTC. No live values or simulated streaming.",
    "Hourly synthetic histories contain explicit missing samples. Current snapshots are separate evidence.",
    "Histograms count seven days of synthetic hourly primary-metric samples, excluding missing samples.",
    "East Bank temperature is missing; isolated electrical readings and the strain average include real authored zeros.",
    "Event t_average values are °C; other event metric units remain unknown. Outlier classifications are authored, not detected by this app.",
    "Strain, wavelength and DTS are current snapshot evidence only. The final zero in the DTS vector is retained as authored.",
  ],
};

export function createDemoSource(): EvidenceSource {
  function sensorById(sensor: Sensor): Sensor {
    const canonical = sensors.find((candidate) => candidate.id === sensor.id);
    if (!canonical) throw new Error(`Unknown demonstration sensor: ${sensor.id}`);
    return canonical;
  }
  return {
    async loadSnapshot() {
      return structuredClone(demoSnapshot);
    },
    async loadEvent(id) {
      const event = events.find((candidate) => candidate.id === id);
      if (!event) throw new Error(`Unknown demonstration event: ${id}`);
      return structuredClone(event);
    },
    async loadTrend(sensor, metric, range) {
      return demoTrend(demoSnapshot, sensorById(sensor), metric, range);
    },
    async loadHistogram(sensor) {
      return demoHistogram(demoSnapshot, sensorById(sensor));
    },
  };
}
