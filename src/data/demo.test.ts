import { describe, expect, it } from "vitest";
import { DEMO_EPOCH, DEMO_TIMESTAMP, demoSnapshot } from "./demo";
import { getSource } from "./source";
import type { TrendRange } from "./types";

const source = getSource("demo");

function sensor(id: string) {
  const result = demoSnapshot.sensors.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Missing fixture sensor ${id}`);
  return result;
}

describe("connected deterministic demonstration", () => {
  it("provides a substantial dated network with exact entity references", async () => {
    const snapshot = await source.loadSnapshot();
    expect(snapshot.mode).toBe("demo");
    expect(snapshot.updatedAt).toBe(DEMO_TIMESTAMP);
    expect(snapshot.locations).toHaveLength(5);
    expect(snapshot.assets).toHaveLength(4);
    expect(snapshot.sensors.length).toBeGreaterThanOrEqual(12);
    expect(snapshot.events).toHaveLength(8);
    expect(new Set(snapshot.sensors.map((item) => item.kind))).toEqual(
      new Set(["temperature", "current", "voltage", "strain", "wavelength", "dts"]),
    );
    const locationIds = new Set(snapshot.locations.map((item) => item.id));
    const measurementIds = new Set(snapshot.measurements.map((item) => item.id));
    const sensorIds = new Set(snapshot.sensors.map((item) => item.id));
    for (const item of snapshot.sensors) {
      expect(locationIds.has(item.locationId!)).toBe(true);
      expect(measurementIds.has(item.measurementId!)).toBe(true);
      expect(
        snapshot.measurements.find((reading) => reading.id === item.measurementId)?.sensorIds,
      ).toContain(item.id);
      expect(snapshot.assets.some((asset) => asset.sensorIds.includes(item.id))).toBe(true);
    }
    for (const asset of snapshot.assets) {
      expect(asset.sections.length).toBeGreaterThanOrEqual(2);
      for (const id of asset.sensorIds) expect(sensorIds.has(id)).toBe(true);
      for (const id of asset.locationIds) expect(locationIds.has(id)).toBe(true);
      for (const section of asset.sections) {
        for (const id of section.locationIds) expect(locationIds.has(id)).toBe(true);
        for (const id of section.measurementIds) expect(measurementIds.has(id)).toBe(true);
      }
    }
    for (const event of snapshot.events) {
      const asset = snapshot.assets.find((candidate) => candidate.id === event.assetId);
      expect(asset).toBeDefined();
      for (const id of event.sensorIds) {
        expect(sensorIds.has(id)).toBe(true);
        expect(asset?.sensorIds).toContain(id);
      }
      for (const id of event.locationIds) expect(asset?.locationIds).toContain(id);
    }
  });

  it("walks an authored outlier through cable, location, history and exact current measurement", async () => {
    const snapshot = await source.loadSnapshot();
    const event = await source.loadEvent("event-foundry-temperature");
    expect(event.outlier).toBe(true);
    const asset = snapshot.assets.find((candidate) => candidate.id === event.assetId)!;
    const selected = snapshot.sensors.find((candidate) => candidate.id === event.sensorIds[0])!;
    expect(asset.sensorIds).toContain(selected.id);
    expect(event.locationIds).toContain(selected.locationId);
    expect(snapshot.locations.find((candidate) => candidate.id === selected.locationId)?.name).toBe(
      "Foundry Link Box",
    );
    const trend = await source.loadTrend(selected, "Temperature", "24h");
    expect(trend.unit).toBe("°C");
    expect(
      trend.samples.find((sample) => sample.time === Date.parse(event.timestamp!))?.value,
    ).toBe(74.2);
    expect(trend.samples.at(-1)).toEqual({ time: DEMO_EPOCH, value: 66.8 });
    const reading = snapshot.measurements.find(
      (candidate) => candidate.id === selected.measurementId,
    )!;
    expect(reading.fields.find((field) => field.name === "average")).toEqual({
      name: "average",
      value: 66.8,
      unit: "°C",
    });
    expect(event.series[0]?.unit).toBe("°C");
  });

  it.each<TrendRange>(["24h", "7d", "30d"])(
    "keeps %s hourly history deterministic, dated and explicitly gapped",
    async (range) => {
      const selected = sensor("sensor-nq-temperature");
      const first = await source.loadTrend(selected, "Temperature", range);
      const second = await source.loadTrend(selected, "Temperature", range);
      expect(second).toEqual(first);
      const hours = { "24h": 24, "7d": 168, "30d": 720 }[range];
      expect(first.samples).toHaveLength(hours + 1);
      expect(first.samples[0]?.time).toBe(DEMO_EPOCH - hours * 3_600_000);
      expect(first.samples.at(-1)?.time).toBe(DEMO_EPOCH);
      expect(first.samples.some((sample) => sample.value === null)).toBe(true);
      expect(first.samples.some((sample) => sample.value !== null)).toBe(true);
    },
  );

  it("aligns all events with the history clock and supported authored event samples", async () => {
    const reference = await source.loadTrend(sensor("sensor-nq-temperature"), "Temperature", "30d");
    for (const event of demoSnapshot.events) {
      expect(reference.samples.some((sample) => sample.time === Date.parse(event.timestamp!))).toBe(
        true,
      );
      const selected = sensor(event.sensorIds[0]!);
      if (!selected.metrics.length) continue;
      const metric = selected.kind === "temperature" ? "Temperature" : "AMag";
      const series = await source.loadTrend(selected, metric, "30d");
      expect(
        series.samples.find((sample) => sample.time === Date.parse(event.timestamp!))?.value,
      ).not.toBeNull();
      for (const authored of event.series.flatMap((item) => item.samples)) {
        expect(series.samples.find((sample) => sample.time === authored.time)?.value).toBe(
          authored.value,
        );
      }
    }
  });

  it("retains unknown event units and non-outlier events without anomaly detection", () => {
    expect(
      demoSnapshot.events.find((event) => event.id === "event-foundry-sheath")?.series[0]?.unit,
    ).toBe("unknown");
    expect(demoSnapshot.events.some((event) => !event.outlier)).toBe(true);
    expect(demoSnapshot.events.some((event) => event.seen && event.archived)).toBe(true);
  });

  it("preserves zeros, missingness and current-only families", async () => {
    const zero = await source.loadTrend(sensor("sensor-east-voltage"), "AMag", "24h");
    expect(zero.unit).toBe("V");
    expect(zero.samples.at(-1)?.value).toBe(0);
    expect(zero.samples.some((sample) => sample.value === null)).toBe(true);
    const missing = await source.loadTrend(sensor("sensor-east-temperature"), "Temperature", "24h");
    expect(missing.samples.every((sample) => sample.value === null)).toBe(true);
    expect(await source.loadHistogram(sensor("sensor-east-temperature"))).toEqual([]);
    for (const key of ["canal-strain", "foundry-wavelength", "riverside-dts"]) {
      const selected = sensor(`sensor-${key}`);
      expect(selected.metrics).toEqual([]);
      await expect(source.loadTrend(selected, "Temperature", "24h")).rejects.toThrow("Unsupported");
      await expect(source.loadHistogram(selected)).rejects.toThrow("unsupported");
    }
    expect(
      demoSnapshot.measurements.find((reading) => reading.kind === "strain")?.fields[0],
    ).toEqual({ name: "average", value: 0, unit: "m/m" });
    expect(
      demoSnapshot.measurements.find((reading) => reading.kind === "dts")?.fields[1]?.value,
    ).toBe("[28.4,31.2,34.8,36.1,32.6,0]");
  });

  it("bins a deterministic seven-day primary metric with units and no missing-value counts", async () => {
    const selected = sensor("sensor-foundry-temperature");
    const histogram = await source.loadHistogram(selected);
    const trend = await source.loadTrend(selected, selected.metrics[0]!.key, "7d");
    expect(histogram).toEqual(await source.loadHistogram(selected));
    expect(histogram.length).toBeGreaterThan(1);
    expect(
      histogram.every((bucket) => bucket.label.includes("°C") && Number.isInteger(bucket.count)),
    ).toBe(true);
    expect(histogram.reduce((count, bucket) => count + bucket.count, 0)).toBe(
      trend.samples.filter((sample) => sample.value !== null).length,
    );
    const zeroHistogram = await source.loadHistogram(sensor("sensor-east-voltage"));
    expect(zeroHistogram).toEqual([{ label: "= 0 V", count: 165 }]);
  });

  it("returns isolated copies and rejects unknown identities or metrics", async () => {
    const first = await source.loadSnapshot();
    first.events[0]!.title = "mutated";
    expect((await source.loadSnapshot()).events[0]?.title).not.toBe("mutated");
    const event = await source.loadEvent("event-foundry-temperature");
    event.series[0]!.samples[0]!.value = -99;
    expect((await source.loadEvent(event.id)).series[0]?.samples[0]?.value).toBe(62.1);
    await expect(source.loadEvent("not-a-real-event")).rejects.toThrow(
      "Unknown demonstration event",
    );
    await expect(
      source.loadTrend({ ...sensor("sensor-nq-current"), id: "unknown" }, "AMag", "24h"),
    ).rejects.toThrow("Unknown demonstration sensor");
    await expect(source.loadTrend(sensor("sensor-nq-temperature"), "AMag", "24h")).rejects.toThrow(
      "Unsupported temperature trend metric",
    );
  });
});
