import { queryOptions, useMutation } from "@tanstack/react-query";
import { api, type One } from "@/lib/api";
import { useInvalidateBudgetData, type CategoryType, type Currency } from "@/features/budgets/api";

export type Frequency =
  | "ONE_TIME"
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY"
  | "CUSTOM_DAYS"
  | "CUSTOM_MONTHS";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  ONE_TIME: "One time",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
  CUSTOM_DAYS: "Every N days",
  CUSTOM_MONTHS: "Every N months",
};

export type BucketStatus = "OPEN" | "CLOSED" | "MISSED";

export type Bucket = {
  id: string;
  sequence: number;
  startDate: string;
  endDate: string;
  expectedDate: string;
  estimatedAmount: string;
  actualAmount: string;
  actualDate: string | null;
  currency: Currency;
  status: BucketStatus;
};

export type Item = {
  id: string;
  categoryId: string;
  type: CategoryType;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  estimatedAmount: string;
  firstExpectedDate: string;
  frequency: Frequency;
  customInterval: number | null;
  currency: Currency;
  transactionCount: number;
  buckets: Bucket[];
};

export type ItemInput = {
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  estimatedAmount: string;
  firstExpectedDate: string;
  frequency: Frequency;
  customInterval?: number | null;
  categoryId?: string;
};

type Saved = One<Item>;

export const itemQuery = (id: string) =>
  queryOptions({
    queryKey: ["items", id],
    queryFn: () => api<One<Item>>(`/items/${id}`).then((r) => r.data),
  });

export function useSaveItem(categoryId?: string) {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ItemInput> & { id?: string }) =>
      id
        ? api<Saved>(`/items/${id}`, { method: "PATCH", body })
        : api<Saved>(`/categories/${categoryId}/items`, { method: "POST", body }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateBudgetData();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/items/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(),
  });
}
