import type { Locator, Page } from "@playwright/test";
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

// Feature 002 — money palette. Colors as the browser computes them.
const OFFWHITE = "rgb(247, 242, 247)";
const NAVY = "rgb(2, 48, 71)";
const TEAL = "rgb(8, 76, 97)";
const LIME = "rgb(192, 242, 10)";
const SUCCESS_LIGHT = "rgb(29, 107, 58)";
const DESTRUCTIVE_LIGHT = "rgb(179, 38, 30)";
const RETIRED = ["rgb(255, 103, 0)", "rgb(58, 110, 165)", "rgb(0, 78, 152)"];

const style = (locator: Locator, prop: string) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

/** Every color any element on the page computes, to catch the retired palette anywhere. */
async function usedColors(page: Page) {
  return page.evaluate(() => {
    const seen = new Set<string>();
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const s = getComputedStyle(el);
      for (const v of [
        s.color,
        s.backgroundColor,
        s.borderTopColor,
        s.outlineColor,
        s.fill,
        s.stroke,
      ])
        seen.add(v);
    }
    return [...seen];
  });
}

test("light theme uses the money palette and none of the retired colors (US1)", async ({
  page,
}) => {
  await signUp(page);
  const body = page.locator("body");
  await expect.poll(() => style(body, "background-color")).toBe(OFFWHITE);
  expect(await style(body, "color")).toBe(NAVY);
  expect(
    await style(page.getByRole("link", { name: "Record transaction" }), "background-color"),
  ).toBe(TEAL);

  for (const url of ["/", "/budgets", "/reports"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const colors = await usedColors(page);
    for (const retired of RETIRED) expect(colors, `${url} uses ${retired}`).not.toContain(retired);
  }
});

test("dark theme uses navy, off-white and lime, and follows the device setting (US2)", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("banner").getByRole("radio", { name: "Dark theme" }).click();
  const body = page.locator("body");
  await expect.poll(() => style(body, "background-color")).toBe(NAVY);
  expect(await style(body, "color")).toBe(OFFWHITE);
  // Buttons animate color changes, so wait for the final value
  await expect
    .poll(() => style(page.getByRole("link", { name: "Record transaction" }), "background-color"))
    .toBe(LIME);

  // Device theme: switches with the OS setting, no reload
  await page.getByRole("banner").getByRole("radio", { name: "Device theme" }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => style(body, "background-color")).toBe(OFFWHITE);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => style(body, "background-color")).toBe(NAVY);
});

test("positive money, success and errors are distinct and never color-only (US3)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page);
  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "1000" });
  await createParty(page, "payors", { name: "Employer", type: "EMPLOYER" });
  await createParty(page, "vendors", { name: "Landlord", type: "SERVICE" });

  // Success toast: green icon, with text
  await createLiteBudget(page, { name: "2025", start: "2025-01-01", end: "2025-12-31" });
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Budget created." });
  await expect(toast).toBeVisible();
  expect(await style(toast.locator("svg").first(), "color")).toBe(SUCCESS_LIGHT);

  await addCategory(page, "income", "Salaries");
  await addItem(page, "Salaries", { name: "Salary", amount: "3000", first: "2025-01-30" });
  await addCategory(page, "expense", "Housing");
  await addItem(page, "Housing", { name: "Rent", amount: "1200", first: "2025-01-05" });
  const base = { budget: "2025 (USD)", account: "Checking (USD)" };
  await recordTransaction(page, {
    ...base,
    item: "Salaries · Salary",
    counterparty: "Employer",
    amount: "3000",
    when: "2025-01-30T09:00",
    income: true,
  });
  await recordTransaction(page, {
    ...base,
    item: "Housing · Rent",
    counterparty: "Landlord",
    amount: "1200",
    when: "2025-01-05T10:00",
  });

  // Income: lime mark with "+"; expense: no lime, "−"
  const income = page.getByRole("row", { name: /Salary/ }).getByText(/^\+/);
  await expect(income).toBeVisible();
  expect(await style(income, "background-color")).toBe(LIME);
  expect(await style(income, "color")).toBe(NAVY);
  const expense = page.getByRole("row", { name: /Rent/ }).getByText(/^−/);
  await expect(expense).toBeVisible();
  expect(await style(expense, "background-color")).not.toBe(LIME);

  // Error: red text with a message
  await page.goto("/budgets/new/lite");
  await page.getByRole("button", { name: "Create budget" }).click();
  const error = page.locator(`#${"budget-name"}-error`);
  await expect(error).toHaveText(/Required/);
  expect(await style(error, "color")).toBe(DESTRUCTIVE_LIGHT);
  await expect(page.getByLabel(field("Name"))).toHaveAttribute("aria-invalid", "true");
});
