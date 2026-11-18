import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrendChart } from "./TrendChart";
import { chartComparison, chartEvents, chartHour, chartSeries, chartStart } from "./chart-fixtures";
import { seriesCsv } from "./chart-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function inspectionRegion() {
  return screen.getByRole("group", { name: "Joint 4 temperature sample inspection" });
}

function inspector() {
  return within(screen.getByRole("region", { name: "Sample inspector" }));
}

describe("TrendChart", () => {
  it("previews with keyboard independently from pinning; inspects missing values and zero exactly", () => {
    const onSelectTime = vi.fn();
    render(<TrendChart series={chartSeries} onSelectTime={onSelectTime} />);
    const region = inspectionRegion();
    fireEvent.keyDown(region, { key: "Home" });
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("16 °C");
    expect(inspector().getByText(/Preview ·.*12.3456789 °C/)).toBeVisible();
    expect(onSelectTime).not.toHaveBeenCalled();
    fireEvent.keyDown(region, { key: "Enter" });
    expect(onSelectTime).toHaveBeenLastCalledWith(chartStart);
    expect(inspector().getByText(/Pinned sample/)).toBeVisible();
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(inspector().getByText(/Preview ·.*Missing reading/)).toBeVisible();
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    fireEvent.keyDown(region, { key: "Enter" });
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("Missing reading");
    fireEvent.click(screen.getByRole("button", { name: "Next sample" }));
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent(/^0 °C$/);
    fireEvent.click(screen.getByRole("button", { name: "Previous sample" }));
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("Missing reading");
    fireEvent.keyDown(region, { key: "Escape" });
    expect(onSelectTime).toHaveBeenLastCalledWith(null);
    expect(inspector().getByText(/Latest sample/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Unpin" })).toBeDisabled();
    fireEvent.keyDown(region, { key: "End" });
    fireEvent.keyDown(region, { key: "Enter" });
    expect(onSelectTime).toHaveBeenLastCalledWith(chartStart + chartHour * 4);
    expect(screen.getByRole("button", { name: "Next sample" })).toBeDisabled();
  });

  it("preserves gaps, compares only matching known units, and never substitutes a nearby comparison reading", () => {
    const { rerender } = render(
      <TrendChart
        series={chartSeries}
        comparison={chartComparison}
        selectedTime={chartStart + 2 * chartHour}
      />,
    );
    const path = screen.getByTestId("primary-path").getAttribute("d") ?? "";
    expect(path.match(/M/g)).toHaveLength(2);
    expect(screen.getByTestId("comparison-path")).toBeInTheDocument();
    expect(inspector().getByText(/Joint 5 temperature: Missing reading/)).toBeVisible();
    rerender(
      <TrendChart
        series={chartSeries}
        comparison={{ ...chartComparison, samples: [{ time: chartStart, value: 1 }] }}
        selectedTime={chartStart + 2 * chartHour}
      />,
    );
    expect(inspector().getByText(/No sample at this exact timestamp/)).toBeVisible();
    rerender(<TrendChart series={chartSeries} comparison={{ ...chartComparison, unit: "A" }} />);
    expect(screen.queryByTestId("comparison-path")).not.toBeInTheDocument();
    expect(screen.getByText(/Comparison hidden/)).toBeVisible();
    rerender(
      <TrendChart
        series={{ ...chartSeries, unit: "unknown" }}
        comparison={{ ...chartComparison, unit: "unknown" }}
      />,
    );
    expect(screen.queryByTestId("comparison-path")).not.toBeInTheDocument();
  });

  it("marks outliers at their authored time, not the nearest sample, and keeps ordinary events secondary", () => {
    const { container } = render(<TrendChart series={chartSeries} events={chartEvents} />);
    const mark = container.querySelector(`[data-event-time="${chartStart + chartHour / 2}"]`);
    expect(mark?.querySelector("path")).toBeInTheDocument();
    expect(mark?.querySelector("title")).toHaveTextContent("2026-01-12T08:30:00.000Z");
    expect(screen.getByText(/◇ Authored outlier/)).toBeVisible();
    const ordinary = container.querySelector(`[data-event-time="${chartStart + chartHour * 3}"]`);
    expect(ordinary?.querySelector("circle")).toBeInTheDocument();
    expect(ordinary?.querySelector("path")).not.toBeInTheDocument();
  });

  it("zooms without losing a pinned reading, with a separate reset action", () => {
    render(<TrendChart series={chartSeries} selectedTime={chartStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Recent half" }));
    expect(screen.getByRole("button", { name: "Recent half" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/3\/5 samples/)).toBeVisible();
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    expect(screen.getByText(/Pinned sample is outside/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "All / reset zoom" }));
    expect(screen.queryByText(/Pinned sample is outside/)).not.toBeInTheDocument();
    expect(screen.getByTestId("pinned-cursor")).toBeInTheDocument();
  });

  it("honours controlled selection and resets local state for a new series", () => {
    const onSelectTime = vi.fn();
    const { rerender } = render(
      <TrendChart series={chartSeries} selectedTime={chartStart} onSelectTime={onSelectTime} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next sample" }));
    expect(onSelectTime).toHaveBeenLastCalledWith(chartStart + chartHour);
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    rerender(
      <TrendChart
        series={chartSeries}
        selectedTime={chartStart + chartHour}
        onSelectTime={onSelectTime}
      />,
    );
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("Missing reading");
    rerender(<TrendChart series={{ ...chartSeries, id: "new-series" }} />);
    expect(inspector().getByText(/Latest sample/)).toBeVisible();
  });

  it("uses one keyboard inspection region, exposes authored-order rows, and handles empty/all-missing data", () => {
    const { rerender } = render(
      <TrendChart series={{ ...chartSeries, samples: [...chartSeries.samples].reverse() }} />,
    );
    expect(inspectionRegion()).toHaveAttribute("tabindex", "0");
    expect(inspectionRegion().querySelectorAll("[tabindex]")).toHaveLength(0);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Exact sample table/));
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("2026-01-12T12:00:00.000Z");
    expect(screen.getByRole("table")).toHaveTextContent("0 °C");
    rerender(<TrendChart series={{ ...chartSeries, samples: [] }} />);
    expect(screen.getByText(/No data — no timestamped samples/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Next sample" })).toBeDisabled();
    rerender(
      <TrendChart series={{ ...chartSeries, samples: [{ time: chartStart, value: null }] }} />,
    );
    expect(screen.getByText(/No readings in this window/)).toBeVisible();
    expect(screen.getByTestId("primary-path")).toHaveAttribute("d", "");
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("Missing reading");
  });

  it("recomputes geometry for a narrow container and disconnects ResizeObserver", () => {
    let resize: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { unmount } = render(<TrendChart series={chartSeries} />);
    act(() =>
      resize?.([{ contentRect: { width: 320 } } as ResizeObserverEntry], {} as ResizeObserver),
    );
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("viewBox", "0 0 320 286");
    const texts = [...svg.querySelectorAll("text")];
    expect(texts.length).toBeLessThan(12);
    expect(svg.innerHTML).not.toMatch(/NaN|Infinity/);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("supports touch/pointer preview separately from pinned state", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { container } = render(<TrendChart series={chartSeries} />);
    const overlay = container.querySelector('rect[aria-hidden="true"]')!;
    fireEvent.pointerMove(overlay, { clientX: 42 });
    expect(screen.getByTestId("preview-cursor")).toBeInTheDocument();
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("16 °C");
    fireEvent.pointerUp(overlay, { clientX: 42, pointerType: "touch" });
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    fireEvent.pointerLeave(overlay);
    expect(screen.queryByTestId("preview-cursor")).not.toBeInTheDocument();
    expect(screen.getByTestId("pinned-cursor")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unpin" }));
    expect(screen.queryByTestId("pinned-cursor")).not.toBeInTheDocument();
  });

  it("keeps invalid timestamp rows and lets an unavailable controlled selection be cleared", () => {
    const onSelectTime = vi.fn();
    render(
      <TrendChart
        series={{ ...chartSeries, samples: [...chartSeries.samples, { time: NaN, value: 17 }] }}
        selectedTime={chartStart + 1}
        onSelectTime={onSelectTime}
      />,
    );
    expect(screen.getByText(/1 invalid timestamps cannot be plotted/)).toBeVisible();
    expect(screen.getByText(/selected timestamp has no exact primary sample/)).toBeVisible();
    expect(inspector().getByTestId("inspector-value")).toHaveTextContent("No sample");
    fireEvent.click(screen.getByRole("button", { name: "Unpin" }));
    expect(onSelectTime).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByText(/Exact sample table/));
    expect(screen.getByRole("table")).toHaveTextContent("Invalid timestamp");
    expect(screen.getByRole("table")).toHaveTextContent("17 °C");
  });

  it("exports exact authored samples, preserving zero, missingness and safe spreadsheet text", () => {
    vi.useFakeTimers();
    const csv = seriesCsv({ ...chartSeries, label: '=HYPERLINK("unsafe")', unit: "@formula" });
    expect(csv).toContain('"\'=HYPERLINK(""unsafe"")"');
    expect(csv).toContain('"\'@formula"');
    expect(csv.split("\r\n")[2]).toContain(",,");
    expect(csv.split("\r\n")[3]).toContain(",0,");
    expect(csv).toContain("12.3456789");
    const createObjectURL = vi.fn(() => "blob:synthetic");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<TrendChart series={chartSeries} />);
    fireEvent.click(screen.getByText(/Exact sample table/));
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:synthetic");
  });
});
