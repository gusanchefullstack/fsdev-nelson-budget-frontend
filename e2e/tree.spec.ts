import type { Locator, Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import { expect, field, signUp, test } from "./fixtures";

const category = (page: Page, name: string) =>
  page.getByRole("listitem", { name: `${name} category` });

async function dragTo(page: Page, handle: Locator, target: Locator) {
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y + 20, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 20, { steps: 15 });
  await page.mouse.up();
}

test("complete tree: drag, keyboard move, refused cross-type drop, save (scenario 16)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page);
  await page.goto("/budgets/new");
  await page.getByRole("link", { name: "Complete" }).click();

  await page.getByLabel(field("Name")).first().fill("Tree 2027");
  await page.getByLabel(field("Start date")).fill("2027-01-01");
  await page.getByLabel(field("End date")).fill("2027-12-31");

  for (const [type, name] of [
    ["income", "Salaries"],
    ["expense", "Housing"],
    ["expense", "Utilities"],
  ] as const) {
    await page.getByLabel(`New ${type} category`).fill(name);
    await page.getByLabel(`New ${type} category`).press("Enter");
    await expect(category(page, name)).toBeVisible();
  }
  await page.getByRole("button", { name: "Add item to Housing" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(field("Name")).fill("Rent");
  await dialog.getByLabel(field("Description")).fill("Apartment");
  await dialog.getByLabel(/^Estimated amount/).fill("5000");
  await dialog.getByLabel(field("First expected date")).fill("2027-01-20");
  await dialog.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(category(page, "Housing")).toContainText("Rent");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  // Drag Rent into Utilities (scroll so source and target are both on screen)
  await category(page, "Housing").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await dragTo(page, page.getByRole("button", { name: "Drag Rent" }), category(page, "Utilities"));
  await expect(category(page, "Utilities")).toContainText("Rent");
  await expect(category(page, "Housing")).not.toContainText("Rent");

  // Dropping onto an income category is refused
  await category(page, "Salaries").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await dragTo(page, page.getByRole("button", { name: "Drag Rent" }), category(page, "Salaries"));
  await expect(page.getByText("Items can only move to a category of the same type")).toBeVisible();
  await expect(category(page, "Utilities")).toContainText("Rent");

  // Keyboard only: move it back with the "Move to" menu
  const menu = page.getByRole("combobox", { name: "Move Rent to" });
  await menu.focus();
  await menu.selectOption({ label: "Housing" });
  await expect(category(page, "Housing")).toContainText("Rent");

  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByRole("heading", { name: "Tree 2027", level: 1 })).toBeVisible();
  await expect(page.getByRole("row", { name: /Rent/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Housing", level: 3 })).toBeVisible();
});
