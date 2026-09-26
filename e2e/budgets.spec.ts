import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import { addCategory, addItem, createLiteBudget, expect, signUp, test } from "./fixtures";

test("Lite budget with a monthly item produces 12 buckets from the 5th to the 4th (scenario 6)", async ({
  page,
}) => {
  await signUp(page);
  await createLiteBudget(page, { name: "2027", start: "2027-01-01", end: "2027-12-31" });
  await expect(page.getByRole("heading", { name: "2027", level: 1 })).toBeVisible();
  await addCategory(page, "expense", "Housing");
  await addItem(page, "Housing", { name: "Rent", amount: "5000", first: "2027-01-20" });
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: "Rent" }).click();
  const rows = page.getByRole("row");
  await expect(rows).toHaveCount(13);
  await expect(rows.nth(1)).toContainText("Jan 1, 2027 – Feb 4, 2027");
  await expect(rows.nth(2)).toContainText("Feb 5, 2027 – Mar 4, 2027");
  await expect(rows.nth(12)).toContainText("Dec 5, 2027 – Dec 31, 2027");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("an item past the budget end is clamped with a notice (scenario 7)", async ({ page }) => {
  await signUp(page);
  await createLiteBudget(page, { name: "2027", start: "2027-01-01", end: "2027-12-31" });
  await addCategory(page, "expense", "Subscriptions");
  await addItem(page, "Subscriptions", {
    name: "Netflix",
    amount: "20",
    first: "2027-03-20",
    start: "2027-03-15",
    end: "2028-03-15",
  });
  await expect(page.getByText("The end date was set to Dec 31, 2027")).toBeVisible();
  await expect(page.getByRole("row", { name: /Netflix/ })).toContainText(
    "Mar 15, 2027 – Dec 31, 2027",
  );
});

test("overlapping budgets in the same currency are rejected (scenario 8)", async ({ page }) => {
  await signUp(page);
  await createLiteBudget(page, { name: "2027", start: "2027-01-01", end: "2027-12-31" });
  await expect(page.getByRole("heading", { name: "2027", level: 1 })).toBeVisible();

  await createLiteBudget(page, { name: "Mid", start: "2027-07-01", end: "2028-06-30" });
  await expect(page.getByText(/You already have a USD budget \(2027\)/)).toBeVisible();

  await createLiteBudget(page, { name: "2028", start: "2028-01-01", end: "2028-12-31" });
  await expect(page.getByRole("heading", { name: "2028", level: 1 })).toBeVisible();
  await createLiteBudget(page, {
    name: "COP 2027",
    currency: "COP",
    start: "2027-01-01",
    end: "2027-12-31",
  });
  await expect(page.getByRole("heading", { name: "COP 2027", level: 1 })).toBeVisible();

  await page.goto("/budgets");
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(3);
  await expectAccessible(page);
});
