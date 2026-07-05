import * as Y from "yjs";

import { createAutoSnapshot, getLatestSnapshotState } from "../db/documents.js";
import { config } from "../config.js";
import { requestSnapshotSummary } from "../services/summaries.js";
import { runDocumentMarkupRepair } from "../yjs/repair-markup.js";

function hashState(update: Uint8Array): string {
  return Buffer.from(update).toString("base64");
}

export class DocumentPersistence {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly lastSavedHash = new Map<string, string>();

  async hydrateDocument(documentId: string, doc: Y.Doc): Promise<void> {
    const snapshot = await getLatestSnapshotState(documentId);

    if (!snapshot) {
      return;
    }

    Y.applyUpdate(doc, snapshot);
    const repaired = runDocumentMarkupRepair(doc);
    const state = Y.encodeStateAsUpdate(doc);
    this.lastSavedHash.set(documentId, hashState(state));

    if (repaired) {
      await this.flush(documentId, doc);
    }
  }

  scheduleFlush(documentId: string, doc: Y.Doc): void {
    const existingTimer = this.timers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      void this.flush(documentId, doc);
    }, config.persistenceDebounceMs);

    this.timers.set(documentId, timer);
  }

  async flush(documentId: string, doc: Y.Doc): Promise<void> {
    this.timers.delete(documentId);

    const state = Y.encodeStateAsUpdate(doc);
    const stateHash = hashState(state);
    const previousHash = this.lastSavedHash.get(documentId);

    if (previousHash === stateHash) {
      return;
    }

    try {
      const snapshotId = await createAutoSnapshot(documentId, state);
      this.lastSavedHash.set(documentId, stateHash);
      void requestSnapshotSummary(documentId, snapshotId);
    } catch (error) {
      console.error(
        `[persistence] Failed to save snapshot for document ${documentId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  async flushAll(docs: Map<string, Y.Doc>): Promise<void> {
    await Promise.all(
      Array.from(docs.entries()).map(([documentId, doc]) =>
        this.flush(documentId, doc),
      ),
    );
  }

  dispose(documentId: string): void {
    const timer = this.timers.get(documentId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(documentId);
    }
  }
}

export const documentPersistence = new DocumentPersistence();
