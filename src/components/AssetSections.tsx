import type { Asset, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { locationName, primaryReading } from "../presentation";

type SectionProps = { snapshot: Snapshot; route: Route };

export function AssetSections({ asset, snapshot, route }: SectionProps & { asset: Asset }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {asset.sections.map((section, index) => (
        <li key={section.id} className="py-5">
          <div className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-electrical-soft text-sm font-semibold text-electrical">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold">{section.name}</h3>
              <p className="mt-2 text-xs break-all text-muted">{section.id}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {section.locationIds.map((id) => (
                  <a
                    key={id}
                    className="text-link text-sm"
                    href={routeHref({
                      mode: route.mode,
                      view: "assets",
                      location: id,
                      event: route.event,
                    })}
                  >
                    {locationName(snapshot, id)} →
                  </a>
                ))}
              </div>
              <SectionMeasurements ids={section.measurementIds} snapshot={snapshot} route={route} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SectionMeasurements({ ids, snapshot, route }: SectionProps & { ids: string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {ids.map((id) => {
        const measurement = snapshot.measurements.find((item) => item.id === id);
        return (
          <li key={id} className="flex flex-wrap justify-between gap-x-5 gap-y-1 text-sm">
            {measurement ? (
              <>
                <a
                  className="text-link"
                  href={routeHref({
                    mode: route.mode,
                    view: "measurements",
                    measurement: id,
                    event: route.event,
                  })}
                >
                  {measurement.name}
                </a>
                <span className="tabular-nums">{primaryReading(measurement)}</span>
              </>
            ) : (
              <span>Unresolved measurement · {id}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LocationCables({
  locationId,
  snapshot,
  route,
}: SectionProps & { locationId: string }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {snapshot.assets
        .filter((item) => item.locationIds.includes(locationId))
        .map((item) => (
          <li key={item.id} className="py-5">
            <a
              className="text-link"
              href={routeHref({
                mode: route.mode,
                view: "assets",
                asset: item.id,
                event: route.event,
              })}
            >
              {item.name} →
            </a>
            <p className="mt-2 text-sm text-muted">
              {item.sections.length} sections · {item.sensorIds.length} associated sensors
            </p>
          </li>
        ))}
    </ul>
  );
}
