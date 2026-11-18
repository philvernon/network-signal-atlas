import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { readRoute, routeHref } from "./navigation";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.history.replaceState(null, "", "/");
});
function navigate(hash: string) {
  act(() => {
    window.history.pushState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

test("shows explicitly labelled synthetic network evidence", async () => {
  render(<App />);
  expect(await screen.findByRole("heading", { name: /Latest network evidence/ })).toBeVisible();
  expect(screen.getByText("Synthetic demonstration")).toBeVisible();
  expect(screen.getByRole("link", { name: "Foundry joint temperature outlier" })).toBeVisible();
});
test("keeps source and entity identifiers in shareable routes", () => {
  const route = { mode: "live" as const, view: "events" as const, event: "event with spaces/42" };
  expect(readRoute(routeHref(route))).toMatchObject(route);
  expect(readRoute("#view=unknown&mode=other")).toMatchObject({ view: "overview", mode: "demo" });
});
test("follows the outlier through cable, history and current measurement", async () => {
  navigate("#view=events&mode=demo&event=event-foundry-temperature");
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Foundry joint temperature outlier" }),
  ).toBeVisible();
  expect(await screen.findByRole("heading", { name: /Authored event evidence/ })).toBeVisible();
  const asset = screen.getByRole("link", { name: /C02.*→/ });
  navigate(asset.getAttribute("href")!);
  expect(await screen.findByRole("heading", { name: /C02 · Canal/ })).toBeVisible();
  const history = screen.getAllByRole("link", { name: "Inspect history →" })[0]!;
  navigate(history.getAttribute("href")!);
  expect(await screen.findByRole("heading", { name: "Sensor investigation" })).toBeVisible();
  expect(await screen.findByRole("group", { name: /sample inspection/ })).toBeVisible();
  const measurement = screen.getByRole("link", { name: "All exact measurement fields →" });
  navigate(measurement.getAttribute("href")!);
  expect(await screen.findByRole("heading", { name: "Measurement evidence" })).toBeVisible();
});
test("event filters combine search, severity and archived visibility", async () => {
  navigate("#view=events&mode=demo");
  render(<App />);
  const search = await screen.findByRole("searchbox", { name: "Search events" });
  fireEvent.change(search, { target: { value: "Foundry" } });
  expect(screen.getByRole("status")).toHaveTextContent("2 of 8");
  fireEvent.change(screen.getByRole("combobox", { name: "Severity" }), {
    target: { value: "critical" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("1 of 8");
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Include archived" }));
  expect(screen.getByRole("status")).toHaveTextContent("8 of 8");
});
test("measurement family filtering preserves an exact zero", async () => {
  navigate("#view=measurements&mode=demo");
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Strain" }));
  expect(screen.getByText("0 m/m", { exact: true })).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("1 measurements");
});
test("a failed live source stays live instead of showing demo measurements", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new TypeError("Test service unavailable"));
  try {
    navigate("#view=overview&mode=live");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Connection unavailable" })).toBeVisible();
    expect(screen.getByText("Live service")).toBeVisible();
    expect(screen.queryByText("Synthetic demonstration")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Skip to evidence" }));
    expect(window.location.hash).toBe("#view=overview&mode=live");
    expect(document.activeElement).toBe(document.getElementById("main-content"));
  } finally {
    fetchMock.mockRestore();
  }
});
