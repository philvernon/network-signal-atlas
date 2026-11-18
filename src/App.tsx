import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { getSource } from "./data/source";
import type { EvidenceSource, Snapshot } from "./data/types";
import { useRoute, type Route } from "./navigation";
import { errorText } from "./presentation";
import { Shell, EmptyState } from "./components/Shell";
import { Overview } from "./components/Overview";
import { EventPage } from "./components/Events";
import { AssetsPage } from "./components/Assets";
import { MeasurementsPage } from "./components/Measurements";
import { InvestigationPage } from "./components/Investigation";

export function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AtlasApplication />
    </QueryClientProvider>
  );
}
function AtlasApplication() {
  const route = useRoute();
  const source = getSource(route.mode);
  const snapshot = useQuery({ queryKey: [route.mode, "snapshot"], queryFn: source.loadSnapshot });
  const previous = useRef(route);
  useEffect(() => {
    if (previous.current !== route && !snapshot.isPending) {
      document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
    previous.current = route;
  }, [route, snapshot.isPending]);
  let content;
  if (snapshot.isPending)
    content = (
      <div className="content py-12">
        <p role="status">Loading network evidence…</p>
      </div>
    );
  else if (snapshot.isError)
    content = (
      <div className="content py-12">
        <EmptyState title="Connection unavailable">
          <p role="alert">{errorText(snapshot.error)}</p>
          <p className="mt-3">Check the Grid Data service and session, then retry.</p>
          <button
            className="action mt-5"
            type="button"
            onClick={() => {
              void snapshot.refetch();
            }}
          >
            Retry connection
          </button>
        </EmptyState>
      </div>
    );
  else
    content = (
      <EvidencePage
        key={`${route.mode}:${route.view}`}
        snapshot={snapshot.data}
        source={source}
        route={route}
      />
    );
  return (
    <Shell
      route={route}
      snapshot={snapshot.data}
      refreshing={snapshot.isFetching}
      onRefresh={() => {
        void snapshot.refetch();
      }}
    >
      {snapshot.data &&
        snapshot.data.notes.some((note) => /^(Maps|Cable assets) unavailable/.test(note)) && (
          <aside className="content mt-6" aria-label="Partial source evidence">
            <div className="border-l-4 border-amber bg-amber-soft p-4 text-sm">
              <h2 className="font-semibold">Partial source evidence</h2>
              <ul className="mt-2 space-y-2">
                {snapshot.data.notes
                  .filter((note) => /^(Maps|Cable assets) unavailable/.test(note))
                  .map((note) => (
                    <li key={note}>{note}</li>
                  ))}
              </ul>
            </div>
          </aside>
        )}
      {content}
    </Shell>
  );
}
function EvidencePage(props: { snapshot: Snapshot; source: EvidenceSource; route: Route }) {
  switch (props.route.view) {
    case "overview":
      return <Overview {...props} />;
    case "events":
      return <EventPage {...props} />;
    case "assets":
      return <AssetsPage {...props} />;
    case "measurements":
      return <MeasurementsPage {...props} />;
    case "investigation":
      return <InvestigationPage {...props} />;
  }
}
