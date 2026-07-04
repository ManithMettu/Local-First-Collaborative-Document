import type WebSocket from "ws";
import * as Y from "yjs";

import { config } from "../config.js";

export function isMessageTooLarge(rawMessage: WebSocket.RawData): boolean {
  if (Buffer.isBuffer(rawMessage)) {
    return rawMessage.byteLength > config.maxMessageBytes;
  }

  if (rawMessage instanceof ArrayBuffer) {
    return rawMessage.byteLength > config.maxMessageBytes;
  }

  if (Array.isArray(rawMessage)) {
    const byteLength = rawMessage.reduce(
      (total, chunk) => total + chunk.byteLength,
      0,
    );
    return byteLength > config.maxMessageBytes;
  }

  return Buffer.byteLength(String(rawMessage)) > config.maxMessageBytes;
}

export function toUint8Array(rawMessage: WebSocket.RawData): Uint8Array {
  if (Buffer.isBuffer(rawMessage)) {
    return new Uint8Array(rawMessage);
  }

  if (rawMessage instanceof ArrayBuffer) {
    return new Uint8Array(rawMessage);
  }

  if (Array.isArray(rawMessage)) {
    const totalLength = rawMessage.reduce(
      (total, chunk) => total + chunk.byteLength,
      0,
    );
    const merged = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of rawMessage) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return merged;
  }

  return new TextEncoder().encode(String(rawMessage));
}

export class MalformedUpdateTracker {
  private readonly counts = new Map<WebSocket, number>();

  record(connection: WebSocket): boolean {
    const nextCount = (this.counts.get(connection) ?? 0) + 1;
    this.counts.set(connection, nextCount);
    return nextCount >= config.maxMalformedMessages;
  }

  clear(connection: WebSocket): void {
    this.counts.delete(connection);
  }
}

export function safeApplyUpdate(
  doc: Y.Doc,
  update: Uint8Array,
  origin: unknown,
): void {
  Y.applyUpdate(doc, update, origin);
}
