import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AppErrorBoundary, AppErrorFallback } from "./AppErrorBoundary";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders healthy children without a fallback", () => {
  const report = vi.spyOn(console, "error");

  render(
    <AppErrorBoundary>
      <p>Application content</p>
    </AppErrorBoundary>,
  );

  expect(screen.getByText("Application content")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(report).not.toHaveBeenCalled();
});

test("reports a render failure and focuses an accessible fallback without exposing diagnostics", () => {
  const error = new Error("Synthetic private diagnostic");
  const report = vi.spyOn(console, "error").mockImplementation(() => {});

  function Broken(): never {
    throw error;
  }

  render(
    <AppErrorBoundary>
      <Broken />
    </AppErrorBoundary>,
  );

  expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Something went wrong" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  expect(report).toHaveBeenCalledWith(
    "Unhandled application render error",
    error,
    expect.any(String),
  );
});

test("offers an explicit recovery action and warns about unsaved changes", () => {
  const reload = vi.fn();

  render(<AppErrorFallback onReload={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "Reload page" }));

  expect(reload).toHaveBeenCalledOnce();
  expect(screen.getByText(/Any unsaved changes may be lost/)).toBeVisible();
});
