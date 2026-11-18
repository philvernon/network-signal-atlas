import type { Sensor, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { eventFailure, locationName, primaryReading } from "../presentation";
import { EventUnavailable } from "./EventUnavailable";

type SensorContextProps = { sensor: Sensor; snapshot: Snapshot; route: Route };

export function SensorHeading({ sensor, snapshot, route }: SensorContextProps) {
  return (
    <div className="mb-6 border-b border-line pb-5">
      <p className="text-xs break-all text-muted">{sensor.id}</p>
      <h2 className="mt-2 text-2xl font-bold">{sensor.name}</h2>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {sensor.locationId && (
          <a
            className="text-link"
            href={routeHref({
              mode: route.mode,
              view: "assets",
              location: sensor.locationId,
              event: route.event,
            })}
          >
            {locationName(snapshot, sensor.locationId)} →
          </a>
        )}
        {route.event && (
          <a
            className="text-link"
            href={routeHref({ mode: route.mode, view: "events", event: route.event })}
          >
            Originating event →
          </a>
        )}
      </div>
    </div>
  );
}

export function SensorContextCards({ sensor, snapshot, route }: SensorContextProps) {
  const failure = eventFailure(snapshot);
  const events = snapshot.events.filter((event) => event.sensorIds.includes(sensor.id));
  const measurement = snapshot.measurements.find((item) => item.id === sensor.measurementId);
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <section className="bg-canvas p-5">
        <h3 className="font-bold">Current measurement</h3>
        <p className="mt-3 text-2xl font-semibold tabular-nums">
          {measurement ? primaryReading(measurement) : "Unavailable"}
        </p>
        <p className="mt-2 text-xs text-muted">
          Latest snapshot · separate from the pinned historical sample
        </p>
        {measurement && (
          <a
            className="text-link mt-4 inline-block text-sm"
            href={routeHref({
              mode: route.mode,
              view: "measurements",
              measurement: measurement.id,
              event: route.event,
            })}
          >
            All exact measurement fields →
          </a>
        )}
      </section>
      <section className="bg-thermal-soft p-5">
        <h3 className="font-bold text-thermal">Event context</h3>
        {failure !== undefined ? (
          <EventUnavailable message={failure} />
        ) : (
          <>
            <p className="mt-3 text-sm">
              {events.filter((event) => event.outlier).length} authored outliers · {events.length}{" "}
              related events
            </p>
            {events.map((event) => (
              <a
                className="text-link mt-3 block text-sm"
                key={event.id}
                href={routeHref({ mode: route.mode, view: "events", event: event.id })}
              >
                {event.title} →
              </a>
            ))}
            {!events.length && (
              <p className="mt-2 text-xs text-muted">
                No authored events associated in this snapshot.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export function SensorCableAssociations({ sensor, snapshot, route }: SensorContextProps) {
  const assets = snapshot.assets.filter((asset) => asset.sensorIds.includes(sensor.id));
  return (
    <section className="mt-7">
      <h3 className="font-bold">Cable associations</h3>
      {assets.length ? (
        <ul className="mt-3 space-y-3">
          {assets.map((asset) => (
            <li key={asset.id}>
              <a
                className="text-link text-sm"
                href={routeHref({
                  mode: route.mode,
                  view: "assets",
                  asset: asset.id,
                  event: route.event,
                })}
              >
                {asset.name} →
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No resolved cable association.</p>
      )}
    </section>
  );
}
