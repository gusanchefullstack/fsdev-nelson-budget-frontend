import type { Page } from "@playwright/test";
import {
  addCategory,
  addItem,
  createLiteBudget,
  createParty,
  expect,
  recordTransaction,
  signUp,
  test,
} from "./fixtures";

/*
 * Spec 004 US1 on a fully past budget (2025), so the estimate to date is the whole estimate and
 * results don't depend on today's date. One-time items, [estimated, actual] → status:
 *   Salary 2,000 / 1,000 → Under (income, red) · Rent 1,000 / 1,200 → Over (expense, red, exceeded)
 *   Water 100 / 105 → On track (exceeded) · Travel: empty category
 */
test.use({ timezoneId: "America/Bogota" });

const overview = (page: Page) => page.getByRole("region", { name: "Overview" });
const row = (page: Page, name: string) =>
  overview(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(name, { exact: true }) })
    .last();

test("overview shows estimated vs actual and status per row (US1)", async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page);
  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "10000" });
  await createParty(page, "vendors", { name: "Landlord", type: "SERVICE" });
  await createParty(page, "payors", { name: "Employer", type: "EMPLOYER" });
  await createLiteBudget(page, { name: "2025", start: "2025-01-01", end: "2025-12-31" });
  await addCategory(page, "income", "Salaries");
  await addItem(page, "Salaries", {
    name: "Salary",
    amount: "2000",
    first: "2025-02-01",
    frequency: "ONE_TIME",
  });
  await addCategory(page, "expense", "Housing");
  await addItem(page, "Housing", {
    name: "Rent",
    amount: "1000",
    first: "2025-03-10",
    frequency: "ONE_TIME",
  });
  await addItem(page, "Housing", {
    name: "Water",
    amount: "100",
    first: "2025-04-10",
    frequency: "ONE_TIME",
  });
  await addCategory(page, "expense", "Travel");
  const budgetUrl = page.url();

  const base = { budget: "2025 (USD)", account: "Checking (USD)" };
  const pay = async (item: string, amount: string, when: string, income = false) => {
    await recordTransaction(page, {
      ...base,
      item,
      amount,
      when,
      counterparty: income ? "Employer" : "Landlord",
      income,
    });
    await expect(page).toHaveURL(/\/transactions$/);
  };
  await pay("Salaries · Salary", "1000", "2025-02-01T09:00", true);
  await pay("Housing · Rent", "1200", "2025-03-10T10:00");
  await pay("Housing · Water", "105", "2025-04-10T10:00");

  await page.goto(budgetUrl);
  await expect(overview(page).getByRole("heading", { name: "Overview" })).toBeVisible();
  // The Overview sits above the editing sections (FR-014)
  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headings.slice(0, 3)).toEqual(["Overview", "Income", "Expenses"]);

  await expect(overview(page)).toContainText(/Estimated net USD\s900\.00/);
  await expect(overview(page)).toContainText(/Actual net −USD\s305\.00/);

  const salary = row(page, "Salary");
  await expect(salary).toContainText(/Estimated USD\s2,000\.00/);
  await expect(salary).toContainText(/Actual USD\s1,000\.00/);
  await expect(salary.locator("[data-status]")).toHaveText("Under");

  const rent = row(page, "Rent");
  await expect(rent).toContainText(/Actual USD\s1,200\.00/);
  await expect(rent.locator("[data-status]")).toHaveText("Over");
  await expect(rent).toContainText("exceeded");

  const water = row(page, "Water");
  await expect(water.locator("[data-status]").first()).toHaveText("On track");

  const travel = row(page, "Travel");
  await expect(travel).toContainText(/Estimated USD\s0\.00/);
  await expect(travel.locator("[data-status]")).toHaveText("On track");
  await expect(overview(page).getByRole("button", { name: "Travel" })).toHaveCount(0);

  // Housing sums its items: 1,100 estimated, 1,305 actual → Over
  const housing = overview(page).getByRole("button", { name: "Housing" });
  await expect(housing).toHaveAttribute("aria-expanded", "true");
  await housing.press("Enter");
  await expect(housing).toHaveAttribute("aria-expanded", "false");
  await expect(overview(page).getByText("Rent", { exact: true })).toHaveCount(0);
  await housing.press("Enter");

  // A new transaction shows when the user comes back (US1 scenario 9)
  await pay("Housing · Water", "50", "2025-04-12T10:00");
  await page.goto(budgetUrl);
  await expect(row(page, "Water")).toContainText(/Actual USD\s155\.00/);
  await expect(row(page, "Water").locator("[data-status]")).toHaveText("Over");
});
