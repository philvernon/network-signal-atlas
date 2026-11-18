import type { Snapshot } from "../data/types";
import { routeHref, type Route } from "../navigation";
import { locationName } from "../presentation";
import { EmptyState, PageHeading } from "./Shell";

export type InventoryKind = "cables" | "locations";

type AssetInventoryProps = {
  snapshot: Snapshot;
  route: Route;
  search: string;
  kind: InventoryKind;
  onSearchChange: (search: string) => void;
  onKindChange: (kind: InventoryKind) => void;
};

export function AssetInventory({
  snapshot,
  route,
  search,
  kind,
  onSearchChange,
  onKindChange,
}: AssetInventoryProps) {
  const query = search.toLowerCase();
  const assets = snapshot.assets.filter((item) =>
    `${item.name} ${item.id} ${item.locationIds.map((id) => locationName(snapshot, id)).join(" ")}`
      .toLowerCase()
      .includes(query),
  );
  const locations = snapshot.locations.filter((item) =>
    `${item.name} ${item.id} ${item.description}`.toLowerCase().includes(query),
  );
  return (
    <div className="content pt-10">
      <PageHeading
        label="Network context"
        title="Assets & locations"
        description="Resolve the physical context of a signal, then continue into its sensor evidence."
      />
      {(route.asset || route.location) && (
        <p role="alert" className="mb-5 border-l-4 border-amber bg-amber-soft p-4 text-sm">
          The linked asset or location is not available in this snapshot.
        </p>
      )}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="flex gap-2" aria-label="Inventory type">
          {(["cables", "locations"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              className={kind === value ? "action-primary" : "action"}
              onClick={() => onKindChange(value)}
            >
              {value === "cables"
                ? `Cable assets (${snapshot.assets.length})`
                : `Locations (${snapshot.locations.length})`}
            </button>
          ))}
        </div>
        <label className="w-full text-sm font-semibold sm:w-80">
          Search inventory
          <input
            type="search"
            className="field mt-2"
            placeholder="Name, location or source ID"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {kind === "cables"
          ? assets.map((item) => (
              <li key={item.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto]">
                <div>
                  <a
                    className="text-link text-lg"
                    href={routeHref({ mode: route.mode, view: "assets", asset: item.id })}
                  >
                    {item.name} →
                  </a>
                  <p className="mt-2 text-sm text-muted">
                    {item.locationIds.map((id) => locationName(snapshot, id)).join(" — ")}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  {item.sections.length} sections <span className="mx-2">·</span>{" "}
                  {item.sensorIds.length} sensors
                </p>
              </li>
            ))
          : locations.map((item) => (
              <li key={item.id} className="py-6">
                <a
                  className="text-link text-lg"
                  href={routeHref({ mode: route.mode, view: "assets", location: item.id })}
                >
                  {item.name} →
                </a>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
                <p className="mt-3 text-sm">
                  {
                    snapshot.assets.filter((assetItem) => assetItem.locationIds.includes(item.id))
                      .length
                  }{" "}
                  cables ·{" "}
                  {snapshot.sensors.filter((sensor) => sensor.locationId === item.id).length}{" "}
                  sensors
                </p>
              </li>
            ))}
      </ul>
      {(kind === "cables" ? assets.length : locations.length) === 0 && (
        <EmptyState title="No matching inventory">
          Try a different source ID or location name.
        </EmptyState>
      )}
    </div>
  );
}
