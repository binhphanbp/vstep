import { describe, expect, it } from "vitest";
import {
  freshState,
  stateSchema,
  type Note,
  type NoteAnchor,
  type StudyState,
} from "../../src/lib/learning";
import {
  NOTE_LIMITS,
  addNote,
  binnedNotes,
  editNote,
  emptyBin,
  eraseNote,
  liveNotes,
  noteBytes,
  notesAt,
  restoreNote,
  trashNote,
} from "../../src/lib/notes";

const anchor = (overrides: Partial<NoteAnchor> = {}): NoteAnchor => ({
  source: "paper",
  sourceId: "133",
  version: 1,
  skill: "listening",
  group: "Đề 133",
  label: "Đề 133 · Nghe · Part 2 · Câu 12",
  itemId: "133-abc",
  excerpt: "What time does the shuttle leave?",
  ...overrides,
});
const t0 = new Date("2026-10-08T05:00:00.000Z");
const later = (days: number) => new Date(t0.getTime() + days * 86_400_000);
let counter = 0;
const add = (
  state: StudyState,
  body: string,
  extra: Partial<NoteAnchor> = {},
) => {
  const outcome = addNote(
    state,
    { body, anchor: anchor(extra) },
    t0,
    `n${++counter}`,
  );
  expect(outcome.error).toBeUndefined();
  return outcome.state;
};
/** What a reload would make of the state: the stored text, then the schema. */
const reload = (state: StudyState) =>
  stateSchema.safeParse(JSON.parse(JSON.stringify(state)));

describe("writing a note", () => {
  it("keeps the text, the place it was written, and survives a reload", () => {
    const state = add(freshState(), "  Bẫy: người nói đổi ý ở câu cuối.  ");
    const [note] = liveNotes(state);
    expect(note.body).toBe("Bẫy: người nói đổi ý ở câu cuối.");
    expect(note.anchor?.label).toBe("Đề 133 · Nghe · Part 2 · Câu 12");
    const parsed = reload(state);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.notes).toEqual(state.notes);
  });

  it("refuses an empty note and one that is too long, and changes nothing", () => {
    const state = freshState();
    for (const body of ["", "   \n  ", "x".repeat(NOTE_LIMITS.body + 1)]) {
      const outcome = addNote(state, { body, anchor: anchor() });
      expect(outcome.error).toBeTruthy();
      expect(outcome.state).toBe(state);
    }
    const exact = addNote(state, { body: "x".repeat(NOTE_LIMITS.body) });
    expect(exact.error).toBeUndefined();
    expect(reload(exact.state).success).toBe(true);
  });

  it("cuts the labels it stores down to what the schema accepts", () => {
    const state = add(freshState(), "ok", {
      group: "g".repeat(500),
      label: "l".repeat(500),
      excerpt: "e".repeat(500),
    });
    const stored = liveNotes(state)[0].anchor!;
    expect(stored.group.length).toBe(NOTE_LIMITS.group);
    expect(stored.label.length).toBe(NOTE_LIMITS.label);
    expect(stored.excerpt?.length).toBe(NOTE_LIMITS.excerpt);
    expect(reload(state).success).toBe(true);
  });

  it("finds the notes of one question, whatever version they were written on", () => {
    let state = add(freshState(), "câu 12");
    state = add(state, "câu 12 bản cũ", { version: 7 });
    state = add(state, "câu khác", { itemId: "133-other" });
    state = add(state, "cả đề", { itemId: undefined });
    state = add(state, "đề khác", { sourceId: "134" });
    const where = {
      source: "paper",
      sourceId: "133",
      itemId: "133-abc",
    } as const;
    expect(notesAt(state, where).map((note) => note.body)).toEqual([
      "câu 12",
      "câu 12 bản cũ",
    ]);
    expect(
      notesAt(state, { source: "paper", sourceId: "133" }).map(
        (note) => note.body,
      ),
    ).toEqual(["cả đề"]);
  });
});

describe("the limits hold where the note is written", () => {
  it("refuses the note after the last one that fits, and the saved profile still loads", () => {
    const room = NOTE_LIMITS.count;
    const notes: Note[] = Array.from({ length: room }, (_, index) => ({
      id: `fill-${index}`,
      createdAt: t0.toISOString(),
      updatedAt: t0.toISOString(),
      body: "x",
    }));
    const full: StudyState = { ...freshState(), notes };
    expect(reload(full).success).toBe(true);
    const outcome = addNote(full, { body: "one too many" }, t0, "extra");
    expect(outcome.error).toMatch(/đã đầy/);
    expect(outcome.state).toBe(full);
    expect(reload(outcome.state).success).toBe(true);
  });

  it("counts the bin: a deleted note still takes a place until it expires", () => {
    const notes: Note[] = Array.from({ length: NOTE_LIMITS.count }, (_, i) => ({
      id: `fill-${i}`,
      createdAt: t0.toISOString(),
      updatedAt: t0.toISOString(),
      body: "x",
      ...(i === 0 ? { deletedAt: t0.toISOString() } : {}),
    }));
    const state: StudyState = { ...freshState(), notes };
    expect(addNote(state, { body: "no room" }, t0, "a").error).toBeTruthy();
    // Thirty-one days on, the deleted one has expired and its place is free.
    const outcome = addNote(state, { body: "room again" }, later(31), "b");
    expect(outcome.error).toBeUndefined();
    expect(outcome.state.notes).toHaveLength(NOTE_LIMITS.count);
    expect(outcome.state.notes?.some((note) => note.id === "fill-0")).toBe(
      false,
    );
  });

  it("refuses what would take the book past its size, yet lets a full book shrink", () => {
    const mk = (id: string, body: string): Note => ({
      id,
      createdAt: t0.toISOString(),
      updatedAt: t0.toISOString(),
      body,
      anchor: anchor(),
    });
    // Notes of the longest allowed length, in the language the notes are
    // written in: two bytes for most characters.
    const notes: Note[] = [];
    while (
      noteBytes([...notes, mk("probe", "ă".repeat(NOTE_LIMITS.body))]) <=
      NOTE_LIMITS.bytes
    )
      notes.push(mk(`big-${notes.length}`, "ă".repeat(NOTE_LIMITS.body)));
    expect(notes.length).toBeGreaterThan(100);
    // Fill the rest, leaving ten bytes of room.
    const slack = 10;
    const room = () => NOTE_LIMITS.bytes - slack - noteBytes(notes);
    const overheadOf = (id: string) =>
      noteBytes([...notes, mk(id, "x")]) - noteBytes(notes) - 1;
    while (room() - overheadOf("fill") < 0) notes.pop();
    while (room() - overheadOf("fill") > NOTE_LIMITS.body) {
      const n = Math.min(
        NOTE_LIMITS.body,
        room() - 2 * overheadOf("pad-000") - 20,
      );
      notes.push(
        mk(`pad-${String(notes.length).padStart(3, "0")}`, "x".repeat(n)),
      );
    }
    notes.push(mk("fill", "x".repeat(room() - overheadOf("fill"))));
    const state: StudyState = { ...freshState(), notes };
    expect(noteBytes(notes)).toBe(NOTE_LIMITS.bytes - slack);
    expect(reload(state).success).toBe(true);

    // A new note does not fit, and nothing changes.
    const refused = addNote(state, { body: "x", anchor: anchor() }, t0, "new");
    expect(refused.error).toMatch(/1,5 MB/);
    expect(refused.state).toBe(state);
    // Neither does making one longer by more than the room that is left...
    const filler = notes.at(-1)!;
    const longer = editNote(
      state,
      "fill",
      { body: filler.body + "x".repeat(50) },
      t0,
    );
    expect(longer.error).toMatch(/1,5 MB/);
    expect(longer.state).toBe(state);
    // ...but a little longer, a shorter text and a star all go through.
    expect(
      editNote(state, "fill", { body: filler.body + "x".repeat(5) }, t0).error,
    ).toBeUndefined();
    const shorter = editNote(state, "big-0", { body: "ngắn" }, t0);
    expect(shorter.error).toBeUndefined();
    expect(noteBytes(shorter.state.notes ?? [])).toBeLessThan(
      NOTE_LIMITS.bytes - slack,
    );
    expect(editNote(state, "big-1", { star: true }, t0).error).toBeUndefined();
    // And once there is room again, the refused note fits.
    expect(
      addNote(shorter.state, { body: "x", anchor: anchor() }, t0, "new").error,
    ).toBeUndefined();
  });
});

describe("editing, deleting and bringing back", () => {
  it("edits the text and the star of a live note", () => {
    const state = add(freshState(), "bản đầu");
    const id = liveNotes(state)[0].id;
    const edited = editNote(
      state,
      id,
      { body: " bản sau ", star: true },
      later(1),
    );
    expect(edited.error).toBeUndefined();
    const [note] = liveNotes(edited.state);
    expect(note.body).toBe("bản sau");
    expect(note.star).toBe(true);
    expect(note.updatedAt).toBe(later(1).toISOString());
    const unstarred = editNote(edited.state, id, { star: false }, later(2));
    expect(liveNotes(unstarred.state)[0]).not.toHaveProperty("star");
    expect(reload(unstarred.state).success).toBe(true);
  });

  it("will not save an empty edit, nor an edit to a note that is gone", () => {
    const state = add(freshState(), "giữ lại");
    const id = liveNotes(state)[0].id;
    expect(editNote(state, id, { body: "   " }).error).toBeTruthy();
    expect(editNote(state, "missing", { body: "x" }).error).toBeTruthy();
    const binned = trashNote(state, id, t0);
    expect(editNote(binned, id, { body: "x" }).error).toBeTruthy();
  });

  it("deletes into a bin that keeps a note for thirty days", () => {
    const state = add(freshState(), "xóa nhầm");
    const id = liveNotes(state)[0].id;
    const binned = trashNote(state, id, later(1));
    expect(liveNotes(binned)).toHaveLength(0);
    expect(binnedNotes(binned, later(1)).map((note) => note.id)).toEqual([id]);
    expect(
      notesAt(binned, { source: "paper", sourceId: "133", itemId: "133-abc" }),
    ).toHaveLength(0);
    // Brought back whole: same text, same place, no deletion mark.
    const back = restoreNote(binned, id, later(2));
    expect(back.error).toBeUndefined();
    expect(liveNotes(back.state)[0]).toMatchObject({ id, body: "xóa nhầm" });
    expect(liveNotes(back.state)[0]).not.toHaveProperty("deletedAt");
    // After thirty days it can no longer be brought back or listed.
    expect(binnedNotes(binned, later(32))).toHaveLength(0);
    expect(restoreNote(binned, id, later(32)).error).toBeTruthy();
  });

  it("erases for good only what is already in the bin", () => {
    const state = add(freshState(), "một");
    const id = liveNotes(state)[0].id;
    expect(eraseNote(state, id)).toBe(state);
    const binned = trashNote(state, id, t0);
    expect(eraseNote(binned, id).notes).toEqual([]);
    expect(emptyBin(binned).notes).toEqual([]);
    expect(emptyBin(state)).toBe(state);
  });
});

describe("the schema around notes", () => {
  it("still reads a profile saved before notes existed", () => {
    expect(
      stateSchema.safeParse(JSON.parse(JSON.stringify(freshState()))).success,
    ).toBe(true);
  });

  it("rejects what the writers can never produce", () => {
    const base = add(freshState(), "ok");
    const [note] = base.notes!;
    const bad = (notes: unknown) =>
      stateSchema.safeParse({ ...JSON.parse(JSON.stringify(base)), notes })
        .success;
    expect(bad([note])).toBe(true);
    expect(bad([note, note])).toBe(false); // the same id twice
    expect(bad([{ ...note, body: "x".repeat(NOTE_LIMITS.body + 1) }])).toBe(
      false,
    );
    expect(bad([{ ...note, createdAt: "yesterday" }])).toBe(false);
    expect(bad([{ ...note, anchor: { ...note.anchor, source: "web" } }])).toBe(
      false,
    );
  });

  it("keeps a field a later release adds to a note or to where it was written", () => {
    const base = add(freshState(), "ok");
    const stored = JSON.parse(JSON.stringify(base));
    stored.notes[0].futureField = 1;
    stored.notes[0].anchor.futureField = 2;
    const parsed = stateSchema.parse(stored);
    expect(JSON.parse(JSON.stringify(parsed)).notes[0]).toMatchObject({
      futureField: 1,
      anchor: { futureField: 2 },
    });
  });
});
