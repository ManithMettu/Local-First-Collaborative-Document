import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import { computeRestoreUpdate, mergeDocumentState } from "@/lib/yjs/restore";

import {
  appendTextToState,
  createSnapshotState,
  plainText,
} from "../../helpers/yjs-fixtures";

describe("mergeDocumentState", () => {
  it("produces the restored document when no live room is available", () => {
    const snapshotState = createSnapshotState("version-a");
    const currentState = appendTextToState(snapshotState, "version-b");
    const restoreUpdate = computeRestoreUpdate(currentState, snapshotState);
    const mergedState = mergeDocumentState(currentState, restoreUpdate);

    const doc = new Y.Doc();
    Y.applyUpdate(doc, mergedState);
    expect(plainText(doc)).toBe("version-a");
    doc.destroy();
  });
});
