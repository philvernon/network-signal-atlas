import type { ReactNode } from "react";
import type { Snapshot } from "../data/types";
import { routeHref, type Route, type View } from "../navigation";
import { dateTime } from "../presentation";

export function Shell({
  route,
  snapshot,
  refreshing,
  onRefresh,
  children,
}: {
  route: Route;
  snapshot?: Snapshot;
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const navigation: { view: View; label: string }[] = [
    { view: "overview", label: "Overview" },
    { view: "events", label: "Event log" },
    { view: "assets", label: "Assets & locations" },
    { view: "measurements", label: "Measurements" },
    { view: "investigation", label: "Investigation" },
  ];
  return (
    <>
      <a
        href={routeHref(route)}
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main-content");
          main?.focus();
          main?.scrollIntoView?.({ block: "start" });
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-3 focus:z-50 focus:bg-paper focus:p-3"
      >
        Skip to evidence
      </a>
      <header className="border-b border-line bg-paper">
        <div className="content flex min-h-24 flex-wrap items-center justify-between gap-x-8 gap-y-5 py-5">
          <a
            href={routeHref({ view: "overview", mode: route.mode })}
            className="flex items-center gap-3 text-ink no-underline"
            aria-label="Network Signal Atlas overview"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 grid-cols-2 gap-1 border-b-4 border-amber p-0.5"
            >
              <i className="bg-activity" />
              <i className="bg-thermal" />
              <i className="col-span-2 bg-electrical" />
            </span>
            <span className="text-xl font-bold tracking-tight sm:text-2xl">
              Network Signal Atlas
            </span>
          </a>
          <div className="flex flex-wrap items-center gap-4">
            <div
              aria-label="Evidence source"
              className="flex border border-line p-0.5 text-xs font-semibold sm:text-sm"
            >
              <a
                className={`px-3 py-2 ${route.mode === "demo" ? "bg-ink text-paper" : "hover:bg-canvas"}`}
                aria-current={route.mode === "demo" ? "true" : undefined}
                href={routeHref({ view: "overview", mode: "demo" })}
              >
                Demonstration
              </a>
              <a
                className={`px-3 py-2 ${route.mode === "live" ? "bg-ink text-paper" : "hover:bg-canvas"}`}
                aria-current={route.mode === "live" ? "true" : undefined}
                href={routeHref({ view: "overview", mode: "live" })}
              >
                Live connection
              </a>
            </div>
            <button
              className="text-sm font-semibold hover:text-activity"
              disabled={refreshing}
              onClick={onRefresh}
              type="button"
            >
              {refreshing ? "Refreshing…" : "Refresh snapshot ↻"}
            </button>
          </div>
        </div>
      </header>
      <div className="bg-canvas">
        <div className="content flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3 text-xs sm:text-sm">
          <p>
            <span
              className={`mr-2 inline-block h-2 w-2 ${route.mode === "demo" ? "bg-amber" : "bg-activity"}`}
              aria-hidden="true"
            />
            <strong>{route.mode === "demo" ? "Synthetic demonstration" : "Live service"}</strong>
            <span className="mx-2 text-muted">/</span>
            {route.mode === "demo" ? "North Quay network" : "Grid Data network"}
          </p>
          <p className="text-muted">
            Snapshot · {snapshot ? dateTime(snapshot.updatedAt) : "Waiting for evidence"}
          </p>
        </div>
      </div>
      <nav
        aria-label="Evidence sections"
        className="sticky top-0 z-20 border-b border-line bg-paper"
      >
        <div className="content flex overflow-x-auto">
          {navigation.map(({ view, label }) => (
            <a
              key={view}
              href={routeHref({ view, mode: route.mode })}
              aria-current={route.view === view ? "page" : undefined}
              className={`shrink-0 border-b-4 px-4 py-4 text-sm font-semibold first:pl-0 sm:px-6 sm:text-base ${route.view === view ? "border-amber text-ink" : "border-transparent text-muted hover:text-activity"}`}
            >
              {label}
              {view === "events" && snapshot && (
                <span className="ml-2 text-xs text-muted">
                  {snapshot.eventAvailability?.status === "unavailable"
                    ? "—"
                    : snapshot.events.length}
                </span>
              )}
            </a>
          ))}
        </div>
      </nav>
      <main
        id="main-content"
        className="min-h-[65vh] scroll-mt-16 focus-visible:outline-none"
        tabIndex={-1}
      >
        {children}
      </main>
      <footer className="mt-16 border-t border-line bg-canvas py-7">
        <div className="content flex flex-wrap justify-between gap-3 text-xs text-muted">
          <p>
            Network Signal Atlas <span className="mx-2">·</span> Distribution network evidence
          </p>
          <p>
            {route.mode === "demo"
              ? "Deterministic synthetic data · 18 June 2026"
              : "Same-origin Grid Data API · physical units"}
          </p>
        </div>
      </footer>
    </>
  );
}

export function PageHeading({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow mb-2">{label}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {children}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-y border-line py-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}
