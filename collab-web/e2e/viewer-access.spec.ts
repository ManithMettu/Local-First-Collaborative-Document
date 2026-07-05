import { expect, test } from "@playwright/test";

import { isDatabaseAvailable } from "./db";
import {
  createDocument,
  createTestUser,
  editorLocator,
  register,
  waitForEditor,
  waitForOnline,
} from "./helpers";

test.describe("viewer access", () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isDatabaseAvailable()),
      "PostgreSQL must be running (DATABASE_URL) for Playwright e2e tests",
    );
  });

  test("blocks viewers from editing while owners can still write", async ({
    browser,
  }) => {
    const owner = createTestUser("owner");
    const viewer = createTestUser("viewer");

    const ownerContext = await browser.newContext();
    const viewerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const viewerPage = await viewerContext.newPage();

    try {
      await register(ownerPage, owner);
      await register(viewerPage, viewer);

      const documentUrl = await createDocument(ownerPage, "Viewer access test");
      await ownerPage.goto(documentUrl);
      await waitForEditor(ownerPage);
      await waitForOnline(ownerPage);

      await ownerPage.getByRole("button", { name: "Invite" }).click();
      await ownerPage.locator("#collaborator-email").fill(viewer.email);
      await ownerPage.locator("#collaborator-role").selectOption("VIEWER");
      await ownerPage
        .getByRole("button", { name: "Add collaborator" })
        .click();
      await expect(ownerPage.getByText(viewer.email, { exact: false })).toBeVisible({
        timeout: 15_000,
      });

      await viewerPage.goto("/documents");
      await viewerPage
        .getByRole("link", { name: /Viewer access test/i })
        .click();
      await viewerPage.waitForURL("**/documents/*");
      await waitForEditor(viewerPage);
      await waitForOnline(viewerPage);

      await expect(
        viewerPage.getByText("view-only", { exact: false }),
      ).toBeVisible();
      await expect(viewerPage.getByText("Viewer", { exact: true }).first()).toBeVisible();
      await expect(editorLocator(viewerPage)).toHaveAttribute(
        "contenteditable",
        "false",
      );

      await typeInEditor(ownerPage, "owner-can-edit");
      await expect(editorLocator(viewerPage)).toContainText("owner-can-edit", {
        timeout: 20_000,
      });

      const beforeViewerEdit = (await editorLocator(viewerPage).textContent()) ?? "";
      await editorLocator(viewerPage).click({ force: true });
      await viewerPage.keyboard.type("viewer-attempt", { delay: 10 });
      await ownerPage.waitForTimeout(1_500);

      const afterViewerEdit = (await editorLocator(viewerPage).textContent()) ?? "";
      expect(afterViewerEdit).toBe(beforeViewerEdit);
      expect(afterViewerEdit).not.toContain("viewer-attempt");
    } finally {
      await ownerContext.close();
      await viewerContext.close();
    }
  });
});

async function typeInEditor(
  page: import("@playwright/test").Page,
  text: string,
): Promise<void> {
  const editor = editorLocator(page);
  await editor.click();
  await page.keyboard.type(text, { delay: 20 });
}
