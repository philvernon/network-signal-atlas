import type { Sample, Series } from "../../data/types";
import { chartButton, exactTime, exactValue } from "./chart-utils";

interface SampleInspectorProps {
  samples: Sample[];
  unit: string;
  selectedTime: number | null;
  pinned?: Sample;
  preview?: Sample;
  comparison?: Series;
  onSelect: (time: number | null) => void;
}

export function SampleInspector({
  samples,
  unit,
  selectedTime,
  pinned,
  preview,
  comparison,
  onSelect,
}: SampleInspectorProps) {
  const baseline = selectedTime === null ? samples.at(-1) : pinned;
  const index = baseline ? samples.indexOf(baseline) : -1;
  const inspectionTime = selectedTime ?? baseline?.time;
  const comparisonSample = comparison?.samples.find((sample) => sample.time === inspectionTime);
  let heading = "Latest sample";
  if (selectedTime !== null) heading = pinned ? "Pinned sample" : "Selected timestamp";

  return (
    <section aria-label="Sample inspector" className="border-y border-line py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="min-w-0 space-y-1 text-sm"
        >
          <p className="font-medium text-ink">
            {heading} · {inspectionTime === undefined ? "No sample" : exactTime(inspectionTime)}
          </p>
          <p className="text-lg tabular-nums text-ink" data-testid="inspector-value">
            {exactValue(baseline, unit)}
          </p>
          {comparison && (
            <p className="text-muted">
              {comparison.label}:{" "}
              {comparisonSample
                ? exactValue(comparisonSample, comparison.unit)
                : "No sample at this exact timestamp"}
            </p>
          )}
        </div>
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Step through all samples"
        >
          <button
            type="button"
            className={chartButton}
            disabled={index <= 0}
            onClick={() => onSelect(samples[index - 1]!.time)}
          >
            Previous sample
          </button>
          <button
            type="button"
            className={chartButton}
            disabled={index < 0 || index >= samples.length - 1}
            onClick={() => onSelect(samples[index + 1]!.time)}
          >
            Next sample
          </button>
          <button
            type="button"
            className={chartButton}
            disabled={selectedTime === null}
            onClick={() => onSelect(null)}
          >
            Unpin
          </button>
        </div>
      </div>
      <p
        aria-live="polite"
        aria-atomic="true"
        className="mt-2 min-h-20 break-words text-sm tabular-nums text-muted sm:min-h-10"
      >
        {preview
          ? `Preview · ${exactTime(preview.time)} · ${exactValue(preview, unit)} — press Enter or tap to pin.`
          : "Preview: move over the chart or use its arrow keys. Pinning keeps the inspector fixed."}
      </p>
    </section>
  );
}
