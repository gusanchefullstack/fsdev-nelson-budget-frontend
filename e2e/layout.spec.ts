import type { Page } from "@playwright/test";
import { expect, signUp, test } from "./fixtures";

// Controls sharing a row line up (top edge and height), whatever sits below either one.
async function expectAligned(page: Page, a: string, b: string) {
  const [boxA, boxB] = await Promise.all([
    page.locator(a).boundingBox(),
    page.locator(b).boundingBox(),
  ]);
  expect(boxA && boxB).toBeTruthy();
  expect(Math.abs(boxA!.height - boxB!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxA!.y - boxB!.y)).toBeLessThanOrEqual(1);
}

async function expectProfileRowsAligned(page: Page, twoColumns: boolean) {
  await expectAligned(page, "#phoneCountryCode", "#phoneNumber");
  if (twoColumns) {
    await expectAligned(page, "#firstName", "#lastName");
    await expectAligned(page, "#postalCode", "#country");
  }
}

test("sign-up fields in the same row are aligned", async ({ page }) => {
  await page.goto("/sign-up");
  const twoColumns = page.viewportSize()!.width >= 768;
  if (twoColumns) await expectAligned(page, "#username", "#email");
  await expectProfileRowsAligned(page, twoColumns);
});

test("profile fields in the same row are aligned", async ({ page }) => {
  await signUp(page);
  await page.goto("/profile");
  await expectProfileRowsAligned(page, page.viewportSize()!.width >= 768);
});

// Single-column auth pages: heading and form share one column centered in <main>.
for (const path of ["/sign-in", "/forgot-password", "/reset-password?token=x"]) {
  test(`${path} form is centered`, async ({ page }) => {
    await page.goto(path);
    const main = (await page.locator("main").boundingBox())!;
    const form = (await page.locator("main form").boundingBox())!;
    const heading = (await page.locator("main h1").boundingBox())!;
    const left = form.x - main.x;
    const right = main.x + main.width - (form.x + form.width);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(Math.abs(heading.x - form.x)).toBeLessThanOrEqual(1);
  });
}

// Theme lives only in the header (auto-saved); "Save profile" is the last control on /profile.
test("profile page: no theme section, email first, save profile last", async ({ page }) => {
  await signUp(page);
  await page.goto("/profile");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Personal details" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Theme" })).toHaveCount(0);
  await expect(main.getByRole("radiogroup", { name: "Theme" })).toHaveCount(0);
  const headings = await main.getByRole("heading", { level: 2 }).allTextContents();
  expect(headings).toEqual(["Email", "Personal details"]);
  await expect(main.getByRole("button").last()).toHaveText("Save profile");
});
