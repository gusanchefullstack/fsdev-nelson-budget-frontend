import type { BudgetInput, BudgetPreview } from "@/features/budgets/api";
import { formatMoney } from "@/lib/temporal";
import type { DraftCategory } from "@/stores/budget-draft";

export type ReviewTreeNode = {
  id: string;
  kind: "root" | "group" | "category" | "item";
  label: string;
  amount: string;
  sign?: "positive" | "negative" | "zero";
  children: ReviewTreeNode[];
};

const signOf = (amount: string) =>
  Number(amount) > 0 ? "positive" : Number(amount) < 0 ? "negative" : "zero";

/** Money with a true minus sign ("−USD 10.00") so negatives read clearly (FR-014). */
export function signedMoney(amount: string, currency: string): string {
  const n = Number(amount);
  return n < 0 ? `−${formatMoney(Math.abs(n), currency)}` : formatMoney(n, currency);
}

/** Draft (names, keys) + preview (totals) → the review tree. Preview arrays follow draft order. */
export function toTreeData(categories: DraftCategory[], preview: BudgetPreview): ReviewTreeNode {
  const group = (type: "INCOME" | "EXPENSE"): ReviewTreeNode => ({
    id: type,
    kind: "group",
    label: type === "INCOME" ? "Incomes" : "Expenses",
    amount: type === "INCOME" ? preview.plannedIncome : preview.plannedExpense,
    children: categories.flatMap((c, ci) => {
      const p = preview.categories[ci];
      if (c.type !== type || !p) return [];
      return [
        {
          id: c.key,
          kind: "category" as const,
          label: c.name,
          amount: p.plannedTotal,
          children: c.items.map((item, ii) => ({
            id: item.key,
            kind: "item" as const,
            label: item.name,
            amount: p.items[ii]?.plannedTotal ?? "0.00",
            children: [],
          })),
        },
      ];
    }),
  });
  const sign = signOf(preview.plannedNet);
  return {
    id: "root",
    kind: "root",
    label: sign === "negative" ? "Net deficit" : "Net balance",
    amount: preview.plannedNet,
    sign,
    children: [group("INCOME"), group("EXPENSE")],
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One sentence describing the tree for screen readers (FR-016). */
export function reviewSummary(
  info: BudgetInput,
  categories: DraftCategory[],
  preview: BudgetPreview,
): string {
  const money = (a: string) => formatMoney(a, info.currency);
  const net = Number(preview.plannedNet);
  const netPhrase =
    net < 0
      ? `negative net balance of ${formatMoney(Math.abs(net), info.currency)}`
      : `net balance ${money(preview.plannedNet)}`;
  const incomes = categories.filter((c) => c.type === "INCOME").length;
  const expenses = categories.length - incomes;
  const items = categories.reduce((n, c) => n + c.items.length, 0);
  return (
    `${info.name}: planned income ${money(preview.plannedIncome)}, ` +
    `planned expenses ${money(preview.plannedExpense)}, ${netPhrase}. ` +
    `${plural(incomes, "income category", "income categories")} and ` +
    `${plural(expenses, "expense category", "expense categories")} with ${plural(items, "item", "items")}.`
  );
}
