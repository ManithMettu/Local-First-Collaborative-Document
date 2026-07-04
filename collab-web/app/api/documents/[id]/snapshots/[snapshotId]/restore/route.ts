import { NextResponse } from "next/server";

import { notFound, serverError } from "@/lib/api/response";
import {
  requireDocumentAccess,
  requireUserId,
} from "@/lib/documents/access";
import {
  getSnapshotState,
  resolveLiveDocumentState,
} from "@/lib/documents/snapshots";
import {
  computeRestoreUpdate,
  encodeStateBase64,
} from "@/lib/yjs/restore";
import { applyServerDocumentUpdate } from "@/lib/ws/internal";
import type { DocumentSnapshotRestoreRouteContext } from "@/types/api";

export async function POST(_request: Request, context: DocumentSnapshotRestoreRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id: documentId, snapshotId } = await context.params;

  const access = await requireDocumentAccess(userId, documentId, "EDITOR");
  if (!access.ok) {
    return access.response;
  }

  try {
    const snapshotState = await getSnapshotState(documentId, snapshotId);
    if (!snapshotState) {
      return notFound();
    }

    const currentState = await resolveLiveDocumentState(documentId);
    const restoreUpdate = computeRestoreUpdate(currentState, snapshotState);

    if (restoreUpdate.byteLength === 0) {
      return NextResponse.json({
        applied: true,
        update: encodeStateBase64(new Uint8Array()),
        message: "Document already matches this version",
      });
    }

    await applyServerDocumentUpdate(documentId, restoreUpdate);

    return NextResponse.json({
      applied: true,
      update: encodeStateBase64(restoreUpdate),
    });
  } catch {
    return serverError();
  }
}
