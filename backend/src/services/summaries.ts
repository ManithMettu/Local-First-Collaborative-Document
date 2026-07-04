import { config } from "../config.js";

export async function requestSnapshotSummary(
  documentId: string,
  snapshotId: string,
): Promise<void> {
  const secret = config.internalApiSecret;
  const baseUrl = (process.env.NEXT_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  if (!secret) {
    return;
  }

  try {
    await fetch(`${baseUrl}/api/internal/snapshots/summarize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId, snapshotId }),
    });
  } catch (error) {
    console.warn(
      `[summaries] Failed to request summary for snapshot ${snapshotId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
