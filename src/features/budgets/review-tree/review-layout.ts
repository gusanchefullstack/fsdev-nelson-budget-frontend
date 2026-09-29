import { hierarchy, tree, zoomIdentity, type HierarchyPointNode, type ZoomTransform } from "d3";
import type { ReviewTreeNode } from "./review-summary";

export const NODE_W = 168;
export const NODE_H = 52;
const GAP_X = 16;
const GAP_Y = 44;
const PAD = 16;
export const READABLE_SCALE = 0.7; // first view never starts smaller (owner review, T029)
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 2.5;
export const CHAR_W = 7.3; // Roboto Mono at 12px

export type Size = { width: number; height: number };
type Bounds = { x0: number; x1: number; y0: number; y1: number };
export type Point = HierarchyPointNode<ReviewTreeNode>;

export function layout(root: ReviewTreeNode, collapsed: Set<string>) {
  const h = hierarchy(root, (d) => (collapsed.has(d.id) ? undefined : d.children));
  // Equal spacing for siblings and cousins; the gap is already in nodeSize
  const laidOut = tree<ReviewTreeNode>()
    .nodeSize([NODE_W + GAP_X, NODE_H + GAP_Y])
    .separation(() => 1)(h);
  const nodes: Point[] = [];
  laidOut.eachBefore((n) => nodes.push(n)); // depth-first, so Tab follows the tree
  const bounds = nodes.reduce<Bounds>(
    (b, n) => ({
      x0: Math.min(b.x0, n.x - NODE_W / 2),
      x1: Math.max(b.x1, n.x + NODE_W / 2),
      y0: Math.min(b.y0, n.y),
      y1: Math.max(b.y1, n.y + NODE_H),
    }),
    { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity },
  );
  return { nodes, links: laidOut.links(), bounds };
}

function fitScale(b: Bounds, size: Size) {
  return Math.min(
    1,
    (size.width - 2 * PAD) / (b.x1 - b.x0),
    (size.height - 2 * PAD) / (b.y1 - b.y0),
  );
}

export function fitTransform(b: Bounds, size: Size): ZoomTransform {
  const k = fitScale(b, size);
  const x = size.width / 2 - k * ((b.x0 + b.x1) / 2);
  const y = size.height / 2 - k * ((b.y0 + b.y1) / 2);
  return zoomIdentity.translate(x, y).scale(k);
}

/**
 * Readable first view (FR-013): collapse categories, then groups, until the tree fits the box
 * at READABLE_SCALE or more.
 */
export function initialCollapsed(root: ReviewTreeNode, size: Size): Set<string> {
  const none = new Set<string>();
  if (fitScale(layout(root, none).bounds, size) >= READABLE_SCALE) return none;
  const categories = new Set(root.children.flatMap((g) => g.children.map((c) => c.id)));
  if (fitScale(layout(root, categories).bounds, size) >= READABLE_SCALE) return categories;
  return new Set([...categories, ...root.children.map((g) => g.id)]);
}
