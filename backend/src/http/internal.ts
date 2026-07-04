import type { IncomingMessage, ServerResponse } from "node:http";

import { config } from "../config.js";
import {
  applyUpdateToRoom,
  disconnectUserFromDocument,
  getRoomDocumentState,
} from "../sync/handler.js";

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function isAuthorized(request: IncomingMessage): boolean {
  if (!config.internalApiSecret) {
    return false;
  }

  const authorization = request.headers.authorization;
  if (typeof authorization !== "string") {
    return false;
  }

  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token === config.internalApiSecret;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", reject);
  });
}

export async function handleInternalRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (!url.pathname.startsWith("/internal/")) {
    return false;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return true;
  }

  const stateMatch = url.pathname.match(/^\/internal\/documents\/([^/]+)\/state$/);
  if (stateMatch && request.method === "GET") {
    const documentId = stateMatch[1];
    if (!documentId) {
      sendJson(response, 400, { error: "Invalid document id" });
      return true;
    }

    const state = getRoomDocumentState(documentId);
    if (!state) {
      sendJson(response, 404, { error: "No active document room" });
      return true;
    }

    sendJson(response, 200, {
      state: Buffer.from(state).toString("base64"),
    });
    return true;
  }

  const applyMatch = url.pathname.match(
    /^\/internal\/documents\/([^/]+)\/apply-update$/,
  );
  if (applyMatch && request.method === "POST") {
    const documentId = applyMatch[1];
    if (!documentId) {
      sendJson(response, 400, { error: "Invalid document id" });
      return true;
    }

    try {
      const rawBody = await readBody(request);
      const payload = JSON.parse(rawBody) as { update?: string };

      if (!payload.update) {
        sendJson(response, 400, { error: "Missing update" });
        return true;
      }

      const update = new Uint8Array(Buffer.from(payload.update, "base64"));
      const applied = applyUpdateToRoom(documentId, update);

      if (!applied) {
        sendJson(response, 404, { error: "No active document room" });
        return true;
      }

      sendJson(response, 200, { applied: true });
      return true;
    } catch {
      sendJson(response, 400, { error: "Invalid request body" });
      return true;
    }
  }

  const disconnectMatch = url.pathname.match(
    /^\/internal\/documents\/([^/]+)\/disconnect-user$/,
  );
  if (disconnectMatch && request.method === "POST") {
    const documentId = disconnectMatch[1];
    if (!documentId) {
      sendJson(response, 400, { error: "Invalid document id" });
      return true;
    }

    try {
      const rawBody = await readBody(request);
      const payload = JSON.parse(rawBody) as { userId?: string };

      if (!payload.userId) {
        sendJson(response, 400, { error: "Missing userId" });
        return true;
      }

      const disconnected = disconnectUserFromDocument(
        documentId,
        payload.userId,
      );

      sendJson(response, 200, { disconnected });
      return true;
    } catch {
      sendJson(response, 400, { error: "Invalid request body" });
      return true;
    }
  }

  sendJson(response, 404, { error: "Not found" });
  return true;
}
