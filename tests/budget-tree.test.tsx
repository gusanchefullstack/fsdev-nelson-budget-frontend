import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetTree } from "@/features/budgets/tree/budget-tree";
import { useBudgetDraft } from "@/stores/budget-draft";

const item = (name: string) => ({
  name,
  description: name,
  estimatedAmount: "10",
  firstExpectedDate: "2027-01-10",
  frequency: "MONTHLY" as const,
  customInterval: null,
});

function seed() {
  const s = useBudgetDraft.getState();
  s.reset();
  s.setInfo({
    name: "2027",
    description: "",
    currency: "USD",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
  });
  s.addCategory("EXPENSE", "Housing", "");
  s.addCategory("EXPENSE", "Utilities", "");
  s.addCategory("INCOME", "Salaries", "");
  const [housing] = useBudgetDraft.getState().categories;
  s.addItem(housing!.key, item("Rent"));
}

const cat = (name: string) => useBudgetDraft.getState().categories.find((c) => c.name === name)!;

describe("US7 — budget tree", () => {
  beforeEach(seed);

  it("moves an item to another category of the same type with the Move to menu", async () => {
    render(<BudgetTree />);
    const menu = screen.getByRole("combobox", { name: "Move Rent to" });
    // Only same-type targets are offered
    expect(Array.from(menu.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Move to…",
      "Utilities",
    ]);
    await userEvent.selectOptions(menu, cat("Utilities").key);
    expect(cat("Housing").items).toHaveLength(0);
    expect(cat("Utilities").items.map((i) => i.name)).toEqual(["Rent"]);
  });

  it("refuses a move to a category of the other type", () => {
    const rent = cat("Housing").items[0]!;
    expect(useBudgetDraft.getState().moveItem(rent.key, cat("Salaries").key)).toBe(false);
    expect(cat("Housing").items).toHaveLength(1);
    expect(cat("Salaries").items).toHaveLength(0);
  });

  it("gives every drag handle an accessible name", () => {
    render(<BudgetTree />);
    expect(screen.getByRole("button", { name: "Drag Rent" })).toBeInTheDocument();
  });
});
