import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { useZodForm } from "@/lib/forms";
import { budgetSchema } from "./schemas";
import type { BudgetInput } from "./api";

type Props = {
  initial?: Partial<BudgetInput>;
  submitLabel: string;
  pending?: boolean;
  currencyLocked?: boolean;
  onSubmit: (data: BudgetInput, setServerErrors: (e: unknown) => void) => void;
};

export function BudgetForm({ initial, submitLabel, pending, currencyLocked, onSubmit }: Props) {
  const form = useZodForm(budgetSchema, {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    currency: initial?.currency ?? "USD",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (data) onSubmit({ ...data, description: data.description || null }, form.applyServerErrors);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <FormField
        id="budget-name"
        label="Name"
        required
        error={form.errors.name}
        className="grid gap-1.5 md:col-span-2"
      >
        {(a) => (
          <Input
            {...a}
            value={form.values.name}
            onChange={(e) => form.set("name")(e.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="budget-description"
        label="Description"
        error={form.errors.description}
        className="grid gap-1.5 md:col-span-2"
      >
        {(a) => (
          <Textarea
            {...a}
            value={form.values.description}
            onChange={(e) => form.set("description")(e.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="budget-currency"
        label="Currency"
        required
        error={form.errors.currency}
        hint={currencyLocked ? "The currency can't change once the budget has items." : undefined}
      >
        {(a) => (
          <NativeSelect
            {...a}
            disabled={currencyLocked}
            value={form.values.currency}
            onChange={(e) => form.set("currency")(e.target.value as "USD" | "COP")}
          >
            <option value="USD">USD — US dollar</option>
            <option value="COP">COP — Colombian peso</option>
          </NativeSelect>
        )}
      </FormField>
      <div className="hidden md:block" />
      <FormField id="budget-start" label="Start date" required error={form.errors.startDate}>
        {(a) => (
          <Input
            {...a}
            type="date"
            value={form.values.startDate}
            onChange={(e) => form.set("startDate")(e.target.value)}
          />
        )}
      </FormField>
      <FormField id="budget-end" label="End date" required error={form.errors.endDate}>
        {(a) => (
          <Input
            {...a}
            type="date"
            value={form.values.endDate}
            onChange={(e) => form.set("endDate")(e.target.value)}
          />
        )}
      </FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
