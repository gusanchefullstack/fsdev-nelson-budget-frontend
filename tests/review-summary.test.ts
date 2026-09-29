import { describe, expect, it } from "vitest";
import type { BudgetInput, BudgetPreview } from "@/features/budgets/api";
import {
  reviewSummary,
  signedMoney,
  toTreeData,
} from "@/features/budgets/review-tree/review-summary";
import type { DraftCategory } from "@/stores/budget-draft";

const draftItem = (key: string, name: string) => ({
  key,
  name,
  description: name,
  estimatedAmount: "10",
  firstExpectedDate: "2027-01-10",
  frequency: "MONTHLY" as const,
  customInterval: null,
});

const info: BudgetInput = {
  name: "Budget 2026",
  currency: "USD",
  startDate: "2026-09-28",
  endDate: "2027-04-30",
};

const categories: DraftCategory[] = [
  { key: "c1", type: "INCOME", name: "Savings", description: "", items: [] },
  {
    key: "c2",
    type: "EXPENSE",
    name: "Rent",
    description: "",
    items: [draftItem("i1", "Channel")],
  },
  {
    key: "c3",
    type: "EXPENSE",
    name: "Health",
    description: "",
    items: [draftItem("i2", "Kaiser"), draftItem("i3", "Dentist")],
  },
];

const preview = (net: string, income = "0.00", expense = "41230.00"): BudgetPreview => ({
  currency: "USD",
  plannedIncome: income,
  plannedExpense: expense,
  plannedNet: net,
  notices: [],
  categories: [
    { type: "INCOME", name: "Savings", plannedTotal: "0.00", items: [] },
    {
      type: "EXPENSE",
      name: "Rent",
      plannedTotal: "38430.00",
      items: [{ name: "Channel", plannedTotal: "38430.00", occurrences: 7 }],
    },
    {
      type: "EXPENSE",
      name: "Health",
      plannedTotal: "2800.00",
      items: [
        { name: "Kaiser", plannedTotal: "2800.00", occurrences: 7 },
        { name: "Dentist", plannedTotal: "0.00", occurrences: 0 },
      ],
    },
  ],
});

describe("toTreeData", () => {
  it("builds net → groups → categories → items with preview totals", () => {
    const root = toTreeData(categories, preview("-41230.00"));
    expect(root).toMatchObject({
      id: "root",
      kind: "root",
      sign: "negative",
      label: "Net deficit",
    });
    expect(root.children.map((g) => [g.id, g.label, g.amount])).toEqual([
      ["INCOME", "Incomes", "0.00"],
      ["EXPENSE", "Expenses", "41230.00"],
    ]);
    const [incomes, expenses] = root.children;
    expect(incomes!.children).toEqual([
      { id: "c1", kind: "category", label: "Savings", amount: "0.00", children: [] },
    ]);
    expect(expenses!.children.map((c) => c.id)).toEqual(["c2", "c3"]);
    expect(expenses!.children[1]!.children).toEqual([
      { id: "i2", kind: "item", label: "Kaiser", amount: "2800.00", children: [] },
      { id: "i3", kind: "item", label: "Dentist", amount: "0.00", children: [] },
    ]);
  });

  it("keeps both groups when there are no categories", () => {
    const root = toTreeData([], { ...preview("0.00", "0.00", "0.00"), categories: [] });
    expect(root.children.map((g) => [g.id, g.children.length])).toEqual([
      ["INCOME", 0],
      ["EXPENSE", 0],
    ]);
  });

  it("signs the root by the net balance", () => {
    expect(toTreeData(categories, preview("5.00")).sign).toBe("positive");
    expect(toTreeData(categories, preview("5.00")).label).toBe("Net balance");
    expect(toTreeData(categories, preview("0.00")).sign).toBe("zero");
    expect(toTreeData(categories, preview("-0.01")).sign).toBe("negative");
  });
});

// Intl puts a no-break space after the currency code
const norm = (s: string) => s.replace(/\u00a0/g, " ");

describe("reviewSummary", () => {
  it("describes a negative net with its absolute value", () => {
    expect(norm(reviewSummary(info, categories, preview("-41230.00")))).toBe(
      "Budget 2026: planned income USD 0.00, planned expenses USD 41,230.00, " +
        "negative net balance of USD 41,230.00. " +
        "1 income category and 2 expense categories with 3 items.",
    );
  });

  it("describes positive and zero nets", () => {
    expect(norm(reviewSummary(info, categories, preview("1000.00", "42230.00")))).toContain(
      "net balance USD 1,000.00.",
    );
    expect(norm(reviewSummary(info, categories, preview("0.00", "41230.00")))).toContain(
      "net balance USD 0.00.",
    );
  });

  it("uses singular forms", () => {
    const one = [categories[0]!, { ...categories[1]! }];
    expect(norm(reviewSummary(info, one, preview("0.00")))).toContain(
      "1 income category and 1 expense category with 1 item.",
    );
  });
});

describe("signedMoney", () => {
  it("uses a true minus sign for negatives", () => {
    expect(norm(signedMoney("-38430.00", "USD"))).toBe("−USD 38,430.00");
    expect(norm(signedMoney("12.5", "USD"))).toBe("USD 12.50");
  });
});
