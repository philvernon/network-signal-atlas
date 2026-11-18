import { useEffect, useRef, useState } from "react";

/** No global observer shim: SSR/jsdom keep a useful, deterministic geometry. */
export function useChartWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = (next: number) => {
      if (Number.isFinite(next) && next > 0) setWidth(Math.round(next));
    };
    update(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
