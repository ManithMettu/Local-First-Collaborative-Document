import { NextResponse } from "next/server";

import {
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/response";
import { requireUserId } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function GET() {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return notFound("User not found");
    }

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.name,
        image: parsed.data.image?.trim() ? parsed.data.image.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch {
    return serverError();
  }
}
