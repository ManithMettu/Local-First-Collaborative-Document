import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  parseCorruptedMarkupString,
  repairDocumentMarkup,
  repairXmlText,
} from "@/lib/yjs/repair-markup";
import { extractPlainTextFromDoc } from "@/lib/yjs/text";

const CORRUPT_MARKUP =
  '<bold><highlight color="#fef08a"><italic><textStyle color="#2563eb" fontFamily="var(--font-mono), monospace" fontSize="32px"><underline>ba</underline></textStyle></italic></highlight></bold>';

describe("parseCorruptedMarkupString", () => {
  it("parses nested mark wrappers into a single attributed insert", () => {
    const parsed = parseCorruptedMarkupString(CORRUPT_MARKUP);

    expect(parsed).toEqual({
      text: "ba",
      attributes: {
        bold: true,
        highlight: "#fef08a",
        italic: true,
        textStyle: {
          color: "#2563eb",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "32px",
        },
        underline: true,
      },
    });
  });
});

describe("repairXmlText", () => {
  it("replaces corrupted literal markup with proper delta attributes", () => {
    const doc = new Y.Doc();
    const paragraph = new Y.XmlElement("paragraph");
    const xmlText = new Y.XmlText();
    xmlText.insert(0, CORRUPT_MARKUP);
    paragraph.insert(0, [xmlText]);
    doc.getXmlFragment("default").insert(0, [paragraph]);

    expect(repairXmlText(xmlText)).toBe(true);
    expect(xmlText.toDelta()).toEqual([
      {
        insert: "ba",
        attributes: {
          bold: true,
          highlight: "#fef08a",
          italic: true,
          textStyle: {
            color: "#2563eb",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "32px",
          },
          underline: true,
        },
      },
    ]);
    expect(extractPlainTextFromDoc(doc)).toBe("ba\n");
  });
});

describe("repairDocumentMarkup", () => {
  it("repairs all corrupted text nodes in a document", () => {
    const doc = new Y.Doc();
    const paragraph = new Y.XmlElement("paragraph");
    const xmlText = new Y.XmlText();
    xmlText.insert(0, CORRUPT_MARKUP);
    paragraph.insert(0, [xmlText]);
    doc.getXmlFragment("default").insert(0, [paragraph]);

    expect(repairDocumentMarkup(doc)).toBe(true);
    expect(extractPlainTextFromDoc(doc)).toBe("ba\n");
  });
});
