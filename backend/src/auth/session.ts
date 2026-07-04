import type { IncomingHttpHeaders } from "node:http";

import { decode } from "next-auth/jwt";

import { config } from "../config.js";

export type AuthResult = {
  userId: string;
};

export async function verifySessionToken(
  token: string,
): Promise<AuthResult | null> {
  try {
    const decoded = await decode({
      token,
      secret: config.nextAuthSecret,
    });

    const userId =
      typeof decoded?.id === "string"
        ? decoded.id
        : typeof decoded?.sub === "string"
          ? decoded.sub
          : null;

    if (!userId) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(
  url: URL,
  headers: IncomingHttpHeaders,
): string | null {
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    return queryToken;
  }

  const authorization = headers.authorization;
  if (typeof authorization === "string") {
    const [scheme, value] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer" && value) {
      return value;
    }
  }

  return null;
}

export function extractDocumentIdFromPath(pathname: string): string | null {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed.includes("/")) {
    return null;
  }

  return trimmed;
}
