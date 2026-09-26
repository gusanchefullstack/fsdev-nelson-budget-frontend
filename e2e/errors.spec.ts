import { expect, signUp, test } from "./fixtures";

// SC-007: users never see raw errors or technical details.
const TECHNICAL = /stack|Exception|TypeError|at .+\.(ts|js):\d+|ECONN|prisma|SQL/i;

test("a server error shows a friendly message with Try again", async ({ page }) => {
  await signUp(page);
  await page.route("**/api/v1/budgets", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: 'relation "Budget" does not exist at prisma.ts:12',
        },
      }),
    }),
  );
  await page.goto("/budgets");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Something went wrong on our side. Please try again.");
  await expect(page.locator("body")).not.toContainText(TECHNICAL);

  await page.unroute("**/api/v1/budgets");
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No budgets yet")).toBeVisible();
});

test("a network failure is explained without technical text", async ({ page }) => {
  await signUp(page);
  await page.route("**/api/v1/accounts", (route) => route.abort("connectionrefused"));
  await page.goto("/accounts");
  await expect(page.getByRole("alert")).toContainText(
    "We couldn't reach Nelson. Check your connection and try again.",
  );
  await expect(page.locator("body")).not.toContainText(TECHNICAL);
});

test("unknown pages show a friendly not-found page", async ({ page }) => {
  await signUp(page);
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Page not found");
});
