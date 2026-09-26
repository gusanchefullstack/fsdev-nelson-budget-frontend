import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { useZodForm } from "@/lib/forms";
import { FREQUENCY_LABELS, type Frequency, type Item, type ItemInput } from "./api";
import { itemSchema } from "./schemas";

type Props = {
  budget: { startDate: string; endDate: string; currency: string };
  item?: Item;
  pending?: boolean;
  onSubmit: (data: ItemInput, setServerErrors: (e: unknown) => void) => void;
};

/** Item fields (FR-012–FR-015); dates default to the budget's range. */
export function ItemForm({ budget, item, pending, onSubmit }: Props) {
  const form = useZodForm(itemSchema, {
    name: item?.name ?? "",
    description: item?.description ?? "",
    startDate: item?.startDate ?? budget.startDate,
    endDate: item?.endDate ?? budget.endDate,
    estimatedAmount: item?.estimatedAmount ?? "",
    firstExpectedDate: item?.firstExpectedDate ?? "",
    frequency: item?.frequency ?? "MONTHLY",
    customInterval: item?.customInterval ? String(item.customInterval) : "",
  });
  const custom = form.values.frequency.startsWith("CUSTOM_");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    onSubmit(
      {
        ...data,
        customInterval: data.frequency.startsWith("CUSTOM_") ? Number(data.customInterval) : null,
      },
      form.applyServerErrors,
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <FormField
        id="item-name"
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
        id="item-description"
        label="Description"
        required
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
        id="item-amount"
        label={`Estimated amount (${budget.currency})`}
        required
        error={form.errors.estimatedAmount}
      >
        {(a) => (
          <Input
            {...a}
            inputMode="decimal"
            value={form.values.estimatedAmount}
            onChange={(e) => form.set("estimatedAmount")(e.target.value)}
          />
        )}
      </FormField>
      <FormField id="item-frequency" label="Frequency" required error={form.errors.frequency}>
        {(a) => (
          <NativeSelect
            {...a}
            value={form.values.frequency}
            onChange={(e) => form.set("frequency")(e.target.value as Frequency)}
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {custom && (
        <FormField
          id="item-interval"
          label={
            form.values.frequency === "CUSTOM_DAYS"
              ? "Repeat every (days)"
              : "Repeat every (months)"
          }
          required
          error={form.errors.customInterval}
        >
          {(a) => (
            <Input
              {...a}
              inputMode="numeric"
              value={form.values.customInterval}
              onChange={(e) => form.set("customInterval")(e.target.value)}
            />
          )}
        </FormField>
      )}
      <FormField
        id="item-first"
        label="First expected date"
        required
        error={form.errors.firstExpectedDate}
        hint="Later occurrences repeat from this date."
        className={custom ? "grid gap-1.5" : "grid gap-1.5 md:col-span-2"}
      >
        {(a) => (
          <Input
            {...a}
            type="date"
            value={form.values.firstExpectedDate}
            onChange={(e) => form.set("firstExpectedDate")(e.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="item-start"
        label="Start date"
        required
        error={form.errors.startDate}
        hint="Kept inside the budget's dates."
      >
        {(a) => (
          <Input
            {...a}
            type="date"
            value={form.values.startDate}
            onChange={(e) => form.set("startDate")(e.target.value)}
          />
        )}
      </FormField>
      <FormField id="item-end" label="End date" required error={form.errors.endDate}>
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
        {item ? "Save item" : "Add item"}
      </Button>
    </form>
  );
}
