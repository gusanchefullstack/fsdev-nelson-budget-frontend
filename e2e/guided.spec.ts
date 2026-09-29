import type { Locator, Page } from "@playwright/test";
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

// On phones the review tree starts collapsed (FR-013); open every node by keyboard, since
// newly shown nodes may sit outside the clipped tree box
async function expandTree(tree: Locator) {
  const closed = tree.locator('[aria-expanded="false"]');
  while ((await closed.count()) > 0) await closed.first().press("Enter");
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

  // Review: planned totals tree (spec 003). Income 12×8000 + 7×500; expenses 12×5000 + 12×20 + 11×40
  const tree = page.getByRole("group", { name: "Budget tree" });
  await expect(tree.getByRole("img", { name: /^Net balance, USD\s38,820\.00$/ })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^Incomes, USD\s99,500\.00$/ })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^Expenses, USD\s60,680\.00$/ })).toBeVisible();
  await expandTree(tree);
  await expect(tree.getByRole("img", { name: /^Gym, USD\s440\.00$/ })).toBeAttached();
  await expect(page.locator("#review-summary")).toHaveText(
    /^Plan 2027: planned income USD\s99,500\.00, planned expenses USD\s60,680\.00, net balance USD\s38,820\.00\. 1 income category and 2 expense categories with 5 items\.$/,
  );
  await expect(page.getByText(/Salary · Monthly/)).toHaveCount(0);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  // Keyboard: collapse and expand a group, zoom and reset (FR-010–FR-012)
  const expenses = tree.getByRole("button", { name: /^Expenses/ });
  await expenses.focus();
  await page.keyboard.press("Enter");
  await expect(expenses).toHaveAttribute("aria-expanded", "false");
  await expect(tree.getByRole("button", { name: /^Housing/ })).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(tree.getByRole("button", { name: /^Housing/ })).toBeVisible();
  await page.getByRole("button", { name: "Zoom in" }).press("Enter");
  await page.getByRole("button", { name: "Reset view" }).press("Enter");

  // Dark theme keeps the tree accessible and inside the page width
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

  // Back, add an item, return: totals are recalculated (FR-007)
  await page.getByRole("button", { name: "Back" }).click();
  await addDraftItem(page, "Subscriptions", "Parking", "10", "2027-01-10");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(tree.getByRole("button", { name: /^Expenses, USD\s60,800\.00$/ })).toBeVisible();
  await expect(page.locator("#review-summary")).toContainText("with 6 items.");

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
  await expandTree(tree);
  await expect(tree.getByRole("button", { name: /^Subscriptions, USD\s800\.00$/ })).toBeVisible();
  await expect(tree.getByRole("img", { name: /^Gym,/ })).toBeAttached();

  await page.unroute("**/api/v1/budgets");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Plan 2027", level: 1 })).toBeVisible();
  for (const name of ["Salary", "Bonus", "Rent", "Netflix", "Gym"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
});
