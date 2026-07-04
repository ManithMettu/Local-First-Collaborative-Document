import { NextResponse } from "next/server";

import {
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/response";
import { requireDocumentOwner, requireUserId } from "@/lib/documents/access";
import { serializeCollaborator } from "@/lib/documents/serializers";
import { db } from "@/lib/db";
import { updateCollaboratorSchema } from "@/lib/validations/document";
import { disconnectServerUser } from "@/lib/ws/internal";
import type { DocumentCollaboratorRouteContext } from "@/types/api";

async function findCollaboratorForDocument(
  documentId: string,
  collaboratorId: string,
) {
  return db.documentCollaborator.findFirst({
    where: {
      id: collaboratorId,
      documentId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function PATCH(request: Request, context: DocumentCollaboratorRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id: documentId, collaboratorId } = await context.params;

  const access = await requireDocumentOwner(userId, documentId);
  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json();
    const parsed = updateCollaboratorSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const existing = await findCollaboratorForDocument(
      documentId,
      collaboratorId,
    );

    if (!existing) {
      return notFound();
    }

    const roleChanged = existing.role !== parsed.data.role;

    const collaborator = await db.documentCollaborator.update({
      where: { id: collaboratorId },
      data: { role: parsed.data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (roleChanged) {
      await disconnectServerUser(documentId, existing.userId);
    }

    return NextResponse.json({
      collaborator: serializeCollaborator(collaborator),
    });
  } catch {
    return serverError();
  }
}

export async function DELETE(_request: Request, context: DocumentCollaboratorRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id: documentId, collaboratorId } = await context.params;

  const access = await requireDocumentOwner(userId, documentId);
  if (!access.ok) {
    return access.response;
  }

  try {
    const existing = await findCollaboratorForDocument(
      documentId,
      collaboratorId,
    );

    if (!existing) {
      return notFound();
    }

    const removedUserId = existing.userId;

    await db.documentCollaborator.delete({
      where: { id: collaboratorId },
    });

    await disconnectServerUser(documentId, removedUserId);

    return new NextResponse(null, { status: 204 });
  } catch {
    return serverError();
  }
}
