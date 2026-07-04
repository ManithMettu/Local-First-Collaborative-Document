import {
  decodeStateBase64,
  encodeStateBase64,
} from "@/lib/yjs/restore";

function getWsHttpBaseUrl(): string {
  const url =
    process.env.WS_SERVER_HTTP_URL ??
    process.env.NEXT_PUBLIC_WS_URL?.replace(/^ws/, "http") ??
    "http://localhost:1234";

  return url.replace(/\/$/, "");
}

function getInternalSecret(): string | null {
  return process.env.WS_INTERNAL_SECRET ?? null;
}

async function internalFetch(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const secret = getInternalSecret();
  if (!secret) {
    return null;
  }

  return fetch(`${getWsHttpBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function fetchServerDocumentState(
  documentId: string,
): Promise<Uint8Array | null> {
  const response = await internalFetch(
    `/internal/documents/${documentId}/state`,
  );

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json()) as { state?: string };
  if (!payload.state) {
    return null;
  }

  return decodeStateBase64(payload.state);
}

export async function applyServerDocumentUpdate(
  documentId: string,
  update: Uint8Array,
): Promise<boolean> {
  const response = await internalFetch(
    `/internal/documents/${documentId}/apply-update`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update: encodeStateBase64(update) }),
    },
  );

  if (!response) {
    return false;
  }

  if (response.status === 404) {
    return false;
  }

  return response.ok;
}

export async function disconnectServerUser(
  documentId: string,
  userId: string,
): Promise<number | null> {
  const response = await internalFetch(
    `/internal/documents/${documentId}/disconnect-user`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    },
  );

  if (!response) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { disconnected?: number };
  return payload.disconnected ?? 0;
}
