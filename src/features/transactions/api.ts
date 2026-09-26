import { keepPreviousData, queryOptions, useMutation } from "@tanstack/react-query";
import { api, type One, type Page } from "@/lib/api";
import { useInvalidateBudgetData, type CategoryType, type Currency } from "@/features/budgets/api";

export type Transaction = {
  id: string;
  itemId: string;
  itemName: string;
  budgetId: string;
  budgetName: string;
  bucketId: string;
  type: CategoryType;
  amount: string;
  currency: Currency;
  occurredAt: string;
  timezone: string;
  localDate: string;
  localDateTime: string;
  accountId: string;
  accountName: string;
  payorId: string | null;
  payorName: string | null;
  vendorId: string | null;
  vendorName: string | null;
};

export type TransactionInput = {
  itemId: string;
  amount: string;
  localDateTime: string;
  accountId: string;
  payorId?: string | null;
  vendorId?: string | null;
};

export type TransactionFilters = {
  budgetId?: string;
  type?: CategoryType;
  from?: string;
  to?: string;
  page?: number;
};

export const transactionsQuery = (filters: TransactionFilters) =>
  queryOptions({
    queryKey: ["transactions", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(
        ([k, v]) => v !== undefined && v !== "" && params.set(k, String(v)),
      );
      return api<Page<Transaction>>(`/transactions?${params}`);
    },
    placeholderData: keepPreviousData,
  });

export const transactionQuery = (id: string) =>
  queryOptions({
    queryKey: ["transactions", "one", id],
    queryFn: () => api<One<Transaction>>(`/transactions/${id}`).then((r) => r.data),
  });

// Saving a transaction changes buckets, balances, dashboard and reports (FR-043, SC-005).
export function useSaveTransaction() {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<TransactionInput> & { id?: string }) =>
      api<One<Transaction>>(id ? `/transactions/${id}` : "/transactions", {
        method: id ? "PATCH" : "POST",
        body,
      }).then((r) => r.data),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(),
  });
}
