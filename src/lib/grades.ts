import * as z from "zod/mini";
import type { StudyState } from "./learning";
import type { SpeakingGrade } from "./grading/speaking";
import type { WritingGrade } from "./grading/writing";
import { gradeKey } from "./grading/generate";

/**
 * The AI grades Gùa has asked for, kept with her other study data so they go
 * into every backup and cloud snapshot and are shown again on the same work.
 *
 * Like notes and scratch pages, every limit is checked where a grade is
 * written, not only in the schema: the saved profile is written unvalidated,
 * and a value the schema rejects would be reported as damaged data on the next
 * load. A grade belongs to one piece of work, so it is dropped with it.
 */
export const GRADE_LIMITS = {
  /** Grades kept; the oldest go first. */
  count: 40,
  /** What all grades may take in the saved profile. */
  bytes: 512 * 1024,
  /** What the schema accepts on load (looser than the write cap, on purpose). */
  schemaCount: 400,
} as const;

export type DoneWritingGrade = Extract<WritingGrade, { status: "graded" }>;
export type DoneSpeakingGrade = Extract<SpeakingGrade, { status: "graded" }>;

/** What a stored transcript may hold: five minutes of speech is about 4,000 characters. */
const TRANSCRIPT_MAX = 12000;
const short = (max: number) => z.string().check(z.maxLength(max));
const count = z.number().check(z.minimum(0));

const criterionSchema = z.looseObject({
  score: z.number().check(z.minimum(0), z.maximum(10)),
  low: count,
  high: count,
  runs: count,
  unsure: z.boolean(),
  band: short(20),
  evidence: z.array(short(700)).check(z.maxLength(8)),
  whyNotHigher: short(1000),
  whyNotLower: short(1000),
  toRaise: short(1000),
  showScore: z.boolean(),
  /** Absent in grades saved before marks were shown unvalidated. */
  validated: z.optional(z.boolean()),
});

export const storedGradeSchema = z.looseObject({
  /** Where the work lives: `paper:<run id>:<slot id>` or `attempt:<attempt id>`. */
  id: short(200),
  at: z.iso.datetime(),
  /** Hash of the task text, the writing and the task number it was graded on. */
  inputHash: short(64),
  grade: z.looseObject({
    status: z.literal("graded"),
    model: short(100),
    promptVersion: short(40),
    rubricVersion: short(60),
    criteria: z.record(z.string(), criterionSchema),
    taskScore: z.nullable(z.number()),
    rawTaskScore: z.number(),
    requirements: z
      .array(
        z.looseObject({
          id: short(60),
          text: short(400),
          met: z.enum(["yes", "partly", "no"]),
        }),
      )
      .check(z.maxLength(20)),
    errors: z
      .array(
        z.looseObject({
          quote: short(500),
          type: short(20),
          correction: short(500),
          explanation: short(700),
        }),
      )
      .check(z.maxLength(40)),
    errorsPer100: z.number(),
    droppedQuotes: count,
    totalQuotes: count,
    runs: count,
    lowConfidence: z.boolean(),
    summary: short(1400),
    measures: z.looseObject({ words: count }),
  }),
});
export const storedSpeakingGradeSchema = z.looseObject({
  /** `paper:<run id>:speaking` — the whole Speaking test of one sitting. */
  id: short(200),
  at: z.iso.datetime(),
  /** Hash of the questions and of the recordings (when each was taken, and its size). */
  inputHash: short(64),
  grade: z.looseObject({
    status: z.literal("graded"),
    model: short(100),
    promptVersion: short(40),
    rubricVersion: short(60),
    parts: z
      .array(
        z.looseObject({
          id: short(120),
          transcript: short(TRANSCRIPT_MAX),
          timesPlausible: z.boolean(),
        }),
      )
      .check(z.maxLength(3)),
    criteria: z.record(z.string(), criterionSchema),
    speakingScore: z.nullable(z.number()),
    rawSpeakingScore: z.number(),
    droppedQuotes: count,
    totalQuotes: count,
    runs: count,
    lowConfidence: z.boolean(),
    summary: short(1400),
  }),
});

/** What is kept: the schema above checks the shape on load; this is the type code works with. */
export type StoredGrade = {
  id: string;
  at: string;
  inputHash: string;
  grade: DoneWritingGrade;
};
export type StoredSpeakingGrade = {
  id: string;
  at: string;
  inputHash: string;
  grade: DoneSpeakingGrade;
};
/** A saved grade of either kind; a Speaking grade is the one that carries `parts`. */
export type AnyStoredGrade = StoredGrade | StoredSpeakingGrade;
export const isSpeakingGrade = (
  stored: AnyStoredGrade,
): stored is StoredSpeakingGrade => "parts" in stored.grade;
type Stored = Record<string, AnyStoredGrade>;
const asState = (grades: Stored) => grades as unknown as StudyState["grades"];

export const paperGradeId = (runId: string, slotId: string) =>
  `paper:${runId}:${slotId}`;
/** The whole Speaking test of a sitting is graded as one performance. */
export const paperSpeakingGradeId = (runId: string) =>
  paperGradeId(runId, "speaking");
export const attemptGradeId = (attemptId: string) => `attempt:${attemptId}`;

/** Which piece of work a grade id points at, or null for a form this build does not know. */
export function gradeTarget(id: string) {
  const [kind, first, ...rest] = id.split(":");
  if (kind === "paper" && first && rest.length)
    return { kind: "paper" as const, runId: first, slotId: rest.join(":") };
  // A sitting's own attempts are named `exam:<id>:<lesson>`, so the id may hold colons.
  if (kind === "attempt" && first)
    return {
      kind: "attempt" as const,
      attemptId: [first, ...rest].join(":"),
    };
  return null;
}

/**
 * Hash of what a grade was made from, so a grade can say "the writing has
 * changed since". The model and rubric versions are kept on the grade itself.
 */
export function inputHashOf(input: {
  task: 1 | 2;
  prompt: string;
  text: string;
}) {
  return gradeKey(["writing-input", input.task, input.prompt, input.text]);
}

/** Hash of the questions and recordings a Speaking grade was made from. */
export function speakingInputHashOf(
  parts: { id: string; prompt: string; savedAt: number; bytes: number }[],
) {
  return gradeKey([
    "speaking-input",
    ...parts.flatMap((p) => [p.id, p.prompt, p.savedAt, p.bytes]),
  ]);
}

/** Keep what the schema and the caps above can hold: long lists and quotes are cut, not rejected. */
export function fitGrade(grade: DoneWritingGrade): DoneWritingGrade {
  const cut = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) : text;
  const criteria = Object.fromEntries(
    Object.entries(grade.criteria).map(([key, value]) => [
      key,
      {
        ...value,
        evidence: value.evidence.slice(0, 8).map((q) => cut(q, 700)),
        whyNotHigher: cut(value.whyNotHigher, 1000),
        whyNotLower: cut(value.whyNotLower, 1000),
        toRaise: cut(value.toRaise, 1000),
      },
    ]),
  ) as DoneWritingGrade["criteria"];
  return {
    ...grade,
    criteria,
    requirements: grade.requirements
      .slice(0, 20)
      .map((r) => ({ ...r, text: cut(r.text, 400) })),
    errors: grade.errors.slice(0, 40).map((e) => ({
      ...e,
      quote: cut(e.quote, 500),
      correction: cut(e.correction, 500),
      explanation: cut(e.explanation, 700),
    })),
    summary: cut(grade.summary, 1400),
  };
}

export function fitSpeakingGrade(grade: DoneSpeakingGrade): DoneSpeakingGrade {
  const cut = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) : text;
  return {
    ...grade,
    parts: grade.parts.slice(0, 3).map((part) => ({
      ...part,
      transcript: cut(part.transcript, TRANSCRIPT_MAX),
    })),
    criteria: Object.fromEntries(
      Object.entries(grade.criteria).map(([key, value]) => [
        key,
        {
          ...value,
          evidence: value.evidence.slice(0, 8).map((q) => cut(q, 700)),
          whyNotHigher: cut(value.whyNotHigher, 1000),
          whyNotLower: cut(value.whyNotLower, 1000),
          toRaise: cut(value.toRaise, 1000),
        },
      ]),
    ) as DoneSpeakingGrade["criteria"],
    summary: cut(grade.summary, 1400),
  };
}

const bytesOf = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length;

/** Grades whose work is gone (a sitting dropped by the 100-sitting cap, a deleted attempt) go too. */
export function pruneGrades(state: StudyState): StudyState {
  const grades = state.grades as Stored | undefined;
  if (!grades) return state;
  const runs = new Set((state.paperRuns ?? []).map((run) => run.id));
  const attempts = new Set(state.attempts.map((attempt) => attempt.id));
  const kept: Stored = {};
  for (const [id, entry] of Object.entries(grades)) {
    const target = gradeTarget(id);
    if (!target) {
      kept[id] = entry; // unknown form: written by a newer build, not ours to drop
      continue;
    }
    if (
      target.kind === "paper"
        ? runs.has(target.runId)
        : attempts.has(target.attemptId)
    )
      kept[id] = entry;
  }
  if (Object.keys(kept).length === Object.keys(grades).length) return state;
  return { ...state, grades: asState(kept) };
}

export type GradeResult = { state: StudyState; error?: string };

const FULL =
  "Các lần chấm đã dùng hết phần dung lượng dành cho chúng (0,5 MB). Xóa bớt lần chấm ở các lượt cũ rồi thử lại.";

/** Saves a grade, replacing an earlier one for the same work and dropping the oldest when full. */
export function addGrade(
  state: StudyState,
  entry: AnyStoredGrade,
): GradeResult {
  const fitted: AnyStoredGrade = isSpeakingGrade(entry)
    ? { ...entry, grade: fitSpeakingGrade(entry.grade) }
    : { ...entry, grade: fitGrade(entry.grade) };
  const grades: Stored = {
    ...((pruneGrades(state).grades as Stored | undefined) ?? {}),
    [fitted.id]: fitted,
  };
  const byAge = () =>
    Object.keys(grades).sort((a, b) =>
      grades[a].at.localeCompare(grades[b].at),
    );
  while (Object.keys(grades).length > GRADE_LIMITS.count) {
    const oldest = byAge().find((id) => id !== fitted.id);
    if (!oldest) break;
    delete grades[oldest];
  }
  while (bytesOf(grades) > GRADE_LIMITS.bytes) {
    const oldest = byAge().find((id) => id !== fitted.id);
    if (!oldest) return { state, error: FULL };
    delete grades[oldest];
  }
  return { state: { ...pruneGrades(state), grades: asState(grades) } };
}

export function removeGrade(state: StudyState, id: string): StudyState {
  if (!state.grades?.[id]) return state;
  const grades = { ...(state.grades as Stored) };
  delete grades[id];
  return { ...state, grades: asState(grades) };
}
