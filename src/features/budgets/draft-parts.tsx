import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/form-dialog";
import { FormField } from "@/components/form-field";
import { ItemForm } from "@/features/items/item-form";
import { FREQUENCY_LABELS } from "@/features/items/api";
import { formatMoney } from "@/lib/temporal";
import { useBudgetDraft, type DraftCategory } from "@/stores/budget-draft";
import type { CategoryType } from "./api";

/** Inline "add category" form used by the Guided and Complete modes. */
export function AddDraftCategory({ type }: { type: CategoryType }) {
  const addCategory = useBudgetDraft((s) => s.addCategory);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const noun = type === "INCOME" ? "income" : "expense";
  function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a category name.");
    if (trimmed.length > 80) return setError("Use 80 characters or fewer.");
    addCategory(type, trimmed, "");
    setName("");
    setError(undefined);
  }
  return (
    <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-2">
      <FormField
        id={`new-${type}-category`}
        label={`New ${noun} category`}
        error={error}
        className="grid min-w-0 flex-1 gap-1.5"
      >
        {(a) => (
          <Input
            {...a}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "INCOME" ? "e.g. Salaries" : "e.g. Utilities"}
          />
        )}
      </FormField>
      <Button type="submit" variant="outline">
        <PlusIcon aria-hidden="true" /> Add category
      </Button>
    </form>
  );
}

/** Add an item to a draft category, reusing the regular item form. */
export function AddDraftItem({ category }: { category: DraftCategory }) {
  const [open, setOpen] = useState(false);
  const info = useBudgetDraft((s) => s.info);
  const addItem = useBudgetDraft((s) => s.addItem);
  return (
    <FormDialog
      wide
      title={`New item in ${category.name}`}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" size="sm">
          <PlusIcon aria-hidden="true" /> Add item to {category.name}
        </Button>
      }
    >
      <ItemForm
        key={open ? "open" : "closed"}
        budget={info}
        onSubmit={(item) => {
          addItem(category.key, item);
          setOpen(false);
        }}
      />
    </FormDialog>
  );
}

export function DraftItemSummary({
  item,
  currency,
}: {
  item: DraftCategory["items"][number];
  currency: string;
}) {
  return (
    <span>
      {item.name} ·{" "}
      {FREQUENCY_LABELS[item.frequency].replace("N", String(item.customInterval ?? "N"))} ·{" "}
      {formatMoney(item.estimatedAmount, currency)}
    </span>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onClick}>
      <Trash2Icon aria-hidden="true" />
    </Button>
  );
}
