import { defineConfig } from "@playwright/test";

// Every e2e spec runs at the three viewports required by the spec (375, 768, 1440 px).
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
  ],
});
