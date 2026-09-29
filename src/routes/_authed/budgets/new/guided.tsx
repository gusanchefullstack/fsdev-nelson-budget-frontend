import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { defineStepper } from "@stepperize/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/features/budgets/budget-form";
import { budgetPreviewQuery, useCreateBudget, type CategoryType } from "@/features/budgets/api";
import { reviewSummary, toTreeData } from "@/features/budgets/review-tree/review-summary";
import { ReviewTree } from "@/features/budgets/review-tree/review-tree";
import { ApiError } from "@/lib/api";
import {
  AddDraftCategory,
  AddDraftItem,
  DraftItemSummary,
  RemoveButton,
} from "@/features/budgets/draft-parts";
import { errorMessage } from "@/lib/error-messages";
import { formatDate } from "@/lib/temporal";
import { draftPayload, useBudgetDraft } from "@/stores/budget-draft";

export const Route = createFileRoute("/_authed/budgets/new/guided")({ component: GuidedBudget });

// FR-016 Guided: basic info → income categories → income items → expense categories → expense items → review
const wizard = defineStepper([
  { id: "info", title: "Basic info" },
  { id: "incomeCategories", title: "Income categories" },
  { id: "incomeItems", title: "Income items" },
  { id: "expenseCategories", title: "Expense categories" },
  { id: "expenseItems", title: "Expense items" },
  { id: "review", title: "Review" },
]);

function GuidedBudget() {
  const stepper = wizard.useStepper();
  const { info, setInfo } = useBudgetDraft();

  return (
    <section aria-labelledby="guided-title" className="grid gap-6">
      <h1 id="guided-title" className="text-2xl font-bold">
        New budget (Guided)
      </h1>
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Steps">
        {stepper.steps.map((step, i) => (
          <li
            key={step.id}
            aria-current={step.id === stepper.id ? "step" : undefined}
            className="rounded-full border px-3 py-1 aria-[current=step]:bg-primary aria-[current=step]:text-primary-foreground"
          >
            {i + 1}. {step.title}
          </li>
        ))}
      </ol>
      <h2
        className="text-xl font-semibold"
        tabIndex={-1}
        key={stepper.id}
        ref={(el) => el?.focus()}
      >
        Step {stepper.index + 1} of {stepper.count}: {stepper.current.title}
      </h2>
      {stepper.match({
        info: () => (
          <div className="max-w-2xl">
            <BudgetForm
              initial={info}
              submitLabel="Next"
              onSubmit={(data) => {
                setInfo({ ...data, description: data.description ?? "" });
                void stepper.next();
              }}
            />
          </div>
        ),
        incomeCategories: () => <CategoriesStep type="INCOME" />,
        incomeItems: () => <ItemsStep type="INCOME" />,
        expenseCategories: () => <CategoriesStep type="EXPENSE" />,
        expenseItems: () => <ItemsStep type="EXPENSE" />,
        review: () => <ReviewStep />,
      })}
      {!stepper.isFirst && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void stepper.prev()}>
            Back
          </Button>
          {!stepper.isLast && <Button onClick={() => void stepper.next()}>Next</Button>}
        </div>
      )}
    </section>
  );
}

function CategoriesStep({ type }: { type: CategoryType }) {
  const { categories, removeCategory } = useBudgetDraft();
  const list = categories.filter((c) => c.type === type);
  return (
    <div className="grid max-w-2xl gap-4">
      {list.length === 0 ? (
        <p className="text-muted-foreground">
          No {type === "INCOME" ? "income" : "expense"} categories yet. You can also add them later.
        </p>
      ) : (
        <ul className="grid gap-1">
          {list.map((c) => (
            <li
              key={c.key}
              className="flex items-center justify-between rounded-md border px-3 py-1"
            >
              {c.name}
              <RemoveButton
                label={`Remove category ${c.name}`}
                onClick={() => removeCategory(c.key)}
              />
            </li>
          ))}
        </ul>
      )}
      <AddDraftCategory type={type} />
    </div>
  );
}

function ItemsStep({ type }: { type: CategoryType }) {
  const { categories, info, removeItem } = useBudgetDraft();
  const list = categories.filter((c) => c.type === type);
  if (list.length === 0)
    return (
      <p className="text-muted-foreground">
        Add a category in the previous step first, or skip this step.
      </p>
    );
  return (
    <div className="grid gap-4">
      {list.map((c) => (
        <section key={c.key} aria-label={c.name} className="grid gap-2 rounded-lg border p-4">
          <h3 className="font-semibold">{c.name}</h3>
          {c.items.length > 0 && (
            <ul className="grid gap-1">
              {c.items.map((i) => (
                <li key={i.key} className="flex items-center justify-between gap-2">
                  <DraftItemSummary item={i} currency={info.currency} />
                  <RemoveButton label={`Remove item ${i.name}`} onClick={() => removeItem(i.key)} />
                </li>
              ))}
            </ul>
          )}
          <div>
            <AddDraftItem category={c} />
          </div>
        </section>
      ))}
    </div>
  );
}

/** Planned-totals tree from the read-only preview, recalculated on every visit (spec 003). */
function PlannedTotals() {
  const { info, categories } = useBudgetDraft();
  const payload = useMemo(() => draftPayload(info, categories), [info, categories]);
  const preview = useQuery(budgetPreviewQuery(payload));
  const data = preview.data;
  const root = useMemo(() => data && toTreeData(categories, data), [categories, data]);

  if (preview.isError) {
    const fixable =
      preview.error instanceof ApiError &&
      (preview.error.code === "VALIDATION_ERROR" || preview.error.code === "CONFLICT");
    return (
      <div
        role="alert"
        className="grid justify-items-start gap-2 rounded-md border border-destructive/50 px-3 py-2 text-destructive"
      >
        <p>
          {errorMessage(preview.error)}
          {fixable ? " Go Back to fix it." : " Your entries are kept."}
        </p>
        {!fixable && (
          <Button variant="outline" size="sm" onClick={() => void preview.refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  }
  if (!data || !root) {
    return (
      <div
        aria-busy="true"
        className="grid h-[420px] place-items-center rounded-lg border bg-muted text-muted-foreground md:h-[520px]"
      >
        Calculating planned totals…
      </div>
    );
  }
  return (
    <>
      {data.notices.length > 0 && (
        <ul role="status" className="grid gap-1 text-sm">
          {data.notices.map((n) => (
            <li key={n.message}>{n.message}</li>
          ))}
        </ul>
      )}
      <ReviewTree
        key={preview.dataUpdatedAt}
        root={root}
        currency={info.currency}
        summaryId="review-summary"
      />
      <p id="review-summary" className="sr-only">
        {reviewSummary(info, categories, data)}
      </p>
    </>
  );
}

function ReviewStep() {
  const { info, categories, reset } = useBudgetDraft();
  const create = useCreateBudget();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string>();

  function save() {
    setFailure(undefined);
    create.mutate(draftPayload(info, categories), {
      onSuccess: ({ data, notices }) => {
        notices?.forEach((n) => toast.info(n.message));
        toast.success("Budget created.");
        // Clear the draft after leaving, so the review doesn't re-preview an empty draft
        void navigate({ to: "/budgets/$budgetId", params: { budgetId: data.id } }).then(reset);
      },
      // All-or-nothing: nothing was saved, and the draft is kept for a retry.
      onError: (err) => setFailure(errorMessage(err)),
    });
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <p>
        <strong>{info.name}</strong> · {info.currency} · {formatDate(info.startDate)} –{" "}
        {formatDate(info.endDate)}
      </p>
      <PlannedTotals />
      {failure && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 px-3 py-2 text-destructive"
        >
          {failure} Nothing was saved and your entries are kept. You can try again.
        </p>
      )}
      <Button onClick={save} disabled={create.isPending} className="justify-self-start">
        {create.isPending ? "Creating…" : failure ? "Try again" : "Create budget"}
      </Button>
    </div>
  );
}
