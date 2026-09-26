import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
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
 * Scenario 14 on a fully past budget (2025), so results don't depend on today's date.
 * Rent 5,000 monthly, paid once (Feb 18): 11 missed periods; estimated 60,000; actual 5,000;
 * nothing left open, so the projection equals the actual (5,000); recommended 5,000 / 12 = 416.67.
 */
test.use({ timezoneId: "America/Bogota" });

test("dashboard alerts and reports match hand calculation (scenario 14)", async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page);
  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "10000" });
  await createParty(page, "vendors", { name: "Landlord", type: "SERVICE" });
  await createLiteBudget(page, { name: "2025", start: "2025-01-01", end: "2025-12-31" });
  await addCategory(page, "expense", "Housing");
  await addItem(page, "Housing", { name: "Rent", amount: "5000", first: "2025-01-20" });
  await recordTransaction(page, {
    budget: "2025 (USD)",
    item: "Housing · Rent",
    account: "Checking (USD)",
    counterparty: "Landlord",
    amount: "5000",
    when: "2025-02-18T20:00",
  });
  await expect(page).toHaveURL(/\/transactions$/);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  await expect(page.getByText("Rent: 11 past periods with no transaction recorded")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Rent: 11 past periods" })).toContainText("2025");
  await expect(page.getByText("Net so far")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /expenses USD\s5,000\.00 of USD\s60,000\.00 estimated/ }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.goto("/reports");
  const rentRow = page
    .getByRole("region", { name: "Expenses execution" })
    .getByRole("row", { name: /Rent/ });
  await expect(rentRow).toContainText("USD 60,000.00");
  await expect(rentRow).toContainText("USD 5,000.00");
  await expect(rentRow).toContainText("8%");
  const housingRow = page
    .getByRole("region", { name: "Expenses by category" })
    .getByRole("row", { name: /Housing/ });
  await expect(housingRow).toContainText("USD 60,000.00");
  await expect(housingRow).toContainText("USD 5,000.00");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.getByRole("tab", { name: "By account, payor, vendor" }).click();
  await page.getByLabel("Group by").selectOption("vendor");
  await expect(page.getByRole("row", { name: /Landlord/ })).toContainText("USD 5,000.00");

  await page.getByRole("tab", { name: "Top N" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "1. Rent" })).toContainText(
    "USD 5,000.00",
  );

  await page.getByRole("tab", { name: "Suggestions" }).click();
  await expect(
    page.getByText(/Rent has 11 past periods with no transaction recorded/),
  ).toBeVisible();
  await expect(page.getByText(/deficit of USD\s5,000\.00/)).toBeVisible();
  await expect(page.getByRole("row", { name: /Rent/ })).toContainText("USD 416.67");
  await expectAccessible(page);
});
