import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import type { GridEvent, Series } from "../../data/types";
import {
  chartButton,
  chronological,
  compatibleComparison,
  hasReading,
  timeDomain,
} from "./chart-utils";
import { SampleInspector } from "./SampleInspector";
import { SampleTable } from "./SampleTable";
import { TrendPlot } from "./TrendPlot";
import { useChartWidth } from "./useChartWidth";

export interface TrendChartProps {
  series: Series;
  comparison?: Series;
  events?: GridEvent[];
  selectedTime?: number | null;
  onSelectTime?: (time: number | null) => void;
}

/** Reset transient state when the caller changes the source series. */
export function TrendChart(props: TrendChartProps) {
  return <TrendChartEvidence key={props.series.id} {...props} />;
}

function TrendChartEvidence({
  series,
  comparison,
  events = [],
  selectedTime,
  onSelectTime,
}: TrendChartProps) {
  const { ref, width } = useChartWidth(760);
  const titleId = useId();
  const instructionsId = useId();
  const [localTime, setLocalTime] = useState<number | null>(null);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [recent, setRecent] = useState(false);
  const pinnedTime = selectedTime === undefined ? localTime : selectedTime;
  const samples = chronological(series.samples);
  const fullDomain = timeDomain(samples);
  const domain: [number, number] = recent
    ? [(fullDomain[0] + fullDomain[1]) / 2, fullDomain[1]]
    : fullDomain;
  const inView = (time: number) => time >= domain[0] && time <= domain[1];
  const visible = samples.filter((sample) => inView(sample.time));
  const pinned = samples.find((sample) => sample.time === pinnedTime);
  const preview = visible.find((sample) => sample.time === previewTime);
  const compatible = compatibleComparison(series, comparison);
  const visibleComparison = compatible
    ? {
        ...compatible,
        samples: chronological(compatible.samples).filter((sample) => inView(sample.time)),
      }
    : undefined;
  const missing = samples.filter((sample) => !hasReading(sample)).length;
  const invalidTimes = series.samples.length - samples.length;

  function pin(time: number | null) {
    setPreviewTime(null);
    if (selectedTime === undefined) setLocalTime(time);
    onSelectTime?.(time);
  }

  function inspectKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const current = visible.findIndex((sample) => sample.time === (preview?.time ?? pinned?.time));
    const start = current < 0 ? visible.length - 1 : current;
    let index: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        index = Math.max(0, start - 1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        index = Math.min(visible.length - 1, start + 1);
        break;
      case "Home":
        index = 0;
        break;
      case "End":
        index = visible.length - 1;
        break;
      case "Enter": {
        event.preventDefault();
        const sample = preview ?? pinned ?? visible.at(-1);
        if (sample) pin(sample.time);
        return;
      }
      case "Escape":
        event.preventDefault();
        setPreviewTime(null);
        pin(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    setPreviewTime(visible[index]?.time ?? null);
  }

  return (
    <figure aria-labelledby={titleId} className="min-w-0 text-ink">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 pb-2">
        <h3 id={titleId} className="min-w-0 break-words text-lg font-medium">
          {series.label}
        </h3>
        <p className="text-sm text-muted">
          {series.unit || "Unit unknown"} · UTC · {visible.length}/{samples.length} samples
        </p>
      </figcaption>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="flex min-w-0 items-center gap-2 break-words">
            <span aria-hidden="true" className="h-0.5 w-5 bg-activity" />
            {series.label}
          </span>
          {compatible && (
            <span className="flex min-w-0 items-center gap-2 break-words text-muted">
              <span aria-hidden="true" className="w-5 border-t border-dashed border-muted" />
              {compatible.label}
            </span>
          )}
        </p>
        <div role="group" aria-label="Chart time window" className="flex gap-1">
          <button
            type="button"
            className={chartButton}
            aria-pressed={recent}
            disabled={samples.length < 2}
            onClick={() => {
              setRecent(true);
              setPreviewTime(null);
            }}
          >
            Recent half
          </button>
          <button
            type="button"
            className={chartButton}
            aria-pressed={!recent}
            onClick={() => {
              setRecent(false);
              setPreviewTime(null);
            }}
          >
            All / reset zoom
          </button>
        </div>
      </div>
      {comparison && !compatible && (
        <p className="py-2 text-sm text-muted">Comparison hidden: units differ or are unknown.</p>
      )}
      <p id={instructionsId} className="pb-1 text-xs leading-relaxed text-muted">
        Focus the chart. Arrow keys preview; Home/End jump; Enter pins; Escape unpins. Move to
        preview or tap a sample to pin. Zoom changes the view, not the pinned reading.
      </p>
      <div
        ref={ref}
        role="group"
        aria-label={`${series.label} sample inspection`}
        aria-roledescription="interactive time series"
        aria-describedby={instructionsId}
        tabIndex={0}
        onKeyDown={inspectKey}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPreviewTime(null);
        }}
        className="w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-activity"
      >
        {samples.length > 0 ? (
          <TrendPlot
            width={width}
            domain={domain}
            samples={visible}
            comparison={visibleComparison}
            events={events}
            pinned={pinned}
            preview={preview}
            label={series.label}
            onPreview={setPreviewTime}
            onPin={pin}
          />
        ) : (
          <p role="status" className="flex h-56 items-center justify-center text-sm text-muted">
            No data — no timestamped samples are available.
          </p>
        )}
      </div>
      {samples.length > 0 && !visible.some(hasReading) && (
        <p className="pb-2 text-sm text-muted">
          No readings in this window. Missing samples remain inspectable.
        </p>
      )}
      {missing > 0 && (
        <p className="pb-2 text-xs text-muted">
          {missing} missing readings · gaps are not interpolated.
        </p>
      )}
      {invalidTimes > 0 && (
        <p className="pb-2 text-xs text-muted">
          {invalidTimes} invalid timestamps cannot be plotted; source rows remain in the exact
          table.
        </p>
      )}
      {pinned && !inView(pinned.time) && (
        <p className="pb-2 text-sm text-muted">
          Pinned sample is outside this zoom window. Reset zoom to see it.
        </p>
      )}
      {pinnedTime !== null && !pinned && (
        <p className="pb-2 text-sm text-muted">
          The selected timestamp has no exact primary sample.
        </p>
      )}
      <SampleInspector
        samples={samples}
        unit={series.unit}
        selectedTime={pinnedTime}
        pinned={pinned}
        preview={preview}
        comparison={compatible}
        onSelect={pin}
      />
      <SampleTable series={series} />
    </figure>
  );
}
