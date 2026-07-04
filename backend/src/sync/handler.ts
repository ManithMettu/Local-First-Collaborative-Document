import type WebSocket from "ws";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

import type { DocumentRole } from "../db/documents.js";
import { documentPersistence } from "./persistence.js";
import { RateLimiter } from "./rate-limiter.js";
import {
  isMessageTooLarge,
  MalformedUpdateTracker,
  toUint8Array,
} from "./validation.js";
import { runDocumentMarkupRepair } from "../yjs/repair-markup.js";

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;
export const MESSAGE_QUERY_AWARENESS = 3;

export type ConnectionContext = {
  userId: string;
  documentId: string;
  role: DocumentRole;
  readOnly: boolean;
};

type DocumentRoom = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  connections: Map<WebSocket, ConnectionContext>;
  awarenessClients: Map<WebSocket, Set<number>>;
  loading: Promise<void>;
};

const rooms = new Map<string, DocumentRoom>();
const rateLimiter = new RateLimiter();
const malformedTracker = new MalformedUpdateTracker();

function getAwarenessClients(awareness: awarenessProtocol.Awareness): number[] {
  return Array.from(awareness.getStates().keys());
}

function broadcastAwareness(
  room: DocumentRoom,
  update: Uint8Array,
  excludeConnection?: WebSocket,
): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, update);
  const message = encoding.toUint8Array(encoder);

  room.connections.forEach((_, connection) => {
    if (connection === excludeConnection) {
      return;
    }

    if (connection.readyState === connection.OPEN) {
      connection.send(message);
    }
  });
}

function broadcastUpdate(
  room: DocumentRoom,
  update: Uint8Array,
  excludeConnection?: WebSocket,
): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);

  room.connections.forEach((_, connection) => {
    if (connection === excludeConnection) {
      return;
    }

    if (connection.readyState === connection.OPEN) {
      connection.send(message);
    }
  });
}

async function getOrCreateRoom(documentId: string): Promise<DocumentRoom> {
  const existingRoom = rooms.get(documentId);
  if (existingRoom) {
    await existingRoom.loading;
    return existingRoom;
  }

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  const room: DocumentRoom = {
    doc,
    awareness,
    connections: new Map(),
    awarenessClients: new Map(),
    loading: documentPersistence.hydrateDocument(documentId, doc),
  };

  rooms.set(documentId, room);
  await room.loading;
  runDocumentMarkupRepair(room.doc);

  const updateHandler = (update: Uint8Array, origin: unknown) => {
    broadcastUpdate(room, update, origin as WebSocket | undefined);
    documentPersistence.scheduleFlush(documentId, doc);
  };

  doc.on("update", updateHandler);

  const awarenessHandler = (
    {
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    origin: unknown,
  ) => {
    const changedClients = added.concat(updated, removed);
    const update = awarenessProtocol.encodeAwarenessUpdate(
      awareness,
      changedClients,
    );
    broadcastAwareness(room, update, origin as WebSocket | undefined);
  };

  awareness.on("update", awarenessHandler);

  awareness.on(
    "update",
    (
      {
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      origin: unknown,
    ) => {
    if (!room.connections.has(origin as WebSocket)) {
      return;
    }

    const connection = origin as WebSocket;
    const clientSet = room.awarenessClients.get(connection) ?? new Set<number>();

    for (const clientId of added) {
      clientSet.add(clientId);
    }
    for (const clientId of updated) {
      clientSet.add(clientId);
    }
    for (const clientId of removed) {
      clientSet.delete(clientId);
    }

    room.awarenessClients.set(connection, clientSet);
  });

  return room;
}

function closeConnection(connection: WebSocket, code: number, reason: string) {
  if (
    connection.readyState === connection.OPEN ||
    connection.readyState === connection.CONNECTING
  ) {
    connection.close(code, reason);
  }
}

/** Close code for role/access changes — client should reconnect to re-handshake. */
export const CLOSE_CODE_ROLE_CHANGED = 4401;

export function disconnectUserFromDocument(
  documentId: string,
  userId: string,
): number {
  const room = rooms.get(documentId);
  if (!room) {
    return 0;
  }

  let disconnected = 0;

  room.connections.forEach((context, connection) => {
    if (context.userId !== userId) {
      return;
    }

    closeConnection(connection, CLOSE_CODE_ROLE_CHANGED, "Role changed");
    disconnected += 1;
  });

  return disconnected;
}

function handleSyncMessage(
  room: DocumentRoom,
  connection: WebSocket,
  context: ConnectionContext,
  decoder: decoding.Decoder,
  encoder: encoding.Encoder,
): void {
  const syncMessageType = decoding.readVarUint(decoder);

  if (
    context.readOnly &&
    (syncMessageType === syncProtocol.messageYjsSyncStep2 ||
      syncMessageType === syncProtocol.messageYjsUpdate)
  ) {
    closeConnection(connection, 4403, "Read-only access");
    return;
  }

  encoding.writeVarUint(encoder, MESSAGE_SYNC);

  const errorHandler = (error: Error) => {
    console.warn(
      `[sync] Malformed update for document ${context.documentId}:`,
      error.message,
    );

    if (malformedTracker.record(connection)) {
      closeConnection(connection, 1008, "Too many malformed updates");
    }
  };

  switch (syncMessageType) {
    case syncProtocol.messageYjsSyncStep1: {
      syncProtocol.readSyncStep1(decoder, encoder, room.doc);
      break;
    }
    case syncProtocol.messageYjsSyncStep2: {
      syncProtocol.readSyncStep2(
        decoder,
        room.doc,
        connection,
        errorHandler,
      );
      documentPersistence.scheduleFlush(context.documentId, room.doc);
      break;
    }
    case syncProtocol.messageYjsUpdate: {
      syncProtocol.readUpdate(decoder, room.doc, connection, errorHandler);
      documentPersistence.scheduleFlush(context.documentId, room.doc);
      break;
    }
    default:
      throw new Error(`Unknown sync message type: ${syncMessageType}`);
  }
}

function handleMessage(
  room: DocumentRoom,
  connection: WebSocket,
  context: ConnectionContext,
  rawMessage: WebSocket.RawData,
): void {
  if (isMessageTooLarge(rawMessage)) {
    closeConnection(connection, 1009, "Message too large");
    return;
  }

  if (!rateLimiter.allow(connection)) {
    if (rateLimiter.shouldDisconnect(connection)) {
      closeConnection(connection, 1008, "Rate limit exceeded");
    }
    return;
  }

  const payload = toUint8Array(rawMessage);
  const decoder = decoding.createDecoder(payload);
  const messageType = decoding.readVarUint(decoder);
  const encoder = encoding.createEncoder();

  switch (messageType) {
    case MESSAGE_SYNC: {
      handleSyncMessage(room, connection, context, decoder, encoder);
      if (encoding.length(encoder) > 1) {
        connection.send(encoding.toUint8Array(encoder));
      }
      break;
    }
    case MESSAGE_AWARENESS: {
      const update = decoding.readVarUint8Array(decoder);
      awarenessProtocol.applyAwarenessUpdate(
        room.awareness,
        update,
        connection,
      );
      break;
    }
    case MESSAGE_QUERY_AWARENESS: {
      const clients = getAwarenessClients(room.awareness);
      const responseEncoder = encoding.createEncoder();
      encoding.writeVarUint(responseEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        responseEncoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, clients),
      );
      connection.send(encoding.toUint8Array(responseEncoder));
      break;
    }
    default:
      closeConnection(connection, 1008, "Unsupported message type");
  }
}

async function cleanupRoom(documentId: string, room: DocumentRoom): Promise<void> {
  if (room.connections.size > 0) {
    return;
  }

  documentPersistence.dispose(documentId);
  await documentPersistence.flush(documentId, room.doc);
  room.doc.destroy();
  rooms.delete(documentId);
}

export async function handleConnection(
  connection: WebSocket,
  context: ConnectionContext,
): Promise<void> {
  const room = await getOrCreateRoom(context.documentId);
  room.connections.set(connection, context);
  connection.binaryType = "arraybuffer";

  connection.on("message", (rawMessage) => {
    try {
      handleMessage(room, connection, context, rawMessage);
    } catch (error) {
      console.warn(
        `[sync] Failed to handle message for ${context.documentId}:`,
        error instanceof Error ? error.message : error,
      );

      if (malformedTracker.record(connection)) {
        closeConnection(connection, 1008, "Too many malformed messages");
      }
    }
  });

  connection.on("close", () => {
    rateLimiter.clear(connection);
    malformedTracker.clear(connection);
    room.connections.delete(connection);

    const controlledIds = Array.from(
      room.awarenessClients.get(connection) ?? [],
    );
    room.awarenessClients.delete(connection);

    if (controlledIds.length > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        controlledIds,
        connection,
      );
    }

    void cleanupRoom(context.documentId, room);
  });

  connection.on("error", (error) => {
    console.warn(
      `[sync] WebSocket error for ${context.documentId}:`,
      error.message,
    );
  });
}

export function getActiveRoomCount(): number {
  return rooms.size;
}

export async function shutdownSyncHandler(): Promise<void> {
  const flushPromises: Promise<void>[] = [];

  rooms.forEach((room, documentId) => {
    flushPromises.push(documentPersistence.flush(documentId, room.doc));
  });

  await Promise.all(flushPromises);
}

export function getRoomDocumentState(documentId: string): Uint8Array | null {
  const room = rooms.get(documentId);
  if (!room) {
    return null;
  }

  return Y.encodeStateAsUpdate(room.doc);
}

export function applyUpdateToRoom(
  documentId: string,
  update: Uint8Array,
): boolean {
  const room = rooms.get(documentId);
  if (!room) {
    return false;
  }

  try {
    Y.applyUpdate(room.doc, update, "restore");
    documentPersistence.scheduleFlush(documentId, room.doc);
    return true;
  } catch {
    return false;
  }
}
