import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EvidenceSource, GridEvent, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import {
  dateTime,
  errorText,
  eventAssetIds,
  eventFailure,
  humanize,
  locationName,
} from "../presentation";
import { TrendChart } from "./charts/TrendChart";
import { EmptyState, PageHeading } from "./Shell";
import { EventUnavailable } from "./EventUnavailable";

export function EventList({
  events,
  snapshot,
  route,
  compact = false,
}: {
  events: GridEvent[];
  snapshot: Snapshot;
  route: Route;
  compact?: boolean;
}) {
  const failure = eventFailure(snapshot);
  if (failure !== undefined) return <EventUnavailable message={failure} />;
  if (!events.length)
    return (
      <EmptyState title="No matching events">Change the filters to see more evidence.</EmptyState>
    );
  return (
    <ul className="divide-y divide-line border-y border-line">
      {events.map((event) => (
        <li
          key={event.id}
          className={`grid gap-3 py-5 ${compact ? "sm:grid-cols-[1fr_auto]" : "lg:grid-cols-[160px_1fr_180px]"}`}
        >
          {!compact && <div className="text-sm text-muted">{dateTime(event.timestamp)}</div>}
          <div>
            <a
              className="text-link text-base"
              href={routeHref({ view: "events", mode: route.mode, event: event.id })}
            >
              {event.title}
            </a>
            <p className="mt-2 text-sm text-muted">
              {event.locationIds.map((id) => locationName(snapshot, id)).join(" · ") ||
                "Location unresolved"}
              <span className="mx-2">/</span>
              {humanize(event.type)}
              {event.archived && " · Archived"}
            </p>
            {compact && <p className="mt-1 text-xs text-muted">{dateTime(event.timestamp)}</p>}
          </div>
          <div className="flex items-start gap-3 text-sm sm:justify-end">
            <Severity level={event.severity} />
            {!event.seen && <span className="text-muted">Unseen</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Severity({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${level === "critical" ? "text-thermal" : "text-ink"}`}
    >
      <span aria-hidden="true">{level === "critical" ? "◆" : level === "warning" ? "△" : "○"}</span>
      {humanize(level)}
    </span>
  );
}

export function EventPage({
  snapshot,
  source,
  route,
}: {
  snapshot: Snapshot;
  source: EvidenceSource;
  route: Route;
}) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [unseen, setUnseen] = useState(false);
  const [archived, setArchived] = useState(false);
  const failure = eventFailure(snapshot);
  if (route.event)
    return (
      <EventDetail
        key={`${route.mode}:${route.event}`}
        snapshot={snapshot}
        source={source}
        route={route}
      />
    );
  const events = snapshot.events.filter(
    (event) =>
      (severity === "all" || event.severity === severity) &&
      (category === "all" || event.type === category) &&
      (!unseen || !event.seen) &&
      (archived || !event.archived) &&
      `${event.title} ${event.id} ${event.type} ${event.locationIds.map((id) => locationName(snapshot, id)).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="content pt-10">
      <PageHeading
        label="Event evidence"
        title="Follow the signal"
        description="Find an event, resolve its location and inspect the measurements behind it."
      />
      <form
        className="mb-5 grid gap-4 border-y border-line py-5 md:grid-cols-[2fr_1fr_1fr]"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="text-sm font-semibold">
          Search events
          <input
            className="field mt-2"
            type="search"
            placeholder="Event, location or source ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Severity
          <select
            className="field mt-2"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="all">All severities</option>
            {[...new Set(snapshot.events.map((event) => event.severity))].map((level) => (
              <option key={level} value={level}>
                {humanize(level)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Event type
          <select
            className="field mt-2"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All event types</option>
            {[...new Set(snapshot.events.map((event) => event.type))].map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-5 text-sm md:col-span-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={unseen}
              onChange={(event) => setUnseen(event.target.checked)}
            />
            Unseen only
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={archived}
              onChange={(event) => setArchived(event.target.checked)}
            />
            Include archived
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setSearch("");
              setSeverity("all");
              setCategory("all");
              setUnseen(false);
              setArchived(false);
            }}
          >
            Reset filters
          </button>
        </div>
      </form>
      <p className="mb-3 text-sm text-muted" role="status">
        {failure !== undefined
          ? "— loaded events · count unavailable"
          : `${events.length} of ${snapshot.events.length} loaded events`}
      </p>
      <EventList events={events} snapshot={snapshot} route={route} />
    </div>
  );
}

function EventDetail({
  snapshot,
  source,
  route,
}: {
  snapshot: Snapshot;
  source: EvidenceSource;
  route: Route;
}) {
  const detail = useQuery({
    queryKey: [route.mode, "event", route.event],
    queryFn: () => source.loadEvent(route.event!),
    retry: false,
  });
  const failure = eventFailure(snapshot);
  const event =
    detail.data ??
    (failure === undefined ? snapshot.events.find((item) => item.id === route.event) : undefined);
  if (!event)
    return (
      <div className="content pt-10">
        <a className="text-link" href={routeHref({ mode: route.mode, view: "events" })}>
          ← All events
        </a>
        {failure !== undefined && <EventUnavailable message={failure} />}
        <EmptyState title={detail.isPending ? "Loading event…" : "Event unavailable"}>
          {detail.error ? errorText(detail.error) : "No event matches this source identity."}
        </EmptyState>
      </div>
    );
  const assets = eventAssetIds(event).flatMap((id) => {
    const asset = snapshot.assets.find((item) => item.id === id);
    return asset ? [asset] : [];
  });
  const unresolvedAssetIds = eventAssetIds(event).filter(
    (id) => !assets.some((asset) => asset.id === id),
  );
  const sensors = snapshot.sensors.filter((sensor) => event.sensorIds.includes(sensor.id));
  return (
    <div className="content pt-8">
      <a className="text-link text-sm" href={routeHref({ mode: route.mode, view: "events" })}>
        ← All events
      </a>
      <div className="mt-7">
        <PageHeading
          label={`${humanize(event.type)} · ${event.id}`}
          title={event.title}
          description={event.description}
        >
          <Severity level={event.severity} />
        </PageHeading>
      </div>
      {failure !== undefined && <EventUnavailable message={failure} />}
      {detail.error && (
        <p role="alert" className="mb-5 border-l-4 border-amber bg-amber-soft p-4 text-sm">
          Event detail could not be refreshed. Showing loaded list evidence.{" "}
          {errorText(detail.error)}
        </p>
      )}
      <dl className="mb-8 grid gap-5 border-y border-line py-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Event time</dt>
          <dd className="mt-1 font-semibold">{dateTime(event.timestamp)}</dd>
        </div>
        <div>
          <dt className="text-muted">End time</dt>
          <dd className="mt-1 font-semibold">
            {event.endTime ? dateTime(event.endTime) : "Not supplied"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Source state</dt>
          <dd className="mt-1 font-semibold">
            {event.seen ? "Seen" : "Unseen"} · {event.archived ? "Archived" : "Not archived"}
          </dd>
        </div>
      </dl>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="section-title mb-5">Authored event evidence</h2>
          {event.series.length ? (
            event.series.map((series) => (
              <div key={series.id} className="mb-8 border-b border-line pb-6">
                <TrendChart series={series} events={[event]} />
              </div>
            ))
          ) : (
            <EmptyState title="No plot series supplied">
              Use the associated sensor history to inspect available time-window evidence.
            </EmptyState>
          )}
        </section>
        <aside className="space-y-7">
          <section className="bg-canvas p-6">
            <p className="eyebrow">Continue investigation</p>
            <h2 className="mt-2 text-xl font-bold">Assets & locations</h2>
            {assets.map((asset) => (
              <a
                key={asset.id}
                className="text-link mt-4 block leading-relaxed"
                href={routeHref({
                  mode: route.mode,
                  view: "assets",
                  asset: asset.id,
                  event: event.id,
                })}
              >
                {asset.name} →
              </a>
            ))}
            {!assets.length && !unresolvedAssetIds.length && (
              <p className="mt-4 text-sm text-muted">Asset association unresolved</p>
            )}
            {unresolvedAssetIds.map((id) => (
              <p key={id} className="mt-3 text-sm break-words text-muted">
                Asset association unresolved · {id}
              </p>
            ))}
            {event.locationIds.map((id) => (
              <a
                key={id}
                className="text-link mt-3 block text-sm"
                href={routeHref({
                  mode: route.mode,
                  view: "assets",
                  location: id,
                  event: event.id,
                })}
              >
                {locationName(snapshot, id)} →
              </a>
            ))}
          </section>
          <section>
            <h2 className="text-lg font-bold">Associated sensors</h2>
            <ul className="mt-3 divide-y divide-line">
              {sensors.map((sensor) => (
                <li key={sensor.id} className="py-4">
                  <p className="font-semibold">{sensor.name}</p>
                  <p className="mt-1 text-xs text-muted">{sensor.id}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {sensor.metrics.length > 0 && (
                      <a
                        className="text-link text-sm"
                        href={routeHref({
                          mode: route.mode,
                          view: "investigation",
                          sensor: sensor.id,
                          event: event.id,
                        })}
                      >
                        Inspect history →
                      </a>
                    )}
                    {sensor.measurementId && (
                      <a
                        className="text-link text-sm"
                        href={routeHref({
                          mode: route.mode,
                          view: "measurements",
                          measurement: sensor.measurementId,
                          event: event.id,
                        })}
                      >
                        Current measurement →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {!sensors.length && (
              <p className="mt-3 text-sm text-muted">No resolved sensor in this snapshot.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
