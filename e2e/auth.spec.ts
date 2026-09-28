import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import { expect, field, signOut, signUp, test } from "./fixtures";

test.use({ timezoneId: "America/Bogota" });

test("sign-up pre-fills the device timezone and lands on the dashboard (scenario 1)", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await expect(page.getByLabel(field("Timezone"))).toHaveValue("America/Bogota");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await signUp(page);
});

test("sign in by username and by email, and lock after repeated failures (scenario 2)", async ({
  page,
}) => {
  const user = await signUp(page);
  await signOut(page);

  await page.getByLabel(field("Email or username")).fill(user.username);
  await page.getByLabel(field("Password")).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
  await signOut(page);

  await page.getByLabel(field("Email or username")).fill(user.email);
  await page.getByLabel(field("Password")).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
  await signOut(page);

  await expectAccessible(page);
  for (let i = 0; i < 5; i++) {
    await page.getByLabel(field("Email or username")).fill(user.email);
    await page.getByLabel(field("Password")).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid credentials");
  }
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("Too many attempts");
});

test("forgot password always confirms; a bad reset link is explained (scenario 3)", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel(field("Email")).fill("someone@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account uses that email");

  await page.goto("/reset-password?token=not-a-real-token");
  await page.getByLabel(field("New password")).fill("brand-new-pass-2");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("alert")).toContainText("invalid, already used or expired");
});

test("theme choice persists after reload and on another device (scenario 4)", async ({
  page,
  browser,
}) => {
  const user = await signUp(page);
  await page.getByRole("radio", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const other = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": "10.250.0.1" } });
  const page2 = await other.newPage();
  await page2.goto("/sign-in");
  await page2.getByLabel(field("Email or username")).fill(user.username);
  await page2.getByLabel(field("Password")).fill(user.password);
  await page2.getByRole("button", { name: "Sign in" }).click();
  await expect(page2.getByRole("heading", { level: 1 })).toContainText("Welcome");
  await expect(page2.locator("html")).toHaveClass(/dark/);
  await expectAccessible(page2);
  await other.close();
});

test("a theme switch sticks while navigating in the app, without a reload (FR-006)", async ({
  page,
}) => {
  await signUp(page);
  // Main nav is inline on desktop and in the menu sheet on smaller screens
  const navigate = async (name: string) => {
    if (page.viewportSize()!.width >= 1024) {
      await page.getByRole("banner").getByRole("link", { name }).click();
    } else {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("dialog").getByRole("link", { name }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  };
  const html = page.locator("html");
  const banner = page.getByRole("banner");

  for (const [theme, dark] of [
    ["Dark theme", true],
    ["Light theme", false],
  ] as const) {
    await banner.getByRole("radio", { name: theme }).click();
    for (const name of ["Budgets", "Accounts", "Dashboard"]) {
      await navigate(name);
      if (dark) await expect(html, `${theme} after ${name}`).toHaveClass(/dark/);
      else await expect(html, `${theme} after ${name}`).not.toHaveClass(/dark/);
      await expect(banner.getByRole("radio", { name: theme })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    }
  }
});

test("a signed-in user is sent past the sign-in and sign-up forms", async ({ page }) => {
  await signUp(page);

  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
  }

  // The sign-in return address is honoured only for pages in the app
  await page.goto("/sign-in?redirect=/budgets");
  await expect(page).toHaveURL("/budgets");
  await page.goto("/sign-in?redirect=//evil.example");
  await expect(page).toHaveURL("/");

  // Password-reset pages stay reachable while signed in
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reset your password");
});
