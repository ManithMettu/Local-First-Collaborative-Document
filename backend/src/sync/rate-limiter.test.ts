import { describe, expect, it } from "vitest";

import { RateLimiter } from "./rate-limiter.js";

describe("RateLimiter", () => {
  it("allows messages within the per-second budget", () => {
    const limiter = new RateLimiter();
    const socket = {} as import("ws").default;

    for (let index = 0; index < 50; index += 1) {
      expect(limiter.allow(socket)).toBe(true);
    }
  });

  it("flags disconnect after sustained bursts", () => {
    const limiter = new RateLimiter();
    const socket = {} as import("ws").default;

    for (let index = 0; index < 51; index += 1) {
      limiter.allow(socket);
    }

    expect(limiter.shouldDisconnect(socket)).toBe(false);

    for (let burst = 0; burst < 3; burst += 1) {
      for (let index = 0; index < 51; index += 1) {
        limiter.allow(socket);
      }
    }

    expect(limiter.shouldDisconnect(socket)).toBe(true);
  });
});
