import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetOverview } from "@/features/budgets/overview/budget-overview";
import { budgetFixture } from "./overview-fixture";

const row = (name: string) =>
  screen.getByText(name, { selector: "[data-row-name]" }).closest("li")!;

describe("US1 — budget overview", () => {
  it("shows the heading, the hint and each row's figures", () => {
    render(<BudgetOverview budget={budgetFixture()} />);
    expect(screen.getByRole("heading", { name: "Overview", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(/Status compares the actual with what was expected by today \(±10%\)/),
    ).toBeInTheDocument();
    const rent = row("Rent");
    expect(within(rent).getByText(/Estimated USD\s1,200\.00/)).toBeInTheDocument();
    expect(within(rent).getByText(/Actual USD\s400\.00/)).toBeInTheDocument();
  });

  it("shows nets on the budget row with a true minus sign and no status", () => {
    render(<BudgetOverview budget={budgetFixture()} />);
    const budget = screen.getByText("Plan 2027", { selector: "[data-row-name]" }).parentElement!;
    expect(within(budget).getByText(/Estimated net −USD\s100\.00/)).toBeInTheDocument();
    expect(within(budget).getByText(/Actual net −USD\s305\.00/)).toBeInTheDocument();
    expect(within(budget).queryByText(/^(Over|Under|On track)$/)).toBeNull();
  });

  it("labels status in words, red only when it works against the budget", () => {
    render(<BudgetOverview budget={budgetFixture()} />);
    const over = within(row("Rent")).getByText("Over");
    const under = within(row("Salary")).getByText("Under");
    const onTrack = within(row("Movies")).getByText("On track");
    expect(over.closest("[data-status]")).toHaveClass("text-destructive");
    expect(under.closest("[data-status]")).toHaveClass("text-destructive");
    expect(onTrack.closest("[data-status]")).not.toHaveClass("text-destructive");
  });

  it("says when the actual exceeds the estimated total", () => {
    render(<BudgetOverview budget={budgetFixture()} />);
    expect(within(row("Movies")).getByText("exceeded")).toBeInTheDocument();
    expect(within(row("Rent")).queryByText("exceeded")).toBeNull();
  });

  it("collapses and expands rows with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<BudgetOverview budget={budgetFixture()} />);
    const housing = screen.getByRole("button", { name: "Housing" });
    expect(housing).toHaveAttribute("aria-expanded", "true");
    housing.focus();
    await user.keyboard("{Enter}");
    expect(housing).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Rent", { selector: "[data-row-name]" })).toBeNull();
    await user.keyboard(" ");
    expect(housing).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Rent", { selector: "[data-row-name]" })).toBeInTheDocument();
  });

  it("has no toggle for empty categories", () => {
    render(<BudgetOverview budget={budgetFixture()} />);
    expect(screen.queryByRole("button", { name: "Gifts" })).toBeNull();
    expect(screen.getByText("Gifts", { selector: "[data-row-name]" })).toBeInTheDocument();
  });

  it("shows an empty state for a budget with no items", () => {
    render(<BudgetOverview budget={budgetFixture([])} />);
    expect(screen.getByText("Nothing to show yet")).toBeInTheDocument();
    expect(screen.getByText("Add items to see how this budget is going.")).toBeInTheDocument();
  });
});
