import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoSnapshot } from "../data/demo";
import type { EvidenceSource, GridEvent, Snapshot } from "../data/types";
import { readRoute, routeHref, type Route } from "../navigation";
import { AssetsPage } from "./Assets";
import { EventList, EventPage } from "./Events";
import { InvestigationPage } from "./Investigation";
import { Overview } from "./Overview";

const failureMessage = "Event service failed: upstream request timed out.";
const emptySnapshot: Snapshot = {
  ...demoSnapshot,
  events: [],
  eventAvailability: { status: "available" },
};
const unavailableSnapshot: Snapshot = {
  ...emptySnapshot,
  eventAvailability: { status: "unavailable", message: failureMessage },
};
const eventRoute: Route = { mode: "demo", view: "events" };
const sensor = demoSnapshot.sensors.find((item) => item.id === "sensor-foundry-temperature")!;
const clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
});

function createSource(event = demoSnapshot.events[0]!): EvidenceSource {
  return {
    loadSnapshot: vi.fn(async () => demoSnapshot),
    loadEvent: vi.fn(async () => event),
    loadTrend: vi.fn<EvidenceSource["loadTrend"]>(async (selected, metric) => ({
      id: `${selected.id}:${metric}`,
      label: selected.name,
      unit: selected.metrics.find((item) => item.key === metric)!.unit,
      samples: [
        { time: Date.parse(demoSnapshot.updatedAt!), value: 0 },
        { time: Date.parse(demoSnapshot.updatedAt!) + 1000, value: 1 },
      ],
    })),
    loadHistogram: vi.fn(async () => [{ label: "Source zero bucket", count: 0 }]),
  };
}

function renderWithQueries(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe("event availability", () => {
  it("distinguishes a successful empty list from an unavailable service, even with loaded items", () => {
    const { rerender } = render(
      <EventList events={[]} snapshot={emptySnapshot} route={eventRoute} />,
    );
    expect(screen.getByRole("heading", { name: "No matching events" })).toBeVisible();
    expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();

    rerender(
      <EventList events={demoSnapshot.events} snapshot={unavailableSnapshot} route={eventRoute} />,
    );
    expect(screen.getByRole("heading", { name: "Event evidence unavailable" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
    expect(screen.queryByRole("heading", { name: "No matching events" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("uses a dash rather than a source count on the failed event page", () => {
    renderWithQueries(
      <EventPage snapshot={unavailableSnapshot} source={createSource()} route={eventRoute} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("— loaded events · count unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
    expect(screen.queryByText(/0 of 0/)).not.toBeInTheDocument();
  });

  it("retains genuine zero counts on a successful empty event page", () => {
    renderWithQueries(
      <EventPage snapshot={emptySnapshot} source={createSource()} route={eventRoute} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("0 of 0 loaded events");
    expect(screen.getByRole("heading", { name: "No matching events" })).toBeVisible();
  });

  it("does not treat an empty failure message as an available event service", () => {
    render(
      <EventList
        events={[]}
        snapshot={{
          ...unavailableSnapshot,
          eventAvailability: { status: "unavailable", message: "" },
        }}
        route={eventRoute}
      />,
    );
    expect(screen.getByRole("heading", { name: "Event evidence unavailable" })).toBeVisible();
    expect(screen.queryByText("No matching events")).not.toBeInTheDocument();
  });

  it("keeps unavailable overview event counts unknown and removes the event sparkline even with retained events", () => {
    renderWithQueries(
      <Overview
        snapshot={{ ...unavailableSnapshot, events: demoSnapshot.events }}
        source={createSource()}
        route={{ mode: "demo", view: "overview" }}
      />,
    );
    expect(screen.getByText(/— unseen · — authored outliers/)).toBeVisible();
    expect(screen.queryByRole("img", { name: /Events per day/ })).not.toBeInTheDocument();
    const activity = screen.getByRole("heading", { name: "Event activity" }).closest("section")!;
    expect(within(activity).getAllByText("—", { exact: true })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "All events →" })).toBeVisible();
    expect(screen.getAllByText(failureMessage)).toHaveLength(2);
    expect(screen.queryByText(/0 unseen|0 authored outliers/)).not.toBeInTheDocument();
  });

  it("plots real zero event activity for a successful empty overview", () => {
    renderWithQueries(
      <Overview
        snapshot={emptySnapshot}
        source={createSource()}
        route={{ mode: "demo", view: "overview" }}
      />,
    );
    expect(screen.getByRole("img", { name: /Events per day/ })).toBeVisible();
    expect(screen.getByText(/0 unseen · 0 authored outliers/)).toBeVisible();
    expect(screen.getByRole("link", { name: "All 0 events →" })).toBeVisible();
    expect(screen.queryByText("Event evidence unavailable")).not.toBeInTheDocument();
  });

  it("shows investigation unavailability without suppressing physical history or measurement evidence", async () => {
    renderWithQueries(
      <InvestigationPage
        snapshot={unavailableSnapshot}
        source={createSource()}
        route={{ mode: "demo", view: "investigation", sensor: sensor.id }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
    expect(
      screen.queryByText(/0 authored outliers|0 related events|No authored events associated/),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("group", { name: /sample inspection/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "All exact measurement fields →" })).toBeVisible();
  });

  it("keeps genuine empty investigation event context separate from unavailability", () => {
    renderWithQueries(
      <InvestigationPage
        snapshot={emptySnapshot}
        source={createSource()}
        route={{ mode: "demo", view: "investigation", sensor: sensor.id }}
      />,
    );
    expect(screen.getByText(/0 authored outliers · 0 related events/)).toBeVisible();
    expect(screen.getByText("No authored events associated in this snapshot.")).toBeVisible();
    expect(screen.queryByText("Event evidence unavailable")).not.toBeInTheDocument();
  });

  it("uses the unavailable EventList state for cable and location related evidence", () => {
    const { rerender } = render(
      <AssetsPage
        snapshot={unavailableSnapshot}
        route={{ mode: "demo", view: "assets", asset: demoSnapshot.assets[0]!.id }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
    rerender(
      <AssetsPage
        snapshot={unavailableSnapshot}
        route={{ mode: "demo", view: "assets", location: demoSnapshot.locations[0]!.id }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
    expect(screen.queryByText("No matching events")).not.toBeInTheDocument();
  });

  it("shows event detail refresh failures plainly alongside loaded list evidence", async () => {
    const source = createSource();
    source.loadEvent = vi.fn().mockRejectedValue(new Error("Detail request failed."));
    renderWithQueries(
      <EventPage
        snapshot={demoSnapshot}
        source={source}
        route={{ ...eventRoute, event: demoSnapshot.events[0]!.id }}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Detail request failed.");
    expect(screen.getByRole("heading", { name: demoSnapshot.events[0]!.title })).toBeVisible();
  });

  it("reports list failure even if an individual event detail is available", async () => {
    const event = demoSnapshot.events[0]!;
    renderWithQueries(
      <EventPage
        snapshot={unavailableSnapshot}
        source={createSource(event)}
        route={{ ...eventRoute, event: event.id }}
      />,
    );
    expect(await screen.findByRole("heading", { name: event.title })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
  });
});

describe("multi-cable event navigation", () => {
  it("shows the explicit unresolved source identity when the resolved association collection is empty", async () => {
    const event: GridEvent = {
      ...demoSnapshot.events[0]!,
      assetId: "source-unresolved-cable",
      associatedAssetIds: [],
      locationIds: [],
      series: [],
    };
    renderWithQueries(
      <EventPage
        snapshot={{ ...demoSnapshot, events: [event] }}
        source={createSource(event)}
        route={{ ...eventRoute, event: event.id }}
      />,
    );
    expect(
      await screen.findByText("Asset association unresolved · source-unresolved-cable"),
    ).toBeVisible();
  });
  it("offers every resolved asset link and finds the same event from each cable", async () => {
    const assets = demoSnapshot.assets.slice(0, 2);
    const event: GridEvent = {
      ...demoSnapshot.events[0]!,
      assetId: null,
      associatedAssetIds: [...assets.map((asset) => asset.id), "unresolved-cable"],
      series: [],
    };
    const snapshot: Snapshot = { ...demoSnapshot, events: [event] };
    const detail = renderWithQueries(
      <EventPage
        snapshot={snapshot}
        source={createSource(event)}
        route={{ ...eventRoute, event: event.id }}
      />,
    );
    expect(screen.getByText("Asset association unresolved · unresolved-cable")).toBeVisible();
    const routes = assets.map((asset) => {
      const link = screen.getByRole("link", { name: `${asset.name} →` });
      const route = readRoute(link.getAttribute("href")!);
      expect(route).toMatchObject({
        mode: "demo",
        view: "assets",
        asset: asset.id,
        event: event.id,
      });
      return route;
    });
    await waitFor(() => expect(screen.getByRole("heading", { name: event.title })).toBeVisible());
    detail.unmount();
    for (const route of routes) {
      const page = render(<AssetsPage snapshot={snapshot} route={route} />);
      const relatedEvent = screen.getByRole("link", { name: event.title });
      const originatingEvent = screen.getByRole("link", { name: "← Return to originating event" });
      for (const link of [relatedEvent, originatingEvent]) {
        expect(readRoute(link.getAttribute("href")!)).toMatchObject({
          ...eventRoute,
          event: event.id,
        });
      }
      page.unmount();
    }
  });

  it("preserves explicit legacy asset identity when the association collection is absent", () => {
    const asset = demoSnapshot.assets[0]!;
    const event: GridEvent = {
      ...demoSnapshot.events[0]!,
      associatedAssetIds: undefined,
      assetId: asset.id,
      series: [],
    };
    const snapshot: Snapshot = { ...demoSnapshot, events: [event] };
    renderWithQueries(
      <EventPage
        snapshot={snapshot}
        source={createSource(event)}
        route={{ ...eventRoute, event: event.id }}
      />,
    );
    expect(screen.getByRole("link", { name: `${asset.name} →` })).toHaveAttribute(
      "href",
      routeHref({ mode: "demo", view: "assets", asset: asset.id, event: event.id }),
    );
  });
});

it("preserves history controls, comparison reset and independent distribution loading after composition", async () => {
  const primary = {
    ...sensor,
    metrics: [
      { key: "first", label: "First", unit: "°C" },
      { key: "second", label: "Second", unit: "°C" },
    ],
  };
  const comparison = { ...primary, id: "comparison-sensor", name: "Compatible comparison" };
  const snapshot = { ...emptySnapshot, sensors: [primary, comparison] };
  const source = createSource();
  renderWithQueries(
    <InvestigationPage
      snapshot={snapshot}
      source={source}
      route={{ mode: "demo", view: "investigation", sensor: primary.id }}
    />,
  );
  await screen.findByRole("group", { name: /sample inspection/ });
  expect(source.loadTrend).toHaveBeenCalledWith(primary, "first", "24h");
  expect(source.loadHistogram).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("combobox", { name: "Compare a compatible sensor" }), {
    target: { value: comparison.id },
  });
  await waitFor(() => expect(source.loadTrend).toHaveBeenCalledWith(comparison, "first", "24h"));
  fireEvent.change(screen.getByRole("combobox", { name: "History metric" }), {
    target: { value: "second" },
  });
  expect(screen.getByRole("combobox", { name: "Compare a compatible sensor" })).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "7 days" }));
  await waitFor(() => expect(source.loadTrend).toHaveBeenCalledWith(primary, "second", "7d"));
  fireEvent.click(screen.getByRole("button", { name: "Load distribution" }));
  const table = await screen.findByRole("table", { name: "Source histogram bucket counts" });
  expect(within(table).getByText("0", { exact: true })).toBeVisible();
  expect(source.loadHistogram).toHaveBeenCalledWith(primary);
  fireEvent.click(screen.getByRole("button", { name: "Hide distribution" }));
  expect(
    screen.queryByRole("table", { name: "Source histogram bucket counts" }),
  ).not.toBeInTheDocument();
});

it("retains inventory selection and search when returning from a detail page", () => {
  const route: Route = { mode: "demo", view: "assets" };
  const { rerender } = render(<AssetsPage snapshot={demoSnapshot} route={route} />);
  const locationsButton = `Locations (${demoSnapshot.locations.length})`;
  fireEvent.click(screen.getByRole("button", { name: locationsButton }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Search inventory" }), {
    target: { value: "Foundry" },
  });
  const location = demoSnapshot.locations.find((item) => item.id === "loc-foundry")!;
  rerender(<AssetsPage snapshot={demoSnapshot} route={{ ...route, location: location.id }} />);
  expect(screen.getByRole("heading", { name: location.name })).toBeVisible();
  rerender(<AssetsPage snapshot={demoSnapshot} route={route} />);
  expect(screen.getByRole("button", { name: locationsButton })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("searchbox", { name: "Search inventory" })).toHaveValue("Foundry");
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
});

it("does not invent event detail from an unavailable list if the individual request also fails", async () => {
  const event = demoSnapshot.events[0]!;
  const source = createSource(event);
  source.loadEvent = vi.fn().mockRejectedValue(new Error("Individual event request failed."));
  renderWithQueries(
    <EventPage
      snapshot={{ ...unavailableSnapshot, events: [event] }}
      source={source}
      route={{ ...eventRoute, event: event.id }}
    />,
  );
  expect(await screen.findByText("Individual event request failed.")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent(failureMessage);
  expect(screen.queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
});

it("shows the exact summary trend error without substituting current measurements for history", async () => {
  const source = createSource();
  source.loadTrend = vi.fn().mockRejectedValue(new Error("Historical buckets request failed."));
  renderWithQueries(
    <Overview
      snapshot={emptySnapshot}
      source={source}
      route={{ mode: "demo", view: "overview" }}
    />,
  );
  expect(
    await screen.findByText(/History unavailable\. Historical buckets request failed\./),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: "Electrical evidence" })).toBeVisible();
});
