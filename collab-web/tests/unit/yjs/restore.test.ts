import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import { computeRestoreUpdate } from "@/lib/yjs/restore";
import { extractPlainTextFromDoc } from "@/lib/yjs/text";

import {
  appendTextToState,
  createSnapshotState,
  plainText,
} from "../../helpers/yjs-fixtures";

describe("computeRestoreUpdate", () => {
  it("returns an empty update when the snapshot is an ancestor of current state", () => {
    const snapshotState = createSnapshotState("AAA");
    const currentState = appendTextToState(snapshotState, "BBB");

    const currentDoc = new Y.Doc();
    const targetDoc = new Y.Doc();
    Y.applyUpdate(currentDoc, currentState);
    Y.applyUpdate(targetDoc, snapshotState);

    const ancestorUpdate = Y.encodeStateAsUpdate(
      targetDoc,
      Y.encodeStateVector(currentDoc),
    );

    expect(ancestorUpdate.byteLength).toBeLessThanOrEqual(2);

    currentDoc.destroy();
    targetDoc.destroy();
  });

  it("applies restore as a forward mergeable update on top of current state", () => {
    const snapshotState = createSnapshotState("AAA");
    const currentState = appendTextToState(snapshotState, "BBB");

    const liveDoc = new Y.Doc();
    Y.applyUpdate(liveDoc, currentState);

    const restoreUpdate = computeRestoreUpdate(currentState, snapshotState);
    Y.applyUpdate(liveDoc, restoreUpdate, "restore");

    expect(plainText(liveDoc)).toBe("AAA");
    expect(restoreUpdate.byteLength).toBeGreaterThan(2);

    liveDoc.destroy();
  });

  it("preserves rich text marks when restoring a formatted snapshot", () => {
    const snapshotDoc = new Y.Doc();
    const fragment = snapshotDoc.getXmlFragment("default");
    const paragraph = new Y.XmlElement("paragraph");
    const xmlText = new Y.XmlText();
    xmlText.insert(0, "hello", { bold: true });
    paragraph.insert(0, [xmlText]);
    fragment.insert(0, [paragraph]);
    const snapshotState = Y.encodeStateAsUpdate(snapshotDoc);

    const currentDoc = new Y.Doc();
    Y.applyUpdate(currentDoc, snapshotState);
    const currentParagraph = currentDoc.getXmlFragment("default").get(0);
    const currentText = currentParagraph?.get(0);
    if (currentText instanceof Y.XmlText) {
      currentText.insert(currentText.length, " world");
    }
    const currentState = Y.encodeStateAsUpdate(currentDoc);

    const restoreUpdate = computeRestoreUpdate(currentState, snapshotState);
    const liveDoc = new Y.Doc();
    Y.applyUpdate(liveDoc, currentState);
    Y.applyUpdate(liveDoc, restoreUpdate, "restore");

    const restoredText = liveDoc.getXmlFragment("default").get(0)?.get(0);
    expect(restoredText).toBeInstanceOf(Y.XmlText);
    if (restoredText instanceof Y.XmlText) {
      expect(restoredText.toDelta()).toEqual([
        { insert: "hello", attributes: { bold: true } },
      ]);
    }

    snapshotDoc.destroy();
    currentDoc.destroy();
    liveDoc.destroy();
  });
});

describe("restore with concurrent state", () => {
  it("replaces visible content when restoring an older snapshot", () => {
    const snapshotState = createSnapshotState("AAA");
    const currentState = appendTextToState(snapshotState, "BBB");

    const peerDoc = new Y.Doc();
    Y.applyUpdate(peerDoc, currentState);
    const peerVector = Y.encodeStateVector(peerDoc);
    appendTextAtEnd(peerDoc, "CCC");

    const restoreUpdate = computeRestoreUpdate(currentState, snapshotState);

    const liveDoc = new Y.Doc();
    Y.applyUpdate(liveDoc, currentState);
    Y.applyUpdate(liveDoc, restoreUpdate, "restore");
    Y.applyUpdate(liveDoc, Y.encodeStateAsUpdate(peerDoc, peerVector));

    const text = extractPlainTextFromDoc(liveDoc).replace(/\n$/, "");
    expect(text).toBe("AAA");
    expect(text).not.toContain("BBB");

    peerDoc.destroy();
    liveDoc.destroy();
  });
});

function appendTextAtEnd(doc: Y.Doc, suffix: string): void {
  const fragment = doc.getXmlFragment("default");
  const paragraph = fragment.get(0);

  if (!(paragraph instanceof Y.XmlElement)) {
    return;
  }

  const xmlText = paragraph.get(0);
  if (xmlText instanceof Y.XmlText) {
    xmlText.insert(xmlText.length, suffix);
  }
}
