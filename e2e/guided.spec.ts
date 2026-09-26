import type { Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import { expect, field, signUp, test } from "./fixtures";

async function addDraftItem(
  page: Page,
  category: string,
  name: string,
  amount: string,
  first: string,
) {
  await page.getByRole("button", { name: `Add item to ${category}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(field("Name")).fill(name);
  await dialog.getByLabel(field("Description")).fill(`${name} payment`);
  await dialog.getByLabel(/^Estimated amount/).fill(amount);
  await dialog.getByLabel(field("First expected date")).fill(first);
  await dialog.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function addDraftCategory(page: Page, type: "income" | "expense", name: string) {
  await page.getByLabel(`New ${type} category`).fill(name);
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: name })).toBeVisible();
}

test("guided creation is all-or-nothing and keeps the draft after a failure (scenario 15)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page);
  await page.goto("/budgets/new");
  await page.getByRole("link", { name: "Guided" }).click();

  await page.getByLabel(field("Name")).fill("Plan 2027");
  await page.getByLabel(field("Start date")).fill("2027-01-01");
  await page.getByLabel(field("End date")).fill("2027-12-31");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByRole("heading", { name: /Step 2 of 6: Income categories/ })).toBeVisible();
  await addDraftCategory(page, "income", "Salaries");
  await page.getByRole("button", { name: "Next" }).click();
  await addDraftItem(page, "Salaries", "Salary", "8000", "2027-01-30");
  await addDraftItem(page, "Salaries", "Bonus", "500", "2027-06-15");
  await page.getByRole("button", { name: "Next" }).click();

  await addDraftCategory(page, "expense", "Housing");
  await addDraftCategory(page, "expense", "Subscriptions");
  // Back keeps what was entered
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText(/Salary · Monthly · USD\s8,000\.00/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Subscriptions" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  await addDraftItem(page, "Housing", "Rent", "5000", "2027-01-20");
  await addDraftItem(page, "Subscriptions", "Netflix", "20", "2027-01-15");
  await addDraftItem(page, "Subscriptions", "Gym", "40", "2027-02-01");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Next" }).click();

  // Force a server failure on save
  await page.route("**/api/v1/budgets", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "x" } }),
        })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Create budget" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Nothing was saved and your entries are kept",
  );
  await expect(page.getByText("Gym")).toBeVisible();

  await page.unroute("**/api/v1/budgets");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Plan 2027", level: 1 })).toBeVisible();
  for (const name of ["Salary", "Bonus", "Rent", "Netflix", "Gym"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
});
