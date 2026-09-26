import { queryOptions } from "@tanstack/react-query";
import { api, type One } from "@/lib/api";
import type { Budget, CategoryType } from "@/features/budgets/api";
import type { Transaction } from "@/features/transactions/api";

export type Alert = {
  type: "MISSED" | "OVER_BUDGET";
  budgetId: string;
  itemId: string;
  bucketId?: string;
  message: string;
};
export type Dashboard = {
  budgets: (Budget & { net: string })[];
  latestTransactions: Transaction[];
  alerts: Alert[];
};

export type ExecutionItem = {
  itemId: string;
  itemName: string;
  estimatedToDate: string;
  actual: string;
  ratio: number;
  projected: string;
};
export type Execution = {
  budget: { id: string; name: string; currency: string };
  categories: { id: string; name: string; type: CategoryType; items: ExecutionItem[] }[];
  totals: Record<
    | "estimatedIncomeToDate"
    | "actualIncome"
    | "estimatedExpenseToDate"
    | "actualExpense"
    | "projectedIncome"
    | "projectedExpense"
    | "projectedNet",
    string
  >;
};
export type EntityRow = { id: string; name: string; income: string; expense: string };
export type TopRow = { itemId: string; itemName: string; categoryName: string; actual: string };
export type Suggestions = {
  suggestions: { rule: string; itemId?: string; message: string }[];
  recommendations: { itemId: string; itemName: string; recommendedAmount: string }[];
  projectedNet: string;
};

const qs = (o: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
  ).toString();

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => api<One<Dashboard>>("/dashboard").then((r) => r.data),
});

export const executionQuery = (budgetId: string, from?: string, to?: string) =>
  queryOptions({
    queryKey: ["reports", "execution", budgetId, from, to],
    queryFn: () =>
      api<One<Execution>>(`/reports/budgets/${budgetId}/execution?${qs({ from, to })}`).then(
        (r) => r.data,
      ),
  });

export const byEntityQuery = (
  dimension: "account" | "payor" | "vendor",
  budgetId: string,
  from?: string,
  to?: string,
) =>
  queryOptions({
    queryKey: ["reports", "by-entity", dimension, budgetId, from, to],
    queryFn: () =>
      api<{ data: EntityRow[] }>(
        `/reports/by-entity?${qs({ dimension, budgetId, from, to })}`,
      ).then((r) => r.data),
  });

export const topQuery = (budgetId: string, n: number) =>
  queryOptions({
    queryKey: ["reports", "top", budgetId, n],
    queryFn: () =>
      api<One<{ n: number; income: TopRow[]; expense: TopRow[] }>>(
        `/reports/budgets/${budgetId}/top?n=${n}`,
      ).then((r) => r.data),
  });

export const suggestionsQuery = (budgetId: string) =>
  queryOptions({
    queryKey: ["reports", "suggestions", budgetId],
    queryFn: () =>
      api<One<Suggestions>>(`/reports/budgets/${budgetId}/suggestions`).then((r) => r.data),
  });
