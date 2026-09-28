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

test("sign-up sets the phone code from the country, replacing it or clearing it", async ({
  page,
}) => {
  await page.goto("/sign-up");
  const country = page.getByLabel(field("Country"));
  const code = page.getByLabel(field("Country code"));
  const codeFlag = page.getByTestId("phone-code-flag");

  await expect(codeFlag).toHaveCount(0);
  await country.selectOption("CO");
  await expect(code).toHaveValue("+57");
  await expect(codeFlag).toHaveText(flag("CO"));

  // Changing the country replaces the code, so flag and number always match
  await country.selectOption("MX");
  await expect(code).toHaveValue("+52");
  await expect(codeFlag).toHaveText(flag("MX"));

  // A typed code stays until the country changes again
  await code.fill("+99");
  await expect(code).toHaveValue("+99");

  // Shared codes, and a country with no code of its own clears the field
  for (const [iso, dial] of [
    ["CA", "+1"],
    ["KZ", "+7"],
    ["JE", "+44"],
    ["PN", ""],
  ]) {
    await country.selectOption(iso);
    await expect(code, iso).toHaveValue(dial);
  }
});

test("profile and party forms fill the code and show the flag only with a country", async ({
  page,
}) => {
  await signUp(page);

  // Profile: the saved code is kept on load and follows a country change
  await page.goto("/profile");
  const code = page.getByLabel(field("Country code"));
  await expect(code).toHaveValue("+57");
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

  // Back to no country: no code, no flag
  await dialog.getByLabel(field("Country")).selectOption("");
  await expect(phoneCode).toHaveValue("");
  await expect(dialog.getByTestId("phone-code-flag")).toHaveCount(0);
});
