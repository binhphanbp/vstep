import type { Note, NoteAnchor, StudyState } from "./learning";

/**
 * The learner's own notes on questions: what to keep, and the rules for
 * writing one.
 *
 * Every limit is checked HERE, before a note is written, and not only in the
 * schema. The saved profile is written without validation and validated when it
 * is next read, so a value the schema rejects used to be saved happily and then
 * reported as damaged data on the following load: the 101st sitting of the
 * paper bank did exactly that. A note that does not fit is refused with a
 * message, and what is already saved is never put at risk by it.
 */
export const NOTE_LIMITS = {
  /** Notes in the book, counting the ones still in the bin. */
  count: 2000,
  /** Characters in one note. */
  body: 2000,
  group: 80,
  label: 160,
  excerpt: 200,
  /** What the notes may take in the saved profile (1.5 MB), measured as stored. */
  bytes: 1.5 * 1024 * 1024,
  /** How long a deleted note can still be brought back. */
  trashDays: 30,
} as const;

const DAY = 86_400_000;

export type NoteOutcome = {
  state: StudyState;
  note?: Note;
  /** Why nothing was saved, in words the learner can act on. */
  error?: string;
};

/** The size the notes take once written, in bytes of the stored text. */
export function noteBytes(notes: readonly Note[]) {
  return new TextEncoder().encode(JSON.stringify(notes)).length;
}

export function allNotes(state: StudyState): readonly Note[] {
  return state.notes ?? [];
}

/** Notes that have not been deleted, oldest first. */
export function liveNotes(state: StudyState): Note[] {
  return allNotes(state)
    .filter((note) => !note.deletedAt)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

const binCutoff = (now: Date) => now.getTime() - NOTE_LIMITS.trashDays * DAY;

/** Deleted notes that can still be brought back, newest deletion first. */
export function binnedNotes(state: StudyState, now = new Date()): Note[] {
  const cutoff = binCutoff(now);
  return allNotes(state)
    .filter((note) => note.deletedAt && Date.parse(note.deletedAt) >= cutoff)
    .sort((a, b) => Date.parse(b.deletedAt!) - Date.parse(a.deletedAt!));
}

/** What a question, or a whole paper or lesson, is called in a note. */
export type NoteTarget = {
  source: NoteAnchor["source"];
  sourceId: string;
  /** Leave out for the notes about the paper or lesson as a whole. */
  itemId?: string;
};

/**
 * The live notes written about one question, whatever version of the material
 * they were written on: a lesson that is rewritten keeps its question ids, and
 * a note written a month ago is still about that question.
 */
export function notesAt(state: StudyState, target: NoteTarget): Note[] {
  // Filter first, sort after: a paper review asks this for every question
  // (75 of them) and the book can hold two thousand notes.
  return allNotes(state)
    .filter(
      (note) =>
        !note.deletedAt &&
        note.anchor?.source === target.source &&
        note.anchor.sourceId === target.sourceId &&
        note.anchor.itemId === target.itemId,
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function clampAnchor(anchor: NoteAnchor): NoteAnchor {
  return {
    ...anchor,
    sourceId: anchor.sourceId.slice(0, 100),
    group: anchor.group.slice(0, NOTE_LIMITS.group),
    label: anchor.label.slice(0, NOTE_LIMITS.label),
    ...(anchor.itemId === undefined
      ? {}
      : { itemId: anchor.itemId.slice(0, 120) }),
    ...(anchor.excerpt === undefined
      ? {}
      : { excerpt: anchor.excerpt.slice(0, NOTE_LIMITS.excerpt) }),
  };
}

/** Why a book of notes would not fit, or null when it does. */
function whyNotFit(notes: readonly Note[]): string | null {
  if (notes.length > NOTE_LIMITS.count)
    return `Sổ ghi chú đã đầy (${NOTE_LIMITS.count} ghi chú). Xóa bớt ghi chú cũ, hoặc dọn mục “Đã xóa gần đây”, rồi thử lại.`;
  if (noteBytes(notes) > NOTE_LIMITS.bytes)
    return "Sổ ghi chú đã dùng hết phần dung lượng dành cho nó (1,5 MB). Xóa bớt ghi chú dài, hoặc dọn mục “Đã xóa gần đây”, rồi thử lại.";
  return null;
}

function withoutExpired(notes: readonly Note[], now: Date): Note[] {
  const cutoff = binCutoff(now);
  return notes.filter(
    (note) => !note.deletedAt || Date.parse(note.deletedAt) >= cutoff,
  );
}

function checkBody(body: string): string | null {
  if (!body.trim()) return "Ghi chú đang trống.";
  if (body.length > NOTE_LIMITS.body)
    return `Ghi chú dài tối đa ${NOTE_LIMITS.body} ký tự.`;
  return null;
}

export function addNote(
  state: StudyState,
  input: { body: string; anchor?: NoteAnchor; star?: boolean },
  now = new Date(),
  id: string = crypto.randomUUID(),
): NoteOutcome {
  const problem = checkBody(input.body);
  if (problem) return { state, error: problem };
  const stamp = now.toISOString();
  const note: Note = {
    id,
    createdAt: stamp,
    updatedAt: stamp,
    body: input.body.trim(),
    ...(input.star ? { star: true } : {}),
    ...(input.anchor ? { anchor: clampAnchor(input.anchor) } : {}),
  };
  const notes = [...withoutExpired(allNotes(state), now), note];
  const full = whyNotFit(notes);
  if (full) return { state, error: full };
  return { state: { ...state, notes }, note };
}

/**
 * Changes the text or the star of a live note. A longer text is refused when
 * the book no longer fits; a shorter one is always accepted, so a full book
 * can always be tidied.
 */
export function editNote(
  state: StudyState,
  id: string,
  patch: { body?: string; star?: boolean },
  now = new Date(),
): NoteOutcome {
  const current = allNotes(state).find((note) => note.id === id);
  if (!current || current.deletedAt)
    return { state, error: "Không tìm thấy ghi chú này; có thể nó đã bị xóa." };
  const body = patch.body?.trim();
  if (body !== undefined) {
    const problem = checkBody(body);
    if (problem) return { state, error: problem };
  }
  const note: Note = {
    ...current,
    ...(body !== undefined ? { body } : {}),
    updatedAt: now.toISOString(),
  };
  if (patch.star !== undefined) {
    if (patch.star) note.star = true;
    else delete note.star;
  }
  const notes = withoutExpired(allNotes(state), now).map((entry) =>
    entry.id === id ? note : entry,
  );
  if (body !== undefined && body.length > current.body.length) {
    const full = whyNotFit(notes);
    if (full) return { state, error: full };
  }
  return { state: { ...state, notes }, note };
}

/** Puts a note in the bin, where it can be brought back for a while. */
export function trashNote(
  state: StudyState,
  id: string,
  now = new Date(),
): StudyState {
  if (!allNotes(state).some((note) => note.id === id && !note.deletedAt))
    return state;
  return {
    ...state,
    notes: allNotes(state).map((note) =>
      note.id === id ? { ...note, deletedAt: now.toISOString() } : note,
    ),
  };
}

export function restoreNote(
  state: StudyState,
  id: string,
  now = new Date(),
): NoteOutcome {
  const current = binnedNotes(state, now).find((note) => note.id === id);
  if (!current)
    return { state, error: "Ghi chú này đã quá hạn khôi phục hoặc không còn." };
  const note: Note = { ...current, updatedAt: now.toISOString() };
  delete note.deletedAt;
  return {
    state: {
      ...state,
      notes: allNotes(state).map((entry) => (entry.id === id ? note : entry)),
    },
    note,
  };
}

/** Removes a deleted note for good. */
export function eraseNote(state: StudyState, id: string): StudyState {
  if (!allNotes(state).some((note) => note.id === id && note.deletedAt))
    return state;
  return { ...state, notes: allNotes(state).filter((note) => note.id !== id) };
}

/** Empties the bin. */
export function emptyBin(state: StudyState): StudyState {
  if (!allNotes(state).some((note) => note.deletedAt)) return state;
  return { ...state, notes: allNotes(state).filter((note) => !note.deletedAt) };
}

/** The shortcuts offered under the box, in the words Gùa would write. */
export const NOTE_SUGGESTIONS = [
  "Bẫy: từ đồng nghĩa",
  "Bẫy: phủ định",
  "Không nghe kịp con số",
  "Đọc thiếu câu cuối đoạn",
  "Từ mới: ",
] as const;
