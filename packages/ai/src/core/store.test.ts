import { describe, it, expect } from "vitest";
import { createStorage, type StorageAdapter } from "./store";

function createMockAdapter(initial: Record<string, unknown> = {}): StorageAdapter {
  let data = { ...initial };
  return {
    async get(keys: string[]) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in data) result[key] = data[key];
      }
      return result;
    },
    async set(items: Record<string, unknown>) {
      data = { ...data, ...items };
    },
  };
}

describe("createStorage", () => {
  it("returns defaults for empty store", async () => {
    const s = createStorage(createMockAdapter());
    const state = await s.getAll();
    expect(state).toEqual({
      config: undefined,
      videoId: undefined,
      messages: {},
      transcript: undefined,
    });
  });

  it("round-trips set + getAll", async () => {
    const s = createStorage(createMockAdapter());
    await s.set("videoId", "abc123");
    const state = await s.getAll();
    expect(state.videoId).toBe("abc123");
  });

  it("setPartial merges with current state", async () => {
    const s = createStorage(createMockAdapter());
    await s.set("config", { provider: "anthropic", apiKey: "k", model: "m" });
    await s.setPartial({ videoId: "xyz" });
    const state = await s.getAll();
    expect(state.config).toEqual({ provider: "anthropic", apiKey: "k", model: "m" });
    expect(state.videoId).toBe("xyz");
    expect(state.messages).toEqual({});
  });

  it("setPartial preserves existing keys not in partial", async () => {
    const s = createStorage(createMockAdapter());
    await s.set("videoId", "abc");
    await s.setPartial({ messages: { v1: [] } });
    const state = await s.getAll();
    expect(state.videoId).toBe("abc");
    expect(state.messages).toEqual({ v1: [] });
  });

  it("setPartial overwrites nested messages correctly", async () => {
    const s = createStorage(createMockAdapter({
      messages: { video1: [{ id: "1", role: "user", content: "hi", timestamp: 1000 }] }
    }));
    await s.setPartial({ messages: { video2: [] } });
    const state = await s.getAll();
    expect(state.messages).toEqual({ video2: [] });
  });
});