import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { TrendChart } from "./TrendChart";
import { chartComparison, chartEvents, chartHour, chartSeries, chartStart } from "./chart-fixtures";
import "../../styles.css";

const meta = {
  title: "Apps/network-signal-atlas/Charts/Trend chart",
  component: TrendChart,
  parameters: { layout: "padded" },
  args: {
    series: chartSeries,
    events: chartEvents,
    comparison: chartComparison,
    onSelectTime: fn(),
  },
} satisfies Meta<typeof TrendChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InspectAndPin: Story = {
  play: async ({ canvas, args }) => {
    const chart = canvas.getByRole("group", { name: "Joint 4 temperature sample inspection" });
    chart.focus();
    await userEvent.keyboard("{Home}{Enter}");
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(chartStart);
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByText(/Preview ·.*Missing reading/)).toBeVisible();
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent("12.3456789 °C");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent("Missing reading");
    await userEvent.click(canvas.getByRole("button", { name: "Next sample" }));
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent(/^0 °C$/);
    await userEvent.click(canvas.getByRole("button", { name: "Unpin" }));
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(null);
    await userEvent.click(canvas.getByText(/Exact sample table/));
    await expect(canvas.getByRole("table")).toBeVisible();
    chart.focus();
    await userEvent.keyboard("{Home}{Enter}");
  },
};

export const NarrowWithZoom: Story = {
  render: (args) => (
    <div className="max-w-80">
      <TrendChart {...args} />
    </div>
  ),
  play: async ({ canvas, args }) => {
    const chart = canvas.getByRole("group", { name: "Joint 4 temperature sample inspection" });
    chart.focus();
    await userEvent.keyboard("{Home}{Enter}");
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(chartStart);
    await userEvent.click(canvas.getByRole("button", { name: "Recent half" }));
    await expect(canvas.getByText(/Pinned sample is outside/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Recent half" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(canvas.getByRole("button", { name: "All / reset zoom" }));
    await expect(canvas.queryByText(/Pinned sample is outside/)).not.toBeInTheDocument();
    chart.focus();
    await userEvent.keyboard("{Escape}");
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(null);
  },
};

export const Empty: Story = {
  args: {
    series: { ...chartSeries, samples: [] },
    comparison: undefined,
    events: [],
    onSelectTime: undefined,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/No data — no timestamped samples/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Previous sample" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Recent half" })).toBeDisabled();
  },
};

export const MissingReadings: Story = {
  args: {
    series: {
      ...chartSeries,
      samples: chartSeries.samples.map((sample) => ({ ...sample, value: null })),
    },
    comparison: undefined,
    events: [],
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText(/No readings in this window/)).toBeVisible();
    canvas.getByRole("group", { name: "Joint 4 temperature sample inspection" }).focus();
    await userEvent.keyboard("{End}{Enter}");
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(chartStart + 4 * chartHour);
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent("Missing reading");
  },
};

export const IncompatibleComparison: Story = {
  args: { comparison: { ...chartComparison, unit: "A" }, onSelectTime: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Comparison hidden: units differ or are unknown/)).toBeVisible();
    await expect(canvas.queryByTestId("comparison-path")).not.toBeInTheDocument();
  },
};

export const UnavailableSelectedTimestamp: Story = {
  args: {
    selectedTime: chartStart + 1,
    comparison: undefined,
    series: { ...chartSeries, samples: [...chartSeries.samples, { time: NaN, value: 17 }] },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText(/selected timestamp has no exact primary sample/)).toBeVisible();
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent("No sample");
    await userEvent.click(canvas.getByRole("button", { name: "Unpin" }));
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(null);
    await userEvent.click(canvas.getByText(/Exact sample table/));
    await expect(canvas.getByRole("table")).toHaveTextContent("Invalid timestamp");
  },
};

export const SingleZeroSample: Story = {
  args: {
    series: { ...chartSeries, samples: [{ time: chartStart, value: 0 }] },
    comparison: undefined,
    events: [],
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("button", { name: "Recent half" })).toBeDisabled();
    canvas.getByRole("group", { name: "Joint 4 temperature sample inspection" }).focus();
    await userEvent.keyboard("{Home}{Enter}");
    await expect(args.onSelectTime).toHaveBeenLastCalledWith(chartStart);
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent(/^0 °C$/);
  },
};

export const LargeUnitTicks: Story = {
  args: {
    series: {
      ...chartSeries,
      label: "Current evidence",
      unit: "A",
      samples: chartSeries.samples.map((sample) => ({
        ...sample,
        value: sample.value === null ? null : sample.value * 1e8,
      })),
    },
    comparison: undefined,
    events: [],
    onSelectTime: undefined,
  },
  render: (args) => (
    <div className="max-w-80">
      <TrendChart {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img")).toBeVisible();
    await expect(canvas.getByTestId("inspector-value")).toHaveTextContent("1600000000 A");
  },
};
