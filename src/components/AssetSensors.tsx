import type { Sensor } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { humanize } from "../presentation";

export function AssetSensors({ sensors, route }: { sensors: Sensor[]; route: Route }) {
  return (
    <section className="mt-7">
      <h2 className="text-xl font-bold">Sensor evidence</h2>
      <ul className="mt-3 divide-y divide-line">
        {sensors.map((sensor) => (
          <li key={sensor.id} className="py-4">
            <p className="text-xs text-muted">{humanize(sensor.kind)}</p>
            <h3 className="mt-1 text-sm font-semibold">{sensor.name}</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {sensor.metrics.length > 0 && (
                <a
                  className="text-link text-sm"
                  href={routeHref({
                    mode: route.mode,
                    view: "investigation",
                    sensor: sensor.id,
                    event: route.event,
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
                    event: route.event,
                  })}
                >
                  Measurement →
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!sensors.length && <p className="mt-3 text-sm text-muted">No resolved sensors.</p>}
    </section>
  );
}
