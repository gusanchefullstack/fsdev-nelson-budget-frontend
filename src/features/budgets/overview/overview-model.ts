import type { BudgetDetail, CategoryType, Figures } from "@/features/budgets/api";

export type OverviewStatus = "over" | "under" | "onTrack";

export type OverviewRow = {
  id: string;
  kind: "budget" | "group" | "category" | "item";
  type?: CategoryType;
  name: string;
  estimatedTotal: string;
  actual: string;
  estimatedToDate?: string;
  status?: OverviewStatus;
  adverse: boolean;
  share: number;
  exceeded: boolean;
  children: OverviewRow[];
};

const cents = (v: string) => Math.round(Number(v) * 100);
const fmt = (c: number) => (c / 100).toFixed(2);

/** Spec 004 FR-008: off track when the actual is more than 10% away from the estimate to date. */
export function status(estimatedToDate: string, actual: string): OverviewStatus {
  const e = cents(estimatedToDate);
  const a = cents(actual);
  if (a * 100 > e * 110 || (e === 0 && a > 0)) return "over";
  if (a * 100 < e * 90) return "under";
  return "onTrack";
}

function row(
  id: string,
  kind: "group" | "category" | "item",
  type: CategoryType,
  name: string,
  f: Figures,
  children: OverviewRow[] = [],
): OverviewRow {
  const s = status(f.estimatedToDate, f.actual);
  const total = cents(f.estimatedTotal);
  const actual = cents(f.actual);
  return {
    id,
    kind,
    type,
    name,
    ...f,
    status: s,
    adverse: (type === "EXPENSE" && s === "over") || (type === "INCOME" && s === "under"),
    share: total > 0 ? Math.min(actual / total, 1) : actual > 0 ? 1 : 0,
    exceeded: actual > total,
    children,
  };
}

const sumFigures = (list: Figures[]): Figures => {
  const add = (key: keyof Figures) => fmt(list.reduce((n, f) => n + cents(f[key]), 0));
  return {
    estimatedTotal: add("estimatedTotal"),
    estimatedToDate: add("estimatedToDate"),
    actual: add("actual"),
  };
};

export function toOverview(budget: BudgetDetail): OverviewRow {
  const group = (type: CategoryType) => {
    const categories = budget.categories.filter((c) => c.type === type);
    return row(
      type,
      "group",
      type,
      type === "INCOME" ? "Income" : "Expenses",
      sumFigures(categories.map((c) => c.figures)),
      categories.map((c) =>
        row(
          c.id,
          "category",
          type,
          c.name,
          c.figures,
          c.items.map((i) => row(i.id, "item", type, i.name, i.figures)),
        ),
      ),
    );
  };
  return {
    id: "budget",
    kind: "budget",
    name: budget.name,
    estimatedTotal: fmt(cents(budget.estimatedIncomeTotal) - cents(budget.estimatedExpenseTotal)),
    actual: fmt(cents(budget.actualIncome) - cents(budget.actualExpense)),
    adverse: false,
    share: 0,
    exceeded: false,
    children: [group("INCOME"), group("EXPENSE")],
  };
}

/** FR-012: large budgets (more than 10 items) start with categories collapsed. */
export function initialCollapsed(root: OverviewRow): Set<string> {
  const categories = root.children.flatMap((g) => g.children);
  const items = categories.reduce((n, c) => n + c.children.length, 0);
  if (items <= 10) return new Set();
  return new Set(categories.filter((c) => c.children.length > 0).map((c) => c.id));
}
