import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { budgetQuery, budgetsQuery } from "@/features/budgets/api";
import { partiesQuery } from "@/features/parties/api";
import { useZodForm } from "@/lib/forms";
import type { Transaction, TransactionInput } from "./api";

const schema = z.object({
  budgetId: z.string().min(1, "Choose a budget."),
  itemId: z.string().min(1, "Choose a budget item."),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter an amount with up to 2 decimals.")
    .refine((v) => Number(v) > 0, "The amount must be greater than 0."),
  localDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time."),
  accountId: z.string().min(1, "Choose an account."),
  counterpartyId: z.string().min(1, "Choose who paid or who you paid."),
});

type Props = {
  /** Timezone the date and time are read in: the profile's for new, the recorded one for edits (FR-042a). */
  timezone: string;
  transaction?: Transaction;
  initialBudgetId?: string;
  pending?: boolean;
  onSubmit: (data: TransactionInput, setServerErrors: (e: unknown) => void) => void;
};

export function TransactionForm({
  timezone,
  transaction,
  initialBudgetId,
  pending,
  onSubmit,
}: Props) {
  const form = useZodForm(schema, {
    budgetId: transaction?.budgetId ?? initialBudgetId ?? "",
    itemId: transaction?.itemId ?? "",
    amount: transaction?.amount ?? "",
    localDateTime: transaction?.localDateTime ?? "",
    accountId: transaction?.accountId ?? "",
    counterpartyId: transaction?.payorId ?? transaction?.vendorId ?? "",
  });
  const budgets = useQuery(budgetsQuery);
  const budget = useQuery({
    ...budgetQuery(form.values.budgetId),
    enabled: !!form.values.budgetId,
  });
  const accounts = useQuery(partiesQuery("accounts"));
  const payors = useQuery(partiesQuery("payors"));
  const vendors = useQuery(partiesQuery("vendors"));

  const items =
    budget.data?.categories.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name }))) ?? [];
  const item = items.find((i) => i.id === form.values.itemId);
  const isIncome = item?.type === "INCOME";
  const currency = budget.data?.currency;
  const accountOptions = (accounts.data ?? []).filter((a) => !currency || a.currency === currency);
  const counterparties = (isIncome ? payors.data : vendors.data) ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    onSubmit(
      {
        itemId: data.itemId,
        amount: data.amount,
        localDateTime: data.localDateTime,
        accountId: data.accountId,
        payorId: isIncome ? data.counterpartyId : null,
        vendorId: isIncome ? null : data.counterpartyId,
      },
      (err) => {
        form.applyServerErrors(err);
        const fields = (err as { fields?: Record<string, string> }).fields;
        if (fields?.payorId || fields?.vendorId)
          form.setErrors((e) => ({ ...e, counterpartyId: fields.payorId ?? fields.vendorId! }));
      },
    );
  }

  const accountSelect = (label: string) => (
    <FormField
      id="tx-account"
      label={label}
      required
      error={form.errors.accountId}
      hint={currency ? `Only ${currency} accounts can be used.` : undefined}
    >
      {(a) => (
        <NativeSelect
          {...a}
          value={form.values.accountId}
          onChange={(e) => form.set("accountId")(e.target.value)}
        >
          <option value="">Choose an account</option>
          {accountOptions.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.currency})
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
  const counterpartySelect = (
    <FormField
      id="tx-counterparty"
      label={isIncome ? "From (payor)" : "To (vendor)"}
      required
      error={form.errors.counterpartyId}
    >
      {(a) => (
        <NativeSelect
          {...a}
          value={form.values.counterpartyId}
          onChange={(e) => form.set("counterpartyId")(e.target.value)}
        >
          <option value="">{isIncome ? "Choose a payor" : "Choose a vendor"}</option>
          {counterparties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );

  return (
    <form onSubmit={submit} noValidate className="grid max-w-2xl gap-4 md:grid-cols-2">
      <FormField id="tx-budget" label="Budget" required error={form.errors.budgetId}>
        {(a) => (
          <NativeSelect
            {...a}
            value={form.values.budgetId}
            onChange={(e) =>
              form.setValues((v) => ({
                ...v,
                budgetId: e.target.value,
                itemId: "",
                accountId: "",
                counterpartyId: "",
              }))
            }
          >
            <option value="">Choose a budget</option>
            {budgets.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.currency})
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField id="tx-item" label="Budget item" required error={form.errors.itemId}>
        {(a) => (
          <NativeSelect
            {...a}
            disabled={!budget.data}
            value={form.values.itemId}
            onChange={(e) =>
              form.setValues((v) => ({ ...v, itemId: e.target.value, counterpartyId: "" }))
            }
          >
            <option value="">Choose an item</option>
            {(["INCOME", "EXPENSE"] as const).map((type) => (
              <optgroup key={type} label={type === "INCOME" ? "Income" : "Expenses"}>
                {items
                  .filter((i) => i.type === type)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.category} · {i.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {item && (
        <p className="text-sm md:col-span-2" aria-live="polite">
          This is an <strong>{isIncome ? "income" : "expense"}</strong>:{" "}
          {isIncome
            ? "a payor pays into one of your accounts."
            : "you pay a vendor from one of your accounts."}
        </p>
      )}
      <FormField
        id="tx-amount"
        label={`Amount${currency ? ` (${currency})` : ""}`}
        required
        error={form.errors.amount}
      >
        {(a) => (
          <Input
            {...a}
            inputMode="decimal"
            value={form.values.amount}
            onChange={(e) => form.set("amount")(e.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="tx-when"
        label="Date and time"
        required
        error={form.errors.localDateTime}
        hint={`In your timezone: ${timezone.replaceAll("_", " ")}.`}
      >
        {(a) => (
          <Input
            {...a}
            type="datetime-local"
            value={form.values.localDateTime}
            onChange={(e) => form.set("localDateTime")(e.target.value)}
          />
        )}
      </FormField>
      {isIncome ? (
        <>
          {counterpartySelect}
          {accountSelect("To (account)")}
        </>
      ) : (
        <>
          {accountSelect("From (account)")}
          {counterpartySelect}
        </>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {transaction ? "Save transaction" : "Record transaction"}
      </Button>
    </form>
  );
}
