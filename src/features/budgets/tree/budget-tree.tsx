import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useBudgetDraft } from "@/stores/budget-draft";
import { SectionNode } from "./tree-nodes";

const name = (data: unknown) => (data as { name?: string } | undefined)?.name ?? "item";

// Screen-reader announcements for drag and drop (FR-017, WCAG).
const announcements: Announcements = {
  onDragStart: ({ active }) =>
    `Picked up ${name(active.data.current)}. Use arrow keys to move, space to drop, escape to cancel.`,
  onDragOver: ({ active, over }) =>
    over
      ? `${name(active.data.current)} is over a category.`
      : `${name(active.data.current)} is not over a category.`,
  onDragEnd: ({ active, over }) =>
    over ? `Dropped ${name(active.data.current)}.` : `${name(active.data.current)} was not moved.`,
  onDragCancel: ({ active }) => `Moving ${name(active.data.current)} was cancelled.`,
};

// Drop where the pointer is; fall back to overlap for keyboard dragging (no pointer).
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/** Budget → Income / Expenses → categories → items, with drag and drop between same-type categories. */
export function BudgetTree() {
  const { categories, info, moveItem } = useBudgetDraft();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const moved = moveItem(String(active.id), String(over.id));
    const from = categories.find((c) => c.items.some((i) => i.key === active.id));
    if (!moved && from && from.key !== over.id)
      toast.error("Items can only move to a category of the same type (income or expense).");
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragEnd={onDragEnd}
      accessibility={{ announcements }}
    >
      <ul className="grid gap-6" aria-label={`${info.name || "New budget"} structure`}>
        <SectionNode type="INCOME" categories={categories} currency={info.currency} />
        <SectionNode type="EXPENSE" categories={categories} currency={info.currency} />
      </ul>
    </DndContext>
  );
}
