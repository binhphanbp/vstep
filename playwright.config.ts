import { defineConfig, devices } from "@playwright/test";
const production = process.env.MAY_E2E_PRODUCTION === "1";
const port = production ? 3100 : 3000;
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: production
      ? `npm run start -- --hostname 127.0.0.1 --port ${port}`
      : "npm run dev -- --hostname 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !production && !process.env.CI,
    timeout: 120000,
  },
});
