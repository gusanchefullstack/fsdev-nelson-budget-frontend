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
