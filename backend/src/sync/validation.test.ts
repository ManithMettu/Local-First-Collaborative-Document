import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  isMessageTooLarge,
  MalformedUpdateTracker,
  safeApplyUpdate,
  toUint8Array,
} from "./validation.js";

describe("isMessageTooLarge", () => {
  it("rejects buffers above the configured limit", () => {
    const oversized = Buffer.alloc(1_048_577);
    expect(isMessageTooLarge(oversized)).toBe(true);
  });

  it("accepts buffers within the limit", () => {
    const payload = Buffer.from("hello");
    expect(isMessageTooLarge(payload)).toBe(false);
  });
});

describe("toUint8Array", () => {
  it("normalizes buffer payloads", () => {
    const bytes = toUint8Array(Buffer.from("sync"));
    expect(new TextDecoder().decode(bytes)).toBe("sync");
  });
});

describe("MalformedUpdateTracker", () => {
  it("disconnects after repeated malformed updates", () => {
    const tracker = new MalformedUpdateTracker();
    const socket = {} as import("ws").default;

    expect(tracker.record(socket)).toBe(false);
    expect(tracker.record(socket)).toBe(false);
    expect(tracker.record(socket)).toBe(false);
    expect(tracker.record(socket)).toBe(false);
    expect(tracker.record(socket)).toBe(true);
  });
});

describe("safeApplyUpdate", () => {
  it("applies valid Yjs updates", () => {
    const source = new Y.Doc();
    const target = new Y.Doc();
    const fragment = source.getXmlFragment("default");
    const paragraph = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    text.insert(0, "hello");
    paragraph.insert(0, [text]);
    fragment.insert(0, [paragraph]);

    const update = Y.encodeStateAsUpdate(source);
    safeApplyUpdate(target, update, "test");

    expect(target.getXmlFragment("default").length).toBeGreaterThan(0);

    source.destroy();
    target.destroy();
  });
});
