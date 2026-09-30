import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ReviewOutline } from "@/features/budgets/review-outline";
import { useBudgetDraft, type DraftCategory } from "@/stores/budget-draft";

const side = (type: "INCOME" | "EXPENSE", label: string): DraftCategory[] => [
  ...Array.from({ length: 5 }, (_, c) => ({
    key: `${type}-${c}`,
    type,
    name: `${label} group ${c + 1}`,
    description: "",
    items: Array.from({ length: 10 }, (_, i) => ({
      key: `${type}-${c}-${i}`,
      name: `${label} ${c + 1}.${i + 1}`,
      description: "x",
      estimatedAmount: "125.5",
      firstExpectedDate: "2027-01-15",
      frequency: "MONTHLY" as const,
      customInterval: null,
    })),
  })),
  { key: `${type}-empty`, type, name: `${label} empty`, description: "", items: [] },
];

describe("US3 — Guided review outline", () => {
  beforeEach(() => {
    useBudgetDraft.setState({
      info: {
        name: "Big 2027",
        description: "",
        currency: "USD",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      categories: [...side("INCOME", "Income"), ...side("EXPENSE", "Expense")],
    });
  });

  it("lists every item of a 50-per-side draft, grouped by side and category", () => {
    render(<ReviewOutline />);
    const income = screen.getByRole("region", { name: "Income" });
    const expenses = screen.getByRole("region", { name: "Expenses" });
    expect(within(income).getAllByRole("heading", { level: 4 })).toHaveLength(6);
    expect(within(income).getAllByText(/ · Monthly · USD\s125\.50$/)).toHaveLength(50);
    expect(within(expenses).getAllByText(/ · Monthly · USD\s125\.50$/)).toHaveLength(50);
  });

  it("shows empty categories", () => {
    render(<ReviewOutline />);
    const empty = screen.getByRole("heading", { name: "Expense empty", level: 4 }).closest("li")!;
    expect(within(empty).getByText("No items")).toBeInTheDocument();
  });

  it("shows no totals, tree, zoom controls or loading state", () => {
    render(<ReviewOutline />);
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset view" })).toBeNull();
    expect(screen.queryByText(/planned|net balance/i)).toBeNull();
    expect(document.querySelector("[aria-busy]")).toBeNull();
  });

  it("says when a side has no categories", () => {
    useBudgetDraft.setState({ categories: side("EXPENSE", "Expense") });
    render(<ReviewOutline />);
    expect(screen.getByText("No income categories")).toBeInTheDocument();
  });
});
