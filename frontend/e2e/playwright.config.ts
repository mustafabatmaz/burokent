import { defineConfig, devices } from "@playwright/test";

// Runs inside the Playwright image on the stack's network, through infra/e2e/run.sh
export default defineConfig({
  testDir: "tests",
  // The panel tests share one database; running one test at a time keeps them independent of timing
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // The test Caddy signs its own certificates
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
