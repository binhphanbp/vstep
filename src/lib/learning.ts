import * as z from "zod/mini";
import {
  lessons,
  vocabulary,
  type Lesson,
  type Question,
  type Skill,
  type Vocabulary,
} from "./content";
import { allLessons, fullListening, fullReading } from "./full-exam-content";
import {
  fullListening2,
  fullReading2,
  fullSpeaking2,
  fullWriting2,
} from "./full-exam-02";
import { SAVED_WORD_PREFIX, wordCards } from "./word-cards";

// The production CSP intentionally disallows eval. Configure Zod before any
// schema is created so its optional JIT probe does not trigger a violation.
z.config({ jitless: true });

const skillSchema = z.enum(["listening", "reading", "writing", "speaking"]);
export const confidenceSchema = z.enum(["guess", "unsure", "sure"]);
const limitedString = (max: number) => z.string().check(z.maxLength(max));
const boundedNumber = (minimum: number, maximum: number) =>
  z.number().check(z.minimum(minimum), z.maximum(maximum));
const boundedInteger = (minimum: number, maximum: number) =>
  z.number().check(z.int(), z.minimum(minimum), z.maximum(maximum));
const questionSnapshotSchema = z
  .object({
    id: limitedString(100),
    text: limitedString(3000),
    options: z.array(limitedString(2000)).check(z.minLength(2), z.maxLength(8)),
    answer: boundedInteger(0, 7),
    explanation: limitedString(5000),
    tag: limitedString(100),
    evidence: z.optional(limitedString(3000)),
    optionNotes: z.optional(
      z.array(limitedString(2000)).check(z.minLength(2), z.maxLength(8)),
    ),
  })
  .check(
    z.superRefine((question, ctx) => {
      if (
        question.optionNotes &&
        question.optionNotes.length !== question.options.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["optionNotes"],
          message: "Mỗi lựa chọn phải có đúng một ghi chú phân tích.",
        });
      if (question.answer >= question.options.length)
        ctx.addIssue({
          code: "custom",
          path: ["answer"],
          message: "Đáp án đúng phải nằm trong danh sách lựa chọn.",
        });
      if (new Set(question.options).size !== question.options.length)
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "Các lựa chọn trong snapshot không được trùng nhau.",
        });
    }),
  );
const lessonSnapshotSchema = z
  .object({
    id: limitedString(100),
    version: boundedInteger(1, 1000000),
    skill: skillSchema,
    title: limitedString(500),
    subtitle: limitedString(1000),
    topic: limitedString(200),
    level: z.enum(["B1", "B2"]),
    minutes: boundedInteger(1, 300),
    part: limitedString(500),
    text: limitedString(50000),
    questions: z.array(questionSnapshotSchema).check(z.maxLength(100)),
    tips: z.array(limitedString(1000)).check(z.maxLength(30)),
    minWords: z.optional(boundedInteger(1, 10000)),
    sample: z.optional(limitedString(50000)),
  })
  .check(
    z.refine(
      (lesson) =>
        new Set(lesson.questions.map((question) => question.id)).size ===
        lesson.questions.length,
      {
        error: "Mã câu hỏi trong snapshot không được trùng nhau.",
        path: ["questions"],
      },
    ),
  );

export const profileSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(40)),
  target: z.enum(["B1", "B2", "C1"]),
  level: z.enum(["starting", "B1", "B2"]),
  examDate: z.union([z.literal(""), z.iso.date()]),
  dailyMinutes: boundedInteger(10, 120),
  interests: z.array(limitedString(50)).check(z.maxLength(10)),
  focus: skillSchema,
  onboarded: z.boolean(),
});
export /**
 * Everything an attempt must agree with in the material it was worked on.
 *
 * The same rules apply whether the copy travels on the attempt (how history
 * was stored before the shared library) or sits in `library` with the attempt
 * pointing at it, so they are written once and called from both places. A
 * backup that disagrees with itself is rejected rather than quietly reshaping
 * what she did.
 */
function checkAttemptAgainstLesson(
  attempt: {
    lessonId: string;
    skill: string;
    total: number;
    correct: number;
    answers: Record<string, number>;
    confidence?: Record<string, string>;
  },
  lesson: {
    id: string;
    skill: string;
    questions: { id: string; options: string[]; answer: number }[];
  },
  issue: (path: (string | number)[], message: string) => void,
  prefix: (string | number)[] = [],
) {
  if (lesson.id !== attempt.lessonId)
    issue(
      [...prefix, "lessonSnapshot", "id"],
      "Snapshot phải thuộc đúng bài của lượt học.",
    );
  if (lesson.skill !== attempt.skill)
    issue(
      [...prefix, "lessonSnapshot", "skill"],
      "Kỹ năng trong snapshot không khớp lượt học.",
    );
  if (lesson.questions.length !== attempt.total)
    issue([...prefix, "total"], "Tổng số câu phải khớp snapshot của bài.");
  const questions = new Map(
    lesson.questions.map((question) => [question.id, question]),
  );
  for (const [questionId, answer] of Object.entries(attempt.answers)) {
    const question = questions.get(questionId);
    if (!question || answer >= question.options.length)
      issue(
        [...prefix, "answers", questionId],
        "Câu trả lời không thuộc snapshot của bài.",
      );
  }
  for (const questionId of Object.keys(attempt.confidence ?? {}))
    if (!questions.has(questionId))
      issue(
        [...prefix, "confidence", questionId],
        "Độ chắc chắn không thuộc snapshot của bài.",
      );
  const correct = lesson.questions.filter(
    (question) => attempt.answers[question.id] === question.answer,
  ).length;
  if (correct !== attempt.correct)
    issue([...prefix, "correct"], "Điểm số phải khớp đáp án trong snapshot.");
}
const attemptSchema = z
  .object({
    id: limitedString(100),
    lessonId: limitedString(100),
    skill: skillSchema,
    date: z.iso.datetime(),
    answers: z.record(z.string(), boundedInteger(0, 7)),
    confidence: z.optional(z.record(z.string(), confidenceSchema)),
    correct: boundedInteger(0, 100),
    total: boundedInteger(0, 100),
    seconds: boundedNumber(0, 18000),
    text: z.optional(limitedString(30000)),
    reflection: z.optional(z.array(limitedString(200)).check(z.maxLength(20))),
    // Her own rating against Mây's self-check criteria, 1-3 per criterion.
    // Optional so that every attempt filed before the criteria existed - and
    // every backup holding one - still parses.
    selfCheck: z.optional(z.record(z.string(), boundedInteger(1, 3))),
    /** What a teacher wrote back about this piece, typed in by hand. */
    feedback: z.optional(limitedString(4000)),
    recordingId: z.optional(limitedString(100)),
    lessonSnapshot: z.optional(lessonSnapshotSchema),
    /**
     * Key into `library` for the material this attempt was worked on, used
     * instead of carrying a copy of the lesson on every attempt. Optional:
     * attempts filed before the shared library existed keep their own
     * `lessonSnapshot` and are read exactly as they were.
     */
    lessonRef: z.optional(limitedString(120)),
  })
  .check(
    z.superRefine((attempt, ctx) => {
      if (attempt.correct > attempt.total)
        ctx.addIssue({
          code: "custom",
          path: ["correct"],
          message: "Số câu đúng không thể lớn hơn tổng số câu.",
        });
      const snapshot = attempt.lessonSnapshot;
      if (!snapshot) return;
      checkAttemptAgainstLesson(attempt, snapshot, (path, message) =>
        ctx.addIssue({ code: "custom", path, message }),
      );
    }),
  );
const reviewSchema = z.object({
  due: z.iso.datetime(),
  interval: boundedNumber(0, 365),
  ease: boundedNumber(1.3, 3),
  repetitions: z.number().check(z.int(), z.minimum(0)),
  lastDate: z.string(),
});
const examStageSchema = z.object({
  skill: skillSchema,
  label: limitedString(50),
  seconds: boundedInteger(1, 18000),
  lessonIds: z.array(limitedString(100)).check(z.minLength(1), z.maxLength(40)),
});
export const examSchema = z
  .object({
    id: limitedString(100),
    // "full2" is the second paper. New value, old backups unaffected: a
    // stored sitting of "full" still parses and still finds its stages.
    mode: z.optional(z.enum(["mini", "full", "full2"])),
    startedAt: z.number(),
    stage: boundedInteger(0, 3),
    // Which material of the current part is open. Reading runs four passages
    // on one clock, so a reload has to come back to the passage being read.
    material: z.optional(boundedInteger(0, 39)),
    deadline: z.number(),
    answers: z.record(z.string(), boundedInteger(0, 7)),
    writing: limitedString(30000),
    writingTask2: z.optional(limitedString(30000)),
    // Speaking parts answered out loud on a device that cannot record. Without
    // this the part is unfinishable and the sitting stays permanently open.
    spoken: z.optional(z.array(limitedString(100)).check(z.maxLength(40))),
    finished: z.boolean(),
    lessonSnapshots: z.optional(
      z.array(lessonSnapshotSchema).check(z.minLength(1), z.maxLength(40)),
    ),
    stagePlan: z.optional(
      z.array(examStageSchema).check(z.minLength(4), z.maxLength(4)),
    ),
  })
  .check(
    z.superRefine((exam, ctx) => {
      const snapshots = exam.lessonSnapshots ?? [];
      if (
        new Set(snapshots.map((lesson) => lesson.id)).size !== snapshots.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["lessonSnapshots"],
          message: "Mỗi bài trong snapshot đề phải có mã riêng.",
        });
      if (!exam.stagePlan) return;
      const lessonsById = new Map(
        snapshots.map((lesson) => [lesson.id, lesson]),
      );
      const plannedIds = exam.stagePlan.flatMap((stage) => stage.lessonIds);
      if (new Set(plannedIds).size !== plannedIds.length)
        ctx.addIssue({
          code: "custom",
          path: ["stagePlan"],
          message: "Một bài không được xuất hiện ở nhiều phần thi.",
        });
      exam.stagePlan.forEach((stage, stageIndex) => {
        stage.lessonIds.forEach((lessonId, lessonIndex) => {
          const lesson = lessonsById.get(lessonId);
          if (!lesson || lesson.skill !== stage.skill)
            ctx.addIssue({
              code: "custom",
              path: ["stagePlan", stageIndex, "lessonIds", lessonIndex],
              message:
                "Mỗi bài trong cấu trúc đề phải có snapshot đúng kỹ năng.",
            });
        });
      });
    }),
  );
export const stateSchema = z
  .object({
    version: z.literal(1),
    profile: profileSchema,
    attempts: z.array(attemptSchema).check(z.maxLength(10000)),
    reviews: z.record(z.string(), reviewSchema),
    mistakeReviews: z.record(z.string(), reviewSchema),
    drafts: z.record(z.string(), limitedString(30000)),
    mood: z.record(z.string(), z.enum(["low", "okay", "great"])),
    // Optional on purpose: every backup written before word cards existed has
    // to keep parsing, or it lands in the "damaged data" path instead.
    savedWords: z.optional(
      z.record(z.string(), z.object({ addedAt: z.iso.datetime() })),
    ),
    /**
     * One copy of each lesson version the learner has actually worked, keyed
     * `lessonId@vN`. Measured before this existed: after three months of
     * ordinary study the saved state was 980 KB, of which 95% was the same
     * few lessons copied onto attempt after attempt — on a 5 MB localStorage
     * budget that is a year and a bit before the app cannot save at all.
     * Optional, so every backup written before it still parses.
     */
    library: z.optional(z.record(z.string(), lessonSnapshotSchema)),
    exam: z.nullable(examSchema),
    updatedAt: z.iso.datetime(),
  })
  .check(
    z.superRefine((state, ctx) => {
      const seen = new Set<string>();
      state.attempts.forEach((attempt, index) => {
        if (seen.has(attempt.id))
          ctx.addIssue({
            code: "custom",
            path: ["attempts", index, "id"],
            message: "Mỗi lượt học phải có mã riêng.",
          });
        seen.add(attempt.id);
        // The same checks an inline snapshot gets, for the shared copy: a
        // backup that points an attempt at the wrong material would rewrite
        // history quietly, which is exactly what the snapshot prevents.
        const shared = attempt.lessonRef
          ? state.library?.[attempt.lessonRef]
          : undefined;
        if (!shared) return;
        if (attempt.lessonRef !== `${shared.id}@v${shared.version}`)
          ctx.addIssue({
            code: "custom",
            path: ["attempts", index, "lessonRef"],
            message: "Mã học liệu phải gồm đúng mã bài và phiên bản.",
          });
        checkAttemptAgainstLesson(
          attempt,
          shared,
          (path, message) => ctx.addIssue({ code: "custom", path, message }),
          ["attempts", index],
        );
      });
    }),
  );
export type Profile = z.infer<typeof profileSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type StudyState = z.infer<typeof stateSchema>;
export type ExamSession = z.infer<typeof examSchema>;

export const DEFAULT_LEARNER_NAME = "Gùa";

export function personalizeLegacyState(state: StudyState): StudyState {
  let changed = false;
  const profile =
    state.profile.name === "bạn" && !state.profile.onboarded
      ? ((changed = true), { ...state.profile, name: DEFAULT_LEARNER_NAME })
      : state.profile;
  // Upgrading legacy history is also where an existing history gets compacted:
  // a copy already carried on an attempt moves into the shared library, so a
  // learner who has been studying for months stops paying for the same lesson
  // over and over. The content is identical, keyed by its own version.
  const library = { ...state.library };
  const fileIn = (lesson: Lesson) => {
    const key = libraryKey(lesson.id, lesson.version);
    if (!library[key]) library[key] = structuredClone(lesson);
    return key;
  };
  const attempts = state.attempts.map((attempt) => {
    if (attempt.lessonSnapshot) {
      changed = true;
      const { lessonSnapshot, ...rest } = attempt;
      return { ...rest, lessonRef: fileIn(lessonSnapshot) };
    }
    if (attempt.lessonRef) return attempt;
    const lesson = allLessons.find(
      (candidate) =>
        candidate.id === attempt.lessonId && candidate.skill === attempt.skill,
    );
    if (!lesson || lesson.questions.length !== attempt.total) return attempt;
    const questions = new Map(
      lesson.questions.map((question) => [question.id, question]),
    );
    if (
      Object.entries(attempt.answers).some(
        ([id, answer]) =>
          !questions.has(id) || answer >= questions.get(id)!.options.length,
      ) ||
      Object.keys(attempt.confidence ?? {}).some((id) => !questions.has(id)) ||
      scoreQuestionSet(lesson.questions, attempt.answers).correct !==
        attempt.correct
    )
      return attempt;
    changed = true;
    return { ...attempt, lessonRef: fileIn(lesson) };
  });
  let exam = state.exam;
  if (exam && (!exam.lessonSnapshots || !exam.stagePlan)) {
    const stagePlan =
      exam.stagePlan ?? structuredClone(getExamStages(exam.mode));
    const existing = new Map(
      (exam.lessonSnapshots ?? []).map((lesson) => [lesson.id, lesson]),
    );
    for (const id of new Set(stagePlan.flatMap((stage) => stage.lessonIds))) {
      if (existing.has(id)) continue;
      const lesson = allLessons.find((candidate) => candidate.id === id);
      if (lesson) existing.set(id, structuredClone(lesson));
    }
    const complete = stagePlan.every((stage) =>
      stage.lessonIds.every((id) => existing.get(id)?.skill === stage.skill),
    );
    if (complete) {
      changed = true;
      exam = {
        ...exam,
        stagePlan,
        lessonSnapshots: [...existing.values()],
      };
    }
  }
  return changed ? { ...state, profile, attempts, library, exam } : state;
}

export function freshState(): StudyState {
  return {
    version: 1,
    profile: {
      name: DEFAULT_LEARNER_NAME,
      target: "B2",
      level: "starting",
      examDate: "",
      dailyMinutes: 30,
      interests: ["Cuộc sống Sài Gòn", "Giáo dục"],
      focus: "listening",
      onboarded: false,
    },
    attempts: [],
    reviews: {},
    mistakeReviews: {},
    drafts: {},
    mood: {},
    savedWords: {},
    exam: null,
    updatedAt: new Date().toISOString(),
  };
}
export function localDay(date: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
export function dayOffset(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return localDay(date);
}
export function streak(attempts: Attempt[], now = new Date()): number {
  const days = new Set(attempts.map((a) => localDay(a.date)));
  let day = localDay(now);
  if (!days.has(day)) day = dayOffset(day, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = dayOffset(day, -1);
  }
  return count;
}
export function daysUntil(date: string, now = new Date()) {
  if (!date) return null;
  return Math.ceil(
    (Date.parse(`${date}T00:00:00+07:00`) -
      Date.parse(`${localDay(now)}T00:00:00+07:00`)) /
      86400000,
  );
}
export function wordCount(text: string) {
  return (
    text.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  );
}
export function scheduleReview(
  previous: Review | undefined,
  quality: "again" | "hard" | "good" | "easy",
  now = new Date(),
): Review {
  const ease = Math.max(
    1.3,
    Math.min(
      3,
      (previous?.ease ?? 2.5) +
        (quality === "again"
          ? -0.2
          : quality === "hard"
            ? -0.15
            : quality === "easy"
              ? 0.15
              : 0),
    ),
  );
  const repetitions =
    quality === "again" ? 0 : (previous?.repetitions ?? 0) + 1;
  const interval =
    quality === "again"
      ? 10 / 1440
      : quality === "hard"
        ? 1
        : repetitions === 1
          ? quality === "easy"
            ? 4
            : 1
          : repetitions === 2
            ? quality === "easy"
              ? 8
              : 3
            : Math.min(
                365,
                Math.max(
                  1,
                  Math.round(
                    (previous?.interval ?? 1) *
                      ease *
                      (quality === "easy" ? 1.3 : 1),
                  ),
                ),
              );
  return {
    due: new Date(now.getTime() + interval * 86400000).toISOString(),
    interval,
    ease,
    repetitions,
    lastDate: localDay(now),
  };
}
/**
 * How many recent questions the accuracy figure is measured over. Counting
 * attempts instead would let one exam decide everything: a full Listening
 * section files fourteen separate attempts, so the five newest would all come
 * from the last few minutes of that one sitting.
 */
const ACCURACY_QUESTION_WINDOW = 30;
/** The key a lesson version is stored under in the shared library. */
export function libraryKey(lessonId: string, version: number) {
  return `${lessonId}@v${version}`;
}
/**
 * The material an attempt was actually worked on.
 *
 * Three places it can live, in order: a copy carried on the attempt itself
 * (how every attempt was stored before the shared library), the library entry
 * the attempt points at, and finally today's content — which is only right
 * when the lesson has not been rewritten since, and is what the snapshot
 * exists to avoid relying on.
 */
export function attemptLesson(
  state: { library?: Record<string, Lesson> },
  attempt: { lessonId: string; lessonSnapshot?: Lesson; lessonRef?: string },
): Lesson | undefined {
  return (
    attempt.lessonSnapshot ??
    (attempt.lessonRef ? state.library?.[attempt.lessonRef] : undefined) ??
    allLessons.find((candidate) => candidate.id === attempt.lessonId)
  );
}
/** A lesson the learner has already met is the same material until it changes. */
function lessonVersionKey(attempt: Attempt) {
  // The ref already carries the version; an attempt with neither ref nor
  // snapshot predates both and keeps its old key of `@v0`.
  if (attempt.lessonRef) return attempt.lessonRef;
  return libraryKey(attempt.lessonId, attempt.lessonSnapshot?.version ?? 0);
}
/**
 * The attempts that measure ability: the first meeting with each lesson
 * version. Doing a lesson again once the answers are known says something
 * about effort, not about reading or listening, so the two are counted apart —
 * otherwise repeating an old lesson raises the figure that decides what the
 * learner is given next, and a weak skill quietly stops being prioritised.
 */
export function firstAttempts(attempts: Attempt[]): Attempt[] {
  const met = new Set<string>();
  return [...attempts]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .filter((attempt) => {
      const key = lessonVersionKey(attempt);
      if (met.has(key)) return false;
      met.add(key);
      return true;
    });
}
/** Newest attempts until the question window is full; never half a lesson. */
function recentQuestions(scored: Attempt[]) {
  const relevant: Attempt[] = [];
  let questions = 0;
  for (const attempt of [...scored].reverse()) {
    if (questions >= ACCURACY_QUESTION_WINDOW) break;
    relevant.push(attempt);
    questions += attempt.total;
  }
  const total = relevant.reduce((sum, a) => sum + a.total, 0);
  return total
    ? Math.round(
        (relevant.reduce((sum, a) => sum + a.correct, 0) / total) * 100,
      )
    : null;
}
export function skillStats(state: StudyState, skill: Skill) {
  const mine = state.attempts.filter((a) => a.skill === skill);
  const firstIds = new Set(firstAttempts(state.attempts).map((a) => a.id));
  const first = mine.filter((a) => firstIds.has(a.id));
  const again = mine.filter((a) => !firstIds.has(a.id));
  return {
    count: mine.length,
    /** Measured on first meetings only: this is the number that means ability. */
    accuracy: recentQuestions(first.filter((a) => a.total > 0)),
    firstCount: first.length,
    /** Repeat work, kept separate so effort never reads as progress. */
    practiceCount: again.length,
    practiceAccuracy: recentQuestions(again.filter((a) => a.total > 0)),
  };
}
/**
 * How each kind of question is going, measured on first meetings only. "Weak
 * at Reading" is not something a learner can act on; "weak at vocabulary in
 * context" is, and since every question carries a type this is already in the
 * data — it was simply never read.
 */
export function questionTypeStats(state: StudyState) {
  const firstIds = new Set(firstAttempts(state.attempts).map((a) => a.id));
  const stats = new Map<
    string,
    { tag: string; asked: number; wrong: number; confidentWrong: number }
  >();
  for (const attempt of state.attempts) {
    if (!firstIds.has(attempt.id)) continue;
    const lesson = attemptLesson(state, attempt);
    if (!lesson) continue;
    for (const question of lesson.questions) {
      const answer = attempt.answers[question.id];
      // A blank says nothing about the type; it usually means time ran out.
      if (answer === undefined) continue;
      const entry = stats.get(question.tag) ?? {
        tag: question.tag,
        asked: 0,
        wrong: 0,
        confidentWrong: 0,
      };
      entry.asked += 1;
      if (answer !== question.answer) {
        entry.wrong += 1;
        if (attempt.confidence?.[question.id] === "sure")
          entry.confidentWrong += 1;
      }
      stats.set(question.tag, entry);
    }
  }
  return [...stats.values()].sort((a, b) => b.asked - a.asked);
}
/** Enough questions of a type before its error rate means anything. */
export const TYPE_EVIDENCE_MINIMUM = 3;
/** Question types going wrong often enough to steer what is offered next. */
export function weakQuestionTypes(state: StudyState) {
  return questionTypeStats(state)
    .filter((item) => item.asked >= TYPE_EVIDENCE_MINIMUM && item.wrong > 0)
    .map((item) => ({ ...item, ratio: item.wrong / item.asked }))
    .sort((a, b) => b.ratio - a.ratio || b.confidentWrong - a.confidentWrong);
}
/**
 * A lesson worth opening to practise one kind of question. Prefers material
 * she has not met, so "luyện dạng này" does not send her back through answers
 * she already knows.
 */
export function lessonForType(state: StudyState, tag: string) {
  const carrying = lessons.filter((lesson) =>
    lesson.questions.some((question) => question.tag === tag),
  );
  const met = new Set(state.attempts.map((attempt) => attempt.lessonId));
  const count = (lesson: (typeof lessons)[number]) =>
    lesson.questions.filter((question) => question.tag === tag).length;
  return (
    carrying.find((lesson) => !met.has(lesson.id)) ??
    [...carrying].sort((a, b) => count(b) - count(a))[0]
  );
}
/**
 * The exam date turned into something to do this week.
 *
 * Before this, `examDate` did one thing: add twelve points to B2 lessons when
 * the exam was thirty days away or closer. That is almost nothing, and it said
 * the same thing on day 30 as on day 2. The weeks before an exam are not
 * interchangeable: there is a stretch for building the base, a stretch for
 * drilling the question types that are actually going wrong, and a last two
 * weeks that should look like the exam itself.
 *
 * Every line this returns is built from the learner's own data. When there is
 * no exam date it returns null and the interface says so plainly rather than
 * inventing a deadline.
 */
export const EXAM_REHEARSAL_DAYS = 14;
export const EXAM_DRILL_DAYS = 42;
export type ExamWeekPlan = {
  days: number;
  weeks: number;
  key: "foundation" | "weak-types" | "rehearsal" | "exam-day";
  title: string;
  focus: string;
  thisWeek: string[];
};
export function examWeekPlan(
  state: StudyState,
  now = new Date(),
): ExamWeekPlan | null {
  const days = daysUntil(state.profile.examDate, now);
  if (days === null || days < 0) return null;
  const weeks = Math.ceil(days / 7);
  const met = new Set(state.attempts.map((attempt) => attempt.lessonId));
  const unseen = lessons.filter((lesson) => !met.has(lesson.id)).length;
  const dueWords = openVocabulary(state).filter((word) => {
    const review = state.reviews[word.id];
    return !review || Date.parse(review.due) <= now.getTime();
  }).length;
  const dueMistakes = mistakes(state, now).filter((item) => item.due).length;
  const weak = weakQuestionTypes(state).slice(0, 2);
  const satExam = state.attempts.some((attempt) =>
    attempt.id.startsWith("exam:"),
  );
  const minutes = state.profile.dailyMinutes;
  const thisWeek: string[] = [];
  const key =
    days === 0
      ? "exam-day"
      : days <= EXAM_REHEARSAL_DAYS
        ? "rehearsal"
        : days <= EXAM_DRILL_DAYS
          ? "weak-types"
          : "foundation";
  if (key === "exam-day") {
    // Telling someone to sit a full mock on the morning of the exam is worse
    // than saying nothing. The honest advice for today is short.
    thisWeek.push(
      "Hôm nay là ngày thi — không có bài nào ở đây quan trọng hơn việc giữ sức.",
    );
    thisWeek.push(
      "Thi xong, đặt mốc mới trong Cài đặt hoặc quay lại nhịp học bình thường.",
    );
  } else if (key === "foundation") {
    thisWeek.push(
      unseen
        ? `Học ${Math.min(unseen, 5)} bài chưa gặp trong thư viện (còn ${unseen} bài)`
        : `Giữ nhịp ${minutes} phút mỗi ngày và ôn lại bài đã học`,
    );
    if (dueWords) thisWeek.push(`Ôn ${dueWords} thẻ từ đã đến hạn`);
    if (!satExam) thisWeek.push("Thử một đề rút gọn để biết nhịp làm bài");
  } else if (key === "weak-types") {
    if (weak.length)
      for (const type of weak)
        thisWeek.push(
          `Luyện dạng “${type.tag}”: đang sai ${type.wrong}/${type.asked} câu đã làm`,
        );
    else
      thisWeek.push(
        "Chưa đủ dữ liệu để chỉ ra dạng câu yếu — làm thêm một bài Đọc và một bài Nghe",
      );
    if (dueMistakes) thisWeek.push(`Sửa ${dueMistakes} lỗi đã đến lịch ôn`);
    if (!satExam)
      thisWeek.push("Làm một đề đủ cấu trúc trước khi vào hai tuần cuối");
  } else {
    thisWeek.push("Làm đề đủ cấu trúc đúng giờ, ít nhất một lần trong tuần");
    if (dueMistakes) thisWeek.push(`Ôn ${dueMistakes} câu sai đã đến hạn`);
    thisWeek.push(`Giữ nhịp ${minutes} phút mỗi ngày, không mở thêm dạng mới`);
  }
  const title =
    key === "exam-day"
      ? "Hôm nay là ngày thi"
      : key === "foundation"
        ? "Giai đoạn xây nền"
        : key === "weak-types"
          ? "Giai đoạn luyện dạng đang sai"
          : "Hai tuần cuối: tập nhịp thi";
  const focus =
    key === "exam-day"
      ? `Những gì làm được thì đã làm rồi. Chúc ${state.profile.name} một buổi thi nhẹ nhàng.`
      : key === "foundation"
        ? `Còn ${days} ngày, khoảng ${weeks} tuần. Đủ thời gian để đi hết thư viện trước khi luyện sâu.`
        : key === "weak-types"
          ? `Còn ${days} ngày. Đây là lúc luyện đúng dạng câu đang sai thay vì học dàn đều.`
          : `Còn ${days} ngày. Việc chính bây giờ là quen nhịp đề và giữ sức, không học thêm dạng mới.`;
  return { days, weeks, key, title, focus, thisWeek };
}
/**
 * Milestones that actually happened.
 *
 * Every entry here traces back to a specific attempt, review or date in the
 * learner's own history, and carries the evidence with it. When nothing has
 * happened yet this returns an empty list and the interface shows nothing:
 * a congratulation for an achievement that was not earned is worse than
 * silence, because it teaches her not to believe the next one.
 */
export const STREAK_MILESTONE_DAYS = 3;
export const LONG_MEMORY_DAYS = 60;
export type Milestone = {
  id: string;
  title: string;
  detail: string;
  date: string;
};
export function milestones(state: StudyState, now = new Date()): Milestone[] {
  const found: Milestone[] = [];
  const history = [...state.attempts].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  const days = streak(state.attempts, now);
  const last = history.at(-1);
  if (days >= STREAK_MILESTONE_DAYS && last)
    found.push({
      id: `streak:${days}`,
      title: `${days} ngày liên tiếp có mặt`,
      detail: `Buổi gần nhất: ${localDay(last.date)}.`,
      date: last.date,
    });
  const firstExam = history.find((attempt) => attempt.id.startsWith("exam:"));
  if (firstExam)
    found.push({
      id: "exam:first",
      title: "Đã hoàn thành một đề có giờ",
      detail: `Lần đầu vào phòng thi thử: ${localDay(firstExam.date)}.`,
      date: firstExam.date,
    });
  // A question type she used to get wrong and then answered without a single
  // mistake. Both halves have to be real: the earlier error and the clean run.
  const wrongBefore = new Set<string>();
  const cleaned = new Map<string, Milestone>();
  for (const attempt of history) {
    const lesson = attemptLesson(state, attempt);
    if (!lesson) continue;
    const seen = new Map<string, { asked: number; wrong: number }>();
    for (const question of lesson.questions) {
      const answer = attempt.answers[question.id];
      if (answer === undefined) continue;
      const entry = seen.get(question.tag) ?? { asked: 0, wrong: 0 };
      entry.asked += 1;
      if (answer !== question.answer) entry.wrong += 1;
      seen.set(question.tag, entry);
    }
    for (const [tag, entry] of seen) {
      if (
        entry.wrong === 0 &&
        entry.asked >= TYPE_EVIDENCE_MINIMUM &&
        wrongBefore.has(tag) &&
        !cleaned.has(tag)
      )
        cleaned.set(tag, {
          id: `type:${tag}`,
          title: `Lần đầu đúng trọn dạng “${tag}”`,
          detail: `${entry.asked}/${entry.asked} câu trong bài “${lesson.title}”, ngày ${localDay(attempt.date)}.`,
          date: attempt.date,
        });
      if (entry.wrong > 0) wrongBefore.add(tag);
    }
  }
  found.push(...cleaned.values());
  for (const word of vocabulary) {
    const review = state.reviews[word.id];
    if (!review || review.interval < LONG_MEMORY_DAYS) continue;
    found.push({
      id: `word:${word.id}`,
      title: `Từ “${word.word}” đã nhớ qua mốc ${LONG_MEMORY_DAYS} ngày`,
      detail: `Lần ôn gần nhất ${review.lastDate}, hẹn lại sau ${Math.round(review.interval)} ngày.`,
      date: `${review.lastDate}T12:00:00+07:00`,
    });
  }
  return found.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
/**
 * A ten-minute session for a day with no time in it.
 *
 * "Hơi mệt" used to do one thing: drop the budget to fifteen minutes and then
 * serve the same standard lessons, the shortest of which is six minutes and
 * most of which are eight or ten. There was no shape of session shorter than a
 * lesson, so a tired day became an all-or-nothing choice. This is the smaller
 * shape: one short listening or reading text, up to three vocabulary cards
 * already due, and one mistake already due. Everything in it is an existing
 * flow, so the session lands in the history exactly like any other.
 */
export const QUICK_SESSION_MINUTES = 10;
/** Longest lesson that still leaves room for the cards and the mistake. */
const QUICK_LESSON_MINUTES = 8;
export type QuickSession = {
  lesson: (typeof lessons)[number];
  words: typeof vocabulary;
  mistake: ReturnType<typeof mistakes>[number] | undefined;
};
export function quickSession(
  state: StudyState,
  now = new Date(),
): QuickSession | null {
  const met = new Map<string, string>();
  for (const attempt of state.attempts)
    if (!met.has(attempt.lessonId) || met.get(attempt.lessonId)! < attempt.date)
      met.set(attempt.lessonId, attempt.date);
  const short = lessons.filter(
    (lesson) =>
      lesson.minutes <= QUICK_LESSON_MINUTES &&
      (lesson.skill === "listening" || lesson.skill === "reading"),
  );
  if (!short.length) return null;
  // Listening first, as the plan says; an unseen lesson before a repeat; then
  // whichever has been left alone longest.
  const lesson =
    [...short].sort((a, b) => {
      const rank = (item: (typeof short)[number]) =>
        (item.skill === "listening" ? 0 : 1) * 2 + (met.has(item.id) ? 1 : 0);
      return (
        rank(a) - rank(b) ||
        Date.parse(met.get(a.id) ?? "1970-01-01T00:00:00Z") -
          Date.parse(met.get(b.id) ?? "1970-01-01T00:00:00Z")
      );
    })[0] ?? null;
  if (!lesson) return null;
  const words = openVocabulary(state)
    .filter((word) => {
      const review = state.reviews[word.id];
      return !review || Date.parse(review.due) <= now.getTime();
    })
    .slice(0, 3);
  const mistake = mistakes(state, now)
    .filter((item) => item.due)
    .sort((a, b) => b.wrongCount - a.wrongCount)[0];
  return { lesson, words, mistake };
}
/**
 * The word cards she added herself, shaped like the authored deck so the
 * review screen does not need to know the difference. The card text lives in
 * content; state stores only which question it came from and when it was
 * added, so a card can be corrected later without rewriting her history.
 */
export type SavedWord = {
  id: string;
  questionId: string;
  word: string;
  ipa: string;
  meaning: string;
  example: string;
  topic: string;
  addedAt: string;
};
export function savedWords(state: StudyState): SavedWord[] {
  return Object.entries(state.savedWords ?? {})
    .filter(([questionId]) => wordCards[questionId])
    .map(([questionId, saved]) => ({
      id: `${SAVED_WORD_PREFIX}${questionId}`,
      questionId,
      ...wordCards[questionId],
      addedAt: saved.addedAt,
    }))
    .sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt));
}
/** A card exists for this question only if one was written for it. */
export function wordCardFor(questionId: string) {
  return wordCards[questionId];
}
export function addSavedWord(
  state: StudyState,
  questionId: string,
  now = new Date(),
): StudyState {
  if (!wordCards[questionId] || state.savedWords?.[questionId]) return state;
  return {
    ...state,
    savedWords: {
      ...state.savedWords,
      [questionId]: { addedAt: now.toISOString() },
    },
  };
}
export function removeSavedWord(
  state: StudyState,
  questionId: string,
): StudyState {
  if (!state.savedWords?.[questionId]) return state;
  const rest = { ...state.savedWords };
  delete rest[questionId];
  // The review schedule goes with it: keeping it would quietly resurrect the
  // card's history if she ever adds the same word again.
  const reviews = { ...state.reviews };
  delete reviews[`${SAVED_WORD_PREFIX}${questionId}`];
  return { ...state, savedWords: rest, reviews };
}
/**
 * Sittings of the timed room, and what can honestly be compared between them.
 *
 * Two independent papers exist so that a mock at the start of a course and a
 * mock at the end mean something. Nothing read that data: the history listed
 * each part of each sitting on its own row. This groups the rows back into the
 * sitting they came from, and — this is the part that matters — refuses to
 * call a repeat of the same paper a measure of progress, because the second
 * time round the learner is partly remembering.
 */
export type Sitting = {
  /** The exam id every attempt of the sitting shares. */
  id: string;
  paper: "mini" | "full" | "full2";
  date: string;
  listening: { correct: number; total: number };
  reading: { correct: number; total: number };
  /** Pieces of writing and speaking parts filed, which are not marked. */
  writing: number;
  speaking: number;
  minutes: number;
};
export const paperNames: Record<Sitting["paper"], string> = {
  mini: "Buổi rút gọn",
  full: "Đề đủ cấu trúc 01",
  full2: "Đề đủ cấu trúc 02",
};
export function examSittings(state: StudyState): Sitting[] {
  const groups = new Map<string, Attempt[]>();
  for (const attempt of state.attempts) {
    if (!attempt.id.startsWith("exam:")) continue;
    const id = attempt.id.split(":")[1];
    if (!id) continue;
    groups.set(id, [...(groups.get(id) ?? []), attempt]);
  }
  return [...groups.entries()]
    .map(([id, attempts]) => {
      const score = (skill: Skill) =>
        attempts
          .filter((attempt) => attempt.skill === skill)
          .reduce(
            (sum, attempt) => ({
              correct: sum.correct + attempt.correct,
              total: sum.total + attempt.total,
            }),
            { correct: 0, total: 0 },
          );
      const paper: Sitting["paper"] = attempts.some((attempt) =>
        attempt.lessonId.startsWith("exam2-"),
      )
        ? "full2"
        : attempts.some((attempt) => attempt.lessonId.startsWith("full-"))
          ? "full"
          : "mini";
      return {
        id,
        paper,
        date: attempts
          .map((attempt) => attempt.date)
          .sort()
          .at(0)!,
        listening: score("listening"),
        reading: score("reading"),
        writing: attempts.filter((attempt) => attempt.skill === "writing")
          .length,
        speaking: attempts.filter((attempt) => attempt.skill === "speaking")
          .length,
        minutes: Math.round(
          attempts.reduce((sum, attempt) => sum + attempt.seconds, 0) / 60,
        ),
      };
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export type SittingComparison = {
  before: Sitting;
  after: Sitting;
  /** Percentage points, positive means better in the later sitting. */
  listening: number | null;
  reading: number | null;
  /** False when both sittings used the same paper. */
  comparable: boolean;
};
/** The two most recent full-length sittings, if there are two. */
export function compareSittings(state: StudyState): SittingComparison | null {
  const full = examSittings(state).filter(
    (sitting) => sitting.paper !== "mini",
  );
  if (full.length < 2) return null;
  const [before, after] = full.slice(-2);
  const shift = (key: "listening" | "reading") => {
    if (!before[key].total || !after[key].total) return null;
    return Math.round(
      (after[key].correct / after[key].total -
        before[key].correct / before[key].total) *
        100,
    );
  };
  return {
    before,
    after,
    listening: shift("listening"),
    reading: shift("reading"),
    // The same paper twice measures memory as much as ability, and saying so
    // is the difference between a measurement and a flattering number.
    comparable: before.paper !== after.paper,
  };
}
/**
 * The cards she can meet today.
 *
 * Most cards now quote a sentence from a particular lesson. Showing such a
 * card before she has read that lesson turns a remembered sentence back into
 * an isolated word, so a sourced card waits until its lesson has been worked
 * at least once. The twenty cards written before this have no source and are
 * always in the deck.
 */
export function openVocabulary(state: StudyState): Vocabulary[] {
  const met = new Set(state.attempts.map((attempt) => attempt.lessonId));
  return vocabulary.filter((word) => !word.source || met.has(word.source));
}
/**
 * One concrete thing to do about a question just got wrong.
 *
 * The review loop explains the answer well, and then stops: "you were wrong,
 * here is why" leaves the learner to invent her own next move at exactly the
 * moment she is least sure what it should be. This picks a single step out of
 * her own history — never a generic encouragement — and the interface shows
 * it under the wrong answer.
 *
 * Nothing here invents evidence: the type line only appears once the same
 * question type has gone wrong at least twice, which is the same honesty rule
 * the weak-type diagnosis uses.
 */
export type NextStep = { text: string; href: string; label: string };
export const TYPE_STEP_MINIMUM = 2;
export function nextStep(
  state: StudyState,
  question: Question,
  lessonId: string,
  confidence?: Confidence,
): NextStep {
  const stat = questionTypeStats(state).find(
    (entry) => entry.tag === question.tag,
  );
  if (stat && stat.wrong >= TYPE_STEP_MINIMUM) {
    const lesson = lessonForType(state, question.tag);
    const carries = lesson?.questions.filter(
      (item) => item.tag === question.tag,
    ).length;
    if (lesson && lesson.id !== lessonId && carries)
      return {
        text: `Dạng “${question.tag}” đang sai ${stat.wrong}/${stat.asked} câu đã làm. Bài “${lesson.title}” có ${carries} câu cùng dạng.`,
        href: `/practice/${lesson.id}`,
        label: "Luyện dạng này",
      };
  }
  if (confidence === "sure")
    return {
      text: `${state.profile.name} đã chọn “Rất chắc” mà vẫn sai, nên đây là chỗ hiểu lệch chứ không phải lỡ tay. Sổ lỗi hẹn lại câu này sớm hơn.`,
      href: "/mistakes",
      label: "Mở Sổ lỗi",
    };
  return {
    text: "Câu này đã vào Sổ lỗi và sẽ quay lại theo lịch ôn; làm lại đúng thì nó rời sổ.",
    href: "/mistakes",
    label: "Mở Sổ lỗi",
  };
}
/** Days a lesson too long for the daily budget waits before being offered. */
const LONG_SESSION_REST_DAYS = 14;
/**
 * The one bigger thing worth doing next, when the daily plan is no longer the
 * whole answer.
 *
 * The library is finite: measured at 42 lessons, a learner working three a day
 * has met every one of them inside six weeks. After that the plan keeps
 * offering sensible repeats and says nothing about the two full-length papers,
 * which are the most valuable material the app has left — and the only way to
 * measure progress against something she has not already seen. This says it,
 * once, from counts rather than encouragement.
 */
export type BigStep = { text: string; href: string; label: string };
export function whatsNext(state: StudyState): BigStep | null {
  const met = new Set(state.attempts.map((attempt) => attempt.lessonId));
  const unseen = lessons.filter((lesson) => !met.has(lesson.id)).length;
  if (unseen > 0) return null;
  const papers = new Set(
    examSittings(state)
      .filter((sitting) => sitting.paper !== "mini")
      .map((sitting) => sitting.paper),
  );
  if (!papers.size)
    return {
      text: `${state.profile.name} đã học hết ${lessons.length} bài trong thư viện. Một đề đủ cấu trúc đo được nhịp làm bài trên ngữ liệu chưa từng gặp.`,
      href: "/exam",
      label: "Vào phòng thi",
    };
  if (papers.size === 1)
    return {
      text: `Còn một đề đủ cấu trúc chưa làm. Hai đề khác ngữ liệu nên chênh lệch giữa chúng mới nói được điều gì đó về năng lực.`,
      href: "/exam",
      label: "Làm đề còn lại",
    };
  return null;
}
/** Points taken off a lesson worked yesterday, so a skill is not pinned. */
export const REPEAT_DAY_PENALTY = 80;
/** Minutes that must be left over before the plan offers a further lesson. */
export const PLAN_EXTRA_MINUTES = 12;
/** Lessons a single day is allowed to hold, however large the budget. */
export const PLAN_MAX_LESSONS = 6;
export function todayPlan(state: StudyState, now = new Date()) {
  const today = localDay(now);
  // Keep today's plan stable while completed lessons gain checkmarks.
  // Yesterday's performance informs the next day's choices.
  const history = {
    ...state,
    attempts: state.attempts.filter((a) => localDay(a.date) < today),
  };
  const mood = state.mood[today];
  const budget =
    mood === "low"
      ? Math.min(15, state.profile.dailyMinutes)
      : state.profile.dailyMinutes;
  const examDays = daysUntil(state.profile.examDate, now);
  // Yesterday's data decides today's phase too, for the same reason the rest
  // of the plan uses `history`: today's plan should not move while she works.
  const phase = examWeekPlan(history, now);
  const dueMistakes = mistakes(history, now).filter((item) => item.due);
  // What she worked yesterday. A learner answering badly used to be handed the
  // same Reading lesson six days running: due mistakes pile up in the lesson
  // she just got wrong, and the bonus for them outweighed everything else, so
  // ten other Reading lessons stayed unreachable exactly while she needed a
  // second angle on the same skill.
  const recentDays = [dayOffset(today, -1), dayOffset(today, -2)];
  const yesterday = new Set(
    history.attempts
      .filter((attempt) => recentDays.includes(localDay(attempt.date)))
      .map((attempt) => attempt.lessonId),
  );
  // The two kinds of question going wrong most often. Naming the type is what
  // makes the plan actionable: "weak at Reading" is not something to practise.
  const weakTypes = weakQuestionTypes(history).slice(0, 2);
  const ranked = lessons
    .map((lesson) => {
      const done = history.attempts.filter((a) => a.lessonId === lesson.id);
      const stat = skillStats(history, lesson.skill);
      const lastAttempt = done.at(-1);
      const recencyGap = lastAttempt
        ? Math.max(
            0,
            Math.floor(
              (Date.parse(`${today}T12:00:00+07:00`) -
                Date.parse(`${localDay(lastAttempt.date)}T12:00:00+07:00`)) /
                86400000,
            ),
          )
        : null;
      const dueForLesson = dueMistakes.filter(
        (item) => item.lesson.id === lesson.id,
      );
      const confidentErrors = dueForLesson.filter(
        (item) => item.confidence === "sure",
      ).length;
      // The phase decides what the last weeks are for; a flat "30 days left"
      // said the same thing on day 30 as on day 2.
      const rehearsing = phase?.key === "rehearsal";
      const drilling = phase?.key === "weak-types";
      // How much of this lesson trains a type she is getting wrong.
      const weakHere = weakTypes
        .map((type) => ({
          ...type,
          questions: lesson.questions.filter((q) => q.tag === type.tag).length,
        }))
        .filter((type) => type.questions > 0)
        .sort((a, b) => b.ratio - a.ratio)[0];
      const score =
        (done.length === 0 ? 60 : 0) +
        (lesson.skill === state.profile.focus ? 20 : 0) +
        (state.profile.interests.includes(lesson.topic) ? 8 : 0) +
        (stat.accuracy !== null && stat.accuracy < 65 ? 15 : 0) +
        Math.min(100, dueForLesson.length * 45) +
        // Capped: at 30 a point each, five confident errors in one lesson used
        // to outweigh everything else and pin the plan to that lesson.
        Math.min(45, confidentErrors * 15) +
        (weakHere ? Math.min(24, 8 * weakHere.questions) : 0) +
        (recencyGap !== null ? Math.min(12, Math.floor(recencyGap / 3)) : 0) +
        (rehearsing && lesson.level === "B2" ? 18 : 0) +
        (drilling && weakHere ? 10 : 0) +
        (state.profile.level === "starting" && lesson.level === "B1" ? 10 : 0) -
        // A lesson worked in the last two days steps aside while another
        // lesson of its skill fits today; its mistakes stay due, and the
        // notebook keeps serving those exact questions in the meantime. A
        // confident error is the exception: getting something wrong while
        // certain is the one case worth returning to the next morning.
        (yesterday.has(lesson.id) && !confidentErrors
          ? REPEAT_DAY_PENALTY
          : 0) -
        done.length * 4;
      const reasons: string[] = [];
      if (weakHere)
        reasons.push(
          `${weakHere.tag}: sai ${weakHere.wrong}/${weakHere.asked} câu đã làm`,
        );
      if (confidentErrors)
        reasons.push(
          `${confidentErrors} câu sai dù đã chọn “Rất chắc” cần sửa ngay`,
        );
      else if (dueForLesson.length)
        reasons.push(`${dueForLesson.length} lỗi đã đến lịch ôn`);
      if (stat.accuracy !== null && stat.accuracy < 65)
        reasons.push(`Độ chính xác ${stat.accuracy}% đang cần củng cố`);
      if (lesson.skill === state.profile.focus)
        reasons.push(`Đúng kỹ năng ${state.profile.name} đang ưu tiên`);
      if (rehearsing && lesson.level === "B2")
        reasons.push(`Còn ${examDays} ngày: hai tuần cuối ưu tiên mức B2`);
      if (drilling && weakHere && reasons.length < 2)
        reasons.push(`Còn ${examDays} ngày: giai đoạn luyện dạng đang sai`);
      if (reasons.length < 2 && state.profile.interests.includes(lesson.topic))
        reasons.push(`Chủ đề hợp sở thích: ${lesson.topic}`);
      if (reasons.length < 2 && recencyGap !== null && recencyGap >= 7)
        reasons.push(`Đã ${recencyGap} ngày chưa quay lại bài này`);
      if (reasons.length < 2 && done.length === 0)
        reasons.push("Bài mới để mở rộng kỹ năng");
      if (mood === "low" && reasons.length < 2)
        reasons.push(`Vừa nhịp học nhẹ ${budget} phút hôm nay`);
      return {
        lesson,
        score,
        recencyGap,
        done: done.length,
        reasons: reasons.slice(0, 2),
      };
    })
    .sort((a, b) => b.score - a.score);
  // A lesson longer than the whole budget can never satisfy `minutes <=
  // remaining`, so the 40-minute essay was never offered once at the default
  // 30 minutes a day — and it is one of the exam's two Writing tasks. It is
  // offered as a split session instead: today the plan or a first draft, the
  // rest tomorrow, once half of it fits and it has been left alone a while.
  const split = (lesson: (typeof lessons)[number], recencyGap: number | null) =>
    lesson.minutes > budget &&
    (recencyGap === null || recencyGap >= LONG_SESSION_REST_DAYS);
  const picked: typeof ranked = [];
  const longer: string[] = [];
  let remaining = budget;
  // One slot always goes to material she has not met, while any is left. A
  // learner who keeps answering wrong used to be served the same two lessons
  // for a fortnight: the due-mistake bonus outweighed everything else, so the
  // rest of the library became unreachable exactly when she needed variety.
  const unseen = ranked.find(
    (item) => item.done === 0 && item.lesson.minutes <= remaining,
  );
  if (unseen) {
    picked.push(unseen);
    remaining -= unseen.lesson.minutes;
  }
  for (const item of ranked) {
    if (picked.includes(item)) continue;
    const { lesson } = item;
    const asSplit =
      split(lesson, item.recencyGap) &&
      remaining >= Math.round(lesson.minutes / 2);
    if (
      (lesson.minutes <= remaining || asSplit) &&
      picked.length < 3 &&
      !picked.some((entry) => entry.lesson.skill === lesson.skill)
    ) {
      if (asSplit) {
        longer.push(lesson.id);
        picked.push({
          ...item,
          reasons: [
            `Bài dài ${lesson.minutes} phút — hôm nay có thể chỉ làm một phần`,
            ...item.reasons,
          ].slice(0, 2),
        });
      } else picked.push(item);
      // A split session only spends today's half of the budget.
      remaining -= asSplit ? Math.round(lesson.minutes / 2) : lesson.minutes;
    }
  }
  // Second pass: spend what is left. The plan used to stop at three lessons
  // with one skill each, so a learner who set aside an hour was handed about
  // half of it — measured at 497 of 840 minutes across a fortnight of
  // 60-minute days. A skill may now repeat, but only with a different lesson
  // and only while a whole lesson still fits, so a short day is untouched.
  // A skill with no lesson yet today comes before a second helping of one
  // that already has one.
  const order = [
    ranked.filter(
      (item) =>
        !picked.some((entry) => entry.lesson.skill === item.lesson.skill),
    ),
    ranked,
  ].flat();
  if (remaining >= PLAN_EXTRA_MINUTES) {
    for (const item of order) {
      if (remaining < PLAN_EXTRA_MINUTES) break;
      if (picked.length >= PLAN_MAX_LESSONS) break;
      if (picked.some((entry) => entry.lesson.id === item.lesson.id)) continue;
      if (item.lesson.minutes > remaining) continue;
      // Two lessons of one skill in a day is plenty; a third would crowd out
      // the skills she has not touched.
      if (
        picked.filter((entry) => entry.lesson.skill === item.lesson.skill)
          .length >= 2
      )
        continue;
      picked.push({
        ...item,
        reasons: [
          ...item.reasons,
          `Hôm nay còn ${remaining} phút trong ngân sách`,
        ].slice(0, 2),
      });
      remaining -= item.lesson.minutes;
    }
  }
  if (!picked.length) picked.push(ranked[0]);
  return {
    lessons: picked.map((item) => item.lesson),
    reasons: Object.fromEntries(
      picked.map((item) => [item.lesson.id, item.reasons]),
    ) as Record<string, string[]>,
    /** Lessons offered even though they do not fit today's budget. */
    longer,
    budget,
    /** Minutes of the budget the plan did not fill. */
    spare: remaining,
    mood,
    examDays,
    /** Null when no exam date is set: the interface must not invent one. */
    phase,
  };
}
export function mistakes(state: StudyState, now = new Date()) {
  const result = new Map<
    string,
    {
      key: string;
      question: Question;
      lesson: Pick<
        (typeof lessons)[number],
        "id" | "version" | "title" | "skill" | "text"
      >;
      chosen: number | undefined;
      confidence: Confidence | undefined;
      wrongCount: number;
      due: boolean;
      /** The most recent time this question came up, it was answered right. */
      fixed: boolean;
      date: string;
      review: Review | undefined;
    }
  >();
  // Oldest first, so "the last time she met this question" is the last write.
  const history = [...state.attempts].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  for (const a of history) {
    const lesson = attemptLesson(state, a);
    if (!lesson) continue;
    for (const question of lesson.questions) {
      const key = mistakeReviewKey(lesson, question.id);
      const previous = result.get(key);
      if (a.answers[question.id] !== question.answer) {
        const review =
          state.mistakeReviews[key] ??
          (lesson.version === 1
            ? state.mistakeReviews[question.id]
            : undefined);
        result.set(key, {
          key,
          question,
          lesson,
          chosen: a.answers[question.id],
          confidence: a.confidence?.[question.id],
          wrongCount: (previous?.wrongCount ?? 0) + 1,
          due: !review || Date.parse(review.due) <= now.getTime(),
          fixed: false,
          date: a.date,
          review,
        });
        continue;
      }
      // Answered correctly. A card the learner has since got right is not due
      // any more: the notebook used to keep asking for a mistake already
      // corrected, and could only ever grow.
      if (previous) result.set(key, { ...previous, due: false, fixed: true });
    }
  }
  const confidenceWeight: Record<Confidence, number> = {
    guess: 0,
    unsure: 10,
    sure: 25,
  };
  return [...result.values()].sort(
    (a, b) =>
      Number(b.due) - Number(a.due) ||
      confidenceWeight[b.confidence ?? "guess"] +
        b.wrongCount * 4 -
        (confidenceWeight[a.confidence ?? "guess"] + a.wrongCount * 4) ||
      Date.parse(b.date) - Date.parse(a.date),
  );
}

export function mistakeReviewKey(
  lesson: Pick<(typeof lessons)[number], "id" | "version">,
  questionId: string,
) {
  return `${lesson.id}@v${lesson.version}:${questionId}`;
}
export function scoreAnswers(
  lessonId: string,
  answers: Record<string, number>,
) {
  const lesson = allLessons.find((l) => l.id === lessonId);
  if (!lesson) throw Error("Không tìm thấy bài học.");
  return scoreQuestionSet(lesson.questions, answers);
}
function scoreQuestionSet(
  questions: Question[],
  answers: Record<string, number>,
) {
  return {
    correct: questions.filter((q) => answers[q.id] === q.answer).length,
    total: questions.length,
  };
}

export function objectiveInsights(
  questions: Question[],
  answers: Record<string, number>,
  confidence: Record<string, Confidence> = {},
) {
  const tags = new Map<string, { correct: number; total: number }>();
  let confidentErrors = 0;
  let fragileCorrect = 0;
  let secureCorrect = 0;

  for (const question of questions) {
    const isCorrect = answers[question.id] === question.answer;
    const current = tags.get(question.tag) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (isCorrect) current.correct += 1;
    tags.set(question.tag, current);

    if (!isCorrect && confidence[question.id] === "sure") confidentErrors += 1;
    if (isCorrect && confidence[question.id] !== "sure") fragileCorrect += 1;
    if (isCorrect && confidence[question.id] === "sure") secureCorrect += 1;
  }

  return {
    byTag: [...tags].map(([tag, score]) => ({ tag, ...score })),
    confidentErrors,
    fragileCorrect,
    secureCorrect,
  };
}

export function recordAttempt(state: StudyState, attempt: Attempt): StudyState {
  if (state.attempts.some((a) => a.id === attempt.id)) return state;
  const mistakeReviews = { ...state.mistakeReviews };
  const lesson = attemptLesson(state, attempt);
  // The material is filed once, under its version, and the attempt points at
  // it. Copying the lesson onto every attempt was 95% of the saved state.
  const library = { ...state.library };
  let recorded = attempt;
  if (!attempt.lessonSnapshot && !attempt.lessonRef && lesson) {
    const key = libraryKey(lesson.id, lesson.version);
    if (!library[key]) library[key] = structuredClone(lesson);
    recorded = { ...attempt, lessonRef: key };
  }
  // Which of this lesson's questions the learner has got wrong before now.
  const missedBefore = new Set<string>();
  for (const past of state.attempts) {
    const pastLesson = attemptLesson(state, past);
    if (!pastLesson) continue;
    for (const question of pastLesson.questions) {
      const answer = past.answers[question.id];
      if (answer !== undefined && answer !== question.answer)
        missedBefore.add(mistakeReviewKey(pastLesson, question.id));
    }
  }
  for (const question of lesson?.questions ?? []) {
    const answer = attempt.answers[question.id];
    const key = mistakeReviewKey(lesson!, question.id);
    // Only a question the learner actually got wrong falls due again. Leaving
    // one blank when time ran out must not erase a schedule already earned.
    if (answer !== undefined && answer !== question.answer) {
      delete mistakeReviews[key];
      // Remove the pre-versioning key as the attempt is now due again.
      delete mistakeReviews[question.id];
    } else if (answer === question.answer && missedBefore.has(key)) {
      // Recalling it correctly inside a lesson is retrieval too, so it counts
      // as a review passed. Before this, only the notebook's own button moved
      // the schedule and a corrected mistake stayed due for ever.
      mistakeReviews[key] = scheduleReview(
        mistakeReviews[key],
        "good",
        new Date(attempt.date),
      );
    }
  }
  return {
    ...state,
    attempts: [...state.attempts, recorded],
    library,
    mistakeReviews,
  };
}
export const examStages = [
  {
    skill: "listening" as Skill,
    label: "Nghe",
    seconds: 600,
    lessonIds: ["listening-weekend", "listening-library"],
  },
  {
    skill: "reading" as Skill,
    label: "Đọc",
    seconds: 900,
    lessonIds: ["reading-cafe", "reading-garden"],
  },
  {
    skill: "writing" as Skill,
    label: "Viết",
    seconds: 1200,
    lessonIds: ["writing-email"],
  },
  {
    skill: "speaking" as Skill,
    label: "Nói",
    seconds: 360,
    lessonIds: ["speaking-social"],
  },
];
export const fullExamStages = [
  {
    skill: "listening" as Skill,
    label: "Nghe",
    seconds: 2400,
    lessonIds: fullListening.map((l) => l.id),
  },
  {
    skill: "reading" as Skill,
    label: "Đọc",
    seconds: 3600,
    lessonIds: fullReading.map((l) => l.id),
  },
  {
    skill: "writing" as Skill,
    label: "Viết",
    seconds: 3600,
    lessonIds: ["writing-email", "writing-essay"],
  },
  {
    skill: "speaking" as Skill,
    label: "Nói",
    seconds: 720,
    lessonIds: ["speaking-social", "speaking-solution", "speaking-topic"],
  },
];
/**
 * The second paper runs the same shape on entirely different material: its own
 * transcripts, passages, Writing tasks and Speaking prompts. One paper cannot
 * measure twice, because the second sitting measures memory.
 */
export const fullExam2Stages = [
  {
    skill: "listening" as Skill,
    label: "Nghe",
    seconds: 2400,
    lessonIds: fullListening2.map((l) => l.id),
  },
  {
    skill: "reading" as Skill,
    label: "Đọc",
    seconds: 3600,
    lessonIds: fullReading2.map((l) => l.id),
  },
  {
    skill: "writing" as Skill,
    label: "Viết",
    seconds: 3600,
    lessonIds: fullWriting2.map((l) => l.id),
  },
  {
    skill: "speaking" as Skill,
    label: "Nói",
    seconds: 720,
    lessonIds: fullSpeaking2.map((l) => l.id),
  },
];
export function getExamStages(mode?: "mini" | "full" | "full2") {
  if (mode === "full") return fullExamStages;
  if (mode === "full2") return fullExam2Stages;
  return examStages;
}

/** Absolute deadlines survive reload, sleep, background tabs, and app crashes. */
export function advanceExam(
  state: StudyState,
  now: number,
  force = false,
): StudyState {
  let exam = state.exam;
  if (!exam || exam.finished || (!force && now < exam.deadline)) return state;
  const attempts = [...state.attempts];
  const stages = exam.stagePlan ?? getExamStages(exam.mode);
  do {
    const stage = stages[exam.stage];
    const ended = Math.min(now, exam.deadline);
    const seconds = Math.max(
      0,
      Math.min(
        stage.seconds,
        (ended - (exam.deadline - stage.seconds * 1000)) / 1000,
      ),
    );
    const current = exam;
    // Task 2 is the second writing lesson of the stage, not one hard-coded
    // id: paper 02 has its own essay and was filing the letter's text twice.
    const writingFor = (lessonId: string) =>
      stage.skill === "writing" && stage.lessonIds.indexOf(lessonId) === 1
        ? (current.writingTask2 ?? "")
        : current.writing;
    // Work the learner never did is not filed: a blank essay, an unrecorded
    // speaking part, or a section with no answer at all. Filing those would
    // invent both a score and the minutes the stage was scheduled to take.
    const worked = stage.lessonIds
      .map((lessonId) => ({
        lessonId,
        lesson:
          current.lessonSnapshots?.find(
            (candidate) => candidate.id === lessonId,
          ) ?? allLessons.find((candidate) => candidate.id === lessonId),
      }))
      .filter(({ lessonId, lesson }) => {
        if (!lesson) return false;
        // A part the recorder already filed carries its real duration; filing
        // it again here would also take a share of the stage time from the
        // parts that still need one.
        if (attempts.some((a) => a.id === `exam:${current.id}:${lessonId}`))
          return false;
        // Speaking files nothing on its own: a take is filed the moment it is
        // captured. What is left is a part the learner answered out loud with
        // no microphone available, and said so.
        if (stage.skill === "speaking")
          return (current.spoken ?? []).includes(lessonId);
        if (stage.skill === "writing")
          return Boolean(writingFor(lessonId).trim());
        return (
          !lesson.questions.length ||
          lesson.questions.some((q) => current.answers[q.id] !== undefined)
        );
      })
      .map((entry) => ({
        ...entry,
        // The full exam's essay is worth twice the email's time.
        weight:
          stage.skill === "writing" &&
          current.mode === "full" &&
          entry.lessonId === "writing-essay"
            ? 2
            : 1,
      }));
    // Time is shared across what was actually worked on, so an abandoned
    // section does not silently take its neighbour's minutes with it.
    const totalWeight = worked.reduce((sum, entry) => sum + entry.weight, 0);
    for (const { lessonId, lesson, weight } of worked) {
      const id = `exam:${current.id}:${lessonId}`;
      if (attempts.some((a) => a.id === id)) continue;
      attempts.push({
        id,
        lessonId,
        skill: stage.skill,
        date: new Date(ended).toISOString(),
        answers: Object.fromEntries(
          lesson!.questions
            .filter((q) => current.answers[q.id] !== undefined)
            .map((q) => [q.id, current.answers[q.id]]),
        ),
        ...scoreQuestionSet(lesson!.questions, current.answers),
        seconds: (seconds * weight) / totalWeight,
        text: stage.skill === "writing" ? writingFor(lessonId) : undefined,
        lessonSnapshot: structuredClone(lesson!),
      });
    }
    if (exam.stage === stages.length - 1) {
      exam = { ...exam, finished: true };
      break;
    }
    const next: number = exam.stage + 1;
    exam = {
      ...exam,
      stage: next,
      // A new part starts at its first material, not where the last one ended.
      material: 0,
      deadline: ended + stages[next].seconds * 1000,
    };
    force = false;
  } while (now >= exam.deadline);
  let result: StudyState = { ...state, exam };
  for (const attempt of attempts) result = recordAttempt(result, attempt);
  return result;
}
