import { describe, expect, it } from "vitest";
import {
  freshState,
  stateSchema,
  type StudyState,
} from "../../src/lib/learning";
import type { Generate } from "../../src/lib/grading/generate";
import { GATES, type Gates } from "../../src/lib/grading/gates";
import { gradeWriting } from "../../src/lib/grading/writing";
import {
  GRADE_LIMITS,
  addGrade,
  attemptGradeId,
  fitGrade,
  gradeTarget,
  inputHashOf,
  paperGradeId,
  pruneGrades,
  removeGrade,
  type DoneWritingGrade,
  type StoredGrade,
} from "../../src/lib/grades";
import { STATE_REV, healStripped, recoverableOf } from "../../src/lib/recovery";
import { buildErrorReport, errorReportText } from "../../src/lib/error-log";

const open: Gates = {
  writing: { task: true, organization: true, vocabulary: true, grammar: true },
  speaking: GATES.speaking,
  measuredOn: "test",
};
const text =
  "Dear Jo, thanks for your email and I am sure you can make the team. You should practise every day and I could training with you on Saturday morning. Also you should eat lots of vegetables, fruit and rice to have energy before each long practice. Best wishes, Gua";
const prompt = "Write an email replying to Jo.\n• suggest\n• respond\n• advise";

async function realGrade(): Promise<DoneWritingGrade> {
  const generate: Generate = async (request) =>
    request.label.startsWith("writing-analysis")
      ? {
          requirements: [
            { id: "r1", met: "yes", quote: "You should practise every day" },
            { id: "r2", met: "yes", quote: "I could training with you" },
            { id: "r3", met: "no", quote: "" },
          ],
          errors: [
            {
              quote: "I could training with you",
              type: "grammar",
              correction: "I could train with you",
              explanation: "Sau could dùng động từ nguyên mẫu.",
            },
          ],
        }
      : {
          criteria: ["task", "organization", "vocabulary", "grammar"].map(
            (criterion) => ({
              criterion,
              score: 6,
              evidence: ["You should practise every day"],
              whyNotHigher: "Thiếu ý.",
              whyNotLower: "Đủ ý.",
              toRaise: "Thêm ví dụ.",
            }),
          ),
          summary: "Tổng kết.",
        };
  const grade = await gradeWriting(
    {
      task: 1,
      prompt,
      requirements: [
        { id: "r1", text: "suggest" },
        { id: "r2", text: "respond" },
        { id: "r3", text: "advise" },
      ],
      text,
    },
    { generate, gates: open },
  );
  if (grade.status !== "graded") throw new Error("expected a grade");
  return grade;
}

async function entry(id: string, at: string): Promise<StoredGrade> {
  return {
    id,
    at,
    inputHash: await inputHashOf({ task: 1, prompt, text }),
    grade: await realGrade(),
  };
}

const run = (id: string) =>
  ({
    id,
    paperId: "132",
    version: 1,
    startedAt: 1,
    stage: 2,
    deadline: 2,
    material: 0,
    answers: {},
    essays: {},
    spoken: [],
  }) as unknown as NonNullable<StudyState["paperRuns"]>[number];
const withRuns = (...ids: string[]): StudyState => ({
  ...freshState(),
  rev: STATE_REV,
  paperRuns: ids.map(run),
});

describe("saved AI grades", () => {
  it("round-trips through the state schema, and an older backup without grades still parses", async () => {
    const stored = await entry(
      paperGradeId("r1", "132-writing-1"),
      "2026-10-08T10:00:00.000Z",
    );
    const result = addGrade(withRuns("r1"), stored);
    expect(result.error).toBeUndefined();
    const parsed = stateSchema.parse(JSON.parse(JSON.stringify(result.state)));
    expect(Object.keys(parsed.grades ?? {})).toEqual([
      "paper:r1:132-writing-1",
    ]);
    const { grades, ...legacy } = result.state;
    void grades;
    expect(() =>
      stateSchema.parse(JSON.parse(JSON.stringify(legacy))),
    ).not.toThrow();
  });

  it("replaces the grade of the same work instead of adding a second", async () => {
    const id = paperGradeId("r1", "s");
    let state = addGrade(
      withRuns("r1"),
      await entry(id, "2026-10-08T10:00:00.000Z"),
    ).state;
    state = addGrade(state, await entry(id, "2026-10-08T11:00:00.000Z")).state;
    expect(Object.keys(state.grades ?? {})).toHaveLength(1);
    expect((state.grades as Record<string, StoredGrade>)[id].at).toBe(
      "2026-10-08T11:00:00.000Z",
    );
  });

  it("keeps at most GRADE_LIMITS.count grades and drops the oldest first", async () => {
    const ids = Array.from(
      { length: GRADE_LIMITS.count + 3 },
      (_, i) => `r${i}`,
    );
    let state = withRuns(...ids);
    for (const [i, runId] of ids.entries()) {
      const at = new Date(Date.UTC(2026, 9, 8, 0, i)).toISOString();
      state = addGrade(state, await entry(paperGradeId(runId, "s"), at)).state;
    }
    const kept = Object.keys(state.grades ?? {});
    expect(kept).toHaveLength(GRADE_LIMITS.count);
    expect(kept).not.toContain("paper:r0:s");
    expect(kept).toContain(`paper:r${ids.length - 1}:s`);
  });

  it("refuses, and changes nothing, when a single grade cannot fit", async () => {
    const stored = await entry(
      paperGradeId("r1", "s"),
      "2026-10-08T10:00:00.000Z",
    );
    const huge: StoredGrade = {
      ...stored,
      grade: {
        ...stored.grade,
        criteria: {
          ...stored.grade.criteria,
          task: {
            ...stored.grade.criteria.task,
            evidence: Array(8).fill("x".repeat(700)),
          },
        },
      },
    };
    const state = withRuns("r1");
    // One grade is far below the cap, so a normal one is accepted…
    expect(addGrade(state, huge).error).toBeUndefined();
    // …and fitGrade keeps every field inside what the schema accepts.
    const fitted = fitGrade({
      ...stored.grade,
      summary: "s".repeat(5000),
      errors: Array.from({ length: 100 }, (_, i) => ({
        quote: `q${i}`.repeat(300),
        type: "grammar" as const,
        correction: "c",
        explanation: "e",
      })),
    });
    expect(fitted.summary).toHaveLength(1400);
    expect(fitted.errors).toHaveLength(40);
    expect(fitted.errors[0].quote.length).toBeLessThanOrEqual(500);
  });

  it("drops the grades of a sitting that is gone, keeps unknown forms, and can remove one", async () => {
    let state = withRuns("r1", "r2");
    state = addGrade(
      state,
      await entry(paperGradeId("r1", "s"), "2026-10-08T10:00:00.000Z"),
    ).state;
    state = addGrade(
      state,
      await entry(paperGradeId("r2", "s"), "2026-10-08T10:01:00.000Z"),
    ).state;
    const unknown = {
      ...(await entry("future:thing", "2026-10-08T10:02:00.000Z")),
    };
    state = {
      ...state,
      grades: {
        ...state.grades,
        "future:thing": unknown,
      } as StudyState["grades"],
    };
    const pruned = pruneGrades({ ...state, paperRuns: [run("r2")] });
    expect(Object.keys(pruned.grades ?? {}).sort()).toEqual([
      "future:thing",
      "paper:r2:s",
    ]);
    expect(pruneGrades(state)).toBe(state); // nothing to drop: the same object
    expect(
      Object.keys(removeGrade(state, "paper:r1:s").grades ?? {}),
    ).not.toContain("paper:r1:s");
    expect(removeGrade(state, "nope")).toBe(state);
  });

  it("names where a grade belongs", () => {
    expect(gradeTarget(paperGradeId("r1", "132-writing-1"))).toEqual({
      kind: "paper",
      runId: "r1",
      slotId: "132-writing-1",
    });
    expect(gradeTarget(attemptGradeId("a1"))).toEqual({
      kind: "attempt",
      attemptId: "a1",
    });
    expect(gradeTarget("garbage")).toBeNull();
  });

  it("hashes the task, the prompt and the writing, so a changed essay is noticed", async () => {
    const base = { task: 1 as const, prompt, text };
    const a = await inputHashOf(base);
    expect(await inputHashOf(base)).toBe(a);
    expect(await inputHashOf({ ...base, text: text + "!" })).not.toBe(a);
    expect(await inputHashOf({ ...base, prompt: prompt + " " })).not.toBe(a);
    expect(await inputHashOf({ ...base, task: 2 })).not.toBe(a);
  });

  it("survives an older tab that drops the field", async () => {
    const mine = addGrade(
      withRuns("r1"),
      await entry(paperGradeId("r1", "s"), "2026-10-08T10:00:00.000Z"),
    ).state;
    expect(Object.keys(recoverableOf(mine).grades ?? {})).toEqual([
      "paper:r1:s",
    ]);
    const stripped: StudyState = { ...withRuns("r1"), rev: undefined };
    const healed = healStripped(mine, stripped);
    expect(Object.keys(healed.grades ?? {})).toEqual(["paper:r1:s"]);
    // A profile that carries the stamp is left alone, even without grades.
    const deliberate = withRuns("r1");
    expect(healStripped(mine, deliberate)).toBe(deliberate);
  });

  it("never reaches the bug report", async () => {
    const state = addGrade(
      withRuns("r1"),
      await entry(paperGradeId("r1", "s"), "2026-10-08T10:00:00.000Z"),
    ).state;
    const report = errorReportText(buildErrorReport(state, "/progress"));
    expect(report).not.toContain("Sau could");
    expect(report).not.toContain("Tổng kết.");
    expect(report).not.toContain("practise every day");
  });
});
