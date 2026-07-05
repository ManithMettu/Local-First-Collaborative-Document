import * as Y from "yjs";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { repairFragmentMarkup } from "@/lib/yjs/repair-markup";

function cloneFragmentChildren(
  source: Y.XmlFragment,
): Array<Y.XmlElement | Y.XmlText> {
  const items: Array<Y.XmlElement | Y.XmlText> = [];

  source.forEach((child) => {
    if (child instanceof Y.XmlElement || child instanceof Y.XmlText) {
      items.push(child.clone());
    }
  });

  return items;
}

function replaceFragmentFromSnapshot(
  target: Y.XmlFragment,
  source: Y.XmlFragment,
): void {
  target.delete(0, target.length);

  const clones = cloneFragmentChildren(source);

  if (clones.length > 0) {
    target.insert(0, clones);
  } else {
    target.insert(0, [new Y.XmlElement("paragraph")]);
  }

  repairFragmentMarkup(target);
}

/**
 * Computes a mergeable Yjs update that moves `currentState` toward the snapshot
 * by cloning the snapshot fragment into the live document — preserving rich
 * text marks and structure, not plain-text tag serialization.
 */
export function computeRestoreUpdate(
  currentState: Uint8Array,
  targetSnapshotState: Uint8Array,
): Uint8Array {
  const currentDoc = new Y.Doc();
  const targetDoc = new Y.Doc();

  try {
    Y.applyUpdate(currentDoc, currentState);
    Y.applyUpdate(targetDoc, targetSnapshotState);

    Y.transact(
      targetDoc,
      () => {
        repairFragmentMarkup(targetDoc.getXmlFragment(YJS_DOCUMENT_FIELD));
      },
      "repair-markup",
    );

    const stateVectorBefore = Y.encodeStateVector(currentDoc);

    Y.transact(
      currentDoc,
      () => {
        replaceFragmentFromSnapshot(
          currentDoc.getXmlFragment(YJS_DOCUMENT_FIELD),
          targetDoc.getXmlFragment(YJS_DOCUMENT_FIELD),
        );
      },
      "restore",
    );

    return Y.encodeStateAsUpdate(currentDoc, stateVectorBefore);
  } finally {
    currentDoc.destroy();
    targetDoc.destroy();
  }
}

export function applyRestoreUpdateToDoc(
  doc: Y.Doc,
  currentState: Uint8Array,
  targetSnapshotState: Uint8Array,
): Uint8Array {
  const update = computeRestoreUpdate(currentState, targetSnapshotState);

  if (update.byteLength > 0) {
    Y.applyUpdate(doc, update, "restore");
  }

  return update;
}

export function encodeStateBase64(state: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(state).toString("base64");
  }

  let binary = "";
  for (const byte of state) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeStateBase64(encoded: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(encoded, "base64"));
  }

  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function mergeDocumentState(
  currentState: Uint8Array,
  restoreUpdate: Uint8Array,
): Uint8Array {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, currentState);
    Y.applyUpdate(doc, restoreUpdate);
    return Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }
}
