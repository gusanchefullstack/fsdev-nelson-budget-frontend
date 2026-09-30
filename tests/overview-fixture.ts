import type { BudgetDetail, CategoryType, DetailItem, Figures } from "@/features/budgets/api";

const fig = (estimatedTotal: string, estimatedToDate: string, actual: string): Figures => ({
  estimatedTotal,
  estimatedToDate,
  actual,
});

export function detailItem(
  id: string,
  type: CategoryType,
  figures: [string, string, string],
): DetailItem {
  return {
    id,
    categoryId: "c",
    type,
    name: id,
    description: id,
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    estimatedAmount: "100.00",
    firstExpectedDate: "2027-01-10",
    frequency: "MONTHLY",
    customInterval: null,
    currency: "USD",
    transactionCount: 0,
    buckets: [],
    figures: fig(...figures),
  };
}

const sum = (items: DetailItem[], key: keyof Figures) =>
  (items.reduce((n, i) => n + Math.round(Number(i.figures[key]) * 100), 0) / 100).toFixed(2);

export function category(id: string, type: CategoryType, items: DetailItem[]) {
  return {
    id,
    type,
    name: id,
    description: null,
    counts: { items: items.length, transactions: 0 },
    figures: fig(sum(items, "estimatedTotal"), sum(items, "estimatedToDate"), sum(items, "actual")),
    items,
  };
}

/**
 * Income: Salaries (Salary 1,200 / 300 / 200 → under), Gifts (empty).
 * Expenses: Housing (Rent 1,200 / 300 / 400 → over), Fun (Movies 100 / 100 / 105 → on track, exceeded).
 * Figures are [estimated total, estimated to date, actual].
 */
export function budgetFixture(categories = defaultCategories()): BudgetDetail {
  const total = (type: CategoryType, key: keyof Figures) =>
    sum(
      categories.filter((c) => c.type === type).flatMap((c) => c.items),
      key,
    );
  return {
    id: "b1",
    name: "Plan 2027",
    description: null,
    currency: "USD",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    estimatedIncomeToDate: total("INCOME", "estimatedToDate"),
    actualIncome: total("INCOME", "actual"),
    estimatedExpenseToDate: total("EXPENSE", "estimatedToDate"),
    actualExpense: total("EXPENSE", "actual"),
    estimatedIncomeTotal: total("INCOME", "estimatedTotal"),
    estimatedExpenseTotal: total("EXPENSE", "estimatedTotal"),
    counts: {
      categories: categories.length,
      items: categories.reduce((n, c) => n + c.items.length, 0),
      transactions: 0,
    },
    categories,
  };
}

export function defaultCategories() {
  return [
    category("Salaries", "INCOME", [
      detailItem("Salary", "INCOME", ["1200.00", "300.00", "200.00"]),
    ]),
    category("Gifts", "INCOME", []),
    category("Housing", "EXPENSE", [
      detailItem("Rent", "EXPENSE", ["1200.00", "300.00", "400.00"]),
    ]),
    category("Fun", "EXPENSE", [detailItem("Movies", "EXPENSE", ["100.00", "100.00", "105.00"])]),
  ];
}
