import type { StudyState } from "./learning";
import { liveNotes } from "./notes";

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

export type BackupMark = { at: string; notes: number };

export function readBackupMark(): BackupMark | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (
      value &&
      typeof value.at === "string" &&
      Number.isFinite(Date.parse(value.at)) &&
      Number.isInteger(value.notes) &&
      value.notes >= 0
    )
      return { at: value.at, notes: value.notes };
  } catch {
    // No mark, or storage unavailable: the same as never having backed up.
  }
  return null;
}

/** Records that `state` has just been copied out. */
export function markBackup(state: StudyState, at = new Date()) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        at: at.toISOString(),
        notes: liveNotes(state).length,
      } satisfies BackupMark),
    );
  } catch {
    // A full device already says so elsewhere; the reminder just stays on.
  }
}

/** How many notes are not in any copy yet, when that is enough to mention. */
export function backupReminder(
  state: StudyState,
  mark: BackupMark | null,
): { since: number; last: string | null } | null {
  const since = Math.max(0, liveNotes(state).length - (mark?.notes ?? 0));
  return since >= REMIND_AFTER_NOTES ? { since, last: mark?.at ?? null } : null;
}
