import { defineConfig } from "@playwright/test";

// Smoke tests against the deployed site: npx playwright test -c playwright.live.config.ts
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: {
    baseURL: process.env.LIVE_URL ?? "https://fsdev-nelson-budget-frontend.vercel.app",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
