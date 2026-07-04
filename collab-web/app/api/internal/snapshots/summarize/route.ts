import { NextResponse } from "next/server";

import { badRequest, serverError, unauthorized } from "@/lib/api/response";
import { summarizeSnapshotById } from "@/lib/documents/snapshot-summaries";
import type { SummarizeSnapshotRequest } from "@/types/api";

function isAuthorized(request: Request): boolean {
  const secret = process.env.WS_INTERNAL_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as SummarizeSnapshotRequest;

    if (!body.documentId || !body.snapshotId) {
      return badRequest("documentId and snapshotId are required");
    }

    const changeSummary = await summarizeSnapshotById(
      body.documentId,
      body.snapshotId,
    );

    return NextResponse.json({
      summarized: Boolean(changeSummary),
      changeSummary,
    });
  } catch {
    return serverError();
  }
}
