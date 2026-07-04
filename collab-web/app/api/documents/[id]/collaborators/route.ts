import { NextResponse } from "next/server";

import {
  badRequest,
  conflict,
  notFound,
  serverError,
} from "@/lib/api/response";
import { requireDocumentOwner, requireUserId } from "@/lib/documents/access";
import { serializeCollaborator } from "@/lib/documents/serializers";
import { db } from "@/lib/db";
import { addCollaboratorSchema } from "@/lib/validations/document";
import type { DocumentIdRouteContext } from "@/types/api";

export async function POST(request: Request, context: DocumentIdRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id: documentId } = await context.params;

  const access = await requireDocumentOwner(userId, documentId);
  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json();
    const parsed = addCollaboratorSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const targetUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!targetUser) {
      return notFound("No user found with that email");
    }

    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!document) {
      return notFound();
    }

    if (targetUser.id === document.ownerId) {
      return badRequest("The document owner cannot be added as a collaborator");
    }

    if (targetUser.id === userId) {
      return badRequest("You cannot add yourself as a collaborator");
    }

    const existingCollaboration = await db.documentCollaborator.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUser.id,
        },
      },
    });

    if (existingCollaboration) {
      return conflict("This user is already a collaborator on this document");
    }

    const collaborator = await db.documentCollaborator.create({
      data: {
        documentId,
        userId: targetUser.id,
        role: parsed.data.role,
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

    return NextResponse.json(
      { collaborator: serializeCollaborator(collaborator) },
      { status: 201 },
    );
  } catch {
    return serverError();
  }
}
