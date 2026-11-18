import { useQueries } from "@tanstack/react-query";
import type { EvidenceSource, Sample, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { dateTime, errorText, eventFailure, humanize, primaryReading } from "../presentation";
import { Sparkline } from "./charts/Sparkline";
import { EventList } from "./Events";
import { EventUnavailable } from "./EventUnavailable";

export function Overview({
  snapshot,
  source,
  route,
}: {
  snapshot: Snapshot;
  source: EvidenceSource;
  route: Route;
}) {
  const failure = eventFailure(snapshot);
  const eventsAvailable = failure === undefined;
  const sensors = [
    snapshot.sensors.find(
      (sensor) =>
        sensor.kind === "temperature" &&
        sensor.metrics.length &&
        eventsAvailable &&
        snapshot.events
          .find((event) => event.outlier && !event.archived)
          ?.sensorIds.includes(sensor.id),
    ),
    snapshot.sensors.find((sensor) => sensor.kind === "current" && sensor.metrics.length),
  ];
  const trends = useQueries({
    queries: sensors.map((sensor) => ({
      queryKey: [route.mode, "summary", sensor?.id],
      queryFn: () => source.loadTrend(sensor!, sensor!.metrics[0]!.key, "24h"),
      enabled: !!sensor,
      retry: false,
    })),
  });
  const end = snapshot.updatedAt ? Date.parse(snapshot.updatedAt) : NaN;
  const eventSamples: Sample[] =
    eventsAvailable && Number.isFinite(end)
      ? Array.from({ length: 7 }, (_, index) => {
          const time = end - (6 - index) * 86_400_000;
          return {
            time,
            value: snapshot.events.filter(
              (event) =>
                event.timestamp &&
                Date.parse(event.timestamp) > time - 86_400_000 &&
                Date.parse(event.timestamp) <= time,
            ).length,
          };
        })
      : [];
  const unseen = eventsAvailable
    ? snapshot.events.filter((event) => !event.seen && !event.archived).length
    : "—";
  const outlierCount = eventsAvailable
    ? snapshot.events.filter((event) => event.outlier).length
    : "—";
  const temperatures = snapshot.measurements.filter(
    (measurement) => measurement.kind === "temperature",
  );
  const electrical = snapshot.measurements.filter(
    (measurement) => measurement.kind === "current" || measurement.kind === "voltage",
  );
  const latest = [...snapshot.events]
    .sort((a, b) => Date.parse(b.timestamp ?? "") - Date.parse(a.timestamp ?? ""))
    .slice(0, 4);
  const groups = [
    {
      title: "Event activity",
      subtitle: "Authored changes across the network",
      color: "text-activity",
      surface: "bg-activity-soft",
      value: eventsAvailable ? snapshot.events.length : "—",
      unit: "loaded events",
      link: "events" as const,
    },
    {
      title: "Thermal evidence",
      subtitle: "Joint and termination temperatures",
      color: "text-thermal",
      surface: "bg-thermal-soft",
      value: temperatures.length,
      unit: "temperature measurements",
      link: "measurements" as const,
    },
    {
      title: "Electrical evidence",
      subtitle: "Current, voltage and sheath readings",
      color: "text-electrical",
      surface: "bg-electrical-soft",
      value: electrical.length,
      unit: "electrical measurements",
      link: "measurements" as const,
    },
  ];
  return (
    <>
      <section className="bg-canvas pt-10 sm:pt-12">
        <div className="content">
          <p className="eyebrow mb-3">Distribution network monitoring</p>
          <h1 className="max-w-4xl text-[2.1rem] leading-[1.15] font-bold tracking-tight sm:text-[2.8rem]">
            Latest network evidence:
            <br />
            {route.mode === "demo" ? "North Quay distribution network" : "Grid monitoring overview"}
          </h1>
          <p className="mt-5 text-base text-muted">
            {snapshot.locations.length} locations <span className="mx-2">·</span>{" "}
            {snapshot.assets.length} cable assets <span className="mx-2">·</span>{" "}
            {snapshot.sensors.length} sensors
          </p>
          <div className="grid gap-9 pt-12 pb-10 sm:grid-cols-3 sm:gap-8 lg:gap-12">
            <div>
              {failure !== undefined ? (
                <EventUnavailable message={failure} />
              ) : (
                <Sparkline
                  samples={eventSamples}
                  color="var(--color-activity)"
                  label="Events per day"
                  unit="events"
                />
              )}
              <p className="mt-4 text-lg font-bold text-activity">Network event activity</p>
              <p className="mt-1 text-sm">
                <span className="mr-1 bg-amber-soft px-1.5" aria-hidden="true">
                  ↗
                </span>
                {unseen} unseen · {outlierCount} authored outliers
              </p>
              <a
                className="text-link mt-3 inline-block text-sm"
                href={routeHref({ mode: route.mode, view: "events" })}
              >
                Review events →
              </a>
            </div>
            {sensors.map((sensor, index) => (
              <div key={sensor?.id ?? index}>
                <Sparkline
                  samples={trends[index]?.data?.samples ?? []}
                  color={index === 0 ? "var(--color-thermal)" : "var(--color-electrical)"}
                  label={index === 0 ? "Joint temperature" : "Feeder current"}
                  unit={sensor?.metrics[0]?.unit ?? ""}
                />
                <p
                  className={`mt-4 text-lg font-bold ${index === 0 ? "text-thermal" : "text-electrical"}`}
                >
                  {index === 0 ? "Temperature at the joint" : "Electrical loading"}
                </p>
                <p className="mt-1 truncate text-sm">
                  {sensor?.name ??
                    (index === 0 && !eventsAvailable
                      ? "Event-linked sensor unavailable"
                      : "No supported sensor")}
                </p>
                {sensor && (
                  <a
                    className="text-link mt-3 inline-block text-sm"
                    href={routeHref({ mode: route.mode, view: "investigation", sensor: sensor.id })}
                  >
                    Inspect 24-hour history →
                  </a>
                )}
                {trends[index]?.isError && (
                  <p className="mt-2 text-xs text-muted">
                    History unavailable. {errorText(trends[index]?.error)} Current evidence below.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="content pt-10">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="section-title">Evidence across the network</h2>
          <a href={routeHref({ mode: route.mode, view: "assets" })} className="text-link text-sm">
            Explore assets & locations →
          </a>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {groups.map((group, index) => (
            <section key={group.title} className={`${group.surface} flex flex-col p-5 sm:p-6`}>
              <h3 className={`text-xl font-bold ${group.color}`}>{group.title}</h3>
              <p className={`mt-2 min-h-12 text-sm leading-relaxed ${group.color}`}>
                {group.subtitle}
              </p>
              <div className="mt-5 flex-1 bg-paper p-5">
                <p className={group.color}>
                  <strong className="text-3xl font-bold tabular-nums">{group.value}</strong>
                  <span className="ml-2 text-sm">{group.unit}</span>
                </p>
                {index === 0 ? (
                  <ul className="mt-5 space-y-3 text-sm">
                    <li className="flex justify-between">
                      <span>Unseen, not archived</span>
                      <strong>{unseen}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Authored outlier events</span>
                      <strong>{outlierCount}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Locations represented</span>
                      <strong>{snapshot.locations.length}</strong>
                    </li>
                  </ul>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {(index === 1 ? temperatures : electrical).slice(0, 3).map((measurement) => (
                      <li key={measurement.id} className="py-2 text-sm">
                        <a
                          href={routeHref({
                            mode: route.mode,
                            view: "measurements",
                            measurement: measurement.id,
                          })}
                          className="block hover:text-activity"
                        >
                          <span className="block text-xs text-muted">
                            {measurement.name.split(" · ")[0]}
                          </span>
                          <span className="mt-1 block font-semibold">
                            {primaryReading(measurement)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <a
                  className="text-link mt-5 inline-block text-sm"
                  href={routeHref({ mode: route.mode, view: group.link })}
                >
                  Explore {group.title.toLowerCase()} →
                </a>
              </div>
            </section>
          ))}
        </div>
        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">Start an investigation</p>
              <h2 className="section-title">Recent event evidence</h2>
            </div>
            <a className="text-link text-sm" href={routeHref({ mode: route.mode, view: "events" })}>
              {eventsAvailable ? `All ${snapshot.events.length} events →` : "All events →"}
            </a>
          </div>
          <EventList events={latest} snapshot={snapshot} route={route} compact />
        </section>
        <details className="mt-10 border-y border-line py-5 text-sm">
          <summary className="font-semibold">Source coverage & interpretation</summary>
          <div className="mt-4 max-w-3xl space-y-3 leading-relaxed text-muted">
            <p>
              Snapshot: {dateTime(snapshot.updatedAt)}. Overview event counts describe only the
              loaded event window. Trend summaries show physical sensor values, not network-wide
              operating limits.
            </p>
            <p>
              Current measurements and historical buckets are separate evidence. Gaps remain
              missing; a zero remains a zero. Only source-authored events are classified as
              outliers.
            </p>
            {snapshot.notes.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
            <p>
              Measurement families:{" "}
              {[
                ...new Set(snapshot.measurements.map((measurement) => humanize(measurement.kind))),
              ].join(", ")}
              .
            </p>
          </div>
        </details>
      </div>
    </>
  );
}
