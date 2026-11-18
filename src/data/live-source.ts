import {
  normalizeAllResponse,
  normalizeCableAssets,
  normalizeMaps,
  queryEvent,
  queryEvents,
  querySensorTrend,
  type NormalizedCableState,
  type NormalizedSynthesisState,
  type TrendLatest,
  type TrendScale,
} from "@philvernon/grid-data-kit-core";
import {
  createSynthesisClient,
  type SynthesisClient,
} from "@philvernon/grid-data-kit-core/generated";
import { adaptEvent, adaptSnapshot, adaptTrend } from "./adapters.js";
import { requireMetric } from "./metrics.js";
import type { EvidenceSource, TrendRange } from "./types.js";

const windows: Record<TrendRange, { latest: TrendLatest; scale: TrendScale }> = {
  "24h": { latest: "1d", scale: "1hr" },
  "7d": { latest: "1wk", scale: "1hr" },
  "30d": { latest: "30d", scale: "1hr" },
};

export class UnsupportedHistogramError extends Error {
  constructor() {
    super(
      "Live histogram unavailable: the public API does not establish histogram Value as a count or define Bin interval semantics. No distribution has been fabricated.",
    );
    this.name = "UnsupportedHistogramError";
  }
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/** Client injection is for isolated transport tests; production uses same-origin sessions. */
export function createLiveSource(providedClient?: SynthesisClient): EvidenceSource {
  let client = providedClient;
  let context: { state: NormalizedSynthesisState; cables: NormalizedCableState } | undefined;
  function getClient(): SynthesisClient {
    client ??= createSynthesisClient({ baseUrl: window.location.origin });
    return client;
  }

  const source: EvidenceSource = {
    async loadSnapshot() {
      const api = getClient();
      context = undefined;
      const main = api.getAllInstantaneousData().then(normalizeAllResponse);
      // Attach rejection handlers immediately, even if /all fails first. A slow
      // optional resource must not delay a visible main-snapshot failure.
      const optional = Promise.allSettled([
        api.listMaps().then(normalizeMaps),
        api.listCableAssets().then(normalizeCableAssets),
        queryEvents(api),
      ]);
      let state: NormalizedSynthesisState;
      try {
        state = await main;
      } catch (reason) {
        throw new Error(`Live snapshot failed: ${errorMessage(reason)}`, { cause: reason });
      }
      const [mapsResult, cablesResult, eventsResult] = await optional;
      const notes: string[] = [];
      if (mapsResult.status === "rejected")
        notes.push(
          `Maps unavailable; showing only map evidence returned by /all: ${errorMessage(mapsResult.reason)}`,
        );
      if (cablesResult.status === "rejected")
        notes.push(
          `Cable assets unavailable; showing only cable evidence returned by /all: ${errorMessage(cablesResult.reason)}`,
        );
      if (eventsResult.status === "rejected")
        notes.push(
          `Events unavailable (not an empty event log): ${errorMessage(eventsResult.reason)}`,
        );
      const maps = mapsResult.status === "fulfilled" ? mapsResult.value : state;
      const cables = cablesResult.status === "fulfilled" ? cablesResult.value : state;
      const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
      const snapshot = adaptSnapshot(state, maps, cables, events, notes);
      snapshot.eventAvailability =
        eventsResult.status === "fulfilled"
          ? { status: "available" }
          : {
              status: "unavailable",
              message: `Event source failed: ${errorMessage(eventsResult.reason)}`,
            };
      context = { state, cables };
      return snapshot;
    },
    async loadEvent(id) {
      const event = await queryEvent(getClient(), id);
      if (event.id !== id) throw new Error("Event detail identity does not match the request.");
      if (!context) await source.loadSnapshot();
      if (!context) throw new Error("Live snapshot context is unavailable.");
      return adaptEvent(event, context.state, context.cables);
    },
    async loadTrend(sensor, key, range) {
      const metric = requireMetric(sensor, key);
      const trend = await querySensorTrend(getClient(), {
        sensorId: sensor.id,
        metric: metric.key,
        ...windows[range],
        aggregation: "Mean",
        normalize: false,
      });
      return adaptTrend(trend, sensor, key);
    },
    async loadHistogram() {
      // querySensorHistograms is public, but its bin/value contract cannot be
      // truthfully projected to this app's { label, count } buckets. Do not make
      // an all-sensors request whose response cannot be meaningfully displayed.
      throw new UnsupportedHistogramError();
    },
  };
  return source;
}
