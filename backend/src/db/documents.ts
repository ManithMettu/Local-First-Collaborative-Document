import { randomUUID } from "node:crypto";

import { config } from "../config.js";
import { createPgPool } from "./pool.js";

export type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

const pool = createPgPool(config.databaseUrl);

export async function resolveDocumentRole(
  userId: string,
  documentId: string,
): Promise<DocumentRole | null> {
  const documentResult = await pool.query<{ owner_id: string }>(
    "SELECT owner_id FROM documents WHERE id = $1 LIMIT 1",
    [documentId],
  );

  if (documentResult.rowCount === 0) {
    return null;
  }

  const ownerId = documentResult.rows[0]?.owner_id;
  if (!ownerId) {
    return null;
  }

  if (ownerId === userId) {
    return "OWNER";
  }

  const collaborationResult = await pool.query<{ role: DocumentRole }>(
    "SELECT role FROM document_collaborators WHERE document_id = $1 AND user_id = $2 LIMIT 1",
    [documentId, userId],
  );

  if (collaborationResult.rowCount === 0) {
    return null;
  }

  return collaborationResult.rows[0]?.role ?? null;
}

export async function getLatestSnapshotState(
  documentId: string,
): Promise<Uint8Array | null> {
  const result = await pool.query<{ yjs_state: Buffer }>(
    "SELECT yjs_state FROM document_snapshots WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1",
    [documentId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return new Uint8Array(row.yjs_state);
}

export async function createAutoSnapshot(
  documentId: string,
  state: Uint8Array,
): Promise<string> {
  const snapshotId = randomUUID();

  await pool.query(
    `INSERT INTO document_snapshots (id, document_id, yjs_state, kind, created_at)
     VALUES ($1, $2, $3, 'AUTO', NOW())`,
    [snapshotId, documentId, Buffer.from(state)],
  );

  return snapshotId;
}

export async function closeDatabasePool(): Promise<void> {
  await pool.end();
}
