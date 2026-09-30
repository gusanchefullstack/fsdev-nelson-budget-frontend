import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type One } from "@/lib/api";
import type { Item, ItemInput } from "@/features/items/api";

export type Currency = "USD" | "COP";
export type CategoryType = "INCOME" | "EXPENSE";

export type Totals = {
  estimatedIncomeToDate: string;
  actualIncome: string;
  estimatedExpenseToDate: string;
  actualExpense: string;
};

export type Budget = Totals & {
  id: string;
  name: string;
  description: string | null;
  currency: Currency;
  startDate: string;
  endDate: string;
};

/** Spec 004: execution figures on the budget detail (amounts in the budget's currency). */
export type Figures = { estimatedTotal: string; estimatedToDate: string; actual: string };
export type DetailItem = Item & { figures: Figures };

export type Category = {
  id: string;
  type: CategoryType;
  name: string;
  description: string | null;
  counts: { items: number; transactions: number };
  figures: Figures;
  items: DetailItem[];
};

export type BudgetDetail = Budget & {
  estimatedIncomeTotal: string;
  estimatedExpenseTotal: string;
  counts: { categories: number; items: number; transactions: number };
  categories: Category[];
};

export type BudgetInput = {
  name: string;
  description?: string | null;
  currency: Currency;
  startDate: string;
  endDate: string;
};

export const budgetKeys = {
  all: ["budgets"] as const,
  detail: (id: string) => ["budgets", id] as const,
};

export const budgetsQuery = queryOptions({
  queryKey: budgetKeys.all,
  queryFn: () => api<{ data: Budget[] }>("/budgets").then((r) => r.data),
});

export const budgetQuery = (id: string) =>
  queryOptions({
    queryKey: budgetKeys.detail(id),
    queryFn: () => api<One<BudgetDetail>>(`/budgets/${id}`).then((r) => r.data),
  });

/** Anything that changes budget data also refreshes dashboard and reports (SC-005). */
export function useInvalidateBudgetData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["items"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
}

export type NestedBudgetInput = BudgetInput & {
  categories?: {
    type: CategoryType;
    name: string;
    description: string | null;
    items: ItemInput[];
  }[];
};

/** Lite sends basic info; Guided and Complete send the whole tree (FR-016). */
export function useCreateBudget() {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: (body: NestedBudgetInput) => api<One<Budget>>("/budgets", { method: "POST", body }),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBudget(id: string) {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: (body: Partial<BudgetInput>) =>
      api<One<Budget>>(`/budgets/${id}`, { method: "PATCH", body }).then((r) => r.data),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(),
  });
}

export type CategoryInput = { type: CategoryType; name: string; description?: string | null };

export function useSaveCategory(budgetId: string) {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CategoryInput> & { id?: string }) =>
      id
        ? api(`/categories/${id}`, { method: "PATCH", body })
        : api(`/budgets/${budgetId}/categories`, { method: "POST", body }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(),
  });
}
