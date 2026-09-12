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
const questionSnapshotSchema = z.object({
  id: limitedString(100),
  text: limitedString(3000),
  options: z.array(limitedString(2000)).check(z.minLength(2), z.maxLength(8)),
  answer: boundedInteger(0, 7),
  explanation: limitedString(5000),
  tag: limitedString(100),
});
const lessonSnapshotSchema = z.object({
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
});

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
    answers: z.record(z.string(), boundedInteger(0, 3)),
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
    z.refine((attempt) => attempt.correct <= attempt.total, {
      error: "Số câu đúng không thể lớn hơn tổng số câu.",
      path: ["correct"],
    }),
  );
const reviewSchema = z.object({
  due: z.iso.datetime(),
  interval: boundedNumber(0, 365),
  ease: boundedNumber(1.3, 3),
  repetitions: z.number().check(z.int(), z.minimum(0)),
  lastDate: z.string(),
});
export const examSchema = z.object({
  id: z.string(),
  mode: z.optional(z.enum(["mini", "full"])),
  startedAt: z.number(),
  stage: boundedInteger(0, 3),
  deadline: z.number(),
  answers: z.record(z.string(), boundedInteger(0, 3)),
  writing: limitedString(30000),
  writingTask2: z.optional(limitedString(30000)),
  finished: z.boolean(),
  lessonSnapshots: z.optional(
    z.array(lessonSnapshotSchema).check(z.maxLength(40)),
  ),
});
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
  if (state.profile.name !== "bạn" || state.profile.onboarded) return state;
  return {
    ...state,
    profile: { ...state.profile, name: DEFAULT_LEARNER_NAME },
  };
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
export function skillStats(state: StudyState, skill: Skill) {
  const relevant = state.attempts
    .filter((a) => a.skill === skill && a.total > 0)
    .slice(-5);
  const total = relevant.reduce((s, a) => s + a.total, 0);
  return {
    count: state.attempts.filter((a) => a.skill === skill).length,
    accuracy: total
      ? Math.round((relevant.reduce((s, a) => s + a.correct, 0) / total) * 100)
      : null,
  };
}
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
      const score =
        (done.length === 0 ? 60 : 0) +
        (lesson.skill === state.profile.focus ? 20 : 0) +
        (state.profile.interests.includes(lesson.topic) ? 8 : 0) +
        (stat.accuracy !== null && stat.accuracy < 65 ? 15 : 0) +
        Math.min(100, dueForLesson.length * 45) +
        confidentErrors * 30 +
        (recencyGap !== null ? Math.min(12, Math.floor(recencyGap / 3)) : 0) +
        (examUrgent && lesson.level === "B2" ? 12 : 0) +
        (state.profile.level === "starting" && lesson.level === "B1" ? 10 : 0) -
        done.length * 4;
      const reasons: string[] = [];
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
      return { lesson, score, reasons: reasons.slice(0, 2) };
    })
    .sort((a, b) => b.score - a.score);
  const picked: typeof ranked = [];
  let remaining = budget;
  for (const item of ranked) {
    const { lesson } = item;
    if (
      lesson.minutes <= remaining &&
      picked.length < 3 &&
      !picked.some((entry) => entry.lesson.skill === lesson.skill)
    ) {
      picked.push(item);
      remaining -= lesson.minutes;
    }
  }
  if (!picked.length) picked.push(ranked[0]);
  return {
    lessons: picked.map((item) => item.lesson),
    reasons: Object.fromEntries(
      picked.map((item) => [item.lesson.id, item.reasons]),
    ) as Record<string, string[]>,
    budget,
    mood,
    examDays,
  };
}
export function mistakes(state: StudyState, now = new Date()) {
  const result = new Map<
    string,
    {
      question: Question;
      lesson: Pick<(typeof lessons)[number], "id" | "title" | "skill" | "text">;
      chosen: number | undefined;
      confidence: Confidence | undefined;
      wrongCount: number;
      due: boolean;
      date: string;
    }
  >();
  for (const a of state.attempts) {
    const lesson =
      a.lessonSnapshot ?? allLessons.find((l) => l.id === a.lessonId);
    if (!lesson) continue;
    for (const question of lesson.questions) {
      if (a.answers[question.id] !== question.answer) {
        const previous = result.get(question.id);
        const review = state.mistakeReviews[question.id];
        result.set(question.id, {
          question,
          lesson,
          chosen: a.answers[question.id],
          confidence: a.confidence?.[question.id],
          wrongCount: (previous?.wrongCount ?? 0) + 1,
          due: !review || Date.parse(review.due) <= now.getTime(),
          date: a.date,
        });
      }
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
  for (const question of lesson?.questions ?? []) {
    if (attempt.answers[question.id] !== question.answer)
      delete mistakeReviews[question.id];
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
  const stages = getExamStages(exam.mode);
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
    for (const lessonId of stage.lessonIds) {
      const id = `exam:${exam.id}:${lessonId}`;
      const lesson =
        exam.lessonSnapshots?.find((candidate) => candidate.id === lessonId) ??
        allLessons.find((candidate) => candidate.id === lessonId)!;
      const writing =
        lessonId === "writing-essay" ? (exam.writingTask2 ?? "") : exam.writing;
      // Blank productive responses are not counted as completed practice.
      if (
        stage.skill === "speaking" ||
        (stage.skill === "writing" && !writing.trim())
      )
        continue;
      if (!attempts.some((a) => a.id === id))
        attempts.push({
          id,
          lessonId,
          skill: stage.skill,
          date: new Date(ended).toISOString(),
          answers: Object.fromEntries(
            lesson.questions
              .filter((q) => exam!.answers[q.id] !== undefined)
              .map((q) => [q.id, exam!.answers[q.id]]),
          ),
          ...scoreQuestionSet(lesson.questions, exam.answers),
          seconds:
            stage.skill === "writing" && exam.mode === "full"
              ? seconds * (lessonId === "writing-essay" ? 2 / 3 : 1 / 3)
              : seconds / stage.lessonIds.length,
          text: stage.skill === "writing" ? writing : undefined,
          lessonSnapshot: structuredClone(lesson),
        });
    }
    if (exam.stage === 3) {
      exam = { ...exam, finished: true };
      break;
    }
    const next: number = exam.stage + 1;
    exam = {
      ...exam,
      stage: next,
      deadline: ended + stages[next].seconds * 1000,
    };
    force = false;
  } while (now >= exam.deadline);
  let result: StudyState = { ...state, exam };
  for (const attempt of attempts) result = recordAttempt(result, attempt);
  return result;
}
