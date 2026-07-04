import { NextResponse } from "next/server";

import {
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/response";
import {
  requireDocumentAccess,
  requireDocumentOwner,
  requireUserId,
} from "@/lib/documents/access";
import {
  documentListInclude,
  serializeDocument,
} from "@/lib/documents/serializers";
import { db } from "@/lib/db";
import { updateDocumentSchema } from "@/lib/validations/document";
import type { DocumentIdRouteContext } from "@/types/api";

export async function GET(_request: Request, context: DocumentIdRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id } = await context.params;

  const access = await requireDocumentAccess(userId, id, "VIEWER");
  if (!access.ok) {
    return access.response;
  }

  try {
    const document = await db.document.findUnique({
      where: { id },
      include: documentListInclude,
    });

    if (!document) {
      return notFound();
    }

    return NextResponse.json({
      document: serializeDocument(document, access.role),
    });
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request, context: DocumentIdRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id } = await context.params;

  const access = await requireDocumentAccess(userId, id, "EDITOR");
  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const document = await db.document.update({
      where: { id },
      data: { title: parsed.data.title },
      include: documentListInclude,
    });

    return NextResponse.json({
      document: serializeDocument(document, access.role),
    });
  } catch {
    return serverError();
  }
}

export async function DELETE(_request: Request, context: DocumentIdRouteContext) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;
  const { id } = await context.params;

  const access = await requireDocumentOwner(userId, id);
  if (!access.ok) {
    return access.response;
  }

  try {
    await db.document.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return serverError();
  }
}
