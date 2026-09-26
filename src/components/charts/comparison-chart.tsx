import { useEffect, useRef, useState } from "react";
import { max, scaleBand, scaleLinear } from "d3";

export type ComparisonRow = { id: string; label: string; estimated: number; actual: number };

type Props = {
  title: string;
  rows: ComparisonRow[];
  currency: string;
  /** Text summary for screen readers; the data table is the full alternative (FR-050). */
  summary: string;
};

const BAR = 12; // two bars per row stay under the 24px cap
const GAP = 2; // surface gap between the pair
const LABEL_W = 132;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Estimated vs actual per row as horizontal grouped bars, drawn with D3 scales. */
export function ComparisonChart({ title, rows, currency, summary }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  });
  const rowH = BAR * 2 + GAP + 14;
  const height = rows.length * rowH + 24;
  const x = scaleLinear()
    .domain([0, max(rows, (r) => Math.max(r.estimated, r.actual)) || 1])
    .nice()
    .range([LABEL_W, width - 56]);
  const y = scaleBand()
    .domain(rows.map((r) => r.id))
    .range([0, rows.length * rowH]);
  // 4px rounded data-end, square at the baseline
  const bar = (x0: number, x1: number, top: number) => {
    const w = Math.max(0, x1 - x0);
    const r = Math.min(4, w, BAR / 2);
    return `M${x0},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${top + BAR - r}Q${x0 + w},${top + BAR} ${x0 + w - r},${top + BAR}H${x0}Z`;
  };

  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="flex gap-4 text-sm text-muted-foreground" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ background: "var(--chart-estimated)" }}
            />{" "}
            Estimated
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ background: "var(--chart-actual)" }}
            />{" "}
            Actual
          </span>
        </span>
      </figcaption>
      <div ref={box} className="relative w-full" role="img" aria-label={summary}>
        <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
          {x.ticks(4).map((t) => (
            <g key={t} transform={`translate(${x(t)},0)`}>
              <line y1={0} y2={height - 20} stroke="var(--chart-grid)" strokeWidth={1} />
              <text
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {compact.format(t)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const top = y(r.id)! + 7;
            return (
              <g key={r.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect
                  x={0}
                  y={y(r.id)}
                  width={width}
                  height={rowH}
                  fill={hover === i ? "var(--muted)" : "transparent"}
                />
                <text
                  x={LABEL_W - 8}
                  y={top + BAR + 4}
                  textAnchor="end"
                  className="fill-foreground text-[12px]"
                >
                  {r.label.length > 16 ? `${r.label.slice(0, 15)}…` : r.label}
                </text>
                <path d={bar(x(0), x(r.estimated), top)} fill="var(--chart-estimated)" />
                <path d={bar(x(0), x(r.actual), top + BAR + GAP)} fill="var(--chart-actual)" />
                <text
                  x={x(r.actual) + 4}
                  y={top + BAR * 2 + GAP - 2}
                  className="fill-muted-foreground text-[11px]"
                >
                  {compact.format(r.actual)}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && rows[hover] && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{ top: y(rows[hover]!.id)! + rowH, left: LABEL_W }}
          >
            <p className="font-semibold">{rows[hover]!.label}</p>
            <p>Estimated: {money.format(rows[hover]!.estimated)}</p>
            <p>Actual: {money.format(rows[hover]!.actual)}</p>
          </div>
        )}
      </div>
    </figure>
  );
}
