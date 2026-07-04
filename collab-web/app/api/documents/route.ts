import { NextResponse } from "next/server";

import { badRequest, notFound, serverError } from "@/lib/api/response";
import { requireUserId } from "@/lib/documents/access";
import {
  documentListInclude,
  serializeDocument,
  serializeDocumentSummary,
  type DocumentWithRelations,
} from "@/lib/documents/serializers";
import { db } from "@/lib/db";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { createDocumentSchema } from "@/lib/validations/document";

function resolveRoleFromDocument(
  document: DocumentWithRelations,
  userId: string,
): DocumentRole {
  if (document.ownerId === userId) {
    return "OWNER";
  }

  const collaboration = document.collaborators.find(
    (entry) => entry.userId === userId,
  );

  return collaboration?.role ?? "VIEWER";
}

export async function GET() {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    const documents = await db.document.findMany({
      where: {
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
      include: documentListInclude,
      orderBy: { updatedAt: "desc" },
    });

    const items = documents.map((document) =>
      serializeDocumentSummary(document, resolveRoleFromDocument(document, userId)),
    );

    return NextResponse.json({ documents: items });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const collaborators = parsed.data.collaborators ?? [];
    const normalizedCollaborators = collaborators.map((entry) => ({
      email: entry.email.toLowerCase(),
      role: entry.role,
    }));

    const duplicateEmail = normalizedCollaborators.find(
      (entry, index) =>
        normalizedCollaborators.findIndex(
          (other) => other.email === entry.email,
        ) !== index,
    );

    if (duplicateEmail) {
      return badRequest(
        `Duplicate collaborator email: ${duplicateEmail.email}`,
      );
    }

    const collaboratorUsers = [];

    for (const collaborator of normalizedCollaborators) {
      const targetUser = await db.user.findUnique({
        where: { email: collaborator.email },
        select: { id: true, email: true },
      });

      if (!targetUser) {
        return notFound(`No user found with email ${collaborator.email}`);
      }

      if (targetUser.id === userId) {
        return badRequest("You cannot add yourself as a collaborator");
      }

      collaboratorUsers.push({
        userId: targetUser.id,
        role: collaborator.role,
      });
    }

    const document = await db.document.create({
      data: {
        title: parsed.data.title,
        ownerId: userId,
        collaborators:
          collaboratorUsers.length > 0
            ? {
                create: collaboratorUsers,
              }
            : undefined,
      },
      include: documentListInclude,
    });

    return NextResponse.json(
      { document: serializeDocument(document, "OWNER") },
      { status: 201 },
    );
  } catch {
    return serverError();
  }
}
