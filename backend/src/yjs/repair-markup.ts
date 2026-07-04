import * as Y from "yjs";

const CORRUPTED_MARKUP_PATTERN =
  /^<(?:bold|italic|underline|strike|code|highlight|textStyle|subscript|superscript)\b/;

type ParsedMarkup = {
  text: string;
  attributes: Record<string, unknown>;
};

function parseAttributeString(attrPart: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

  let match = regex.exec(attrPart);
  while (match) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
    match = regex.exec(attrPart);
  }

  const indexedKeys = Object.keys(attrs)
    .filter((key) => /^\d+$/.test(key))
    .sort((left, right) => Number(left) - Number(right));

  if (indexedKeys.length > 0) {
    attrs.__indexedValue = indexedKeys.map((key) => attrs[key] ?? "").join("");
    for (const key of indexedKeys) {
      delete attrs[key];
    }
  }

  return attrs;
}

function mergeTagAttributes(
  target: Record<string, unknown>,
  tag: string,
  attrs: Record<string, string>,
): void {
  switch (tag) {
    case "bold":
      target.bold = true;
      return;
    case "italic":
      target.italic = true;
      return;
    case "underline":
      target.underline = true;
      return;
    case "strike":
      target.strike = true;
      return;
    case "code":
      target.code = true;
      return;
    case "subscript":
      target.subscript = true;
      return;
    case "superscript":
      target.superscript = true;
      return;
    case "highlight":
      target.highlight = attrs.color ?? attrs.__indexedValue ?? true;
      return;
    case "textStyle": {
      const textStyle: Record<string, string> = {};

      if (attrs.color) {
        textStyle.color = attrs.color;
      }

      if (attrs.fontFamily) {
        textStyle.fontFamily = attrs.fontFamily;
      }

      if (attrs.fontSize) {
        textStyle.fontSize = attrs.fontSize;
      }

      if (Object.keys(textStyle).length > 0) {
        target.textStyle = textStyle;
      }

      return;
    }
    default:
      return;
  }
}

export function parseCorruptedMarkupString(
  markup: string,
): ParsedMarkup | null {
  if (!CORRUPTED_MARKUP_PATTERN.test(markup)) {
    return null;
  }

  let current = markup.trim();
  const attributes: Record<string, unknown> = {};

  while (CORRUPTED_MARKUP_PATTERN.test(current)) {
    const match = current.match(/^<([a-zA-Z]+)((?:\s[^>]*)?)>([\s\S]*)<\/\1>$/);

    if (!match) {
      return null;
    }

    const [, tag, attrPart, inner] = match;
    mergeTagAttributes(attributes, tag, parseAttributeString(attrPart.trim()));
    current = inner;
  }

  if (!current || current.includes("<")) {
    return null;
  }

  return { text: current, attributes };
}

export function isCorruptedMarkupXmlText(node: Y.XmlText): boolean {
  const delta = node.toDelta();

  if (delta.length !== 1) {
    return false;
  }

  const [operation] = delta;

  if (typeof operation.insert !== "string") {
    return false;
  }

  if (operation.attributes && Object.keys(operation.attributes).length > 0) {
    return false;
  }

  return CORRUPTED_MARKUP_PATTERN.test(operation.insert);
}

export function repairXmlText(node: Y.XmlText): boolean {
  if (!isCorruptedMarkupXmlText(node)) {
    return false;
  }

  const delta = node.toDelta();
  const [operation] = delta;
  const markup =
    typeof operation.insert === "string" ? operation.insert.trim() : "";

  const parsed = parseCorruptedMarkupString(markup);

  if (!parsed) {
    return false;
  }

  node.delete(0, node.length);
  node.applyDelta([
    {
      insert: parsed.text,
      attributes: parsed.attributes,
    },
  ]);

  return true;
}

function repairElement(element: Y.XmlElement): boolean {
  let repaired = false;

  element.forEach((child) => {
    if (child instanceof Y.XmlText) {
      if (repairXmlText(child)) {
        repaired = true;
      }
      return;
    }

    if (child instanceof Y.XmlElement && repairElement(child)) {
      repaired = true;
    }
  });

  return repaired;
}

export function repairFragmentMarkup(fragment: Y.XmlFragment): boolean {
  let repaired = false;

  fragment.forEach((child) => {
    if (child instanceof Y.XmlElement && repairElement(child)) {
      repaired = true;
    }
  });

  return repaired;
}

export function repairDocumentMarkup(doc: Y.Doc, field = "default"): boolean {
  return repairFragmentMarkup(doc.getXmlFragment(field));
}

export function runDocumentMarkupRepair(
  doc: Y.Doc,
  field = "default",
): boolean {
  let repaired = false;

  Y.transact(
    doc,
    () => {
      repaired = repairDocumentMarkup(doc, field);
    },
    "repair-markup",
  );

  return repaired;
}
