import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { useCreateBudget } from "@/features/budgets/api";
import { budgetSchema } from "@/features/budgets/schemas";
import { BudgetTree } from "@/features/budgets/tree/budget-tree";
import { errorMessage } from "@/lib/error-messages";
import { zodFields } from "@/lib/forms";
import { draftPayload, useBudgetDraft } from "@/stores/budget-draft";

export const Route = createFileRoute("/_authed/budgets/new/complete")({
  component: CompleteBudget,
});

// FR-016 Complete: the whole budget on one screen as a tree, saved in one operation.
function CompleteBudget() {
  const { info, categories, setInfo, reset } = useBudgetDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const create = useCreateBudget();
  const navigate = useNavigate();
  const set =
    (field: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setInfo({ ...info, [field]: e.target.value });

  function save() {
    const parsed = budgetSchema.safeParse({ ...info, description: info.description ?? "" });
    if (!parsed.success) {
      setErrors(zodFields(parsed.error));
      return setFailure("Please complete the budget details.");
    }
    setErrors({});
    setFailure(undefined);
    create.mutate(draftPayload(info, categories), {
      onSuccess: ({ data, notices }) => {
        notices?.forEach((n) => toast.info(n.message));
        toast.success("Budget created.");
        reset();
        void navigate({ to: "/budgets/$budgetId", params: { budgetId: data.id } });
      },
      onError: (err) => setFailure(`${errorMessage(err)} Nothing was saved and your tree is kept.`),
    });
  }

  return (
    <section aria-labelledby="complete-title" className="grid gap-6">
      <h1 id="complete-title" className="text-2xl font-bold">
        New budget (Complete)
      </h1>
      <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
        <legend className="px-1 font-semibold">Budget</legend>
        <FormField
          id="c-name"
          label="Name"
          required
          error={errors.name}
          className="grid gap-1.5 md:col-span-4"
        >
          {(a) => <Input {...a} value={info.name} onChange={set("name")} />}
        </FormField>
        <FormField id="c-currency" label="Currency" required error={errors.currency}>
          {(a) => (
            <NativeSelect {...a} value={info.currency} onChange={set("currency")}>
              <option value="USD">USD</option>
              <option value="COP">COP</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="c-start" label="Start date" required error={errors.startDate}>
          {(a) => <Input {...a} type="date" value={info.startDate} onChange={set("startDate")} />}
        </FormField>
        <FormField id="c-end" label="End date" required error={errors.endDate}>
          {(a) => <Input {...a} type="date" value={info.endDate} onChange={set("endDate")} />}
        </FormField>
      </fieldset>
      <p className="text-sm text-muted-foreground">
        Add categories and items below. Drag an item by its handle to another category of the same
        type, or use its “Move to” menu.
      </p>
      <BudgetTree />
      {failure && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 px-3 py-2 text-destructive"
        >
          {failure}
        </p>
      )}
      <Button onClick={save} disabled={create.isPending} className="justify-self-start">
        {create.isPending ? "Saving…" : "Save budget"}
      </Button>
    </section>
  );
}
