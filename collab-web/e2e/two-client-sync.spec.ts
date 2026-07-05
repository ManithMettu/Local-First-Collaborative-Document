import { test } from "@playwright/test";

import { isDatabaseAvailable } from "./db";
import {
  login,
  createDocument,
  createTestUser,
  expectEditorContains,
  register,
  typeInEditor,
  waitForEditor,
  waitForOnline,
} from "./helpers";

test.describe("two-client collaboration", () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isDatabaseAvailable()),
      "PostgreSQL must be running (DATABASE_URL) for Playwright e2e tests",
    );
  });

  test("syncs edits between two browser contexts on the same document", async ({
    browser,
  }) => {
    const user = createTestUser("sync");

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await register(pageA, user);
      const documentUrl = await createDocument(pageA, "Two-client sync");

      await login(pageB, user);
      await pageA.goto(documentUrl);
      await pageB.goto(documentUrl);

      await waitForEditor(pageA);
      await waitForEditor(pageB);
      await waitForOnline(pageA);
      await waitForOnline(pageB);

      await typeInEditor(pageA, "Hello from client A");

      await expectEditorContains(pageB, "Hello from client A");

      await typeInEditor(pageB, " + client B");

      await expectEditorContains(pageA, "Hello from client A + client B");
      await expectEditorContains(pageB, "Hello from client A + client B");
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test("replays offline edits after reconnect without losing online peer changes", async ({
    browser,
  }) => {
    const user = createTestUser("offline");

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await register(pageA, user);
      const documentUrl = await createDocument(pageA, "Offline reconnect");

      await login(pageB, user);
      await pageA.goto(documentUrl);
      await pageB.goto(documentUrl);

      await waitForEditor(pageA);
      await waitForEditor(pageB);
      await waitForOnline(pageA);
      await waitForOnline(pageB);

      await contextA.setOffline(true);
      await typeInEditor(pageA, "[offline]");

      await typeInEditor(pageB, "[online]");

      await expectEditorContains(pageB, "[online]");

      await contextA.setOffline(false);

      await expectEditorContains(pageA, "[offline]", 60_000);
      await expectEditorContains(pageA, "[online]", 60_000);
      await expectEditorContains(pageB, "[offline]", 60_000);
      await expectEditorContains(pageB, "[online]", 60_000);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
