import { useMemo, useSyncExternalStore } from "react";
import type { SourceMode } from "./data/types";

export type View = "overview" | "events" | "assets" | "measurements" | "investigation";
export interface Route {
  view: View;
  mode: SourceMode;
  event?: string;
  asset?: string;
  location?: string;
  sensor?: string;
  measurement?: string;
}
const views: View[] = ["overview", "events", "assets", "measurements", "investigation"];
export function readRoute(hash: string): Route {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const view = params.get("view") as View | null;
  return {
    view: view && views.includes(view) ? view : "overview",
    mode: params.get("mode") === "live" ? "live" : "demo",
    event: params.get("event") ?? undefined,
    asset: params.get("asset") ?? undefined,
    location: params.get("location") ?? undefined,
    sensor: params.get("sensor") ?? undefined,
    measurement: params.get("measurement") ?? undefined,
  };
}
export function routeHref(route: Route): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(route)) if (value) params.set(key, value);
  return `#${params.toString()}`;
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  return useMemo(() => readRoute(hash), [hash]);
}
