import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MeasurementFields } from "./components/Measurements";
import { exactValueText, eventAssetIds } from "./presentation";
import { demoSnapshot } from "./data/demo";

test("exact readings never round a nonzero strain reading to zero", () => {
  expect(exactValueText(0.0000004)).toBe("4e-7");
  expect(exactValueText(1.23456789123)).toBe("1.23456789123");
  expect(exactValueText(0)).toBe("0");
  expect(exactValueText(null)).toBe("Unavailable");
  render(
    <MeasurementFields
      measurement={{
        id: "precision",
        name: "Precision evidence",
        kind: "strain",
        timestamp: null,
        locationId: null,
        sensorIds: [],
        fields: [{ name: "average", value: 0.0000004, unit: "m/m" }],
      }}
    />,
  );
  expect(screen.getByRole("cell", { name: "4e-7" })).toBeVisible();
});

test("explicit event asset identity remains visible and takes precedence over inferred associations", () => {
  const event = {
    ...demoSnapshot.events[0]!,
    assetId: "source-unresolved-cable",
    associatedAssetIds: [],
  };
  expect(eventAssetIds(event)).toEqual(["source-unresolved-cable"]);
  expect(eventAssetIds({ ...event, associatedAssetIds: ["inferred-other-cable"] })).toEqual([
    "source-unresolved-cable",
  ]);
  expect(
    eventAssetIds({ ...event, assetId: null, associatedAssetIds: ["cable-one", "cable-two"] }),
  ).toEqual(["cable-one", "cable-two"]);
});
