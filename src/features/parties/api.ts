import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type One } from "@/lib/api";
import type { Currency } from "@/features/budgets/api";

export type Collection = "accounts" | "payors" | "vendors";

export type Contact = {
  address: string | null;
  city: string | null;
  postalCode: string | null;
  state: string | null;
  country: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
};

export type Party = Contact & {
  id: string;
  name: string;
  description: string | null;
  type: string;
  currency: Currency;
  transactionCount: number;
  openingBalance?: string;
  currentBalance?: string;
};

export type PartyInput = Partial<Contact> & {
  name: string;
  description?: string | null;
  type: string;
  currency: Currency;
  openingBalance?: string;
};

// Labels and types per collection (FR-030, FR-031)
export const PARTY_META: Record<
  Collection,
  { title: string; singular: string; types: Record<string, string>; intro: string }
> = {
  accounts: {
    title: "Accounts",
    singular: "account",
    intro: "Where your money is held or paid from.",
    types: {
      CHECKING: "Checking",
      SAVINGS: "Savings",
      CREDIT_CARD: "Credit card",
      BROKERAGE: "Brokerage",
      WALLET: "Wallet",
      CASH: "Cash",
    },
  },
  payors: {
    title: "Payors",
    singular: "payor",
    intro: "Who pays you: employers, investments, rentals.",
    types: { EMPLOYER: "Employer", INVESTMENT: "Investment", RENTAL: "Rental", OTHER: "Other" },
  },
  vendors: {
    title: "Vendors",
    singular: "vendor",
    intro: "Who you pay: utilities, subscriptions, stores.",
    types: {
      UTILITY: "Utility",
      SUBSCRIPTION: "Subscription",
      STORE: "Store",
      SERVICE: "Service",
      OTHER: "Other",
    },
  },
};

export const partiesQuery = (collection: Collection) =>
  queryOptions({
    queryKey: [collection],
    queryFn: () => api<{ data: Party[] }>(`/${collection}`).then((r) => r.data),
  });

export const partyQuery = (collection: Collection, id: string) =>
  queryOptions({
    queryKey: [collection, id],
    queryFn: () => api<One<Party>>(`/${collection}/${id}`).then((r) => r.data),
  });

export function useSaveParty(collection: Collection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<PartyInput> & { id?: string }) =>
      api<One<Party>>(id ? `/${collection}/${id}` : `/${collection}`, {
        method: id ? "PATCH" : "POST",
        body,
      }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [collection] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteParty(collection: Collection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/${collection}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [collection] }),
  });
}
