import { describe, expect, it } from "vitest";
import {
  freshState,
  stateSchema,
  type PaperRun,
  type StudyState,
} from "../../src/lib/learning";
import { addPaperRun } from "../../src/lib/papers";
import {
  WORK_LIMITS,
  draftWork,
  readWork,
  setDraftScratch,
  setExamScratch,
  setRunScratch,
  takeDraftWork,
  toggleAttemptMark,
  toggleDraftMark,
  toggleExamMark,
  toggleRunMark,
  withMark,
  withScratch,
  workBytes,
  workDraftKey,
} from "../../src/lib/work";

const run = (id: string, extra: Partial<PaperRun> = {}): PaperRun => ({
  id,
  paperId: "133",
  version: 1,
  startedAt: 1,
  stage: 0,
  deadline: 2,
  material: 0,
  answers: {},
  essays: {},
  spoken: [],
  ...extra,
});
const withRuns = (...ids: string[]): StudyState => ({
  ...freshState(),
  paperRuns: ids.map((id) => run(id)),
});
const reload = (state: StudyState) =>
  stateSchema.safeParse(JSON.parse(JSON.stringify(state)));
const TEXT = "First one. Second one. Third one.";

describe("a page of scratch", () => {
  it("is written, replaced and cleared, leaving no empty field behind", () => {
    let holder: { scratch?: Record<string, string> } = {};
    holder = withScratch(holder, "part-1", "tên riêng: Hart").holder;
    holder = withScratch(holder, "part-2", "15 phút").holder;
    expect(holder.scratch).toEqual({
      "part-1": "tên riêng: Hart",
      "part-2": "15 phút",
    });
    holder = withScratch(holder, "part-1", "").holder;
    expect(holder.scratch).toEqual({ "part-2": "15 phút" });
    holder = withScratch(holder, "part-2", "").holder;
    expect(holder).toEqual({});
    expect("scratch" in holder).toBe(false);
  });

  it("refuses a page that is too long, and a sitting with too many pages", () => {
    const empty = {};
    const long = withScratch(empty, "k", "x".repeat(WORK_LIMITS.scratch + 1));
    expect(long.error).toMatch(/2000 ký tự/);
    expect(long.holder).toBe(empty);
    expect(withScratch(empty, "k", "x".repeat(WORK_LIMITS.scratch)).error).toBe(
      undefined,
    );
    let holder: { scratch?: Record<string, string> } = {};
    for (let i = 0; i < WORK_LIMITS.keys; i++)
      holder = withScratch(holder, `page-${i}`, "x").holder;
    const refused = withScratch(holder, "one-more", "x");
    expect(refused.error).toBeTruthy();
    expect(refused.holder).toBe(holder);
    // A page that already exists can still be changed.
    expect(withScratch(holder, "page-0", "y").error).toBeUndefined();
  });
});

describe("highlights on a text", () => {
  it("are added and taken off, and the field goes when the last one does", () => {
    let holder: { marks?: Record<string, { i: number; q: string }[]> } = {};
    holder = withMark(holder, "slot:p", TEXT, 1).holder;
    expect(holder.marks).toEqual({ "slot:p": [{ i: 1, q: "Second one." }] });
    holder = withMark(holder, "slot:p", TEXT, 1).holder;
    expect(holder).toEqual({});
  });
});

describe("in a paper sitting", () => {
  it("lives on the sitting and nowhere else", () => {
    let state = withRuns("a", "b");
    state = setRunScratch(state, "a", "slot-1", "ghi nhanh").state;
    state = toggleRunMark(state, "a", "slot-1:p", TEXT, 0).state;
    expect(state.paperRuns?.[0].scratch).toEqual({ "slot-1": "ghi nhanh" });
    expect(state.paperRuns?.[0].marks?.["slot-1:p"]).toHaveLength(1);
    expect(state.paperRuns?.[1].scratch).toBeUndefined();
    expect(reload(state).success).toBe(true);
  });

  it("is taken away with a sitting that the 100-sitting cap lets go of", () => {
    let state = withRuns("old");
    state = setRunScratch(state, "old", "slot-1", "chỉ nằm ở lượt cũ").state;
    state = {
      ...state,
      paperRuns: [
        { ...state.paperRuns![0], finishedAt: "2026-10-07T00:00:00.000Z" },
      ],
    };
    const added = addPaperRun(state.paperRuns!, run("new"), 1);
    expect(added.dropped.map((entry) => entry.id)).toEqual(["old"]);
    state = { ...state, paperRuns: added.runs };
    expect(JSON.stringify(state)).not.toContain("chỉ nằm ở lượt cũ");
  });

  it("says so when the sitting is not there, and changes nothing", () => {
    const state = withRuns("a");
    const outcome = setRunScratch(state, "missing", "k", "x");
    expect(outcome.error).toBeTruthy();
    expect(outcome.state).toBe(state);
  });

  it("is refused once all scratch and highlights together take too much, but can shrink", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `r${i}`);
    let state = withRuns(...ids);
    const page = "ă".repeat(WORK_LIMITS.scratch);
    let refusedAt = -1;
    outer: for (const id of ids)
      for (let k = 0; k < WORK_LIMITS.keys; k++) {
        const outcome = setRunScratch(state, id, `page-${k}`, page);
        if (outcome.error) {
          expect(outcome.error).toMatch(/0,5 MB/);
          expect(outcome.state).toBe(state);
          refusedAt = k;
          break outer;
        }
        state = outcome.state;
      }
    expect(refusedAt).toBeGreaterThan(-1);
    expect(workBytes(state)).toBeLessThanOrEqual(WORK_LIMITS.bytes);
    expect(reload(state).success).toBe(true);
    // Clearing a page is always accepted, and makes room again.
    const cleared = setRunScratch(state, "r0", "page-0", "");
    expect(cleared.error).toBeUndefined();
    expect(workBytes(cleared.state)).toBeLessThan(workBytes(state));
  });
});

describe("in a timed exam", () => {
  const exam = {
    id: "e1",
    startedAt: 1,
    stage: 0,
    deadline: 2,
    answers: {},
    writing: "",
    finished: false,
  };
  const state: StudyState = { ...freshState(), exam };

  it("belongs to that exam, not to a later one an old tab still shows", () => {
    const written = setExamScratch(state, "e1", "lesson-1", "dàn ý");
    expect(written.state.exam?.scratch).toEqual({ "lesson-1": "dàn ý" });
    expect(
      toggleExamMark(written.state, "e1", "lesson-1", TEXT, 2).state.exam
        ?.marks,
    ).toBeDefined();
    const stale = setExamScratch(
      written.state,
      "an-older-exam",
      "lesson-1",
      "x",
    );
    expect(stale.error).toBeTruthy();
    expect(stale.state).toBe(written.state);
    expect(setExamScratch(freshState(), "e1", "k", "x").error).toBeTruthy();
    expect(reload(written.state).success).toBe(true);
  });
});

describe("on a filed lesson", () => {
  it("lets the highlights go on changing after the lesson is filed", () => {
    const state: StudyState = {
      ...freshState(),
      attempts: [
        {
          id: "a1",
          lessonId: "x",
          skill: "reading",
          date: "2026-10-08T05:00:00.000Z",
          answers: {},
          correct: 0,
          total: 0,
          seconds: 0,
        },
      ],
    };
    const marked = toggleAttemptMark(state, "a1", "text", TEXT, 0);
    expect(marked.state.attempts[0].marks).toEqual({
      text: [{ i: 0, q: "First one." }],
    });
    expect(
      toggleAttemptMark(state, "none", "text", TEXT, 0).error,
    ).toBeTruthy();
    expect(reload(marked.state).success).toBe(true);
  });
});

describe("while a lesson is open", () => {
  it("is kept in one draft, and taken out when the lesson is filed", () => {
    let state = freshState();
    state = setDraftScratch(state, "reading-cafe", "main", "từ khóa").state;
    state = toggleDraftMark(state, "reading-cafe", "text", TEXT, 1).state;
    expect(draftWork(state, "reading-cafe")).toEqual({
      scratch: { main: "từ khóa" },
      marks: { text: [{ i: 1, q: "Second one." }] },
    });
    expect(workDraftKey("reading-cafe") in state.drafts).toBe(true);
    const taken = takeDraftWork(state, "reading-cafe");
    expect(taken.work.scratch).toEqual({ main: "từ khóa" });
    // The key is removed, not left as an empty draft.
    expect(workDraftKey("reading-cafe") in taken.state.drafts).toBe(false);
    expect(takeDraftWork(taken.state, "reading-cafe").state).toBe(taken.state);
    expect(reload(taken.state).success).toBe(true);
  });

  it("reads anything malformed as nothing, and drops what does not belong", () => {
    expect(readWork(undefined)).toEqual({});
    expect(readWork("not json")).toEqual({});
    expect(readWork("[]")).toEqual({});
    expect(
      readWork(
        JSON.stringify({
          scratch: {
            ok: "giữ",
            long: "x".repeat(WORK_LIMITS.scratch + 1),
            n: 3,
          },
          marks: {
            text: [
              { i: 1, q: "ok" },
              { i: -1, q: "bad" },
              { i: 1.5, q: "bad" },
              "x",
            ],
            empty: [],
          },
        }),
      ),
    ).toEqual({ scratch: { ok: "giữ" }, marks: { text: [{ i: 1, q: "ok" }] } });
  });

  it("never grows past what a saved draft is allowed to hold", () => {
    // Forty pages of the longest length would be 80 000 characters in one
    // draft, and the schema reads 30 000: the profile would not load again.
    let state = freshState();
    let refused: string | undefined;
    for (let key = 0; key < WORK_LIMITS.keys && !refused; key++) {
      const result = setDraftScratch(
        state,
        "reading-cafe",
        `page-${key}`,
        "x".repeat(WORK_LIMITS.scratch),
      );
      refused = result.error;
      if (!refused) state = result.state;
    }
    expect(refused).toBeTruthy();
    expect(
      state.drafts[workDraftKey("reading-cafe")].length,
    ).toBeLessThanOrEqual(WORK_LIMITS.draft);
    expect(reload(state).success).toBe(true);
    // A draft that is full can still be made smaller.
    const smaller = setDraftScratch(state, "reading-cafe", "page-0", "");
    expect(smaller.error).toBeUndefined();
    expect(reload(smaller.state).success).toBe(true);
  });

  it("is clearing a page by writing nothing", () => {
    let state = setDraftScratch(freshState(), "l", "main", "x").state;
    state = setDraftScratch(state, "l", "main", "").state;
    expect(workDraftKey("l") in state.drafts).toBe(false);
  });
});

describe("the schema around scratch and highlights", () => {
  const valid = (state: StudyState) => reload(state).success;
  const base = withRuns("a");

  it("accepts what the writers produce and rejects what they never can", () => {
    expect(valid(base)).toBe(true);
    const put = (patch: Partial<PaperRun>) => ({
      ...base,
      paperRuns: [run("a", patch)],
    });
    expect(valid(put({ scratch: { k: "ok" } }))).toBe(true);
    expect(
      valid(put({ scratch: { k: "x".repeat(WORK_LIMITS.scratch + 1) } })),
    ).toBe(false);
    expect(
      valid(
        put({
          scratch: Object.fromEntries(
            Array.from({ length: WORK_LIMITS.keys + 1 }, (_, i) => [
              `k${i}`,
              "x",
            ]),
          ),
        }),
      ),
    ).toBe(false);
    expect(valid(put({ marks: { t: [{ i: 3, q: "ok" }] } }))).toBe(true);
    expect(valid(put({ marks: { t: [{ i: 5000, q: "ok" }] } }))).toBe(false);
    expect(valid(put({ marks: { t: [{ i: 1, q: "x".repeat(61) }] } }))).toBe(
      false,
    );
    expect(
      valid(
        put({
          marks: {
            t: Array.from({ length: 61 }, (_, i) => ({ i, q: "q" })),
          },
        }),
      ),
    ).toBe(false);
  });
});
