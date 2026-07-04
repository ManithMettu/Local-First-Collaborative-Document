import * as Y from "yjs";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { runDocumentMarkupRepair } from "@/lib/yjs/repair-document";

function extractTextFromXmlText(node: Y.XmlText): string {
  let text = "";

  for (const op of node.toDelta()) {
    if (typeof op.insert === "string") {
      text += op.insert;
    }
  }

  return text;
}

function collectElementText(element: Y.XmlElement): string {
  const tag = element.nodeName;
  const parts: string[] = [];

  element.forEach((child) => {
    if (child instanceof Y.XmlText) {
      parts.push(extractTextFromXmlText(child));
      return;
    }

    if (child instanceof Y.XmlElement) {
      parts.push(collectElementText(child));
    }
  });

  const inner = parts.join("");

  if (
    tag === "paragraph" ||
    tag === "heading" ||
    tag.startsWith("heading") ||
    tag === "blockquote" ||
    tag === "listItem"
  ) {
    return `${inner}\n`;
  }

  if (tag === "hardBreak") {
    return "\n";
  }

  return inner;
}

export type PlainTextSegment = {
  node: Y.XmlText;
  start: number;
  text: string;
};

function walkElementSegments(
  element: Y.XmlElement,
  segments: PlainTextSegment[],
  startOffset: number,
): number {
  let length = 0;

  element.forEach((child) => {
    if (child instanceof Y.XmlText) {
      const text = extractTextFromXmlText(child);
      segments.push({
        node: child,
        start: startOffset + length,
        text,
      });
      length += text.length;
      return;
    }

    if (child instanceof Y.XmlElement) {
      length += walkElementSegments(child, segments, startOffset + length);
    }
  });

  return length;
}

export function buildPlainTextIndex(fragment: Y.XmlFragment): {
  plainText: string;
  segments: PlainTextSegment[];
} {
  const segments: PlainTextSegment[] = [];
  const parts: string[] = [];
  let offset = 0;

  fragment.forEach((child) => {
    if (!(child instanceof Y.XmlElement)) {
      return;
    }

    const blockStart = offset;
    walkElementSegments(child, segments, blockStart);
    const blockText = collectElementText(child);
    parts.push(blockText);
    offset += blockText.length;
  });

  return {
    plainText: parts.join(""),
    segments,
  };
}

export function extractPlainTextFromFragment(fragment: Y.XmlFragment): string {
  const parts: string[] = [];

  fragment.forEach((child) => {
    if (child instanceof Y.XmlText) {
      parts.push(extractTextFromXmlText(child));
      return;
    }

    if (child instanceof Y.XmlElement) {
      parts.push(collectElementText(child));
    }
  });

  return parts.join("");
}

export function extractPlainTextFromDoc(doc: Y.Doc): string {
  return extractPlainTextFromFragment(doc.getXmlFragment(YJS_DOCUMENT_FIELD));
}

export function extractTextFromYjsState(
  state: Uint8Array,
  maxLength = 280,
): string {
  const doc = new Y.Doc();

  try {
    Y.applyUpdate(doc, state);
    runDocumentMarkupRepair(doc, YJS_DOCUMENT_FIELD);
    const text = extractPlainTextFromDoc(doc).replace(/\n{3,}/g, "\n\n").trim();

    if (!text) {
      return "Empty document";
    }

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trimEnd()}…`;
  } finally {
    doc.destroy();
  }
}
