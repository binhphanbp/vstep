import type { Mark } from "./marks";
import type { Note, StudyState } from "./learning";

/**
 * Putting back what an older tab drops.
 *
 * A build that does not know a field loses it when it saves: it reads the
 * profile, keeps the fields it knows and writes those. The loose schemas stop
 * this for every build from the one that introduced them on, but a tab that
 * has been open since before that still runs the old code, and one answer
 * given in it would erase every note written since, and every scratch page and
 * highlight.
 *
 * This build cannot change that tab. What it can do is notice that the profile
 * has come back without the stamp it puts on every save, and put back what
 * that save left out. A stamp, and not "the notes are missing", because a
 * profile can lawfully have no notes: a backup restored on purpose, or every
 * note deleted. Those carry the stamp; only a build that cannot write it
 * produces a profile without.
 */
export const STATE_REV = 2;

/** True for a profile that was last written by a build from before the stamp. */
export function writtenByOlderBuild(state: StudyState): boolean {
  return (state.rev ?? 0) < STATE_REV;
}

type Scratch = Record<string, string>;
type Marks = Record<string, Mark[]>;
export type WorkPair = { scratch?: Scratch; marks?: Marks };

/** The part of a profile that an older build cannot hold. */
export type Recoverable = {
  notes?: Note[];
  /** The AI grades, by the work they belong to. */
  grades?: NonNullable<StudyState["grades"]>;
  /** The scratch pages and highlights of each sitting, by its own id. */
  work?: {
    attempts?: Record<string, WorkPair>;
    paperRuns?: Record<string, WorkPair>;
    exam?: WorkPair & { id: string };
  };
};

type Holder = { id: string; scratch?: Scratch; marks?: Marks };

function pairOf(holder: Holder): WorkPair | null {
  const pair: WorkPair = {};
  if (holder.scratch) pair.scratch = holder.scratch;
  if (holder.marks) pair.marks = holder.marks;
  return pair.scratch || pair.marks ? pair : null;
}

function collect(
  list: readonly Holder[],
): Record<string, WorkPair> | undefined {
  const found: Record<string, WorkPair> = {};
  for (const holder of list) {
    const pair = pairOf(holder);
    if (pair) found[holder.id] = pair;
  }
  return Object.keys(found).length ? found : undefined;
}

/** What would be lost if an older build saved this profile now. */
export function recoverableOf(state: StudyState): Recoverable {
  const saved: Recoverable = {};
  if (state.notes?.length) saved.notes = state.notes;
  if (state.grades && Object.keys(state.grades).length)
    saved.grades = state.grades;
  const work: NonNullable<Recoverable["work"]> = {};
  const attempts = collect(state.attempts as readonly Holder[]);
  if (attempts) work.attempts = attempts;
  const runs = collect((state.paperRuns ?? []) as readonly Holder[]);
  if (runs) work.paperRuns = runs;
  const exam = state.exam ? pairOf(state.exam as Holder) : null;
  if (exam && state.exam) work.exam = { id: state.exam.id, ...exam };
  if (Object.keys(work).length) saved.work = work;
  return saved;
}

function withWork<T extends Holder>(
  list: readonly T[],
  saved: Record<string, WorkPair> | undefined,
): readonly T[] {
  if (!saved) return list;
  let changed = false;
  const next = list.map((holder) => {
    const pair = saved[holder.id];
    if (!pair) return holder;
    const scratch = holder.scratch === undefined ? pair.scratch : undefined;
    const marks = holder.marks === undefined ? pair.marks : undefined;
    if (!scratch && !marks) return holder;
    changed = true;
    return {
      ...holder,
      ...(scratch ? { scratch } : {}),
      ...(marks ? { marks } : {}),
    };
  });
  return changed ? next : list;
}

/**
 * Adds what `saved` holds and the profile lacks. Nothing the profile already
 * has is replaced, and work comes back only to a sitting that still exists.
 * The profile itself is returned when there was nothing to add.
 */
export function putBack(state: StudyState, saved: Recoverable): StudyState {
  let next = state;
  if (state.notes === undefined && saved.notes?.length)
    next = { ...next, notes: saved.notes };
  if (state.grades === undefined && saved.grades)
    next = { ...next, grades: saved.grades };
  const work = saved.work;
  if (work) {
    const attempts = withWork(
      state.attempts as readonly (Holder & StudyState["attempts"][number])[],
      work.attempts,
    );
    if (attempts !== state.attempts)
      next = { ...next, attempts: attempts as StudyState["attempts"] };
    const runs = state.paperRuns;
    if (runs) {
      const restored = withWork(runs as readonly Holder[], work.paperRuns);
      if (restored !== runs)
        next = { ...next, paperRuns: restored as typeof runs };
    }
    const exam = state.exam;
    if (exam && work.exam && work.exam.id === exam.id) {
      const [restored] = withWork([exam as unknown as Holder], {
        [exam.id]: work.exam,
      });
      if (restored !== (exam as unknown as Holder))
        next = { ...next, exam: restored as unknown as typeof exam };
    }
  }
  return next;
}

/**
 * A profile that has just arrived from another tab, with what this tab still
 * has in memory put back if the other tab was an older build. A profile with
 * this build's stamp is returned untouched.
 */
export function healStripped(
  mine: StudyState,
  incoming: StudyState,
): StudyState {
  if (!writtenByOlderBuild(incoming)) return incoming;
  return putBack(incoming, recoverableOf(mine));
}
