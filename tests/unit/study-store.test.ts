import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { freshState } from "../../src/lib/learning";
let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());
it("personalizes an untouched legacy profile without replacing a chosen name", async () => {
  const legacy = freshState();
  legacy.profile = { ...legacy.profile, name: "bạn", onboarded: false };
  values.set("may-study-v1", JSON.stringify(legacy));
  const store = await import("../../src/lib/study-store");
  const stop = store.subscribe(() => {});
  expect(store.getSnapshot().state.profile.name).toBe("Gùa");

  store.replaceStudy({
    ...legacy,
    profile: { ...legacy.profile, name: "Mai", onboarded: true },
  });
  expect(store.getSnapshot().state.profile.name).toBe("Mai");
  stop();
});
it("preserves data that becomes corrupt while the app is open", async () => {
  const store = await import("../../src/lib/study-store");
  const stop = store.subscribe(() => {});
  store.updateStudy((s) => ({ ...s, profile: { ...s.profile, name: "Mai" } }));
  values.set("may-study-v1", "corrupt-external-data");
  store.updateStudy((s) => ({
    ...s,
    profile: { ...s.profile, name: "New name" },
  }));
  expect(values.get("may-study-v1")).toBe("corrupt-external-data");
  expect(store.getSnapshot().storageError).toBeTruthy();
  expect(store.getSnapshot().state.profile.name).toBe("New name");
  stop();
});
it("restoring an older backup advances the current local revision", async () => {
  const initial = freshState();
  initial.updatedAt = "2030-01-01T00:00:00.000Z";
  values.set("may-study-v1", JSON.stringify(initial));
  const store = await import("../../src/lib/study-store");
  const stop = store.subscribe(() => {});
  const backup = freshState();
  backup.updatedAt = "2025-01-01T00:00:00.000Z";
  store.replaceStudy(backup);
  expect(store.getSnapshot().state.updatedAt > initial.updatedAt).toBe(true);
  stop();
});
it("does not lose in-memory data when storage is full and restore fails", async () => {
  const store = await import("../../src/lib/study-store");
  const stop = store.subscribe(() => {});
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  });
  store.updateStudy((s) => ({
    ...s,
    profile: { ...s.profile, name: "Keep me" },
  }));
  expect(store.getSnapshot().state.profile.name).toBe("Keep me");
  expect(store.getSnapshot().storageError).toBeTruthy();
  expect(() => store.replaceStudy(freshState())).toThrow();
  expect(store.getSnapshot().state.profile.name).toBe("Keep me");
  stop();
});
