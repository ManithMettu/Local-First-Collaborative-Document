import type { NextResponse } from "next/server";

import { forbidden, notFound, unauthorized } from "@/lib/api/response";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasMinRole } from "@/lib/documents/roles";
import type { DocumentRole } from "@/lib/generated/prisma/enums";

export { hasMinRole } from "@/lib/documents/roles";

export async function requireUserId():
  Promise<{ userId: string } | { response: NextResponse }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { response: unauthorized() };
  }

  return { userId: session.user.id };
}

export async function resolveDocumentRole(
  userId: string,
  documentId: string,
): Promise<DocumentRole | null> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });

  if (!document) {
    return null;
  }

  if (document.ownerId === userId) {
    return "OWNER";
  }

  const collaboration = await db.documentCollaborator.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!collaboration) {
    return null;
  }

  return collaboration.role;
}

type DocumentAccessResult =
  | { ok: true; role: DocumentRole }
  | { ok: false; response: NextResponse };

export async function requireDocumentAccess(
  userId: string,
  documentId: string,
  minimumRole: DocumentRole = "VIEWER",
): Promise<DocumentAccessResult> {
  const role = await resolveDocumentRole(userId, documentId);

  if (!role) {
    return { ok: false, response: notFound() };
  }

  if (!hasMinRole(role, minimumRole)) {
    return { ok: false, response: forbidden() };
  }

  return { ok: true, role };
}

export async function requireDocumentOwner(
  userId: string,
  documentId: string,
): Promise<DocumentAccessResult> {
  return requireDocumentAccess(userId, documentId, "OWNER");
}
