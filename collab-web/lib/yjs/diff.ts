import { diffChars } from "diff";
import * as Y from "yjs";

import { extractPlainTextFromDoc } from "@/lib/yjs/text";

const MAX_DIFF_CHARS = 2_000;
const MAX_SNIPPET_CHARS = 400;

function truncate(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

export function extractPlainTextFromYjsState(state: Uint8Array): string {
  const doc = new Y.Doc();

  try {
    Y.applyUpdate(doc, state);
    return extractPlainTextFromDoc(doc);
  } finally {
    doc.destroy();
  }
}

export function buildDiffForPrompt(previousText: string, nextText: string): string {
  if (previousText === nextText) {
    return "No textual changes.";
  }

  const parts: string[] = [];

  for (const change of diffChars(previousText, nextText)) {
    if (change.added) {
      parts.push(`+ ${truncate(change.value, MAX_SNIPPET_CHARS)}`);
    } else if (change.removed) {
      parts.push(`- ${truncate(change.value, MAX_SNIPPET_CHARS)}`);
    }
  }

  const diff = parts.join("\n");
  if (diff.length <= MAX_DIFF_CHARS) {
    return diff;
  }

  return `${diff.slice(0, MAX_DIFF_CHARS).trimEnd()}…`;
}

export function buildSnapshotDiffDescription(
  previousState: Uint8Array | null,
  nextState: Uint8Array,
): string {
  const nextText = extractPlainTextFromYjsState(nextState);

  if (!previousState) {
    if (!nextText.trim()) {
      return "Initial version: empty document.";
    }

    return `Initial version added content:\n${truncate(nextText, MAX_SNIPPET_CHARS)}`;
  }

  const previousText = extractPlainTextFromYjsState(previousState);
  return buildDiffForPrompt(previousText, nextText);
}
