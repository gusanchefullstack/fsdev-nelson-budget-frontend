import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { linkVertical, select, zoom, zoomIdentity, type ZoomTransform } from "d3";
import { ChevronDown, ChevronRight, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHAR_W,
  MAX_SCALE,
  MIN_SCALE,
  NODE_H,
  NODE_W,
  fitTransform,
  initialCollapsed,
  layout,
  type Point,
  type Size,
} from "./review-layout";
import { signedMoney, type ReviewTreeNode } from "./review-summary";

const truncate = (text: string, room: number) => {
  const max = Math.floor(room / CHAR_W);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

type Props = { root: ReviewTreeNode; currency: string; summaryId: string };

/** Planned-totals tree for the Guided review (spec 003): d3 for layout and zoom, React for SVG. */
export function ReviewTree({ root, currency, summaryId }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const behavior = useMemo(() => zoom<SVGSVGElement, unknown>(), []);
  const [size, setSize] = useState<Size | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [tip, setTip] = useState<Point | null>(null);
  const initial = useRef<Set<string> | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth || 320, height: el.clientHeight || 420 });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, links } = useMemo(() => layout(root, collapsed), [root, collapsed]);

  function reset(target: Size) {
    initial.current ??= initialCollapsed(root, target);
    setCollapsed(initial.current);
    const t = fitTransform(layout(root, initial.current).bounds, target);
    if (svg.current) select(svg.current).call(behavior.transform, t);
    setTransform(t);
  }

  // First view once the box has a size; resizes keep the user's view.
  useLayoutEffect(() => {
    if (size && initial.current === null) reset(size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    behavior
      .extent((): [[number, number], [number, number]] => [
        [0, 0],
        [el.clientWidth || 320, el.clientHeight || 420],
      ])
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      // A plain wheel scrolls the page; Ctrl/⌘ + wheel (and trackpad pinch) zooms.
      .filter((e: Event) =>
        e.type === "wheel"
          ? (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey
          : !(e as MouseEvent).button,
      )
      .on("zoom", (e: { transform: ZoomTransform }) => setTransform(e.transform));
    const selection = select(el).call(behavior).on("dblclick.zoom", null);
    return () => void selection.on(".zoom", null);
  }, [behavior]);

  const zoomBy = (k: number) => svg.current && select(svg.current).call(behavior.scaleBy, k);

  const toggle = (id: string) => {
    setTip(null); // a tap leaves the tooltip open over the newly shown nodes
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(id);
    }
  };

  const link = linkVertical<{ source: Point; target: Point }, [number, number]>()
    .source((l) => [l.source.x, l.source.y + NODE_H])
    .target((l) => [l.target.x, l.target.y]);

  const width = size?.width ?? 320;
  const height = size?.height ?? 420;

  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => zoomBy(1.25)}>
          <ZoomIn aria-hidden="true" /> Zoom in
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => zoomBy(0.8)}>
          <ZoomOut aria-hidden="true" /> Zoom out
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => size && reset(size)}>
          <Maximize aria-hidden="true" /> Reset view
        </Button>
      </figcaption>
      <div
        ref={box}
        role="group"
        aria-label="Budget tree"
        aria-describedby={summaryId}
        className="relative h-[420px] w-full overflow-hidden rounded-lg border bg-background md:h-[520px]"
      >
        <svg
          ref={svg}
          width={width}
          height={height}
          className="block cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          <g transform={transform.toString()}>
            {links.map((l) => (
              <path
                key={`${l.source.data.id}-${l.target.data.id}`}
                d={link(l) ?? undefined}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.5}
              />
            ))}
            {nodes.map((n) => (
              <TreeNode
                key={n.data.id}
                node={n}
                currency={currency}
                expanded={!collapsed.has(n.data.id)}
                onToggle={() => toggle(n.data.id)}
                onKey={(e) => onKey(e, n.data.id)}
                onShowTip={() => setTip(n)}
                onHideTip={() => setTip((t) => (t === n ? null : t))}
              />
            ))}
          </g>
        </svg>
        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 max-w-[calc(100%-8px)] rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{
              left: Math.max(4, Math.min(transform.applyX(tip.x - NODE_W / 2), width - 220)),
              top: Math.min(transform.applyY(tip.y + NODE_H) + 6, height - 56),
            }}
          >
            <p className="font-semibold break-words">{tip.data.label}</p>
            <p>{signedMoney(tip.data.amount, currency)}</p>
          </div>
        )}
      </div>
    </figure>
  );
}

type NodeProps = {
  node: Point;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  onKey: (e: KeyboardEvent) => void;
  onShowTip: () => void;
  onHideTip: () => void;
};

function TreeNode({ node, currency, expanded, onToggle, onKey, onShowTip, onHideTip }: NodeProps) {
  const { kind, label, amount, sign, children } = node.data;
  const collapsible = (kind === "group" || kind === "category") && children.length > 0;
  const money = signedMoney(amount, currency);
  const positive = kind === "root" && sign === "positive";
  const negative = kind === "root" && sign === "negative";
  const fill = positive ? "var(--positive)" : "var(--card)";
  const stroke = negative ? "var(--destructive)" : positive ? "var(--positive)" : "var(--border)";
  const text = positive
    ? "var(--positive-foreground)"
    : negative
      ? "var(--destructive)"
      : "var(--card-foreground)";
  const labelColor = kind === "group" ? "var(--primary)" : text;
  const room = NODE_W - 20 - (collapsible ? 18 : 0);
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const a11y = collapsible
    ? { role: "button", "aria-expanded": expanded, onClick: onToggle, onKeyDown: onKey }
    : { role: "img" };

  return (
    <g
      transform={`translate(${node.x - NODE_W / 2},${node.y})`}
      tabIndex={0}
      aria-label={`${label}, ${money}`}
      className={`group outline-none ${collapsible ? "cursor-pointer" : ""}`}
      onMouseEnter={onShowTip}
      onMouseLeave={onHideTip}
      onFocus={onShowTip}
      onBlur={onHideTip}
      {...a11y}
    >
      <rect
        x={-4}
        y={-4}
        width={NODE_W + 8}
        height={NODE_H + 8}
        rx={14}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={2}
        className="opacity-0 group-focus-visible:opacity-100"
      />
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={negative || kind === "root" ? 2 : 1}
      />
      <text
        x={10}
        y={21}
        fill={labelColor}
        className={`text-[12px] ${kind === "item" ? "" : "font-semibold"}`}
      >
        {truncate(label, room)}
      </text>
      <text x={10} y={40} fill={text} className="text-[12px]">
        {truncate(money, NODE_W - 20)}
      </text>
      {collapsible && (
        <Chevron
          x={NODE_W - 24}
          y={NODE_H / 2 - 8}
          width={16}
          height={16}
          color={labelColor}
          aria-hidden="true"
        />
      )}
    </g>
  );
}
