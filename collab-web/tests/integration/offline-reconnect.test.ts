import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  applyUpdateSince,
  createDocWithText,
  encodeDocState,
  insertTextAtEnd,
  plainText,
  statesEqual,
  syncDocs,
} from "../helpers/yjs-fixtures";

describe("offline reconnect integration", () => {
  it("replays queued local updates after reconnect and converges with a live peer", () => {
    const serverDoc = createDocWithText("");
    const base = encodeDocState(serverDoc);

    const clientOnline = new Y.Doc();
    const clientOffline = new Y.Doc();
    Y.applyUpdate(clientOnline, base);
    Y.applyUpdate(clientOffline, base);
    syncDocs(clientOnline, serverDoc);

    const offlineVector = Y.encodeStateVector(clientOffline);
    insertTextAtEnd(clientOffline, "offline-edit");

    insertTextAtEnd(clientOnline, "online-edit");
    syncDocs(clientOnline, serverDoc);

    applyUpdateSince(clientOffline, clientOnline, offlineVector);
    syncDocs(clientOffline, serverDoc);
    syncDocs(clientOnline, serverDoc);

    expect(plainText(clientOffline)).toBe(plainText(serverDoc));
    expect(plainText(clientOnline)).toBe(plainText(serverDoc));
    expect(plainText(serverDoc)).toContain("offline-edit");
    expect(plainText(serverDoc)).toContain("online-edit");
    expect(statesEqual(clientOffline, clientOnline)).toBe(true);
    expect(statesEqual(clientOnline, serverDoc)).toBe(true);

    serverDoc.destroy();
    clientOnline.destroy();
    clientOffline.destroy();
  });

  it("preserves both sides' edits when clients reconnect in arbitrary order", () => {
    const base = encodeDocState(createDocWithText("seed-"));

    const alice = new Y.Doc();
    const bob = new Y.Doc();
    Y.applyUpdate(alice, base);
    Y.applyUpdate(bob, base);

    const aliceVector = Y.encodeStateVector(alice);
    const bobVector = Y.encodeStateVector(bob);

    insertTextAtEnd(alice, "alice");
    insertTextAtEnd(bob, "bob");

    const aliceUpdate = Y.encodeStateAsUpdate(alice, aliceVector);
    const bobUpdate = Y.encodeStateAsUpdate(bob, bobVector);

    const relayAliceFirst = new Y.Doc();
    const relayBobFirst = new Y.Doc();
    Y.applyUpdate(relayAliceFirst, base);
    Y.applyUpdate(relayBobFirst, base);
    Y.applyUpdate(relayAliceFirst, aliceUpdate);
    Y.applyUpdate(relayAliceFirst, bobUpdate);
    Y.applyUpdate(relayBobFirst, bobUpdate);
    Y.applyUpdate(relayBobFirst, aliceUpdate);

    expect(statesEqual(relayAliceFirst, relayBobFirst)).toBe(true);
    expect(plainText(relayAliceFirst)).toContain("alice");
    expect(plainText(relayAliceFirst)).toContain("bob");

    alice.destroy();
    bob.destroy();
    relayAliceFirst.destroy();
    relayBobFirst.destroy();
  });
});
