import type WebSocket from "ws";

import { config } from "../config.js";

export class RateLimiter {
  private readonly buckets = new Map<
    WebSocket,
    { count: number; resetAt: number; violations: number }
  >();

  allow(connection: WebSocket): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(connection);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 1_000, violations: bucket?.violations ?? 0 };
      this.buckets.set(connection, bucket);
    }

    bucket.count += 1;

    if (bucket.count <= config.maxMessagesPerSecond) {
      return true;
    }

    bucket.violations += 1;
    return false;
  }

  shouldDisconnect(connection: WebSocket): boolean {
    const bucket = this.buckets.get(connection);
    return (bucket?.violations ?? 0) >= 3;
  }

  clear(connection: WebSocket): void {
    this.buckets.delete(connection);
  }
}
