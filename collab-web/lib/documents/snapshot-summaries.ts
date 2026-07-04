import { generateVersionSummary } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { buildSnapshotDiffDescription } from "@/lib/yjs/diff";

export async function generateChangeSummary(
  documentId: string,
  newState: Uint8Array,
): Promise<string | null> {
  const previousSnapshot = await db.documentSnapshot.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: { yjsState: true },
  });

  const diffDescription = buildSnapshotDiffDescription(
    previousSnapshot ? new Uint8Array(previousSnapshot.yjsState) : null,
    newState,
  );

  return generateVersionSummary(diffDescription);
}

export async function summarizeSnapshotById(
  documentId: string,
  snapshotId: string,
): Promise<string | null> {
  const snapshot = await db.documentSnapshot.findFirst({
    where: { id: snapshotId, documentId },
    select: {
      id: true,
      yjsState: true,
      changeSummary: true,
      createdAt: true,
    },
  });

  if (!snapshot) {
    return null;
  }

  if (snapshot.changeSummary) {
    return snapshot.changeSummary;
  }

  const previousSnapshot = await db.documentSnapshot.findFirst({
    where: {
      documentId,
      createdAt: { lt: snapshot.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { yjsState: true },
  });

  const changeSummary = await generateVersionSummary(
    buildSnapshotDiffDescription(
      previousSnapshot ? new Uint8Array(previousSnapshot.yjsState) : null,
      new Uint8Array(snapshot.yjsState),
    ),
  );

  if (!changeSummary) {
    return null;
  }

  await db.documentSnapshot.update({
    where: { id: snapshot.id },
    data: { changeSummary },
  });

  return changeSummary;
}
