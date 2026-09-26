import { create } from "zustand";
import type { BudgetInput, CategoryType } from "@/features/budgets/api";
import type { ItemInput } from "@/features/items/api";

export type DraftItem = ItemInput & { key: string };
export type DraftCategory = {
  key: string;
  type: CategoryType;
  name: string;
  description: string;
  items: DraftItem[];
};

type DraftState = {
  info: BudgetInput;
  categories: DraftCategory[];
  setInfo: (info: BudgetInput) => void;
  addCategory: (type: CategoryType, name: string, description: string) => void;
  updateCategory: (
    key: string,
    patch: Partial<Pick<DraftCategory, "name" | "description">>,
  ) => void;
  removeCategory: (key: string) => void;
  addItem: (categoryKey: string, item: ItemInput) => void;
  updateItem: (itemKey: string, item: ItemInput) => void;
  removeItem: (itemKey: string) => void;
  /** Moves an item to another category of the same type; returns false when refused (FR-017). */
  moveItem: (itemKey: string, toCategoryKey: string) => boolean;
  reset: () => void;
};

const emptyInfo: BudgetInput = {
  name: "",
  description: "",
  currency: "USD",
  startDate: "",
  endDate: "",
};
const key = () => crypto.randomUUID();

// Kept in memory across steps and after a failed save, so nothing typed is lost (US6).
export const useBudgetDraft = create<DraftState>((set, get) => ({
  info: emptyInfo,
  categories: [],
  setInfo: (info) => set({ info }),
  addCategory: (type, name, description) =>
    set((s) => ({
      categories: [...s.categories, { key: key(), type, name, description, items: [] }],
    })),
  updateCategory: (k, patch) =>
    set((s) => ({ categories: s.categories.map((c) => (c.key === k ? { ...c, ...patch } : c)) })),
  removeCategory: (k) => set((s) => ({ categories: s.categories.filter((c) => c.key !== k) })),
  addItem: (categoryKey, item) =>
    set((s) => ({
      categories: s.categories.map((c) =>
        c.key === categoryKey ? { ...c, items: [...c.items, { ...item, key: key() }] } : c,
      ),
    })),
  updateItem: (itemKey, item) =>
    set((s) => ({
      categories: s.categories.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.key === itemKey ? { ...item, key: itemKey } : i)),
      })),
    })),
  removeItem: (itemKey) =>
    set((s) => ({
      categories: s.categories.map((c) => ({
        ...c,
        items: c.items.filter((i) => i.key !== itemKey),
      })),
    })),
  moveItem: (itemKey, toKey) => {
    const { categories } = get();
    const from = categories.find((c) => c.items.some((i) => i.key === itemKey));
    const to = categories.find((c) => c.key === toKey);
    if (!from || !to || from.key === to.key || from.type !== to.type) return false;
    const item = from.items.find((i) => i.key === itemKey)!;
    set({
      categories: categories.map((c) =>
        c.key === from.key
          ? { ...c, items: c.items.filter((i) => i.key !== itemKey) }
          : c.key === to.key
            ? { ...c, items: [...c.items, item] }
            : c,
      ),
    });
    return true;
  },
  reset: () => set({ info: emptyInfo, categories: [] }),
}));

/** Payload for POST /budgets with nested categories and items. */
export function draftPayload(info: BudgetInput, categories: DraftCategory[]) {
  return {
    ...info,
    description: info.description || null,
    categories: categories.map((c) => ({
      type: c.type,
      name: c.name,
      description: c.description || null,
      items: c.items.map(({ key: _key, ...item }) => item),
    })),
  };
}
