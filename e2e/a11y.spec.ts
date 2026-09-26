import type { Page } from "@playwright/test";
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

// SC-008: every route in contracts/ui-routes.md passes axe (WCAG 2.x A/AA) with no horizontal scroll.
async function check(page: Page, url: string, ready: RegExp | string) {
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(ready);
  await expect(
    page.getByRole("status").filter({ hasText: /Loading/ }),
    `${url}: still loading`,
  ).toHaveCount(0);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await expect(page.getByRole("main")).toHaveCount(1);
}

test("public pages are accessible", async ({ page }) => {
  await check(page, "/sign-in", "Sign in");
  await check(page, "/sign-up", "Create your Nelson account");
  await check(page, "/forgot-password", "Reset your password");
  await check(page, "/reset-password?token=x", "Choose a new password");
});

test("every signed-in page is accessible in light and dark themes", async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page);
  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "1000" });
  await createParty(page, "payors", { name: "Employer", type: "EMPLOYER" });
  await createParty(page, "vendors", { name: "Landlord", type: "SERVICE" });
  await createLiteBudget(page, { name: "2025", start: "2025-01-01", end: "2025-12-31" });
  await addCategory(page, "expense", "Housing");
  await addItem(page, "Housing", { name: "Rent", amount: "500", first: "2025-01-20" });
  const budgetUrl = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "Rent" }).click();
  const itemUrl = new URL(page.url()).pathname;
  await recordTransaction(page, {
    budget: "2025 (USD)",
    item: "Housing · Rent",
    account: "Checking (USD)",
    counterparty: "Landlord",
    amount: "500",
    when: "2025-02-18T20:00",
  });
  await page.getByRole("link", { name: /Feb 18, 2025/ }).click();
  const txUrl = new URL(page.url()).pathname;
  await page.goto("/accounts");
  await page.getByRole("link", { name: "Checking" }).click();
  const accountUrl = new URL(page.url()).pathname;

  const pages: [string, RegExp | string][] = [
    ["/", "Welcome"],
    ["/onboarding", "Welcome to Nelson"],
    ["/budgets", "Budgets"],
    ["/budgets/new", "New budget"],
    ["/budgets/new/lite", "New budget (Lite)"],
    ["/budgets/new/guided", "New budget (Guided)"],
    ["/budgets/new/complete", "New budget (Complete)"],
    [budgetUrl, "2025"],
    [itemUrl, "Rent"],
    ["/accounts", "Accounts"],
    [accountUrl, "Checking"],
    ["/payors", "Payors"],
    ["/vendors", "Vendors"],
    ["/transactions", "Transactions"],
    ["/transactions/new", "Record a transaction"],
    [txUrl, "Rent"],
    ["/reports", "Reports"],
    ["/profile", "Profile"],
  ];
  for (const theme of ["Light theme", "Dark theme"]) {
    await page.goto("/profile");
    await page.getByRole("main").getByRole("radio", { name: theme }).click();
    for (const [url, heading] of pages) await check(page, url, heading);
  }
});

test("keyboard: skip link reaches main content and navigation is operable", async ({ page }) => {
  await signUp(page);
  await page.goto("/budgets");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Budgets");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);

  // After a client-side navigation focus moves to the main content
  await page.getByRole("link", { name: "New budget" }).click();
  await expect(page.getByRole("main")).toBeFocused();

  const budgets = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Budgets" });
  if (await budgets.isVisible()) {
    await budgets.focus();
    await page.keyboard.press("Enter");
  } else {
    await page.getByRole("button", { name: "Open menu" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").getByRole("link", { name: "Budgets" }).focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Budgets");
});
