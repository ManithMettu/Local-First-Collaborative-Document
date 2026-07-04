import * as Y from "yjs";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { extractPlainTextFromDoc } from "@/lib/yjs/text";

export function encodeDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function plainText(doc: Y.Doc): string {
  return extractPlainTextFromDoc(doc).replace(/\n$/, "");
}

export function createDocWithText(text: string): Y.Doc {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment(YJS_DOCUMENT_FIELD);
  const paragraph = new Y.XmlElement("paragraph");
  const xmlText = new Y.XmlText();

  if (text.length > 0) {
    xmlText.insert(0, text);
    paragraph.insert(0, [xmlText]);
  }

  fragment.insert(0, [paragraph]);
  return doc;
}

export function createSnapshotState(text: string): Uint8Array {
  const doc = createDocWithText(text);
  const state = encodeDocState(doc);
  doc.destroy();
  return state;
}

export function appendTextToState(baseState: Uint8Array, suffix: string): Uint8Array {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, baseState);

  const fragment = doc.getXmlFragment(YJS_DOCUMENT_FIELD);
  const paragraph = fragment.get(0);

  if (!(paragraph instanceof Y.XmlElement)) {
    throw new Error("Expected paragraph element");
  }

  const firstChild = paragraph.get(0);

  if (suffix.length === 0) {
    return encodeDocState(doc);
  }

  if (firstChild instanceof Y.XmlText) {
    firstChild.insert(firstChild.length, suffix);
  } else {
    const xmlText = new Y.XmlText();
    xmlText.insert(0, suffix);
    paragraph.insert(0, [xmlText]);
  }

  const state = encodeDocState(doc);
  doc.destroy();
  return state;
}

export function insertTextAtEnd(doc: Y.Doc, text: string): void {
  const fragment = doc.getXmlFragment(YJS_DOCUMENT_FIELD);
  let paragraph = fragment.get(0);

  if (!(paragraph instanceof Y.XmlElement)) {
    paragraph = new Y.XmlElement("paragraph");
    fragment.insert(0, [paragraph]);
  }

  let xmlText = paragraph.get(0);
  if (!(xmlText instanceof Y.XmlText)) {
    xmlText = new Y.XmlText();
    paragraph.insert(0, [xmlText]);
  }

  xmlText.insert(xmlText.length, text);
}

export function applyUpdateSince(
  target: Y.Doc,
  source: Y.Doc,
  stateVector: Uint8Array,
): void {
  Y.applyUpdate(target, Y.encodeStateAsUpdate(source, stateVector));
}

export function syncDocs(left: Y.Doc, right: Y.Doc): void {
  Y.applyUpdate(left, Y.encodeStateAsUpdate(right));
  Y.applyUpdate(right, Y.encodeStateAsUpdate(left));
}

export function statesEqual(left: Y.Doc, right: Y.Doc): boolean {
  const leftState = encodeDocState(left);
  const rightState = encodeDocState(right);

  if (leftState.byteLength !== rightState.byteLength) {
    return false;
  }

  for (let index = 0; index < leftState.byteLength; index += 1) {
    if (leftState[index] !== rightState[index]) {
      return false;
    }
  }

  return true;
}
