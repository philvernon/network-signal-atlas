import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EvidenceSource, Sensor, Snapshot, TrendRange } from "../data/types";
import type { Route } from "../navigation";
import { errorText, eventFailure } from "../presentation";
import { EmptyState } from "./Shell";
import { TrendChart } from "./charts/TrendChart";
import { SensorHistoryControls } from "./SensorHistoryControls";

export function SensorHistory({
  sensor,
  snapshot,
  source,
  route,
}: {
  sensor: Sensor;
  snapshot: Snapshot;
  source: EvidenceSource;
  route: Route;
}) {
  const [metric, setMetric] = useState(sensor.metrics[0]!.key);
  const [range, setRange] = useState<TrendRange>("24h");
  const [comparisonId, setComparisonId] = useState("");
  const metadata = sensor.metrics.find((item) => item.key === metric)!;
  const compatible = snapshot.sensors.filter(
    (item) =>
      item.id !== sensor.id &&
      item.metrics.some(
        (itemMetric) => itemMetric.key === metric && itemMetric.unit === metadata.unit,
      ),
  );
  const comparisonSensor = compatible.find((item) => item.id === comparisonId);
  const trend = useQuery({
    queryKey: [route.mode, "trend", sensor.id, metric, range],
    queryFn: () => source.loadTrend(sensor, metric, range),
    retry: false,
  });
  const comparison = useQuery({
    queryKey: [route.mode, "trend", comparisonSensor?.id, metric, range],
    queryFn: () => source.loadTrend(comparisonSensor!, metric, range),
    enabled: !!comparisonSensor,
    retry: false,
  });
  const events =
    eventFailure(snapshot) === undefined
      ? snapshot.events.filter((event) => event.sensorIds.includes(sensor.id))
      : [];
  return (
    <>
      <SensorHistoryControls
        sensor={sensor}
        compatible={compatible}
        metric={metric}
        range={range}
        comparisonId={comparisonId}
        onMetricChange={(value) => {
          setMetric(value);
          setComparisonId("");
        }}
        onRangeChange={setRange}
        onComparisonChange={setComparisonId}
      />
      {trend.isPending ? (
        <p role="status" className="py-16 text-muted">
          Loading physical sensor history…
        </p>
      ) : trend.isError ? (
        <EmptyState title="History unavailable">
          <p role="alert">{errorText(trend.error)}</p>
          <button
            className="action mt-4"
            type="button"
            onClick={() => {
              void trend.refetch();
            }}
          >
            Retry history
          </button>
        </EmptyState>
      ) : (
        <TrendChart
          key={`${sensor.id}:${metric}:${range}`}
          series={trend.data}
          comparison={comparisonSensor ? comparison.data : undefined}
          events={events}
        />
      )}
      {comparison.isFetching && comparisonSensor && (
        <p role="status" className="mt-3 text-sm text-muted">
          Loading comparison…
        </p>
      )}
      {comparison.isError && comparisonSensor && (
        <p role="alert" className="mt-3 text-sm text-muted">
          Comparison unavailable. {errorText(comparison.error)}
        </p>
      )}
    </>
  );
}
