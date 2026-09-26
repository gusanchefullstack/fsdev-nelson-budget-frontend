import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import {
  addCategory,
  addItem,
  createLiteBudget,
  createParty,
  expect,
  field,
  recordTransaction,
  signUp,
  test,
} from "./fixtures";

test.use({ timezoneId: "America/Bogota" });

test("record, sum, delete and validate transactions; timezone and blocked deletes (scenarios 9–13)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page);
  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "10000" });
  await createParty(page, "accounts", {
    name: "Efectivo",
    type: "CASH",
    currency: "COP",
    opening: "0",
  });
  await createParty(page, "vendors", { name: "Landlord", type: "SERVICE" });
  await createLiteBudget(page, { name: "2027", start: "2027-01-01", end: "2027-12-31" });
  await addCategory(page, "expense", "Housing");
  await addItem(page, "Housing", { name: "Rent", amount: "5000", first: "2027-01-20" });

  // Scenario 9
  const rent = {
    budget: "2027 (USD)",
    item: "Housing · Rent",
    account: "Checking (USD)",
    counterparty: "Landlord",
  };
  await recordTransaction(page, { ...rent, amount: "5000", when: "2027-02-18T20:00" });
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole("row", { name: /Rent/ })).toContainText("USD 5,000.00");
  await expect(page.getByRole("row", { name: /Rent/ })).toContainText("America/Bogota");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.goto("/accounts");
  await expect(page.getByRole("row", { name: /Checking/ })).toContainText("USD 5,000.00");

  // Scenario 10
  await recordTransaction(page, { ...rent, amount: "100", when: "2027-02-20T09:00" });
  await page.goto("/budgets");
  await page.getByRole("link", { name: "2027" }).click();
  await page.getByRole("link", { name: "Rent" }).click();
  await expect(page.getByRole("row").nth(2)).toContainText("USD 5,100.00");
  await page.goto("/transactions");
  await page.getByRole("link", { name: /Feb 20, 2027/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await page.goto("/accounts");
  await expect(page.getByRole("row", { name: /Checking/ })).toContainText("USD 5,000.00");

  // Scenario 11: out-of-range date is explained; COP accounts aren't offered for a USD budget
  await recordTransaction(page, { ...rent, amount: "50", when: "2028-01-05T10:00" });
  await expect(
    page.getByText(/must be between Jan 1, 2027 and Dec 31, 2027/).first(),
  ).toBeVisible();
  await expect(
    page.getByLabel(field("From \\(account\\)")).locator("option", { hasText: "Efectivo" }),
  ).toHaveCount(0);

  // Scenario 12: changing the profile timezone doesn't move existing transactions
  await page.goto("/profile");
  await page.getByLabel(field("Timezone")).selectOption("America/Los_Angeles");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.goto("/transactions");
  await expect(page.getByRole("row", { name: /Rent/ })).toContainText("Feb 18, 2027, 8:00 PM");
  await expect(page.getByRole("row", { name: /Rent/ })).toContainText("America/Bogota");

  // Scenario 13
  await page.goto("/vendors");
  await page.getByRole("link", { name: "Landlord" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("This vendor is used by 1 transaction")).toBeVisible();
});
