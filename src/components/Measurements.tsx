import { useState } from "react";
import type { Measurement, MeasurementKind, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { dateTime, humanize, locationName, primaryReading, exactValueText } from "../presentation";
import { EmptyState, PageHeading } from "./Shell";

export function MeasurementFields({ measurement }: { measurement: Measurement }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="mb-4 text-left text-sm text-muted">
          Exact snapshot fields · {dateTime(measurement.timestamp)}
        </caption>
        <thead className="border-y border-line bg-canvas">
          <tr>
            <th className="px-4 py-3 font-semibold" scope="col">
              Field
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              Source value
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              Unit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {measurement.fields.map((field) => (
            <tr key={field.name}>
              <th scope="row" className="px-4 py-3 font-normal">
                {humanize(field.name)}
              </th>
              <td className="max-w-lg px-4 py-3 break-words tabular-nums">
                {exactValueText(field.value)}
              </td>
              <td className="px-4 py-3 text-muted">{field.unit || "Unknown"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!measurement.fields.length && (
        <p className="py-6 text-muted">No measurement fields supplied.</p>
      )}
    </div>
  );
}

export function MeasurementsPage({ snapshot, route }: { snapshot: Snapshot; route: Route }) {
  const [kind, setKind] = useState<MeasurementKind | "all">("all");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const measurement = snapshot.measurements.find((item) => item.id === route.measurement);
  if (measurement) {
    const sensors = snapshot.sensors.filter((sensor) => measurement.sensorIds.includes(sensor.id));
    const assets = snapshot.assets.filter((asset) =>
      asset.sections.some((section) => section.measurementIds.includes(measurement.id)),
    );
    return (
      <div className="content pt-8">
        <a
          className="text-link text-sm"
          href={routeHref({ mode: route.mode, view: "measurements" })}
        >
          ← All measurements
        </a>
        <div className="mt-7">
          <PageHeading
            label={`${humanize(measurement.kind)} · Current snapshot`}
            title={measurement.name}
            description={measurement.id}
          />
        </div>
        {route.event && (
          <a
            className="text-link mb-7 inline-block text-sm"
            href={routeHref({ mode: route.mode, view: "events", event: route.event })}
          >
            ← Return to originating event
          </a>
        )}
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <section>
            <h2 className="section-title mb-5">Measurement evidence</h2>
            <MeasurementFields measurement={measurement} />
          </section>
          <aside className="space-y-7">
            <section className="bg-canvas p-5">
              <h2 className="text-lg font-bold">Physical context</h2>
              {measurement.locationId ? (
                <a
                  className="text-link mt-4 block text-sm"
                  href={routeHref({
                    mode: route.mode,
                    view: "assets",
                    location: measurement.locationId,
                    event: route.event,
                  })}
                >
                  {locationName(snapshot, measurement.locationId)} →
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">Location unresolved</p>
              )}
              {assets.map((asset) => (
                <a
                  key={asset.id}
                  className="text-link mt-4 block text-sm"
                  href={routeHref({
                    mode: route.mode,
                    view: "assets",
                    asset: asset.id,
                    event: route.event,
                  })}
                >
                  {asset.name} →
                </a>
              ))}
            </section>
            <section>
              <h2 className="text-lg font-bold">Historical context</h2>
              {sensors.length ? (
                sensors.map((sensor) => (
                  <div key={sensor.id} className="mt-4 border-b border-line pb-4">
                    <h3 className="text-sm font-semibold">{sensor.name}</h3>
                    {sensor.metrics.length ? (
                      <a
                        className="text-link mt-3 inline-block text-sm"
                        href={routeHref({
                          mode: route.mode,
                          view: "investigation",
                          sensor: sensor.id,
                          event: route.event,
                        })}
                      >
                        Inspect sensor history →
                      </a>
                    ) : (
                      <p className="mt-3 text-sm text-muted">
                        Current snapshot only. No supported history metric is available for this
                        measurement family.
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="mt-3 text-sm text-muted">No resolved sensor history.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    );
  }
  const measurements = snapshot.measurements.filter(
    (item) =>
      (kind === "all" || item.kind === kind) &&
      (location === "all" || item.locationId === location) &&
      `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const kinds = [...new Set(snapshot.measurements.map((item) => item.kind))];
  return (
    <div className="content pt-10">
      <PageHeading
        label="Current source values"
        title="Measurement inventory"
        description="Inspect the latest source fields, their units and timestamps. Open a sensor history for time-window evidence."
      />
      {route.measurement && (
        <p role="alert" className="mb-5 bg-amber-soft p-4 text-sm">
          The linked measurement is unavailable in this snapshot.
        </p>
      )}
      <div className="mb-7 flex flex-wrap gap-2" aria-label="Measurement family">
        {(["all", ...kinds] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            className={kind === value ? "action-primary" : "action"}
            onClick={() => setKind(value)}
          >
            {humanize(value)}
            {value === "all" ? ` (${snapshot.measurements.length})` : ""}
          </button>
        ))}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="text-sm font-semibold">
          Search measurements
          <input
            type="search"
            className="field mt-2"
            placeholder="Measurement name or source ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Location
          <select
            className="field mt-2"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="all">All locations</option>
            {snapshot.locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-3 text-sm text-muted" role="status">
        {measurements.length} measurements
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {measurements.map((item) => (
          <li
            key={item.id}
            className="grid items-start gap-x-6 gap-y-2 py-5 sm:grid-cols-[1fr_180px_130px]"
          >
            <div>
              <a
                className="text-link"
                href={routeHref({ mode: route.mode, view: "measurements", measurement: item.id })}
              >
                {item.name} →
              </a>
              <p className="mt-2 text-xs text-muted">
                {humanize(item.kind)} · {dateTime(item.timestamp)}
              </p>
            </div>
            <p className="text-sm text-muted">{locationName(snapshot, item.locationId)}</p>
            <p className="text-sm font-semibold tabular-nums sm:text-right">
              {primaryReading(item)}
            </p>
          </li>
        ))}
      </ul>
      {!measurements.length && (
        <EmptyState title="No matching measurements">
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setSearch("");
              setLocation("all");
              setKind("all");
            }}
          >
            Reset measurement filters
          </button>
        </EmptyState>
      )}
    </div>
  );
}
