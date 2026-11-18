export type SourceMode = "demo" | "live";
export type MeasurementKind =
  | "temperature"
  | "current"
  | "voltage"
  | "strain"
  | "wavelength"
  | "dts"
  | "other";
export interface ReadingField {
  name: string;
  value: number | string | null;
  unit: string;
}
export interface Measurement {
  id: string;
  name: string;
  kind: MeasurementKind;
  timestamp: string | null;
  locationId: string | null;
  sensorIds: string[];
  fields: ReadingField[];
}
export interface Sensor {
  id: string;
  name: string;
  kind: MeasurementKind;
  locationId: string | null;
  measurementId: string | null;
  metrics: { key: string; label: string; unit: string }[];
}
export interface Location {
  id: string;
  name: string;
  description: string;
}
export interface AssetSection {
  id: string;
  name: string;
  locationIds: string[];
  measurementIds: string[];
}
export interface Asset {
  id: string;
  name: string;
  locationIds: string[];
  sensorIds: string[];
  sections: AssetSection[];
}
export interface Sample {
  time: number;
  value: number | null;
}
export interface Series {
  id: string;
  label: string;
  unit: string;
  samples: Sample[];
}
export interface GridEvent {
  id: string;
  title: string;
  type: string;
  severity: string;
  timestamp: string | null;
  endTime: string | null;
  sensorIds: string[];
  assetId: string | null;
  /** All public SDK-resolved cable associations; explicit asset identity takes precedence. */
  associatedAssetIds?: string[];
  locationIds: string[];
  seen: boolean;
  archived: boolean;
  description: string;
  outlier: boolean;
  series: Series[];
}
export interface Snapshot {
  mode: SourceMode;
  updatedAt: string | null;
  locations: Location[];
  assets: Asset[];
  sensors: Sensor[];
  measurements: Measurement[];
  events: GridEvent[];
  eventAvailability?: { status: "available" } | { status: "unavailable"; message: string };
  notes: string[];
}
export type TrendRange = "24h" | "7d" | "30d";
export interface HistogramBucket {
  label: string;
  count: number;
}
export interface EvidenceSource {
  loadSnapshot: () => Promise<Snapshot>;
  loadEvent: (id: string) => Promise<GridEvent>;
  loadTrend: (sensor: Sensor, metric: string, range: TrendRange) => Promise<Series>;
  loadHistogram: (sensor: Sensor) => Promise<HistogramBucket[]>;
}
