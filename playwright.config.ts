import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  outputDir: "../../work/test-results",
  use: {
    channel: process.env.PW_CHANNEL,
    baseURL: "http://127.0.0.1:5173",
    timezoneId: "Asia/Hong_Kong",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  workers: 1,
});
