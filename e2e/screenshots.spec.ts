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

// README screenshots at 375/768/1440 px. Run: SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts --project=desktop
test.skip(!process.env.SCREENSHOTS, "only when refreshing README screenshots");

test("capture README screenshots", async ({ browser }) => {
  test.setTimeout(600_000);
  const setup = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await signUp(setup);
  await createParty(setup, "accounts", { name: "Checking", type: "CHECKING", opening: "12000" });
  await createParty(setup, "payors", { name: "Acme Corp", type: "EMPLOYER" });
  await createParty(setup, "vendors", { name: "Landlord", type: "SERVICE" });
  await createParty(setup, "vendors", { name: "PG&E", type: "UTILITY" });
  await createLiteBudget(setup, { name: "Household 2025", start: "2025-01-01", end: "2025-12-31" });
  await addCategory(setup, "income", "Salaries");
  await addItem(setup, "Salaries", { name: "Salary", amount: "8000", first: "2025-01-30" });
  await addCategory(setup, "expense", "Housing");
  await addItem(setup, "Housing", { name: "Rent", amount: "3200", first: "2025-01-05" });
  await addCategory(setup, "expense", "Utilities");
  await addItem(setup, "Utilities", { name: "Electricity", amount: "180", first: "2025-01-15" });
  const budget = "Household 2025 (USD)";
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  for (const [i, m] of months.entries()) {
    const payday = m === "02" ? "27" : "29";
    await recordTransaction(setup, {
      budget,
      item: "Salaries · Salary",
      account: "Checking (USD)",
      counterparty: "Acme Corp",
      amount: "8000",
      when: `2025-${m}-${payday}T09:00`,
      income: true,
    });
    await recordTransaction(setup, {
      budget,
      item: "Housing · Rent",
      account: "Checking (USD)",
      counterparty: "Landlord",
      amount: i % 4 === 3 ? "3350" : "3200",
      when: `2025-${m}-04T10:00`,
    });
    if (i !== 5) {
      await recordTransaction(setup, {
        budget,
        item: "Utilities · Electricity",
        account: "Checking (USD)",
        counterparty: "PG&E",
        amount: String(150 + (i % 5) * 20),
        when: `2025-${m}-16T18:30`,
      });
    }
  }
  const storageState = await setup.context().storageState();
  await setup.close();

  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width, height }, storageState });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByText("Net so far")).toBeVisible();
    await page.screenshot({ path: `screenshots/dashboard-${width}.png` });
    await page.goto("/reports");
    await expect(page.getByRole("region", { name: "Expenses execution" })).toBeVisible();
    await page.screenshot({ path: `screenshots/reports-${width}.png` });
    await ctx.close();
  }
});
