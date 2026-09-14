import * as z from "zod/mini";
import { lessons, type Question, type Skill } from "./content";
import { allLessons, fullListening, fullReading } from "./full-exam-content";

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
export const attemptSchema = z
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
    recordingId: z.optional(limitedString(100)),
    lessonSnapshot: z.optional(lessonSnapshotSchema),
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
      if (snapshot.id !== attempt.lessonId)
        ctx.addIssue({
          code: "custom",
          path: ["lessonSnapshot", "id"],
          message: "Snapshot phải thuộc đúng bài của lượt học.",
        });
      if (snapshot.skill !== attempt.skill)
        ctx.addIssue({
          code: "custom",
          path: ["lessonSnapshot", "skill"],
          message: "Kỹ năng trong snapshot không khớp lượt học.",
        });
      if (snapshot.questions.length !== attempt.total)
        ctx.addIssue({
          code: "custom",
          path: ["total"],
          message: "Tổng số câu phải khớp snapshot của bài.",
        });
      const questions = new Map(
        snapshot.questions.map((question) => [question.id, question]),
      );
      for (const [questionId, answer] of Object.entries(attempt.answers)) {
        const question = questions.get(questionId);
        if (!question || answer >= question.options.length)
          ctx.addIssue({
            code: "custom",
            path: ["answers", questionId],
            message: "Câu trả lời không thuộc snapshot của bài.",
          });
      }
      for (const questionId of Object.keys(attempt.confidence ?? {}))
        if (!questions.has(questionId))
          ctx.addIssue({
            code: "custom",
            path: ["confidence", questionId],
            message: "Độ chắc chắn không thuộc snapshot của bài.",
          });
      const correct = snapshot.questions.filter(
        (question) => attempt.answers[question.id] === question.answer,
      ).length;
      if (correct !== attempt.correct)
        ctx.addIssue({
          code: "custom",
          path: ["correct"],
          message: "Điểm số phải khớp đáp án trong snapshot.",
        });
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
    mode: z.optional(z.enum(["mini", "full"])),
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
  const attempts = state.attempts.map((attempt) => {
    if (attempt.lessonSnapshot) return attempt;
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
    return { ...attempt, lessonSnapshot: structuredClone(lesson) };
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
  return changed ? { ...state, profile, attempts, exam } : state;
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
/** A lesson the learner has already met is the same material until it changes. */
function lessonVersionKey(attempt: Attempt) {
  return `${attempt.lessonId}@v${attempt.lessonSnapshot?.version ?? 0}`;
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
    const lesson =
      attempt.lessonSnapshot ??
      allLessons.find((candidate) => candidate.id === attempt.lessonId);
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
/** Days a lesson too long for the daily budget waits before being offered. */
const LONG_SESSION_REST_DAYS = 14;
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
  const dueMistakes = mistakes(history, now).filter((item) => item.due);
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
      const examUrgent = examDays !== null && examDays >= 0 && examDays <= 30;
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
        (examUrgent && lesson.level === "B2" ? 12 : 0) +
        (state.profile.level === "starting" && lesson.level === "B1" ? 10 : 0) -
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
      if (examUrgent && lesson.level === "B2")
        reasons.push(`Còn ${examDays} ngày đến ngày thi, ưu tiên mức B2`);
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
  if (!picked.length) picked.push(ranked[0]);
  return {
    lessons: picked.map((item) => item.lesson),
    reasons: Object.fromEntries(
      picked.map((item) => [item.lesson.id, item.reasons]),
    ) as Record<string, string[]>,
    /** Lessons offered even though they do not fit today's budget. */
    longer,
    budget,
    mood,
    examDays,
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
    const lesson =
      a.lessonSnapshot ?? allLessons.find((l) => l.id === a.lessonId);
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
  const lesson =
    attempt.lessonSnapshot ??
    allLessons.find((candidate) => candidate.id === attempt.lessonId);
  const recorded =
    attempt.lessonSnapshot || !lesson
      ? attempt
      : { ...attempt, lessonSnapshot: structuredClone(lesson) };
  // Which of this lesson's questions the learner has got wrong before now.
  const missedBefore = new Set<string>();
  for (const past of state.attempts) {
    const pastLesson =
      past.lessonSnapshot ??
      allLessons.find((candidate) => candidate.id === past.lessonId);
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
  return { ...state, attempts: [...state.attempts, recorded], mistakeReviews };
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
export function getExamStages(mode?: "mini" | "full") {
  return mode === "full" ? fullExamStages : examStages;
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
    const writingFor = (lessonId: string) =>
      lessonId === "writing-essay"
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
