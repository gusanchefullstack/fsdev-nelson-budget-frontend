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
  await addDraftCategory(page, "expense", "Travel");
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

  // Review: an outline of the draft, with no totals, tree or zoom (spec 004 FR-016, FR-017)
  const income = page.getByRole("region", { name: "Income" });
  const expenses = page.getByRole("region", { name: "Expenses" });
  await expect(income.getByRole("heading", { name: "Income", level: 3 })).toBeVisible();
  await expect(expenses.getByRole("heading", { name: "Expenses", level: 3 })).toBeVisible();
  await expect(income.getByRole("heading", { name: "Salaries", level: 4 })).toBeVisible();
  await expect(income.getByText(/^Salary · Monthly · USD\s8,000\.00$/)).toBeVisible();
  await expect(income.getByText(/^Bonus · Monthly · USD\s500\.00$/)).toBeVisible();
  await expect(expenses.getByText(/^Gym · Monthly · USD\s40\.00$/)).toBeVisible();
  const travel = expenses.getByRole("listitem").filter({
    has: page.getByRole("heading", { name: "Travel", level: 4 }),
  });
  await expect(travel).toContainText("No items");
  await expect(page.getByRole("button", { name: "Zoom in" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset view" })).toHaveCount(0);
  await expect(page.getByText(/planned|net balance/i)).toHaveCount(0);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  // Dark theme keeps the outline accessible and inside the page width
  await page.getByRole("banner").getByRole("radio", { name: "Dark theme" }).click();
  // Buttons animate color changes, so wait for the final lime before scanning
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Create budget" })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(192, 242, 10)");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  // Back, add an item, return: the outline shows it (FR-019)
  await page.getByRole("button", { name: "Back" }).click();
  await addDraftItem(page, "Subscriptions", "Parking", "10", "2027-01-10");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(expenses.getByText(/^Parking · Monthly · USD\s10\.00$/)).toBeVisible();

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
  // Entries are kept
  await expect(expenses.getByText(/^Gym · Monthly · USD\s40\.00$/)).toBeVisible();
  await expect(expenses.getByText(/^Parking · Monthly/)).toBeVisible();

  await page.unroute("**/api/v1/budgets");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Plan 2027", level: 1 })).toBeVisible();
  for (const name of ["Salary", "Bonus", "Rent", "Netflix", "Gym", "Parking"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
});

test("Review stays readable with 50 items per side (SC-001, SC-004)", async ({ page }) => {
  test.setTimeout(600_000);
  await signUp(page);
  await page.goto("/budgets/new/guided");
  await page.getByLabel(field("Name")).fill("Big 2027");
  await page.getByLabel(field("Start date")).fill("2027-01-01");
  await page.getByLabel(field("End date")).fill("2027-12-31");
  await page.getByRole("button", { name: "Next" }).click();

  const sides = [
    ["income", "Income"],
    ["expense", "Expense"],
  ] as const;
  for (const [type, label] of sides) {
    for (let c = 1; c <= 5; c++) await addDraftCategory(page, type, `${label} group ${c}`);
    await page.getByRole("button", { name: "Next" }).click();
    for (let c = 1; c <= 5; c++) {
      for (let i = 1; i <= 10; i++) {
        await addDraftItem(
          page,
          `${label} group ${c}`,
          `${label} ${c}.${i}`,
          "125.5",
          "2027-01-15",
        );
      }
    }
    await page.getByRole("button", { name: "Next" }).click();
  }

  await expect(page.getByRole("heading", { name: /Step 6 of 6: Review/ })).toBeVisible();
  for (const last of ["Income 5.10", "Expense 5.10"]) {
    const line = page.getByText(new RegExp(`^${last.replace(".", "\\.")} · Monthly`));
    await line.scrollIntoViewIfNeeded();
    await expect(line).toBeVisible();
  }
  await expect(page.getByText(/ · Monthly · USD\s125\.50$/)).toHaveCount(100);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await page.getByRole("banner").getByRole("radio", { name: "Dark theme" }).click();
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Create budget" })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(192, 242, 10)");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
});
