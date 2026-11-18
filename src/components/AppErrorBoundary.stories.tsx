import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { AppErrorFallback } from "./AppErrorBoundary";
import "../styles.css";

const meta = {
  title: "Apps/network-signal-atlas/App recovery",
  component: AppErrorFallback,
  parameters: { layout: "fullscreen" },
  args: { onReload: fn() },
} satisfies Meta<typeof AppErrorFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recovery: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Something went wrong" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Reload page" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onReload).toHaveBeenCalledOnce();
  },
};
