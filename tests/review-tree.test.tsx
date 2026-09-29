import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initialCollapsed } from "@/features/budgets/review-tree/review-layout";
import { ReviewTree } from "@/features/budgets/review-tree/review-tree";
import type { ReviewTreeNode } from "@/features/budgets/review-tree/review-summary";

const node = (
  id: string,
  kind: ReviewTreeNode["kind"],
  label: string,
  amount: string,
  children: ReviewTreeNode[] = [],
): ReviewTreeNode => ({ id, kind, label, amount, children });

function budget(net: string, expenseCategories = 4, itemsPerCategory = 1): ReviewTreeNode {
  const cats = Array.from({ length: expenseCategories }, (_, c) =>
    node(
      `c${c}`,
      "category",
      `Category ${c}`,
      "100.00",
      Array.from({ length: itemsPerCategory }, (_, i) =>
        node(`c${c}i${i}`, "item", `Item ${c}.${i}`, "100.00"),
      ),
    ),
  );
  const sign = Number(net) > 0 ? "positive" : Number(net) < 0 ? "negative" : "zero";
  return {
    ...node("root", "root", sign === "negative" ? "Net deficit" : "Net balance", net, [
      node("INCOME", "group", "Incomes", "0.00", [node("savings", "category", "Savings", "0.00")]),
      node("EXPENSE", "group", "Expenses", "7090.00", cats),
    ]),
    sign,
  };
}

// Intl puts a no-break space after the currency code
const text = (el: Element) => (el.textContent ?? "").replace(/ /g, " ");

// jsdom has no layout; give the tree box a desktop size (768×520)
const box = Object.getOwnPropertyDescriptors(HTMLElement.prototype);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 768 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 520 });
});
afterAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", box.clientWidth!);
  Object.defineProperty(HTMLElement.prototype, "clientHeight", box.clientHeight!);
});

describe("ReviewTree", () => {
  it("renders every level with totals, including an empty category, and no frequencies", () => {
    render(<ReviewTree root={budget("-7090.00")} currency="USD" summaryId="s" />);
    const tree = screen.getByRole("group", { name: "Budget tree" });
    expect(tree).toHaveAttribute("aria-describedby", "s");
    for (const label of [
      "Net deficit",
      "Incomes",
      "Expenses",
      "Savings",
      "Category 0",
      "Item 3.0",
    ]) {
      expect(within(tree).getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(text(tree)).toContain("−USD 7,090.00");
    expect(text(tree)).not.toMatch(/Monthly/);
  });

  it("styles only the net balance by its sign", () => {
    const rootCard = (net: string) => {
      const { unmount } = render(<ReviewTree root={budget(net)} currency="USD" summaryId="s" />);
      const card = screen.getByRole("img", { name: /^Net/ }).querySelectorAll("rect")[1]!;
      const style = [card.getAttribute("fill"), card.getAttribute("stroke")];
      unmount();
      return style;
    };
    expect(rootCard("10.00")).toEqual(["var(--positive)", "var(--positive)"]);
    expect(rootCard("-10.00")).toEqual(["var(--card)", "var(--destructive)"]);
    expect(rootCard("0.00")).toEqual(["var(--card)", "var(--border)"]);
    render(<ReviewTree root={budget("10.00")} currency="USD" summaryId="s" />);
    const expenses = screen.getByRole("button", { name: /^Expenses/ });
    expect(expenses.querySelectorAll("rect")[1]).toHaveAttribute("fill", "var(--card)");
  });

  it("collapses and expands groups by keyboard", async () => {
    const user = userEvent.setup();
    render(<ReviewTree root={budget("10.00")} currency="USD" summaryId="s" />);
    const expenses = screen.getByRole("button", { name: /^Expenses/ });
    expect(expenses).toHaveAttribute("aria-expanded", "true");
    expenses.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /^Expenses/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Category 0")).toBeNull();
    await user.keyboard(" ");
    expect(screen.getAllByText("Category 0").length).toBeGreaterThan(0);
  });

  it("offers labelled zoom controls and a tooltip on focus", async () => {
    const user = userEvent.setup();
    render(<ReviewTree root={budget("10.00")} currency="USD" summaryId="s" />);
    for (const name of ["Zoom in", "Zoom out", "Reset view"]) {
      expect(screen.getByRole("button", { name })).toBeEnabled();
    }
    fireEvent.focus(screen.getByRole("img", { name: /^Item 2\.0/ }));
    expect(text(screen.getByRole("tooltip"))).toBe("Item 2.0USD 100.00");
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("group", { name: "Budget tree" }).querySelector("g")).toHaveAttribute(
      "transform",
      expect.stringContaining("scale("),
    );
  });

  it("starts collapsed only when the full tree would be unreadable (FR-013)", () => {
    const desktop = { width: 768, height: 520 };
    const phone = { width: 343, height: 420 };
    // Owner's example: 5 categories, 4 items
    expect(initialCollapsed(budget("0.00"), desktop)).toEqual(new Set());
    expect(initialCollapsed(budget("0.00"), phone)).toEqual(
      new Set(["savings", "c0", "c1", "c2", "c3", "INCOME", "EXPENSE"]),
    );
    expect(initialCollapsed(budget("0.00", 4, 10), desktop)).toEqual(
      new Set(["savings", "c0", "c1", "c2", "c3"]),
    );
    const many = initialCollapsed(budget("0.00", 40, 1), desktop);
    expect(many.has("INCOME") && many.has("EXPENSE") && many.has("c39")).toBe(true);
  });

  it("restores the first view on Reset after expanding", async () => {
    const user = userEvent.setup();
    render(<ReviewTree root={budget("0.00", 4, 10)} currency="USD" summaryId="s" />);
    expect(screen.queryByText("Item 0.0")).toBeNull();
    // d3-zoom listens for mousedown on the SVG; a plain click is enough here
    fireEvent.click(screen.getByRole("button", { name: /^Category 0/ }));
    expect(screen.getAllByText("Item 0.0").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Reset view" }));
    expect(screen.queryByText("Item 0.0")).toBeNull();
  });
});
