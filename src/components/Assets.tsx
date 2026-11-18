import { useState } from "react";
import type { Snapshot } from "../data/types";
import type { Route } from "../navigation";
import { AssetDetail } from "./AssetDetail";
import { AssetInventory, type InventoryKind } from "./AssetInventory";

export function AssetsPage({ snapshot, route }: { snapshot: Snapshot; route: Route }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<InventoryKind>(route.location ? "locations" : "cables");
  const asset = snapshot.assets.find((item) => item.id === route.asset);
  const location = snapshot.locations.find((item) => item.id === route.location);
  if (asset) return <AssetDetail asset={asset} snapshot={snapshot} route={route} />;
  if (location) return <AssetDetail location={location} snapshot={snapshot} route={route} />;
  return (
    <AssetInventory
      snapshot={snapshot}
      route={route}
      search={search}
      kind={kind}
      onSearchChange={setSearch}
      onKindChange={setKind}
    />
  );
}
