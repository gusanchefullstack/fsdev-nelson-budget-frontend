import { expect, test } from "./fixtures";

// Hummingbird mark (Designed by Magnific): header logo per theme, one favicon.
test("header logo sits left of Nelson and follows the theme", async ({ page }) => {
  await page.goto("/sign-in");
  const home = page.getByRole("banner").getByRole("link", { name: "Nelson" });
  const light = home.locator("img").first();
  const dark = home.locator("img").last();

  await page.getByRole("banner").getByRole("radio", { name: "Light theme" }).click();
  await expect(light).toBeVisible();
  await expect(dark).toBeHidden();
  expect(await light.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  // Decorative: the link's accessible name stays "Nelson"
  await expect(light).toHaveAttribute("alt", "");
  const logoBox = (await light.boundingBox())!;
  const textBox = (await home.boundingBox())!;
  expect(logoBox.x).toBeCloseTo(textBox.x, 0);

  await page.getByRole("banner").getByRole("radio", { name: "Dark theme" }).click();
  await expect(dark).toBeVisible();
  await expect(light).toBeHidden();
  expect(await dark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test("favicon is the hummingbird, raster only and small", async ({ page, request }) => {
  await page.goto("/sign-in");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");
  const svg = await (await request.get("/favicon.svg")).text();
  expect(svg).toContain("data:image/png;base64,");
  // No vector artwork from the licensed asset is published
  expect(svg).not.toMatch(/<path|<linearGradient/);
  expect(svg.length).toBeLessThanOrEqual(10_240);
});
