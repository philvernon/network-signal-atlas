import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, within } from "storybook/test";
import { demoSnapshot } from "../data/demo";
import { getSource } from "../data/source";
import type { GridEvent, Snapshot } from "../data/types";
import type { Route, View } from "../navigation";
import { Overview } from "./Overview";
import { EventPage } from "./Events";
import { AssetsPage } from "./Assets";
import { MeasurementsPage } from "./Measurements";
import { Distribution, InvestigationPage } from "./Investigation";
import { Shell } from "./Shell";
import "../styles.css";

type EvidenceProps = {
  view: View;
  snapshot?: Snapshot;
  event?: string;
  asset?: string;
  location?: string;
  measurement?: string;
  sensor?: string;
  failHistory?: boolean;
  eventOverride?: GridEvent;
};
function EvidencePreview({
  view,
  snapshot = demoSnapshot,
  event,
  asset,
  location,
  measurement,
  sensor,
  failHistory,
  eventOverride,
}: EvidenceProps) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const baseSource = getSource("demo");
  const source = eventOverride
    ? {
        ...baseSource,
        loadEvent: async (id: string) =>
          id === eventOverride.id ? eventOverride : baseSource.loadEvent(id),
      }
    : failHistory
      ? {
          ...getSource("demo"),
          loadTrend: async () => {
            throw new Error("Sensor history is unavailable from this source.");
          },
        }
      : getSource("demo");
  const route: Route = { view, mode: "demo", event, asset, location, measurement, sensor };
  const props = { snapshot, route, source };
  return (
    <QueryClientProvider client={client}>
      <Shell
        route={route}
        snapshot={snapshot}
        refreshing={false}
        onRefresh={() => {
          void client.invalidateQueries();
        }}
      >
        {view === "overview" && <Overview {...props} />}
        {view === "events" && <EventPage {...props} />}
        {view === "assets" && <AssetsPage {...props} />}
        {view === "measurements" && <MeasurementsPage {...props} />}
        {view === "investigation" && <InvestigationPage {...props} />}
      </Shell>
    </QueryClientProvider>
  );
}
const meta = {
  title: "Apps/network-signal-atlas/Evidence",
  component: EvidencePreview,
  parameters: { layout: "fullscreen" },
  args: { view: "overview" },
  tags: ["autodocs"],
} satisfies Meta<typeof EvidencePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const OverviewScreen: Story = {};
const unavailableEvents: Snapshot = {
  ...demoSnapshot,
  events: [],
  eventAvailability: {
    status: "unavailable",
    message: "Event service could not be reached. Other snapshot evidence remains available.",
  },
};
export const UnavailableEventLog: Story = {
  args: { view: "events", snapshot: unavailableEvents },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Event evidence unavailable" })).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "— loaded events · count unavailable",
    );
    await expect(
      canvas.queryByRole("heading", { name: "No matching events" }),
    ).not.toBeInTheDocument();
  },
};
export const UnavailableOverviewEvents: Story = {
  args: { view: "overview", snapshot: unavailableEvents },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/— unseen · — authored outliers/)).toBeVisible();
    await expect(canvas.queryByRole("img", { name: /Events per day/ })).not.toBeInTheDocument();
  },
};
export const UnavailableCableEvents: Story = {
  args: { view: "assets", asset: "cable-canal-foundry", snapshot: unavailableEvents },
};
export const UnavailableInvestigationEvents: Story = {
  args: {
    view: "investigation",
    sensor: "sensor-foundry-temperature",
    snapshot: unavailableEvents,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Event evidence unavailable" })).toBeVisible();
    await expect(await canvas.findByRole("group", { name: /sample inspection/ })).toBeVisible();
    await expect(
      canvas.queryByText(/0 authored outliers|0 related events/),
    ).not.toBeInTheDocument();
  },
};
export const EmptyEventLog: Story = {
  args: {
    view: "events",
    snapshot: { ...demoSnapshot, events: [], eventAvailability: { status: "available" } },
  },
};
export const EventLog: Story = {
  args: { view: "events" },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search events" }), "Foundry");
    await expect(canvas.getByRole("status")).toHaveTextContent("2 of 8");
    await userEvent.click(canvas.getByRole("button", { name: "Reset filters" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("7 of 8");
  },
};
export const OutlierEvent: Story = { args: { view: "events", event: "event-foundry-temperature" } };
export const CableDetail: Story = {
  args: { view: "assets", asset: "cable-canal-foundry", event: "event-foundry-temperature" },
};
export const LocationDetail: Story = {
  args: { view: "assets", location: "loc-foundry", event: "event-foundry-temperature" },
};
export const Locations: Story = {
  args: { view: "assets" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Locations (5)" }));
    await expect(canvas.getByRole("link", { name: "Foundry Link Box →" })).toBeVisible();
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search inventory" }), "Foundry");
    await expect(canvas.getAllByRole("listitem")).toHaveLength(1);
  },
};
export const MeasurementInventory: Story = {
  args: { view: "measurements" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Strain" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("1 measurements");
    await expect(canvas.getByText("0 m/m", { exact: true })).toBeVisible();
  },
};
export const ExactMeasurement: Story = {
  args: { view: "measurements", measurement: "reading-foundry-temperature" },
};
export const Investigation: Story = {
  args: {
    view: "investigation",
    sensor: "sensor-foundry-temperature",
    event: "event-foundry-temperature",
  },
  play: async ({ canvas }) => {
    const chart = await canvas.findByRole("group", { name: /sample inspection/ });
    await userEvent.click(chart);
    await userEvent.keyboard("{End}{Enter}");
    await expect(canvas.getByRole("button", { name: /Unpin/ })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Load distribution" }));
    await expect(
      await canvas.findByRole("table", { name: "Source histogram bucket counts" }),
    ).toBeVisible();
  },
};
export const MissingHistory: Story = {
  args: { view: "investigation", sensor: "sensor-foundry-temperature", failHistory: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "History unavailable" })).toBeVisible();
  },
};
export const EmptyNetwork: Story = {
  args: {
    snapshot: {
      mode: "demo",
      updatedAt: null,
      locations: [],
      assets: [],
      sensors: [],
      measurements: [],
      events: [],
      notes: ["The source returned an empty snapshot."],
    },
  },
};
export const DistributionEvidence: Story = {
  render: () => (
    <div className="mx-auto max-w-lg p-6">
      <Distribution
        buckets={[
          { label: "40–50 °C", count: 18 },
          { label: "50–60 °C", count: 6 },
          { label: "60–70 °C", count: 0 },
        ]}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(within(table).getByText("18")).toBeVisible();
  },
};

const unresolvedAssetEvent: GridEvent = {
  ...demoSnapshot.events[0]!,
  assetId: "source-unresolved-cable",
  associatedAssetIds: [],
  locationIds: [],
  series: [],
};
export const UnresolvedEventAsset: Story = {
  args: {
    view: "events",
    event: unresolvedAssetEvent.id,
    eventOverride: unresolvedAssetEvent,
    snapshot: { ...demoSnapshot, events: [unresolvedAssetEvent] },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Asset association unresolved · source-unresolved-cable"),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Inspect history →" })).toBeVisible();
  },
};
