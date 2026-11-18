import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { scaleLinear } from "d3-scale";
import type { EvidenceSource, HistogramBucket, Sensor, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { errorText, eventFailure, humanize, locationName } from "../presentation";
import { SensorHistory } from "./SensorHistory";
import { SensorHeading, SensorContextCards, SensorCableAssociations } from "./SensorContext";
import { EmptyState, PageHeading } from "./Shell";

export function InvestigationPage({
  snapshot,
  source,
  route,
}: {
  snapshot: Snapshot;
  source: EvidenceSource;
  route: Route;
}) {
  const [search, setSearch] = useState("");
  const allSensors = snapshot.sensors.filter((sensor) => sensor.metrics.length > 0);
  const selected = route.sensor
    ? allSensors.find((sensor) => sensor.id === route.sensor)
    : (allSensors.find(
        (sensor) =>
          eventFailure(snapshot) === undefined &&
          snapshot.events.find((event) => event.id === route.event)?.sensorIds.includes(sensor.id),
      ) ?? allSensors[0]);
  const sensors = allSensors.filter((sensor) =>
    `${sensor.name} ${sensor.id} ${locationName(snapshot, sensor.locationId)}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="content pt-10">
      <PageHeading
        label="Historical evidence"
        title="Sensor investigation"
        description="Compare physical readings, locate authored outliers and pin exact samples without losing the asset context."
      />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="min-w-0">
          <label className="text-sm font-semibold">
            Find a sensor
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or location"
              className="field mt-2"
            />
          </label>
          <p className="mt-3 text-xs text-muted">{sensors.length} sensors with supported history</p>
          <div className="mt-4 max-h-64 overflow-y-auto border-y border-line lg:max-h-[700px]">
            <ul className="divide-y divide-line">
              {sensors.map((sensor) => (
                <li key={sensor.id}>
                  <a
                    className={`block border-l-4 px-3 py-4 ${selected?.id === sensor.id ? "border-amber bg-canvas" : "border-transparent hover:bg-canvas"}`}
                    aria-current={selected?.id === sensor.id ? "true" : undefined}
                    href={routeHref({
                      mode: route.mode,
                      view: "investigation",
                      sensor: sensor.id,
                      event: route.event,
                    })}
                  >
                    <span className="text-xs text-muted">{humanize(sensor.kind)}</span>
                    <span className="mt-1 block text-sm font-semibold leading-relaxed">
                      {sensor.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {!sensors.length && <p className="py-5 text-sm text-muted">No matching sensors.</p>}
        </aside>
        {selected ? (
          <SensorWorkspace
            key={`${route.mode}:${selected.id}`}
            sensor={selected}
            snapshot={snapshot}
            source={source}
            route={route}
          />
        ) : (
          <EmptyState title={route.sensor ? "Sensor unavailable" : "No supported history sensors"}>
            Choose an available sensor or inspect the current measurement inventory.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

function SensorWorkspace({
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
  return (
    <section className="min-w-0">
      <SensorHeading sensor={sensor} snapshot={snapshot} route={route} />
      <SensorHistory sensor={sensor} snapshot={snapshot} source={source} route={route} />
      <SensorContextCards sensor={sensor} snapshot={snapshot} route={route} />
      <DistributionSection sensor={sensor} source={source} mode={route.mode} />
      <SensorCableAssociations sensor={sensor} snapshot={snapshot} route={route} />
    </section>
  );
}

function DistributionSection({
  sensor,
  source,
  mode,
}: {
  sensor: Sensor;
  source: EvidenceSource;
  mode: Route["mode"];
}) {
  const [showDistribution, setShowDistribution] = useState(false);
  const distribution = useQuery({
    queryKey: [mode, "distribution", sensor.id],
    queryFn: () => source.loadHistogram(sensor),
    enabled: showDistribution,
    retry: false,
  });
  return (
    <section className="mt-8 border-y border-line py-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-bold">Source distribution evidence</h3>
          <p className="mt-1 text-xs text-muted">
            Sensor-supplied histogram · independent of the selected chart window
          </p>
        </div>
        <button
          type="button"
          className="action"
          aria-expanded={showDistribution}
          onClick={() => setShowDistribution(!showDistribution)}
        >
          {showDistribution ? "Hide distribution" : "Load distribution"}
        </button>
      </div>
      {showDistribution && (
        <div className="mt-5">
          {distribution.isPending ? (
            <p role="status" className="text-sm text-muted">
              Loading distribution…
            </p>
          ) : distribution.isError ? (
            <p role="status" className="text-sm text-muted">
              {errorText(distribution.error)}
            </p>
          ) : (
            <Distribution buckets={distribution.data} />
          )}
        </div>
      )}
    </section>
  );
}

export function Distribution({ buckets }: { buckets: HistogramBucket[] }) {
  const scale = scaleLinear()
    .domain([0, Math.max(1, ...buckets.map((bucket) => bucket.count))])
    .range([0, 100]);
  if (!buckets.length)
    return <p className="text-sm text-muted">No distribution buckets supplied.</p>;
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Source histogram bucket counts</caption>
      <thead>
        <tr className="border-b border-line">
          <th className="py-2 font-semibold" scope="col">
            Source bucket
          </th>
          <th className="py-2 text-right font-semibold" scope="col">
            Count
          </th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket, index) => (
          <tr key={`${bucket.label}:${index}`}>
            <th className="w-3/4 py-2 pr-5 font-normal" scope="row">
              <span>{bucket.label}</span>
              <span aria-hidden="true" className="mt-1 block h-1.5 bg-thermal-soft">
                <span
                  className="block h-full bg-thermal"
                  style={{ width: `${scale(bucket.count)}%` }}
                />
              </span>
            </th>
            <td className="text-right tabular-nums">{bucket.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
