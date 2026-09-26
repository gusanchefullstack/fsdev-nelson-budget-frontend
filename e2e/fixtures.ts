import { test as base, expect, type Page } from "@playwright/test";

let n = 0;
const unique = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

// Each test gets its own client IP so per-IP limits (FR-005a) don't leak between tests.
export const test = base.extend({
  extraHTTPHeaders: async ({}, use) => {
    await use({
      "X-Forwarded-For": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
    });
  },
});

export { expect };

/** Matches a field label with or without the required-field asterisk. */
export const field = (label: string) => new RegExp(`^${label}( \\*)?$`);

export type TestUser = { username: string; email: string; password: string; firstName: string };

export async function signUp(page: Page, overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const id = unique();
  const user = {
    username: `e2e${id}`,
    email: `e2e${id}@example.com`,
    password: "correct-horse-1",
    firstName: "Ana",
    ...overrides,
  };
  await page.goto("/sign-up");
  await page.getByLabel(field("Username")).fill(user.username);
  await page.getByLabel(field("Email")).fill(user.email);
  await page.getByLabel(field("Password")).fill(user.password);
  await page.getByLabel(field("First name")).fill(user.firstName);
  await page.getByLabel(field("Last name")).fill("Tester");
  await page.getByLabel(field("Address")).fill("Calle 1 # 2-3");
  await page.getByLabel(field("City")).fill("Bogotá");
  await page.getByLabel(field("State / region")).fill("Cundinamarca");
  await page.getByLabel(field("Postal code")).fill("110111");
  await page.locator("#country").selectOption("CO");
  await page.getByLabel(field("Country code")).fill("+57");
  await page.getByLabel(field("Number")).fill("3001234567");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`Welcome, ${user.firstName}`);
  return user;
}

export async function signOut(page: Page) {
  const inline = page.getByRole("button", { name: "Sign out" });
  if (await inline.isVisible()) await inline.click();
  else {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
  }
  await expect(page).toHaveURL(/\/sign-in/);
}

export async function createLiteBudget(
  page: Page,
  b: { name: string; currency?: "USD" | "COP"; start: string; end: string },
) {
  await page.goto("/budgets/new/lite");
  await page.getByLabel(field("Name")).fill(b.name);
  await page.getByLabel(field("Currency")).selectOption(b.currency ?? "USD");
  await page.getByLabel(field("Start date")).fill(b.start);
  await page.getByLabel(field("End date")).fill(b.end);
  await page.getByRole("button", { name: "Create budget" }).click();
}

export async function addCategory(page: Page, type: "income" | "expense", name: string) {
  await page.getByRole("button", { name: `Add ${type} category` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(field("Name")).fill(name);
  await dialog.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function addItem(
  page: Page,
  category: string,
  item: {
    name: string;
    amount: string;
    first: string;
    start?: string;
    end?: string;
    frequency?: string;
  },
) {
  await page.getByRole("button", { name: `Add item to ${category}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(field("Name")).fill(item.name);
  await dialog.getByLabel(field("Description")).fill(`${item.name} payment`);
  await dialog.getByLabel(/^Estimated amount/).fill(item.amount);
  if (item.frequency) await dialog.getByLabel(field("Frequency")).selectOption(item.frequency);
  await dialog.getByLabel(field("First expected date")).fill(item.first);
  if (item.start) await dialog.getByLabel(field("Start date")).fill(item.start);
  if (item.end) await dialog.getByLabel(field("End date")).fill(item.end);
  await dialog.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("link", { name: item.name })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function createParty(
  page: Page,
  collection: "accounts" | "payors" | "vendors",
  p: { name: string; type: string; currency?: "USD" | "COP"; opening?: string },
) {
  const singular = collection.slice(0, -1);
  await page.goto(`/${collection}`);
  await page.getByRole("button", { name: `New ${singular}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(field("Name")).fill(p.name);
  await dialog.getByLabel(field("Type")).selectOption(p.type);
  await dialog.getByLabel(field("Currency")).selectOption(p.currency ?? "USD");
  if (p.opening !== undefined) await dialog.getByLabel(field("Opening balance")).fill(p.opening);
  await dialog.getByRole("button", { name: `Add ${singular}` }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: p.name })).toBeVisible();
}

export async function recordTransaction(
  page: Page,
  t: {
    budget: string;
    item: string;
    amount: string;
    when: string;
    account: string;
    counterparty: string;
    income?: boolean;
  },
) {
  await page.goto("/transactions/new");
  await page.getByLabel(field("Budget")).selectOption({ label: t.budget });
  await page.getByLabel(field("Budget item")).selectOption({ label: t.item });
  await page.getByLabel(/^Amount/).fill(t.amount);
  await page.getByLabel(field("Date and time")).fill(t.when);
  const accountLabel = t.income ? "To (account)" : "From (account)";
  const partyLabel = t.income ? "From (payor)" : "To (vendor)";
  await page
    .getByLabel(field(accountLabel.replace(/[()]/g, "\\$&")))
    .selectOption({ label: t.account });
  await page
    .getByLabel(field(partyLabel.replace(/[()]/g, "\\$&")))
    .selectOption({ label: t.counterparty });
  await page.getByRole("button", { name: "Record transaction" }).click();
}
