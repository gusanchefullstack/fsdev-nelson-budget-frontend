import type { CategoryType } from "@/features/budgets/api";
import { DraftItemSummary } from "@/features/budgets/draft-parts";
import { useBudgetDraft } from "@/stores/budget-draft";

/** Guided Review: the draft as an outline, read from the store only (spec 004 FR-016, FR-017). */
export function ReviewOutline() {
  return (
    <div className="grid gap-6">
      <Side type="INCOME" />
      <Side type="EXPENSE" />
    </div>
  );
}

function Side({ type }: { type: CategoryType }) {
  const { info, categories } = useBudgetDraft();
  const list = categories.filter((c) => c.type === type);
  const id = type === "INCOME" ? "review-income" : "review-expense";
  const title = type === "INCOME" ? "Income" : "Expenses";

  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h3 id={id} className="text-lg font-semibold text-primary">
        {title}
      </h3>
      {list.length === 0 ? (
        <p className="text-muted-foreground">
          No {type === "INCOME" ? "income" : "expense"} categories
        </p>
      ) : (
        <ul className="grid gap-3">
          {list.map((c) => (
            <li
              key={c.key}
              className="grid gap-2 rounded-lg border bg-card p-4 text-card-foreground"
            >
              <h4 className="font-semibold break-words">{c.name}</h4>
              {c.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items</p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {c.items.map((i) => (
                    <li
                      key={i.key}
                      className="border-t pt-1 break-words first:border-t-0 first:pt-0"
                    >
                      <DraftItemSummary item={i} currency={info.currency} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
