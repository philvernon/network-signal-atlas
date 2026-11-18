import type { Asset, Location, Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { eventAssetIds, locationName } from "../presentation";
import { EventList } from "./Events";
import { PageHeading } from "./Shell";
import { AssetSections, LocationCables } from "./AssetSections";
import { AssetSensors } from "./AssetSensors";

type AssetDetailProps = { snapshot: Snapshot; route: Route } & (
  | { asset: Asset; location?: never }
  | { asset?: never; location: Location }
);

export function AssetDetail({ asset, location, snapshot, route }: AssetDetailProps) {
  const entity = asset ?? location;
  const locationIds = asset ? asset.locationIds : [location!.id];
  const sensors = snapshot.sensors.filter((sensor) =>
    asset ? asset.sensorIds.includes(sensor.id) : sensor.locationId === location!.id,
  );
  const measurements = snapshot.measurements.filter((measurement) =>
    asset
      ? asset.sections.some((section) => section.measurementIds.includes(measurement.id))
      : measurement.locationId === location!.id,
  );
  const events = snapshot.events.filter((event) =>
    asset ? eventAssetIds(event).includes(asset.id) : event.locationIds.includes(location!.id),
  );
  return (
    <div className="content pt-8">
      <a className="text-link text-sm" href={routeHref({ mode: route.mode, view: "assets" })}>
        ← Assets & locations
      </a>
      <div className="mt-7">
        <PageHeading
          label={asset ? "Cable asset" : "Network location"}
          title={entity.name}
          description={location?.description ?? `Source identity · ${entity.id}`}
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
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <section>
            <h2 className="section-title mb-5">
              {asset ? "Sections & measurement points" : "Cable assets at this location"}
            </h2>
            {asset ? (
              <AssetSections asset={asset} snapshot={snapshot} route={route} />
            ) : (
              <LocationCables locationId={location!.id} snapshot={snapshot} route={route} />
            )}
            {!measurements.length && (
              <p className="mt-4 text-sm text-muted">
                No associated measurements resolved in the snapshot.
              </p>
            )}
          </section>
          <section className="mt-10">
            <h2 className="section-title mb-5">Related events</h2>
            <EventList events={events} snapshot={snapshot} route={route} compact />
          </section>
        </div>
        <aside>
          <section className="bg-electrical-soft p-5">
            <h2 className="text-xl font-bold text-electrical">Resolved locations</h2>
            <ul className="mt-4 space-y-3">
              {locationIds.map((id) => (
                <li key={id}>
                  <a
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
                </li>
              ))}
            </ul>
          </section>
          <AssetSensors sensors={sensors} route={route} />
        </aside>
      </div>
    </div>
  );
}
