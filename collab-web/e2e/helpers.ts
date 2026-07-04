import { expect, type Page } from "@playwright/test";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function createTestUser(prefix: string): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `${prefix} User`,
    email: `${prefix}-${unique}@e2e.test`,
    password: "password1234",
  };
}

export async function register(page: Page, user: TestUser): Promise<void> {
  await page.goto("/register");
  await page.locator("#name").fill(user.name);
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/documents", { timeout: 30_000 });
}

export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/documents", { timeout: 30_000 });
}

export async function createDocument(
  page: Page,
  title: string,
): Promise<string> {
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Document title").fill(title);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/documents/*");
  return page.url();
}

export function editorLocator(page: Page) {
  return page.locator(".tiptap");
}

export async function waitForOnline(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const status = page.getByRole("status", {
          name: /Connection status:/i,
        });
        const label = await status.getAttribute("aria-label");
        return label?.includes("Online") ?? false;
      },
      { timeout: 45_000 },
    )
    .toBe(true);
}

export async function waitForEditor(page: Page): Promise<void> {
  await expect(editorLocator(page)).toBeVisible({ timeout: 45_000 });
}

export async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = editorLocator(page);
  await editor.click();
  await page.keyboard.type(text, { delay: 20 });
}

export async function expectEditorContains(
  page: Page,
  text: string,
): Promise<void> {
  await expect(editorLocator(page)).toContainText(text, { timeout: 20_000 });
}
