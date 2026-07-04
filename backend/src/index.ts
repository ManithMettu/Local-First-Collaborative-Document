import type { IncomingMessage } from "node:http";

import { createServer } from "node:http";

import { WebSocketServer, type WebSocket } from "ws";

import {
  extractDocumentIdFromPath,
  extractTokenFromRequest,
  verifySessionToken,
} from "./auth/session.js";
import { config } from "./config.js";
import { closeDatabasePool, resolveDocumentRole } from "./db/documents.js";
import {
  handleConnection,
  shutdownSyncHandler,
  type ConnectionContext,
} from "./sync/handler.js";
import { handleInternalRequest } from "./http/internal.js";

const server = createServer((request, response) => {
  void handleInternalRequest(request, response).then((handled) => {
    if (!handled) {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("Collab WebSocket server\n");
    }
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  void (async () => {
    try {
      const host = request.headers.host ?? "localhost";
      const url = new URL(request.url ?? "/", `http://${host}`);
      const documentId = extractDocumentIdFromPath(url.pathname);
      const token = extractTokenFromRequest(url, request.headers);

      if (!documentId || !token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const auth = await verifySessionToken(token);
      if (!auth) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const role = await resolveDocumentRole(auth.userId, documentId);
      if (!role) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (connection) => {
        wss.emit("connection", connection, request, {
          userId: auth.userId,
          documentId,
          role,
          readOnly: role === "VIEWER",
        });
      });
    } catch (error) {
      console.error("[server] Upgrade failed:", error);
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
    }
  })();
});

wss.on(
  "connection",
  (
    connection: WebSocket,
    _request: IncomingMessage,
    context: ConnectionContext,
  ) => {
    void handleConnection(connection, context);
  },
);

server.listen(config.port, config.host, () => {
  console.log(
    `[server] WebSocket listening on ws://${config.host}:${config.port}/{documentId}`,
  );
});

async function shutdown(signal: string) {
  console.log(`[server] Received ${signal}, shutting down…`);
  await shutdownSyncHandler();
  await closeDatabasePool();

  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
