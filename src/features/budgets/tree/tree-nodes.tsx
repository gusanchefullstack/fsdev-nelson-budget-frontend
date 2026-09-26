import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVerticalIcon } from "lucide-react";
import { NativeSelect } from "@/components/native-select";
import {
  AddDraftCategory,
  AddDraftItem,
  DraftItemSummary,
  RemoveButton,
} from "@/features/budgets/draft-parts";
import { cn } from "@/lib/utils";
import { useBudgetDraft, type DraftCategory, type DraftItem } from "@/stores/budget-draft";
import type { CategoryType } from "../api";

/** Draggable item row with a "Move to" menu as the non-drag alternative (FR-017). */
export function ItemNode({
  item,
  category,
  siblings,
  currency,
}: {
  item: DraftItem;
  category: DraftCategory;
  siblings: DraftCategory[];
  currency: string;
}) {
  const { moveItem, removeItem } = useBudgetDraft();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.key,
    data: { type: category.type, name: item.name },
  });
  const targets = siblings.filter((c) => c.key !== category.key);
  return (
    <li
      ref={setNodeRef}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border bg-card px-2 py-1",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <button
        type="button"
        className="grid size-8 cursor-grab place-items-center rounded-md hover:bg-muted"
        aria-label={`Drag ${item.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1">
        <DraftItemSummary item={item} currency={currency} />
      </span>
      {targets.length > 0 && (
        <NativeSelect
          aria-label={`Move ${item.name} to`}
          className="h-8 w-auto"
          value=""
          onChange={(e) => e.target.value && moveItem(item.key, e.target.value)}
        >
          <option value="">Move to…</option>
          {targets.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      )}
      <RemoveButton label={`Remove item ${item.name}`} onClick={() => removeItem(item.key)} />
    </li>
  );
}

/** A category is a drop target; it only accepts items of its own type. */
export function CategoryNode({
  category,
  siblings,
  currency,
}: {
  category: DraftCategory;
  siblings: DraftCategory[];
  currency: string;
}) {
  const removeCategory = useBudgetDraft((s) => s.removeCategory);
  const { setNodeRef, isOver, active } = useDroppable({
    id: category.key,
    data: { type: category.type },
  });
  const refused = isOver && active?.data.current?.type !== category.type;
  return (
    <li
      ref={setNodeRef}
      aria-label={`${category.name} category`}
      className={cn(
        "grid gap-2 rounded-lg border p-3 transition-colors",
        isOver && !refused && "border-primary bg-muted",
        refused && "border-destructive",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{category.name}</h4>
        <RemoveButton
          label={`Remove category ${category.name}`}
          onClick={() => removeCategory(category.key)}
        />
      </div>
      {category.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items. Drag one here or add a new one.</p>
      ) : (
        <ul className="grid gap-1">
          {category.items.map((i) => (
            <ItemNode
              key={i.key}
              item={i}
              category={category}
              siblings={siblings}
              currency={currency}
            />
          ))}
        </ul>
      )}
      <div>
        <AddDraftItem category={category} />
      </div>
    </li>
  );
}

export function SectionNode({
  type,
  categories,
  currency,
}: {
  type: CategoryType;
  categories: DraftCategory[];
  currency: string;
}) {
  const list = categories.filter((c) => c.type === type);
  const title = type === "INCOME" ? "Income" : "Expenses";
  return (
    <li className="grid gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {list.length > 0 && (
        <ul className="grid gap-3 border-l-2 pl-4" aria-label={`${title} categories`}>
          {list.map((c) => (
            <CategoryNode key={c.key} category={c} siblings={list} currency={currency} />
          ))}
        </ul>
      )}
      <div className="pl-4">
        <AddDraftCategory type={type} />
      </div>
    </li>
  );
}
