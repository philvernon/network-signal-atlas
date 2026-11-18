import type { Sensor, TrendRange } from "../data/types";

type SensorHistoryControlsProps = {
  sensor: Sensor;
  compatible: Sensor[];
  metric: string;
  range: TrendRange;
  comparisonId: string;
  onMetricChange: (metric: string) => void;
  onRangeChange: (range: TrendRange) => void;
  onComparisonChange: (id: string) => void;
};

export function SensorHistoryControls({
  sensor,
  compatible,
  metric,
  range,
  comparisonId,
  onMetricChange,
  onRangeChange,
  onComparisonChange,
}: SensorHistoryControlsProps) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="min-w-40 flex-1 text-sm font-semibold">
          Metric
          <select
            value={metric}
            className="field mt-2"
            onChange={(event) => {
              onMetricChange(event.target.value);
            }}
            aria-label="History metric"
          >
            {sensor.metrics.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} · {item.unit}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="mb-2 text-sm font-semibold">Time window</p>
          <div className="flex gap-1" aria-label="History range">
            {(["24h", "7d", "30d"] as const).map((value) => (
              <button
                className={range === value ? "action-primary" : "action"}
                key={value}
                aria-pressed={range === value}
                type="button"
                onClick={() => onRangeChange(value)}
              >
                {value === "24h" ? "24 hours" : value === "7d" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="mb-6 block text-sm font-semibold">
        Compare a compatible sensor
        <select
          className="field mt-2"
          value={comparisonId}
          onChange={(event) => onComparisonChange(event.target.value)}
        >
          <option value="">No comparison</option>
          {compatible.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
