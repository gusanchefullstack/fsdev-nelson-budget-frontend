import { expect, field, signUp, test } from "./fixtures";

// Spec edge case: the session expires while a form is open — sign in again without losing the form.
test("an expired session asks to sign in again, keeps the form and completes the save", async ({
  page,
  context,
}) => {
  const user = await signUp(page);
  await page.goto("/budgets/new/lite");
  await page.getByLabel(field("Name")).fill("Kept after re-auth");
  await page.getByLabel(field("Start date")).fill("2031-01-01");
  await page.getByLabel(field("End date")).fill("2031-12-31");

  await context.clearCookies(); // the session is gone while the form is filled in
  await page.getByRole("button", { name: "Create budget" }).click();

  const dialog = page.getByRole("dialog", { name: "Your session expired" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel(field("Name"))).toHaveValue("Kept after re-auth");
  await dialog.getByLabel(field("Email or username")).fill(user.username);
  await dialog.getByLabel(field("Password")).fill(user.password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();

  // The paused request is retried with the same data
  await expect(page.getByRole("heading", { name: "Kept after re-auth", level: 1 })).toBeVisible();
});
