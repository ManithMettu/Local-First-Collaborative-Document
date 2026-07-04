import path from "node:path";

import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const backendDir = path.resolve(__dirname, "../backend");

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(backendDir, ".env") });

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const appPort = process.env.PLAYWRIGHT_APP_PORT ?? "3000";
const wsPort = process.env.PLAYWRIGHT_WS_PORT ?? "1234";
const appBaseUrl = `http://${host}:${appPort}`;
const nextAuthSecret =
  process.env.NEXTAUTH_SECRET?.trim() || "playwright-e2e-nextauth-secret";
const databaseUrl = process.env.DATABASE_URL?.trim();
const wsInternalSecret =
  process.env.WS_INTERNAL_SECRET?.trim() || "playwright-e2e-internal-secret";

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Playwright e2e tests. Set it in .env before running npm run test:e2e.",
  );
}

const serverEnv = {
  ...process.env,
  PORT: wsPort,
  NEXTAUTH_SECRET: nextAuthSecret,
  DATABASE_URL: databaseUrl,
  WS_INTERNAL_SECRET: wsInternalSecret,
};

const appEnv = {
  ...process.env,
  PORT: appPort,
  NEXTAUTH_SECRET: nextAuthSecret,
  DATABASE_URL: databaseUrl,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? appBaseUrl,
  NEXT_PUBLIC_WS_URL:
    process.env.NEXT_PUBLIC_WS_URL ?? `ws://${host}:${wsPort}`,
  WS_SERVER_HTTP_URL:
    process.env.WS_SERVER_HTTP_URL ?? `http://${host}:${wsPort}`,
  WS_INTERNAL_SECRET: wsInternalSecret,
};

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? appBaseUrl,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: `npm run dev --prefix ${backendDir}`,
      url: `http://${host}:${wsPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: serverEnv,
    },
    {
      command: `npm run dev -- --port ${appPort}`,
      url: appBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: appEnv,
    },
  ],
});
