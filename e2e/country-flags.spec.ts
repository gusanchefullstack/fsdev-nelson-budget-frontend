import { expect, field, signUp, test } from "./fixtures";

// FR-001a: flags in country lists, phone code filled in only when empty, flag beside the code.
const flag = (code: string) =>
  String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

test("country list shows flags after names and keeps type-to-search and plain names", async ({
  page,
}) => {
  await page.goto("/sign-up");
  const country = page.getByLabel(field("Country"));
  const colombia = country.locator('option[value="CO"]');
  await expect(colombia).toHaveText(`Colombia ${flag("CO")}`);
  await expect(colombia).toHaveAttribute("aria-label", "Colombia");

  await country.focus();
  await page.keyboard.type("col");
  await expect(country).toHaveValue("CO");
});

test("sign-up fills the phone code from the country only when it is empty", async ({ page }) => {
  await page.goto("/sign-up");
  const country = page.getByLabel(field("Country"));
  const code = page.getByLabel(field("Country code"));
  const codeFlag = page.getByTestId("phone-code-flag");

  await expect(codeFlag).toHaveCount(0);
  await country.selectOption("CO");
  await expect(code).toHaveValue("+57");
  await expect(codeFlag).toHaveText(flag("CO"));

  // A code already in the field is never overwritten
  await country.selectOption("MX");
  await expect(code).toHaveValue("+57");
  await expect(codeFlag).toHaveText(flag("MX"));

  // Shared codes, and a country with no code of its own
  for (const [iso, dial] of [
    ["CA", "+1"],
    ["KZ", "+7"],
    ["JE", "+44"],
    ["PN", ""],
  ]) {
    await code.fill("");
    await country.selectOption(iso);
    await expect(code, iso).toHaveValue(dial);
  }
});

test("profile and party forms fill the code and show the flag only with a country", async ({
  page,
}) => {
  await signUp(page);

  // Profile: saved code stays; clearing it lets a new country fill it
  await page.goto("/profile");
  const code = page.getByLabel(field("Country code"));
  await expect(code).toHaveValue("+57");
  await page.getByLabel(field("Country")).selectOption("US");
  await expect(code).toHaveValue("+57");
  await code.fill("");
  await page.getByLabel(field("Country")).selectOption("US");
  await expect(code).toHaveValue("+1");
  await expect(page.getByTestId("phone-code-flag")).toHaveText(flag("US"));

  // Party form: optional country, so no flag until one is chosen
  await page.goto("/vendors");
  await page.getByRole("button", { name: "New vendor" }).click();
  const dialog = page.getByRole("dialog");
  const phoneCode = dialog.getByLabel(field("Phone code"));
  await expect(dialog.getByTestId("phone-code-flag")).toHaveCount(0);
  await expect(phoneCode).toHaveValue("");
  await dialog.getByLabel(field("Country")).selectOption("DE");
  await expect(phoneCode).toHaveValue("+49");
  await expect(dialog.getByTestId("phone-code-flag")).toHaveText(flag("DE"));
});
