import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import { createParty, expect, field, signOut, signUp, test } from "./fixtures";

test("new users get the guide with progress; skipping hides it for good (scenario 17)", async ({
  page,
}) => {
  const user = await signUp(page, {}, { keepOnboarding: true });
  await expect(page.getByText("0 of 4 done")).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "100" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText("1 of 4 done")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add an account (done)" })).toBeVisible();

  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome, Ana");
  await signOut(page);

  await page.getByLabel(field("Email or username")).fill(user.username);
  await page.getByLabel(field("Password")).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome, Ana");
  await expect(page).not.toHaveURL(/onboarding/);
});
