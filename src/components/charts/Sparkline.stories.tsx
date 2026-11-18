import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Sparkline } from "./Sparkline";
import { chartSeries, chartStart } from "./chart-fixtures";
import "../../styles.css";

const meta = {
  title: "Apps/network-signal-atlas/Charts/Sparkline",
  component: Sparkline,
  parameters: { layout: "padded" },
  args: {
    samples: chartSeries.samples,
    color: "var(--color-thermal)",
    label: "Thermal evidence",
    unit: "°C",
  },
  decorators: [
    (Story) => (
      <div className="max-w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sparkline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SummaryWithGap: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("16 °C")).toBeVisible();
    await expect(canvas.getByRole("img")).toHaveAccessibleName(/gaps are not interpolated/);
    await expect(canvas.getByText("1 missing")).toBeVisible();
  },
};
export const Empty: Story = {
  args: { samples: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("No data.");
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
  },
};
export const MissingLatest: Story = {
  args: { samples: [...chartSeries.samples, { time: chartStart + 5 * 3_600_000, value: null }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Missing reading")).toBeVisible();
    await expect(canvas.getByRole("img")).toBeVisible();
  },
};
export const ZeroSample: Story = {
  args: { samples: [{ time: chartStart, value: 0 }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("0 °C")).toBeVisible();
    await expect(canvas.getByRole("img")).toBeVisible();
  },
};
export const EntirelyMissing: Story = {
  args: { samples: [{ time: chartStart, value: null }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("No data — 1 missing samples.");
  },
};
