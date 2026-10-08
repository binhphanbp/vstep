import type { Note, StudyState } from "./learning";

/**
 * When this device last wrote a copy of the study data somewhere safe, and how
 * many notes that copy held. Notes live only in the browser until a backup or
 * the cloud takes them, and a notebook grows a note at a time: nothing would
 * otherwise say "you have written a lot since the last copy".
 *
 * It is a fact about this device, so it is kept beside the profile and not in
 * it: a profile restored from another device must not claim that this one was
 * backed up.
 */
const KEY = "may-backup-mark-v1";

/** How many new notes before the notebook asks for a copy. */
export const REMIND_AFTER_NOTES = 10;
/**
 * How old the last copy (or, with none, the oldest note) may be before even a
 * few notes are asked about: a notebook that grows slowly is no safer for it.
 */
export const REMIND_AFTER_DAYS = 14;

/**
 * `at` is when the copy was made. `upTo` is the latest time the copy covers:
 * `at`, or later when a note in it was stamped by a clock that runs ahead.
 */
export type BackupMark = { at: string; notes: number; upTo: string };

export function readBackupMark(): BackupMark | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (
      value &&
      typeof value.at === "string" &&
      Number.isFinite(Date.parse(value.at)) &&
      Number.isInteger(value.notes) &&
      value.notes >= 0
    ) {
      const upTo =
        typeof value.upTo === "string" &&
        Number.isFinite(Date.parse(value.upTo)) &&
        Date.parse(value.upTo) >= Date.parse(value.at)
          ? value.upTo
          : value.at;
      return { at: value.at, notes: value.notes, upTo };
    }
  } catch {
    // No mark, or storage unavailable: the same as never having backed up.
  }
  return null;
}

/**
 * Records that `state` has just been copied out. The copy holds every note as
 * it is now, whatever clock stamped it: a note written by a device whose clock
 * runs ahead has a time later than this moment, and would otherwise count as
 * not copied until the clocks caught up. The moment shown stays the real one.
 */
export function markBackup(state: StudyState, at = new Date()) {
  const live = (state.notes ?? []).filter((note) => !note.deletedAt);
  const newest = Math.max(
    at.getTime(),
    ...live.map((note) => Date.parse(note.updatedAt)).filter(Number.isFinite),
  );
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        at: at.toISOString(),
        notes: live.length,
        upTo: new Date(newest).toISOString(),
      } satisfies BackupMark),
    );
  } catch {
    // A full device already says so elsewhere; the reminder just stays on.
  }
}

export type BackupReminder = {
  /** Notes written or changed since the last copy. */
  since: number;
  /** When the last copy was made, or null when there never was one. */
  last: string | null;
  /** Whole days since that copy, or since the oldest note when there was none. */
  days: number;
  /** Many notes at once, or few notes for a long time. */
  why: "many" | "old";
};

/**
 * Whether the notes not in any copy are worth mentioning, and what to say.
 *
 * A note counts as not copied when it was written or changed after the copy:
 * a copy holds the words a note had that day, not the ones it has now. Counting
 * only by time trusts the clocks of every device that wrote notes into this
 * profile, so the count of notes the copy held is kept as a floor.
 */
export function reminderFor(
  notes: readonly Note[] | undefined,
  mark: BackupMark | null,
  now = new Date(),
): BackupReminder | null {
  // Only counted and dated, never listed: no need to sort them.
  const live = (notes ?? []).filter((note) => !note.deletedAt);
  const cutoff = mark ? Date.parse(mark.upTo) : -Infinity;
  const changed = live.filter((note) => Date.parse(note.updatedAt) > cutoff);
  const since = Math.max(changed.length, live.length - (mark?.notes ?? 0));
  if (since <= 0) return null;
  const from = mark
    ? Date.parse(mark.at)
    : Math.min(...live.map((note) => Date.parse(note.createdAt)));
  const days = Math.max(0, Math.floor((now.getTime() - from) / 86_400_000));
  const why =
    since >= REMIND_AFTER_NOTES
      ? "many"
      : days >= REMIND_AFTER_DAYS
        ? "old"
        : null;
  return why ? { since, last: mark?.at ?? null, days, why } : null;
}
