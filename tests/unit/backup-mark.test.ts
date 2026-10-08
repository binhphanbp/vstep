import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, type Note, type StudyState } from "../../src/lib/learning";
import {
  REMIND_AFTER_NOTES,
  backupReminder,
  markBackup,
  readBackupMark,
} from "../../src/lib/backup-mark";

const notes = (count: number, binned = 0): Note[] =>
  Array.from({ length: count + binned }, (_, index) => ({
    id: `n${index}`,
    createdAt: "2026-10-08T05:00:00.000Z",
    updatedAt: "2026-10-08T05:00:00.000Z",
    body: `ghi chú ${index}`,
    ...(index >= count ? { deletedAt: "2026-10-09T05:00:00.000Z" } : {}),
  }));
const stateWith = (live: number, binned = 0): StudyState => ({
  ...freshState(),
  notes: notes(live, binned),
});

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("asking for a backup of the notes", () => {
  it("stays quiet until enough notes are not in any copy", () => {
    expect(backupReminder(stateWith(REMIND_AFTER_NOTES - 1), null)).toBeNull();
    expect(backupReminder(stateWith(REMIND_AFTER_NOTES), null)).toEqual({
      since: REMIND_AFTER_NOTES,
      last: null,
    });
  });

  it("counts only what was written after the last copy", () => {
    const mark = { at: "2026-10-01T00:00:00.000Z", notes: 5 };
    expect(backupReminder(stateWith(14), mark)).toBeNull();
    expect(backupReminder(stateWith(15), mark)).toEqual({
      since: 10,
      last: mark.at,
    });
    // Fewer notes than the copy held (some were deleted) is nothing new.
    expect(backupReminder(stateWith(2), mark)).toBeNull();
  });

  it("does not count notes that are in the bin", () => {
    expect(backupReminder(stateWith(5, 20), null)).toBeNull();
  });
});

describe("remembering the last copy on this device", () => {
  it("records the time and how many notes the copy held", () => {
    expect(readBackupMark()).toBeNull();
    markBackup(stateWith(12, 3), new Date("2026-10-08T05:00:00.000Z"));
    expect(readBackupMark()).toEqual({
      at: "2026-10-08T05:00:00.000Z",
      notes: 12,
    });
  });

  it("reads anything malformed as no copy at all", () => {
    for (const bad of [
      "not json",
      "null",
      JSON.stringify({ at: "yesterday", notes: 3 }),
      JSON.stringify({ at: "2026-10-08T05:00:00.000Z", notes: -1 }),
      JSON.stringify({ at: "2026-10-08T05:00:00.000Z", notes: 1.5 }),
      JSON.stringify({ notes: 3 }),
    ]) {
      values.set("may-backup-mark-v1", bad);
      expect(readBackupMark()).toBeNull();
    }
  });

  it("does not throw when the device will not store it", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    });
    expect(() => markBackup(stateWith(3))).not.toThrow();
    expect(readBackupMark()).toBeNull();
  });
});
