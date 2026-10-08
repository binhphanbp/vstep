import { describe, expect, it } from "vitest";
import {
  freshState,
  stateSchema,
  type Note,
  type StudyState,
} from "../../src/lib/learning";
import {
  STATE_REV,
  healStripped,
  putBack,
  recoverableOf,
  writtenByOlderBuild,
} from "../../src/lib/recovery";

const note = (id: string, body = "ghi chú"): Note => ({
  id,
  createdAt: "2026-10-08T01:00:00.000Z",
  updatedAt: "2026-10-08T01:00:00.000Z",
  body,
});
const attempt = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    lessonId: "reading-cafe",
    date: "2026-10-08T01:00:00.000Z",
    ...extra,
  }) as unknown as StudyState["attempts"][number];
const run = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    paperId: "132",
    version: 1,
    startedAt: 1,
    stage: 1,
    deadline: 2,
    material: 0,
    answers: {},
    essays: {},
    spoken: [],
    ...extra,
  }) as unknown as NonNullable<StudyState["paperRuns"]>[number];

/** A profile with everything a newer build adds, written by this build. */
function full(): StudyState {
  return {
    ...freshState(),
    rev: STATE_REV,
    notes: [note("n1"), note("n2", "ghi chú thứ hai")],
    attempts: [
      attempt("a1", {
        scratch: { main: "ý chính" },
        marks: { text: [{ i: 1, q: "The café" }] },
      }),
      attempt("a2"),
    ],
    paperRuns: [
      run("r1", { scratch: { reading: "từ khóa" } }),
      run("r2", { marks: { passage: [{ i: 0, q: "A" }] } }),
    ],
    exam: {
      id: "e1",
      scratch: { writing: "dàn ý" },
    } as unknown as StudyState["exam"],
  };
}

/**
 * What a build from before the loose schemas does when it saves: it keeps only
 * the fields it knows, so the newer ones are gone. This is that, written out.
 */
function strippedByOldBuild(state: StudyState): StudyState {
  const { notes, rev, ...rest } = state as StudyState & Record<string, unknown>;
  void notes;
  void rev;
  const plain = <T extends Record<string, unknown>>(item: T) => {
    const { scratch, marks, ...known } = item;
    void scratch;
    void marks;
    return known as T;
  };
  return {
    ...rest,
    attempts: state.attempts.map((item) =>
      plain(item as unknown as Record<string, unknown>),
    ),
    paperRuns: (state.paperRuns ?? []).map((item) =>
      plain(item as unknown as Record<string, unknown>),
    ),
    exam: state.exam
      ? plain(state.exam as unknown as Record<string, unknown>)
      : null,
    updatedAt: "2026-10-08T03:00:00.000Z",
  } as unknown as StudyState;
}

describe("what an older build cannot keep", () => {
  it("is the notes and the scratch pages and highlights of every sitting", () => {
    const saved = recoverableOf(full());
    expect(saved.notes?.map((item) => item.id)).toEqual(["n1", "n2"]);
    expect(saved.work?.attempts).toEqual({
      a1: {
        scratch: { main: "ý chính" },
        marks: { text: [{ i: 1, q: "The café" }] },
      },
    });
    expect(Object.keys(saved.work?.paperRuns ?? {})).toEqual(["r1", "r2"]);
    expect(saved.work?.exam).toEqual({
      id: "e1",
      scratch: { writing: "dàn ý" },
    });
  });

  it("is nothing for a profile with nothing of the sort", () => {
    expect(recoverableOf(freshState())).toEqual({});
    expect(recoverableOf({ ...freshState(), notes: [] })).toEqual({});
  });

  it("survives being stored as text", () => {
    const saved = recoverableOf(full());
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
  });
});

describe("telling a profile an older build wrote", () => {
  it("is the profile that arrives without the stamp this build writes", () => {
    expect(writtenByOlderBuild(freshState())).toBe(true);
    expect(writtenByOlderBuild(full())).toBe(false);
    expect(writtenByOlderBuild(strippedByOldBuild(full()))).toBe(true);
  });

  it("keeps the stamp through the schema, so a reload still sees it", () => {
    const profile: StudyState = {
      ...freshState(),
      rev: STATE_REV,
      notes: [note("n1")],
    };
    const parsed = stateSchema.parse(JSON.parse(JSON.stringify(profile)));
    expect(parsed.rev).toBe(STATE_REV);
  });
});

describe("putting back what an older tab dropped", () => {
  it("restores the notes and the work of every sitting, and nothing else", () => {
    const mine = full();
    const theirs = strippedByOldBuild(mine);
    // The old tab also did real work: one more lesson filed.
    const incoming: StudyState = {
      ...theirs,
      attempts: [...theirs.attempts, attempt("a3")],
    };
    const healed = healStripped(mine, incoming);
    expect(healed).not.toBe(incoming);
    expect(healed.notes?.map((item) => item.id)).toEqual(["n1", "n2"]);
    expect(healed.attempts.map((item) => item.id)).toEqual(["a1", "a2", "a3"]);
    expect(healed.attempts[0]).toMatchObject({ scratch: { main: "ý chính" } });
    expect(healed.attempts[2]).not.toHaveProperty("scratch");
    expect(healed.paperRuns?.[0]).toMatchObject({
      scratch: { reading: "từ khóa" },
    });
    expect(healed.paperRuns?.[1]).toMatchObject({
      marks: { passage: [{ i: 0, q: "A" }] },
    });
    expect(healed.exam).toMatchObject({ scratch: { writing: "dàn ý" } });
    // What the old tab wrote is still what it wrote.
    expect(healed.updatedAt).toBe(incoming.updatedAt);
  });

  it("leaves a profile alone when it carries this build's stamp", () => {
    const mine = full();
    // Another tab of this build deleted every note on purpose.
    const incoming: StudyState = {
      ...mine,
      notes: [],
      rev: STATE_REV,
      updatedAt: "2026-10-08T03:00:00.000Z",
    };
    expect(healStripped(mine, incoming)).toBe(incoming);
    // Or restored a backup that never had any.
    const imported: StudyState = { ...freshState(), rev: STATE_REV };
    expect(healStripped(mine, imported)).toBe(imported);
  });

  it("leaves a profile alone when there was nothing to lose", () => {
    const incoming = strippedByOldBuild(full());
    expect(healStripped(freshState(), incoming)).toBe(incoming);
  });

  it("never overwrites what the incoming profile has", () => {
    const mine = full();
    const incoming: StudyState = {
      ...strippedByOldBuild(mine),
      notes: [note("n9", "đã có sẵn")],
    };
    const healed = healStripped(mine, incoming);
    expect(healed.notes?.map((item) => item.id)).toEqual(["n9"]);
  });

  it("does not bring back work for a sitting that is no longer there", () => {
    const mine = full();
    const incoming: StudyState = {
      ...strippedByOldBuild(mine),
      attempts: [],
      paperRuns: [],
      exam: null,
    };
    const healed = healStripped(mine, incoming);
    expect(healed.attempts).toEqual([]);
    expect(healed.paperRuns).toEqual([]);
    expect(healed.exam).toBeNull();
    // The notes are about questions, not sittings: they come back.
    expect(healed.notes).toHaveLength(2);
  });

  it("puts back from a copy read off the disk the same way", () => {
    const saved = JSON.parse(JSON.stringify(recoverableOf(full())));
    const restored = putBack(strippedByOldBuild(full()), saved);
    expect(restored.notes).toHaveLength(2);
    expect(restored.attempts[0]).toMatchObject({
      scratch: { main: "ý chính" },
    });
    // And a profile that already has everything is returned as it is.
    const whole = full();
    expect(putBack(whole, saved)).toBe(whole);
  });

  it("gives a profile the schema still accepts", () => {
    const profile: StudyState = {
      ...freshState(),
      rev: STATE_REV,
      notes: [note("n1"), note("n2")],
    };
    const healed = healStripped(profile, strippedByOldBuild(profile));
    expect(healed.notes).toHaveLength(2);
    expect(
      stateSchema.safeParse(JSON.parse(JSON.stringify(healed))).success,
    ).toBe(true);
  });
});
