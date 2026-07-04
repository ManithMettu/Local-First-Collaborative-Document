/** Shared Yjs field name for the Tiptap ProseMirror fragment. */
export const YJS_DOCUMENT_FIELD = "default";

/** IndexedDB database name scoped per document. */
export function getIndexedDbName(documentId: string): string {
  return `collab-doc-${documentId}`;
}
