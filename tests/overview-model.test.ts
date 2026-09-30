import { describe, expect, it } from "vitest";
import { status, toOverview } from "@/features/budgets/overview/overview-model";
import { budgetFixture, category, detailItem } from "./overview-fixture";

describe("status (FR-006, FR-008: ±10% of the estimate to date)", () => {
  it.each([
    ["100.00", "110.00", "onTrack"],
    ["100.00", "110.01", "over"],
    ["100.00", "90.00", "onTrack"],
    ["100.00", "89.99", "under"],
    ["100.00", "100.00", "onTrack"],
    ["0.00", "0.01", "over"],
    ["0.00", "0.00", "onTrack"],
  ])("estimate to date %s, actual %s → %s", (estimatedToDate, actual, expected) => {
    expect(status(estimatedToDate, actual)).toBe(expected);
  });
});

describe("toOverview", () => {
  const root = toOverview(budgetFixture());
  const [income, expense] = root.children;
  const find = (name: string) =>
    root.children
      .flatMap((g) => [g, ...g.children, ...g.children.flatMap((c) => c.children)])
      .find((r) => r.name === name)!;

  it("builds budget → Income and Expenses → categories → items", () => {
    expect(root).toMatchObject({ kind: "budget", id: "budget", name: "Plan 2027" });
    expect(income).toMatchObject({ kind: "group", id: "INCOME", name: "Income", type: "INCOME" });
    expect(expense).toMatchObject({ kind: "group", id: "EXPENSE", name: "Expenses" });
    expect(income!.children.map((c) => c.name)).toEqual(["Salaries", "Gifts"]);
    expect(find("Rent")).toMatchObject({ kind: "item", type: "EXPENSE" });
  });

  it("shows nets on the budget row, with no status", () => {
    expect(root.estimatedTotal).toBe("-100.00"); // 1,200 − 1,300
    expect(root.actual).toBe("-305.00"); // 200 − 505
    expect(root.status).toBeUndefined();
  });

  it("sums categories into Income and Expenses", () => {
    expect(expense).toMatchObject({
      estimatedTotal: "1300.00",
      estimatedToDate: "400.00",
      actual: "505.00",
    });
  });

  it("keeps empty categories, with zeros and no children", () => {
    expect(find("Gifts")).toMatchObject({
      kind: "category",
      estimatedTotal: "0.00",
      actual: "0.00",
      status: "onTrack",
      children: [],
    });
  });

  it("marks only expense over and income under as adverse", () => {
    expect(find("Rent")).toMatchObject({ status: "over", adverse: true });
    expect(find("Salary")).toMatchObject({ status: "under", adverse: true });
    expect(find("Movies")).toMatchObject({ status: "onTrack", adverse: false });

    const flipped = toOverview(
      budgetFixture([
        category("Pay", "INCOME", [detailItem("Bonus", "INCOME", ["100.00", "100.00", "150.00"])]),
        category("Food", "EXPENSE", [
          detailItem("Groceries", "EXPENSE", ["100.00", "100.00", "50.00"]),
        ]),
      ]),
    );
    const rows = flipped.children.flatMap((g) => g.children.flatMap((c) => c.children));
    expect(rows.find((r) => r.name === "Bonus")).toMatchObject({ status: "over", adverse: false });
    expect(rows.find((r) => r.name === "Groceries")).toMatchObject({
      status: "under",
      adverse: false,
    });
  });

  it("computes the bar share and the exceeded flag", () => {
    expect(find("Rent")).toMatchObject({ exceeded: false });
    expect(find("Rent").share).toBeCloseTo(400 / 1200);
    expect(find("Movies")).toMatchObject({ share: 1, exceeded: true });

    const zero = toOverview(
      budgetFixture([
        category("Misc", "EXPENSE", [detailItem("Surprise", "EXPENSE", ["0.00", "0.00", "5.00"])]),
      ]),
    );
    expect(zero.children[1]!.children[0]!.children[0]).toMatchObject({
      share: 1,
      exceeded: true,
      status: "over",
    });
  });
});
