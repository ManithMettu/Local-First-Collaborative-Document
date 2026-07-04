import { NextResponse } from "next/server";

import { badRequest, notFound, serverError } from "@/lib/api/response";
import {
  requireDocumentAccess,
  requireUserId,
} from "@/lib/documents/access";
import {
  resolveLiveDocumentState,
  serializeSnapshotListItem,
} from "@/lib/documents/snapshots";
import { generateChangeSummary } from "@/lib/documents/snapshot-summaries";
import { db } from "@/lib/db";
import { createSnapshotSchema } from "@/lib/validations/snapshot";
import type { DocumentIdRouteContext } from "@/types/api";

export async function GET(_request: Request, context: DocumentIdRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id: documentId } = await context.params;

  const access = await requireDocumentAccess(userId, documentId, "VIEWER");
  if (!access.ok) {
    return access.response;
  }

  try {
    const snapshots = await db.documentSnapshot.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        kind: true,
        label: true,
        changeSummary: true,
        createdAt: true,
        yjsState: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      snapshots: snapshots.map((snapshot) =>
        serializeSnapshotListItem(
          snapshot,
          new Uint8Array(snapshot.yjsState),
        ),
      ),
    });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request, context: DocumentIdRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id: documentId } = await context.params;

  const access = await requireDocumentAccess(userId, documentId, "EDITOR");
  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createSnapshotSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });

    if (!document) {
      return notFound();
    }

    const state = await resolveLiveDocumentState(documentId);
    const changeSummary = await generateChangeSummary(documentId, state);

    const snapshot = await db.documentSnapshot.create({
      data: {
        documentId,
        yjsState: Buffer.from(state),
        kind: "MANUAL",
        label: parsed.data.label,
        changeSummary,
        createdById: userId,
      },
      select: {
        id: true,
        kind: true,
        label: true,
        changeSummary: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        snapshot: serializeSnapshotListItem(snapshot, state),
      },
      { status: 201 },
    );
  } catch {
    return serverError();
  }
}
