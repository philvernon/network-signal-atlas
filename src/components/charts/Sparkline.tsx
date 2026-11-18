import { useId } from "react";
import { scaleUtc } from "d3-scale";
import { area } from "d3-shape";
import type { Sample } from "../../data/types";
import {
  axisDate,
  chronological,
  exactTime,
  exactValue,
  hasReading,
  linePath,
  timeDomain,
  valueScale,
} from "./chart-utils";
import { useChartWidth } from "./useChartWidth";

export interface SparklineProps {
  samples: Sample[];
  color: string;
  label: string;
  unit: string;
}

export function Sparkline({ samples, color, label, unit }: SparklineProps) {
  const { ref, width } = useChartWidth(320);
  const titleId = useId();
  const ordered = chronological(samples);
  const latest = ordered.at(-1);
  const readings = ordered.filter(hasReading);
  const missing = ordered.length - readings.length;
  const height = 100;
  const x = scaleUtc()
    .domain(timeDomain(ordered))
    .range([5, Math.max(6, width - 5)]);
  const y = valueScale(ordered, [height - 6, 6], true);
  const fill =
    area<Sample>()
      .defined(hasReading)
      .x((sample) => x(sample.time))
      .y0(y(0))
      .y1((sample) => y(sample.value ?? 0))(ordered) ?? "";

  return (
    <figure className="min-w-0 text-ink">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-base font-medium">{label}</span>
        <span className="text-sm tabular-nums">{exactValue(latest, unit)}</span>
      </figcaption>
      <div ref={ref} className="w-full">
        {readings.length ? (
          <svg
            role="img"
            aria-labelledby={titleId}
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
          >
            <title id={titleId}>
              {label}: {exactValue(latest, unit)} at{" "}
              {latest ? exactTime(latest.time) : "unknown time"}. {missing} missing samples; gaps
              are not interpolated.
            </title>
            <path d={fill} fill={color} fillOpacity={0.12} />
            <path
              d={linePath(ordered, x, y)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {readings.map((sample, index) => (
              <circle
                key={`${sample.time}:${index}`}
                cx={x(sample.time)}
                cy={y(sample.value)}
                r={1.4}
                fill={color}
              />
            ))}
            {latest && hasReading(latest) && (
              <circle
                cx={x(latest.time)}
                cy={y(latest.value)}
                r={3.5}
                fill={color}
                stroke="var(--color-paper)"
                strokeWidth={1.5}
              />
            )}
          </svg>
        ) : (
          <p role="status" className="flex h-25 items-center text-sm text-muted">
            No data{missing ? ` — ${missing} missing samples` : ""}.
          </p>
        )}
      </div>
      {ordered.length > 0 && (
        <p className="flex justify-between gap-2 text-xs text-muted">
          <span>
            {axisDate(new Date(ordered[0]!.time))}–{axisDate(new Date(ordered.at(-1)!.time))} · UTC
          </span>
          <span>{missing ? `${missing} missing` : `${ordered.length} samples`}</span>
        </p>
      )}
    </figure>
  );
}
