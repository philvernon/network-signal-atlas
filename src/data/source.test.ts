import {
  createSynthesisClient,
  type ApiTemperatureTrendBucket,
  type ModelSynthesisOutlierEvent,
} from "@philvernon/grid-data-kit-core/generated";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLiveSource, UnsupportedHistogramError } from "./live-source";
import { metricsForKind } from "./metrics";
import { getSource } from "./source";
import type { Sensor, TrendRange } from "./types";

const sensorId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const selected: Sensor = {
  id: sensorId,
  name: "Test temperature",
  kind: "temperature",
  locationId: null,
  measurementId: null,
  metrics: metricsForKind("temperature"),
};
const event: ModelSynthesisOutlierEvent = {
  event_uuid: eventId,
  event_desc: "Detail evidence",
  event_start_time: "2026-06-18T09:30:00Z",
  event_end_time: "2026-06-18T10:30:00Z",
  event_type: 1,
  is_archived: false,
  is_seen: false,
  sensor_ids: [sensorId],
  event: {
    description: "Detail evidence",
    start_time: 1,
    end_time: 2,
    event_type: 1,
    event_level: 2,
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Route = () => Response;
function transport(overrides: Record<string, Route> = {}) {
  const routes: Record<string, Route> = {
    "/all": () => json({ Devices: [] }),
    "/maps": () => json([]),
    "/cableassets": () => json([]),
    "/events": () => json([]),
    [`/event/${eventId}`]: () => json(event),
    ...overrides,
  };
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    const path = url.pathname.replace(/^\/api\/v2/, "");
    const route = routes[path];
    if (!route) throw new Error(`Unexpected test request: ${url.pathname}`);
    return route();
  });
  const client = createSynthesisClient({ baseUrl: "https://atlas.test", fetch: fetcher });
  return { fetcher, source: createLiveSource(client) };
}

afterEach(() => vi.unstubAllGlobals());

describe("evidence source boundary", () => {
  it("selects demo without any network access or clock dependency", async () => {
    const forbidden = vi.fn<typeof fetch>(() => {
      throw new Error("Unexpected network access");
    });
    vi.stubGlobal("fetch", forbidden);
    const snapshot = await getSource("demo").loadSnapshot();
    await getSource("demo").loadEvent(snapshot.events[0]!.id);
    const selected = snapshot.sensors[0]!;
    await getSource("demo").loadTrend(selected, "Temperature", "24h");
    await getSource("demo").loadHistogram(selected);
    expect(forbidden).not.toHaveBeenCalled();
    expect(snapshot.updatedAt).toBe("2026-06-18T10:30:00.000Z");
  });

  it("constructs the production client lazily at window.location.origin with session credentials", async () => {
    const { fetcher } = transport();
    vi.stubGlobal("fetch", fetcher);
    const source = createLiveSource();
    expect(fetcher).not.toHaveBeenCalled();
    const result = await source.loadSnapshot();
    expect(result.mode).toBe("live");
    expect(result.updatedAt).toBeNull();
    expect(result.eventAvailability).toEqual({ status: "available" });
    expect(fetcher).toHaveBeenCalledTimes(4);
    for (const [input, options] of fetcher.mock.calls) {
      expect(new URL(String(input)).origin).toBe(window.location.origin);
      expect(options?.credentials).toBe("include");
    }
  });

  it("exposes main snapshot transport failure and never switches to demo", async () => {
    const { source } = transport({ "/all": () => json({ message: "offline" }, 503) });
    await expect(source.loadSnapshot()).rejects.toThrow("Live snapshot failed");
  });

  it("fails main evidence promptly even while optional resources are pending", async () => {
    const release: ((response: Response) => void)[] = [];
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).endsWith("/all")) return json({}, 503);
      return new Promise<Response>((resolve) => release.push(resolve));
    });
    const source = createLiveSource(
      createSynthesisClient({ baseUrl: "https://atlas.test", fetch: fetcher }),
    );
    await expect(source.loadSnapshot()).rejects.toThrow("Live snapshot failed");
    expect(release).toHaveLength(3);
    for (const resolve of release) resolve(json([]));
  });

  it("exposes main snapshot normalization failure", async () => {
    const { source } = transport({ "/all": () => json({ Devices: [{ ID: "malformed" }] }) });
    await expect(source.loadSnapshot()).rejects.toThrow("Live snapshot failed");
  });

  it("notes independently failed optional resources while preserving an explicitly live snapshot", async () => {
    const { source } = transport({
      "/maps": () => json({}, 503),
      "/cableassets": () => json({}, 403),
      "/events": () => json({}, 502),
    });
    const snapshot = await source.loadSnapshot();
    expect(snapshot.mode).toBe("live");
    expect(snapshot.sensors).toEqual([]);
    expect(snapshot.assets).toEqual([]);
    expect(snapshot.events).toEqual([]);
    expect(snapshot.eventAvailability).toMatchObject({ status: "unavailable" });
    expect(snapshot.notes.some((note) => note.startsWith("Maps unavailable"))).toBe(true);
    expect(snapshot.notes.some((note) => note.startsWith("Cable assets unavailable"))).toBe(true);
    expect(
      snapshot.notes.some((note) => note.startsWith("Events unavailable (not an empty event log)")),
    ).toBe(true);
  });

  it("isolates malformed optional responses from valid main evidence", async () => {
    const { source } = transport({ "/maps": () => json([{}]), "/events": () => json([{}]) });
    const snapshot = await source.loadSnapshot();
    expect(snapshot.mode).toBe("live");
    expect(snapshot.notes.some((note) => note.startsWith("Maps unavailable"))).toBe(true);
    expect(snapshot.notes.some((note) => note.startsWith("Events unavailable"))).toBe(true);
    expect(snapshot.notes.some((note) => note.startsWith("Cable assets unavailable"))).toBe(false);
  });

  it("loads event detail via the SDK ID query even when the optional list fails", async () => {
    const { source, fetcher } = transport({ "/events": () => json({}, 503) });
    await source.loadSnapshot();
    const result = await source.loadEvent(eventId);
    expect(result.id).toBe(eventId);
    expect(result.outlier).toBe(true);
    expect(result.title).toBe("Detail evidence");
    expect(fetcher.mock.calls.some(([input]) => String(input).includes(`/event/${eventId}`))).toBe(
      true,
    );
  });

  it("rejects detail payloads for another event identity", async () => {
    const { source } = transport({
      [`/event/${eventId}`]: () => json({ ...event, event_uuid: "other-event" }),
    });
    await expect(source.loadEvent(eventId)).rejects.toThrow("identity does not match");
  });

  it("does not hide event detail errors behind list data", async () => {
    const { source } = transport({ [`/event/${eventId}`]: () => json({}, 404) });
    await expect(source.loadEvent(eventId)).rejects.toThrow();
  });

  it.each<TrendRange>(["24h", "7d", "30d"])(
    "queries %s in physical units using exact public window parameters",
    async (range) => {
      const bucket: ApiTemperatureTrendBucket = {
        Timestamp: "2026-06-18T09:30:00Z",
        SensorID: sensorId,
        Temperature: 0,
      };
      const { source, fetcher } = transport({
        [`/sensor/${sensorId}/trend`]: () =>
          json({ SensorID: sensorId, LocationID: "location-1", Buckets: [bucket] }),
      });
      const series = await source.loadTrend(selected, "Temperature", range);
      expect(series.unit).toBe("°C");
      expect(series.samples).toEqual([{ time: Date.parse(bucket.Timestamp), value: 0 }]);
      const request = new URL(String(fetcher.mock.calls[0]![0]));
      expect(request.searchParams.get("latest")).toBe(
        { "24h": "1d", "7d": "1wk", "30d": "30d" }[range],
      );
      expect(request.searchParams.get("scale")).toBe("1hr");
      expect(request.searchParams.get("metric")).toBe("Temperature");
      expect(request.searchParams.get("aggregation")).toBe("Mean");
      expect(request.searchParams.get("normalise")).toBe("false");
    },
  );

  it("rejects unsupported metric/family pairs without making a request", async () => {
    const { source, fetcher } = transport();
    await expect(source.loadTrend(selected, "AMag", "24h")).rejects.toThrow("Unsupported");
    await expect(
      source.loadTrend({ ...selected, kind: "strain" }, "Temperature", "24h"),
    ).rejects.toThrow("Unsupported");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("distinguishes missing and empty history rather than substituting fabricated values", async () => {
    let empty = false;
    const { source } = transport({
      [`/sensor/${sensorId}/trend`]: () =>
        json({ SensorID: sensorId, LocationID: "location-1", ...(empty ? { Buckets: [] } : {}) }),
    });
    await expect(source.loadTrend(selected, "Temperature", "24h")).rejects.toThrow(
      "missing from the response",
    );
    empty = true;
    expect((await source.loadTrend(selected, "Temperature", "24h")).samples).toEqual([]);
  });

  it("returns an explicit unsupported histogram error, not guessed count buckets or demo data", async () => {
    const { source, fetcher } = transport();
    await expect(source.loadHistogram(selected)).rejects.toBeInstanceOf(UnsupportedHistogramError);
    await expect(source.loadHistogram(selected)).rejects.toThrow(
      "does not establish histogram Value as a count",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
