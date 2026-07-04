import { NextResponse } from "next/server";

import {
  generateSelectionSummary,
  isVersionSummaryEnabled,
} from "@/lib/ai/client";
import { badRequest, serverError, unauthorized } from "@/lib/api/response";
import { requireUserId } from "@/lib/documents/access";
import { summarizeSelectionSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("response" in authResult) {
    return authResult.response;
  }

  if (!isVersionSummaryEnabled()) {
    return NextResponse.json(
      { error: "AI summaries are not configured. Add GROQ_API_KEY to enable." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = summarizeSelectionSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const summary = await generateSelectionSummary(parsed.data.text);

    if (!summary) {
      return serverError("Could not generate a summary. Try again.");
    }

    return NextResponse.json({ summary });
  } catch {
    return serverError();
  }
}
