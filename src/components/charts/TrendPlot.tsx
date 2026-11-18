import { bisector } from "d3-array";
import { scaleUtc } from "d3-scale";
import type { ScaleTime } from "d3-scale";
import { symbol, symbolDiamond } from "d3-shape";
import { useId } from "react";
import type { PointerEvent } from "react";
import type { GridEvent, Sample, Series } from "../../data/types";
import { axisClock, axisDate, exactTime, hasReading, linePath, valueScale } from "./chart-utils";

interface TrendPlotProps {
  width: number;
  domain: [number, number];
  samples: Sample[];
  comparison?: Series;
  events: GridEvent[];
  pinned?: Sample;
  preview?: Sample;
  label: string;
  onPreview: (time: number | null) => void;
  onPin: (time: number) => void;
}

const nearestSample = bisector<Sample, number>((sample) => sample.time).center;
const diamond = symbol(symbolDiamond).size(65)() ?? "";

interface SampleCursorProps {
  sample: Sample;
  x: ScaleTime<number, number>;
  y: ReturnType<typeof valueScale>;
  top: number;
  bottom: number;
  kind: "pinned" | "preview";
}

function SampleCursor({ sample, x, y, top, bottom, kind }: SampleCursorProps) {
  const pinned = kind === "pinned";
  return (
    <g data-testid={`${kind}-cursor`}>
      <line
        x1={x(sample.time)}
        x2={x(sample.time)}
        y1={top}
        y2={bottom}
        stroke={pinned ? "var(--color-ink)" : "var(--color-activity)"}
        strokeWidth={pinned ? 1.25 : 1}
        strokeDasharray={pinned ? undefined : "3 4"}
      />
      {hasReading(sample) && (
        <circle
          cx={x(sample.time)}
          cy={y(sample.value)}
          r={pinned ? 5 : 4.5}
          fill={pinned ? "var(--color-amber)" : "var(--color-paper)"}
          stroke={pinned ? "var(--color-ink)" : "var(--color-activity)"}
          strokeWidth={pinned ? 1.5 : 2}
        />
      )}
    </g>
  );
}

export function TrendPlot({
  width,
  domain,
  samples,
  comparison,
  events,
  pinned,
  preview,
  label,
  onPreview,
  onPin,
}: TrendPlotProps) {
  const clipId = useId();
  const titleId = useId();
  const height = 286;
  const top = 32;
  const bottom = height - 52;
  const y = valueScale([...samples, ...(comparison?.samples ?? [])], [bottom, top + 12]);
  const yTicks = y.ticks(4);
  const formatTick = y.tickFormat(4, ".4~g");
  const labelWidth = Math.max(...yTicks.map((tick) => formatTick(tick).length)) * 7;
  const left = Math.min(width * 0.36, Math.max(42, labelWidth + 12));
  const right = Math.max(left + 1, width - 18);
  const x = scaleUtc().domain(domain).range([left, right]);
  const tickCount = Math.max(1, Math.floor((right - left) / 100));
  // D3 chooses calendar-aligned ticks. Reserve a readable label lane for each.
  const xTicks = x
    .ticks(tickCount)
    .filter((tick, index, all) => index === 0 || x(tick) - x(all[index - 1]!) >= 85);
  const timedEvents = events.flatMap((event) => {
    const time = event.timestamp ? Date.parse(event.timestamp) : NaN;
    return Number.isFinite(time) && time >= domain[0] && time <= domain[1] ? [{ event, time }] : [];
  });
  const outliers = timedEvents.filter(({ event }) => event.outlier);
  const visiblePoint = (sample: Sample | undefined) =>
    sample && sample.time >= domain[0] && sample.time <= domain[1];

  function sampleAtPointer(event: PointerEvent<SVGRectElement>): Sample | undefined {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds || !samples.length) return undefined;
    const localX = (event.clientX - bounds.left) * (width / (bounds.width || width));
    const time = x.invert(Math.max(left, Math.min(right, localX))).getTime();
    return samples[nearestSample(samples, time)];
  }

  return (
    <>
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="block overflow-visible text-muted"
      >
        <title id={titleId}>
          {label} over time. Solid primary line; dashed comparison. Missing readings are gaps.
          Diamonds mark authored outlier event times, not interpolated measurements.
        </title>
        <defs>
          <clipPath id={clipId}>
            <rect x={left - 4} y={top} width={right - left + 8} height={bottom - top + 5} />
          </clipPath>
        </defs>
        <g fontSize={11} fill="currentColor" className="tabular-nums">
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-line)"
                strokeWidth={0.75}
                shapeRendering="crispEdges"
              />
              <text x={left - 9} y={y(tick)} textAnchor="end" dy="0.32em">
                {formatTick(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={tick.getTime()} transform={`translate(${x(tick)},${bottom})`}>
              <line y2={5} stroke="var(--color-line)" />
              <text
                y={21}
                textAnchor={x(tick) - left < 40 ? "start" : right - x(tick) < 40 ? "end" : "middle"}
              >
                <tspan x={0}>{axisDate(tick)}</tspan>
                <tspan x={0} dy={15}>
                  {domain[1] - domain[0] < 300_000
                    ? tick.toISOString().slice(11, 19)
                    : axisClock(tick)}
                </tspan>
              </text>
            </g>
          ))}
        </g>
        <g clipPath={`url(#${clipId})`}>
          {comparison && (
            <path
              data-testid="comparison-path"
              d={linePath(comparison.samples, x, y)}
              fill="none"
              stroke="var(--color-muted)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
          )}
          <path
            data-testid="primary-path"
            d={linePath(samples, x, y)}
            fill="none"
            stroke="var(--color-activity)"
            strokeWidth={2.25}
            strokeLinejoin="round"
          />
          {samples.filter(hasReading).map((sample, index) => (
            <circle
              key={`${sample.time}:${index}`}
              cx={x(sample.time)}
              cy={y(sample.value)}
              r={1.8}
              fill="var(--color-activity)"
            />
          ))}
          {visiblePoint(pinned) && pinned && (
            <SampleCursor sample={pinned} x={x} y={y} top={top} bottom={bottom} kind="pinned" />
          )}
          {visiblePoint(preview) && preview && preview.time !== pinned?.time && (
            <SampleCursor sample={preview} x={x} y={y} top={top} bottom={bottom} kind="preview" />
          )}
        </g>
        {timedEvents.map(({ event, time }) => (
          <g key={event.id} data-event-time={time} transform={`translate(${x(time)},0)`}>
            <title>
              {event.outlier ? "Authored outlier" : "Event"}: {event.title} · {exactTime(time)}
            </title>
            {event.outlier ? (
              <>
                <line
                  y1={top - 8}
                  y2={bottom}
                  stroke="var(--color-thermal)"
                  strokeOpacity={0.4}
                  strokeDasharray="2 4"
                />
                <path
                  d={diamond}
                  transform={`translate(0,${top - 15})`}
                  fill="var(--color-thermal)"
                />
              </>
            ) : (
              <circle cy={bottom + 3} r={2.5} fill="var(--color-muted)" />
            )}
          </g>
        ))}
        <rect
          aria-hidden="true"
          x={left}
          y={top}
          width={right - left}
          height={bottom - top}
          fill="transparent"
          style={{ touchAction: "pan-y pinch-zoom" }}
          onPointerMove={(event) => {
            const sample = sampleAtPointer(event);
            if (sample) onPreview(sample.time);
          }}
          onPointerLeave={() => onPreview(null)}
          onPointerCancel={() => onPreview(null)}
          onPointerUp={(event) => {
            const sample = sampleAtPointer(event);
            if (sample) onPin(sample.time);
          }}
        />
      </svg>
      {timedEvents.length > 0 && (
        <div className="space-y-1 pb-3 text-xs text-muted">
          {outliers.map(({ event, time }) => (
            <p key={event.id} className="break-words">
              <span className="font-medium text-thermal">◇ Authored outlier · {event.title}</span> ·{" "}
              <time dateTime={exactTime(time)}>{exactTime(time)}</time>
            </p>
          ))}
          <p>
            {timedEvents.length - outliers.length} ordinary event marks · markers use authored
            timestamps, not inferred readings.
          </p>
        </div>
      )}
    </>
  );
}
