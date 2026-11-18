import { test, expect, savePreview } from "../../../tooling/dev-launcher/capture";

test("capture the populated synthetic overview", async ({ page }) => {
  await page.goto("/#view=overview&mode=demo");
  await expect(page.getByRole("heading", { name: /Latest network evidence/ })).toBeVisible();
  await expect(page.getByText("Synthetic demonstration", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Joint temperature: 66.8 °C/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Feeder current: 386.2 A/ })).toBeVisible();
  await savePreview(page, new URL("./screenshot.png", import.meta.url));
});

test("connect the authored outlier to cable, pinned history and exact measurement", async ({
  page,
}) => {
  await page.goto("/#view=events&mode=demo&event=event-foundry-temperature");
  await expect(
    page.getByRole("heading", { name: "Foundry joint temperature outlier" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /C02 · Canal.*→/ }).click();
  await expect(page.getByRole("heading", { name: /C02 · Canal/ })).toBeVisible();
  await page
    .getByRole("listitem")
    .filter({ hasText: "Foundry · phase A joint temperature" })
    .getByRole("link", { name: "Inspect history →" })
    .click();
  const chart = page.getByRole("group", { name: /sample inspection/ });
  await chart.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page.getByText("74.2 °C", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Unpin", exact: true })).toBeEnabled();
  await page
    .getByRole("combobox", { name: "Compare a compatible sensor" })
    .selectOption("sensor-canal-temperature");
  await page.getByRole("button", { name: "Load distribution" }).click();
  await expect(page.getByRole("table", { name: "Source histogram bucket counts" })).toBeVisible();
  await page.getByRole("link", { name: "All exact measurement fields →" }).click();
  await expect(page.getByRole("heading", { name: "Measurement evidence" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "66.8", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Sensor investigation" })).toBeVisible();
});

test("narrow chart supports keyboard inspection without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#view=investigation&mode=demo&sensor=sensor-foundry-temperature");
  const chart = page.getByRole("group", { name: /sample inspection/ });
  await chart.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Unpin", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Recent half" }).click();
  await page.getByRole("button", { name: "All / reset zoom" }).click();
  await page.getByRole("button", { name: "Unpin", exact: true }).click();
});

test("failed live connection and skip link retain live source identity", async ({ page }) => {
  await page.route("**/api/v2/**", (route) =>
    route.fulfill({ status: 503, json: { message: "Synthetic unavailable service" } }),
  );
  await page.goto("/#view=events&mode=live");
  await expect(page.getByRole("heading", { name: "Connection unavailable" })).toBeVisible();
  const url = page.url();
  await page.getByRole("link", { name: "Skip to evidence" }).focus();
  await page.keyboard.press("Enter");
  expect(page.url()).toBe(url);
  await expect(page.getByText("Live service", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic demonstration", { exact: true })).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeFocused();
});
