import { Component, useEffect, useRef } from "react";
import type { ErrorInfo, ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

type AppErrorFallbackProps = {
  onReload: () => void;
};

export function AppErrorFallback({ onReload }: AppErrorFallbackProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-20">
      <div role="alert">
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight text-slate-950"
        >
          Something went wrong
        </h1>
        <p className="mt-4 max-w-prose text-base leading-7 text-slate-700">
          The app could not continue. Reload the page to try again. Any unsaved changes may be lost.
        </p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="mt-6 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950"
      >
        Reload page
      </button>
    </main>
  );
}

function reloadPage() {
  window.location.reload();
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics out of the UI; add app-specific monitoring here when chosen.
    console.error("Unhandled application render error", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return <AppErrorFallback onReload={reloadPage} />;
    }

    return this.props.children;
  }
}
