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
