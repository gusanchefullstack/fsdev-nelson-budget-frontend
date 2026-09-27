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
