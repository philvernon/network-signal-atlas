import type { Series } from "../../data/types";
import { chartButton, exactTime, exactValue, seriesCsv } from "./chart-utils";

function downloadCsv(series: Series) {
  const blob = new Blob([seriesCsv(series)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "signal-samples.csv";
  document.body.append(link);
  link.click();
  link.remove();
  // Allow the browser to consume the URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function SampleTable({ series }: { series: Series }) {
  const canDownload =
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function" &&
    typeof URL.revokeObjectURL === "function";
  return (
    <details className="border-b border-line py-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-medium text-ink focus-visible:outline-2 focus-visible:outline-activity">
        Exact sample table · {series.samples.length} samples
      </summary>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-muted">
        <p>All primary samples, in source order. Blank CSV values mean missing readings.</p>
        <button
          type="button"
          className={chartButton}
          disabled={!canDownload || series.samples.length === 0}
          onClick={() => downloadCsv(series)}
        >
          Download CSV
        </button>
      </div>
      {!canDownload && (
        <p className="pb-2 text-xs text-muted">CSV download is unavailable in this environment.</p>
      )}
      <div
        className="max-h-80 overflow-auto focus-visible:outline-2 focus-visible:outline-activity"
        role="region"
        aria-label="Exact samples"
        tabIndex={0}
      >
        <table className="w-full border-collapse text-left tabular-nums">
          <caption className="sr-only">
            {series.label} · exact timestamps and values · {series.unit || "unit unknown"}
          </caption>
          <thead className="sticky top-0 bg-paper text-muted">
            <tr>
              <th scope="col" className="px-2 py-2 font-medium">
                Timestamp (UTC)
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Reading ({series.unit || "unit unknown"})
              </th>
            </tr>
          </thead>
          <tbody>
            {series.samples.map((sample, index) => (
              <tr key={`${sample.time}:${index}`} className="border-t border-line">
                <td className="whitespace-nowrap px-2 py-2">{exactTime(sample.time)}</td>
                <td className="px-2 py-2 text-right">{exactValue(sample, series.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
