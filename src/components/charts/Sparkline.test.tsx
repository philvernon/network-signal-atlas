import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sparkline } from "./Sparkline";
import { chartSeries, chartStart } from "./chart-fixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const props = { color: "var(--color-thermal)", label: "Thermal evidence", unit: "°C" };

describe("Sparkline", () => {
  it("renders an open summary with gaps and the latest endpoint", () => {
    const { container } = render(<Sparkline {...props} samples={chartSeries.samples} />);
    expect(screen.getByText("16 °C")).toBeVisible();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /1 missing samples; gaps are not interpolated/,
    );
    const line = container.querySelector('path[fill="none"]');
    expect(line?.getAttribute("d")?.match(/M/g)).toHaveLength(2);
    expect(container.querySelector('circle[r="3.5"]')).toBeInTheDocument();
  });

  it("treats zero as a reading and never invents a latest value after a missing sample", () => {
    const { rerender, container } = render(
      <Sparkline {...props} samples={[{ time: chartStart, value: 0 }]} />,
    );
    expect(screen.getByText("0 °C")).toBeVisible();
    expect(screen.getByRole("img").innerHTML).not.toMatch(/NaN|Infinity/);
    rerender(
      <Sparkline
        {...props}
        samples={[
          { time: chartStart, value: 0 },
          { time: chartStart + 1000, value: null },
        ]}
      />,
    );
    expect(screen.getByText("Missing reading")).toBeVisible();
    expect(container.querySelector('circle[r="3.5"]')).not.toBeInTheDocument();
  });

  it("shows explicit no-data for empty and entirely missing evidence", () => {
    const { rerender } = render(<Sparkline {...props} samples={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No data.");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<Sparkline {...props} samples={[{ time: chartStart, value: null }]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No data — 1 missing samples.");
  });

  it("resizes actual geometry rather than scaling desktop text", () => {
    let resize: ResizeObserverCallback | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Sparkline {...props} samples={chartSeries.samples} />);
    expect(screen.getByRole("img")).toHaveAttribute("viewBox", "0 0 320 100");
    act(() =>
      resize?.([{ contentRect: { width: 240 } } as ResizeObserverEntry], {} as ResizeObserver),
    );
    expect(screen.getByRole("img")).toHaveAttribute("viewBox", "0 0 240 100");
  });
});
