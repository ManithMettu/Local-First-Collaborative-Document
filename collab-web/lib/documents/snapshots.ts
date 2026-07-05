import { db } from "@/lib/db";
import { extractTextFromYjsState } from "@/lib/yjs/preview";
import { fetchServerDocumentState } from "@/lib/ws/internal";

export async function persistDocumentStateAsSnapshot(
  documentId: string,
  state: Uint8Array,
  userId: string,
  label = "Restored version",
): Promise<void> {
  await db.documentSnapshot.create({
    data: {
      documentId,
      yjsState: Buffer.from(state),
      kind: "MANUAL",
      label,
      createdById: userId,
    },
  });
}

export async function resolveLiveDocumentState(
  documentId: string,
): Promise<Uint8Array> {
  const serverState = await fetchServerDocumentState(documentId);
  if (serverState) {
    return serverState;
  }

  const latestSnapshot = await db.documentSnapshot.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: { yjsState: true },
  });

  if (latestSnapshot) {
    return new Uint8Array(latestSnapshot.yjsState);
  }

  const emptyDoc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(emptyDoc);
  emptyDoc.destroy();
  return state;
}

export async function getSnapshotState(
  documentId: string,
  snapshotId: string,
): Promise<Uint8Array | null> {
  const snapshot = await db.documentSnapshot.findFirst({
    where: { id: snapshotId, documentId },
    select: { yjsState: true },
  });

  if (!snapshot) {
    return null;
  }

  return new Uint8Array(snapshot.yjsState);
}

export function serializeSnapshotListItem(
  snapshot: {
    id: string;
    kind: "MANUAL" | "AUTO";
    label: string | null;
    changeSummary: string | null;
    createdAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  },
  yjsState: Uint8Array,
) {
  return {
    id: snapshot.id,
    kind: snapshot.kind,
    label: snapshot.label,
    changeSummary: snapshot.changeSummary,
    previewText: extractTextFromYjsState(yjsState),
    createdAt: snapshot.createdAt.toISOString(),
    createdBy: snapshot.createdBy,
  };
}
