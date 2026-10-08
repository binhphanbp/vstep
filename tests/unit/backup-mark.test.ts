import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, type Note, type StudyState } from "../../src/lib/learning";
import {
  REMIND_AFTER_DAYS,
  REMIND_AFTER_NOTES,
  reminderFor,
  markBackup,
  readBackupMark,
} from "../../src/lib/backup-mark";

const NOW = new Date("2026-10-08T06:00:00.000Z");
/** What the notebook asks of one profile. */
const backupReminder = (
  state: StudyState,
  mark: Parameters<typeof reminderFor>[1],
  now: Date,
) => reminderFor(state.notes, mark, now);
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();
const note = (id: string, updatedAt: string, createdAt = updatedAt): Note => ({
  id,
  createdAt,
  updatedAt,
  body: `ghi chú ${id}`,
});
/** `count` live notes, all written `age` days ago, and `binned` deleted ones. */
const notes = (count: number, binned = 0, age = 0): Note[] =>
  Array.from({ length: count + binned }, (_, index) => ({
    ...note(`n${index}`, daysAgo(age)),
    ...(index >= count ? { deletedAt: daysAgo(0) } : {}),
  }));
const stateWith = (live: number, binned = 0, age = 0): StudyState => ({
  ...freshState(),
  notes: notes(live, binned, age),
});
const stateOf = (...list: Note[]): StudyState => ({
  ...freshState(),
  notes: list,
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
    expect(
      backupReminder(stateWith(REMIND_AFTER_NOTES - 1), null, NOW),
    ).toBeNull();
    expect(backupReminder(stateWith(REMIND_AFTER_NOTES), null, NOW)).toEqual({
      since: REMIND_AFTER_NOTES,
      last: null,
      days: 0,
      why: "many",
    });
  });

  it("counts what was written or changed after the last copy", () => {
    const mark = { at: daysAgo(3), notes: 5, upTo: daysAgo(3) };
    const before = Array.from({ length: 5 }, (_, i) =>
      note(`old${i}`, daysAgo(10)),
    );
    // Nine written since: not enough yet.
    const since = Array.from({ length: 9 }, (_, i) =>
      note(`new${i}`, daysAgo(1)),
    );
    expect(backupReminder(stateOf(...before, ...since), mark, NOW)).toBeNull();
    // A tenth is a change to a note the copy already held: it counts, because
    // the copy has the old words.
    const edited = note("old0", daysAgo(1), daysAgo(10));
    expect(
      backupReminder(stateOf(edited, ...before.slice(1), ...since), mark, NOW),
    ).toMatchObject({ since: 10, last: mark.at, why: "many" });
  });

  it("falls back on counting when the clocks disagree", () => {
    // The copy is stamped in the future of every note: by time nothing is new.
    const mark = { at: daysAgo(-2), notes: 3, upTo: daysAgo(-2) };
    expect(backupReminder(stateWith(15), mark, NOW)).toMatchObject({
      since: 12,
    });
    // Fewer notes than the copy held (some were deleted) is nothing new.
    expect(backupReminder(stateWith(2), mark, NOW)).toBeNull();
  });

  it("asks anyway, with fewer notes, once the last copy is old", () => {
    const few = stateOf(note("a", daysAgo(1)), note("b", daysAgo(2)));
    // A copy five days ago: no need to bother.
    expect(
      backupReminder(few, { at: daysAgo(5), notes: 0, upTo: daysAgo(5) }, NOW),
    ).toBeNull();
    expect(
      backupReminder(
        few,
        {
          at: daysAgo(REMIND_AFTER_DAYS),
          notes: 0,
          upTo: daysAgo(REMIND_AFTER_DAYS),
        },
        NOW,
      ),
    ).toEqual({
      since: 2,
      last: daysAgo(REMIND_AFTER_DAYS),
      days: REMIND_AFTER_DAYS,
      why: "old",
    });
    // No new note since a copy that is old is nothing to ask about.
    const held = stateOf(note("a", daysAgo(40)));
    expect(
      backupReminder(
        held,
        { at: daysAgo(30), notes: 1, upTo: daysAgo(30) },
        NOW,
      ),
    ).toBeNull();
  });

  it("measures a notebook never copied from its oldest note", () => {
    const young = stateOf(note("a", daysAgo(3)), note("b", daysAgo(1)));
    expect(backupReminder(young, null, NOW)).toBeNull();
    const aged = stateOf(
      note("a", daysAgo(1), daysAgo(REMIND_AFTER_DAYS + 1)),
      note("b", daysAgo(1)),
    );
    expect(backupReminder(aged, null, NOW)).toMatchObject({
      since: 2,
      last: null,
      days: REMIND_AFTER_DAYS + 1,
      why: "old",
    });
  });

  it("does not count notes that are in the bin", () => {
    expect(backupReminder(stateWith(5, 20), null, NOW)).toBeNull();
    expect(backupReminder(stateWith(0, 20, 40), null, NOW)).toBeNull();
  });
});

describe("remembering the last copy on this device", () => {
  it("records the time and how many notes the copy held", () => {
    expect(readBackupMark()).toBeNull();
    markBackup(stateWith(12, 3, 1), new Date("2026-10-08T05:00:00.000Z"));
    expect(readBackupMark()).toEqual({
      at: "2026-10-08T05:00:00.000Z",
      notes: 12,
      upTo: "2026-10-08T05:00:00.000Z",
    });
  });

  it("covers a note stamped by a clock that runs ahead, and still says when the copy was made", () => {
    // A note written on a device two days ahead of this one: the copy made now
    // holds it, so it must not be counted as new until the clocks catch up.
    const ahead = stateOf(note("a", daysAgo(-2)));
    markBackup(ahead, NOW);
    const mark = readBackupMark();
    expect(mark).toEqual({
      at: NOW.toISOString(),
      notes: 1,
      upTo: daysAgo(-2),
    });
    expect(backupReminder(ahead, mark, NOW)).toBeNull();
    // The date shown to the learner is the real one, not the stamp of a note.
    const later = Array.from({ length: REMIND_AFTER_NOTES }, (_, index) =>
      note(`later${index}`, daysAgo(-3)),
    );
    expect(
      backupReminder(stateOf(note("a", daysAgo(-2)), ...later), mark, NOW),
    ).toMatchObject({ since: REMIND_AFTER_NOTES, last: NOW.toISOString() });
  });

  it("reads a mark written before copies had a coverage time", () => {
    values.set(
      "may-backup-mark-v1",
      JSON.stringify({ at: "2026-10-08T05:00:00.000Z", notes: 4 }),
    );
    expect(readBackupMark()).toEqual({
      at: "2026-10-08T05:00:00.000Z",
      notes: 4,
      upTo: "2026-10-08T05:00:00.000Z",
    });
    // A coverage time before the copy itself makes no sense and is ignored.
    values.set(
      "may-backup-mark-v1",
      JSON.stringify({
        at: "2026-10-08T05:00:00.000Z",
        notes: 4,
        upTo: "2020-01-01T00:00:00.000Z",
      }),
    );
    expect(readBackupMark()?.upTo).toBe("2026-10-08T05:00:00.000Z");
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
