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
} from "../../helpers/yjs-fixtures";

describe("Yjs CRDT determinism", () => {
  it("converges when the same updates are applied in different orders", () => {
    const base = encodeDocState(createDocWithText(""));

    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    Y.applyUpdate(clientA, base);
    Y.applyUpdate(clientB, base);

    const vectorBeforeA = Y.encodeStateVector(clientA);
    const vectorBeforeB = Y.encodeStateVector(clientB);

    insertTextAtEnd(clientA, "hello");
    insertTextAtEnd(clientB, " world");

    const updateA = Y.encodeStateAsUpdate(clientA, vectorBeforeA);
    const updateB = Y.encodeStateAsUpdate(clientB, vectorBeforeB);

    const mergedAB = new Y.Doc();
    const mergedBA = new Y.Doc();
    Y.applyUpdate(mergedAB, base);
    Y.applyUpdate(mergedBA, base);
    Y.applyUpdate(mergedAB, updateA);
    Y.applyUpdate(mergedAB, updateB);
    Y.applyUpdate(mergedBA, updateB);
    Y.applyUpdate(mergedBA, updateA);

    expect(plainText(mergedAB)).toBe(plainText(mergedBA));
    expect(statesEqual(mergedAB, mergedBA)).toBe(true);
    expect(plainText(mergedAB)).toContain("hello");
    expect(plainText(mergedAB)).toContain(" world");

    clientA.destroy();
    clientB.destroy();
    mergedAB.destroy();
    mergedBA.destroy();
  });

  it("converges after bidirectional sync following divergent offline edits", () => {
    const shared = createDocWithText("start-");
    const base = encodeDocState(shared);
    shared.destroy();

    const offlineA = new Y.Doc();
    const offlineB = new Y.Doc();
    Y.applyUpdate(offlineA, base);
    Y.applyUpdate(offlineB, base);

    const vectorA = Y.encodeStateVector(offlineA);
    const vectorB = Y.encodeStateVector(offlineB);

    insertTextAtEnd(offlineA, "AAA");
    insertTextAtEnd(offlineB, "BBB");

    Y.encodeStateAsUpdate(offlineA, vectorA);
    Y.encodeStateAsUpdate(offlineB, vectorB);

    const replicaOne = new Y.Doc();
    const replicaTwo = new Y.Doc();
    Y.applyUpdate(replicaOne, base);
    Y.applyUpdate(replicaTwo, base);

    applyUpdateSince(replicaOne, offlineA, Y.encodeStateVector(replicaOne));
    applyUpdateSince(replicaTwo, offlineB, Y.encodeStateVector(replicaTwo));
    syncDocs(replicaOne, replicaTwo);

    expect(plainText(replicaOne)).toBe(plainText(replicaTwo));
    expect(plainText(replicaOne)).toContain("AAA");
    expect(plainText(replicaOne)).toContain("BBB");

    offlineA.destroy();
    offlineB.destroy();
    replicaOne.destroy();
    replicaTwo.destroy();
  });

  it("produces identical state when merging three concurrent inserts", () => {
    const base = encodeDocState(createDocWithText(""));

    const docs = Array.from({ length: 3 }, () => {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, base);
      return doc;
    });

    const vectors = docs.map((doc) => Y.encodeStateVector(doc));
    const labels = ["A", "B", "C"];

    docs.forEach((doc, index) => {
      insertTextAtEnd(doc, labels[index] ?? "");
    });

    const updates = docs.map((doc, index) =>
      Y.encodeStateAsUpdate(doc, vectors[index]),
    );

    function mergeInOrder(order: number[]): Y.Doc {
      const merged = new Y.Doc();
      Y.applyUpdate(merged, base);

      for (const index of order) {
        Y.applyUpdate(merged, updates[index]!);
      }

      return merged;
    }

    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];

    const mergedDocs = permutations.map(mergeInOrder);
    const referenceText = plainText(mergedDocs[0]!);

    for (const merged of mergedDocs) {
      expect(plainText(merged)).toBe(referenceText);
    }

    for (let index = 1; index < mergedDocs.length; index += 1) {
      expect(statesEqual(mergedDocs[0]!, mergedDocs[index]!)).toBe(true);
    }

    docs.forEach((doc) => doc.destroy());
    mergedDocs.forEach((doc) => doc.destroy());
  });
});
