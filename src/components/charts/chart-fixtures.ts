import type { GridEvent, Series } from "../../data/types";

// Deterministic synthetic evidence, used only by local stories and tests.
export const chartStart = Date.UTC(2026, 0, 12, 8);
export const chartHour = 3_600_000;
export const chartSeries: Series = {
  id: "synthetic-temperature",
  label: "Joint 4 temperature",
  unit: "°C",
  samples: [12.3456789, null, 0, 14, 16].map((value, index) => ({
    time: chartStart + index * chartHour,
    value,
  })),
};
export const chartComparison: Series = {
  id: "synthetic-comparison",
  label: "Joint 5 temperature",
  unit: "°C",
  samples: [11, 12, null, 13, 15].map((value, index) => ({
    time: chartStart + index * chartHour,
    value,
  })),
};
export const chartEvents: GridEvent[] = [
  {
    id: "synthetic-outlier",
    title: "Authored temperature outlier",
    type: "TemperatureOutlier",
    severity: "Warning",
    timestamp: new Date(chartStart + chartHour / 2).toISOString(),
    endTime: null,
    sensorIds: [],
    assetId: null,
    locationIds: [],
    seen: false,
    archived: false,
    description: "Synthetic authored event between sample timestamps.",
    outlier: true,
    series: [],
  },
  {
    id: "synthetic-event",
    title: "Acquisition resumed",
    type: "Information",
    severity: "Info",
    timestamp: new Date(chartStart + chartHour * 3).toISOString(),
    endTime: null,
    sensorIds: [],
    assetId: null,
    locationIds: [],
    seen: true,
    archived: false,
    description: "Synthetic ordinary event.",
    outlier: false,
    series: [],
  },
];
