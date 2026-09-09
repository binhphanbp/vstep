import { z } from "zod";
import { lessons, type Skill } from "./content";
import { allLessons, fullListening, fullReading } from "./full-exam-content";
const skillSchema = z.enum(["listening", "reading", "writing", "speaking"]);
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  target: z.enum(["B1", "B2", "C1"]),
  level: z.enum(["starting", "B1", "B2"]),
  examDate: z.union([z.literal(""), z.iso.date()]),
  dailyMinutes: z.number().int().min(10).max(120),
  interests: z.array(z.string().max(50)).max(10),
  focus: skillSchema,
  onboarded: z.boolean(),
});
export const attemptSchema = z
  .object({
    id: z.string().max(100),
    lessonId: z.string().max(100),
    skill: skillSchema,
    date: z.string().datetime(),
    answers: z.record(z.string(), z.number().int().min(0).max(3)),
    correct: z.number().int().min(0).max(100),
    total: z.number().int().min(0).max(100),
    seconds: z.number().min(0).max(18000),
    text: z.string().max(30000).optional(),
    reflection: z.array(z.string().max(200)).max(20).optional(),
    recordingId: z.string().max(100).optional(),
  })
  .refine((attempt) => attempt.correct <= attempt.total, {
    message: "Số câu đúng không thể lớn hơn tổng số câu.",
    path: ["correct"],
  });
const reviewSchema = z.object({
  due: z.string().datetime(),
  interval: z.number().min(0).max(365),
  ease: z.number().min(1.3).max(3),
  repetitions: z.number().int().min(0),
  lastDate: z.string(),
});
export const examSchema = z.object({
  id: z.string(),
  mode: z.enum(["mini", "full"]).optional(),
  startedAt: z.number(),
  stage: z.number().int().min(0).max(3),
  deadline: z.number(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  writing: z.string().max(30000),
  writingTask2: z.string().max(30000).optional(),
  finished: z.boolean(),
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    profile: profileSchema,
    attempts: z.array(attemptSchema).max(10000),
    reviews: z.record(z.string(), reviewSchema),
    mistakeReviews: z.record(z.string(), reviewSchema),
    drafts: z.record(z.string(), z.string().max(30000)),
    mood: z.record(z.string(), z.enum(["low", "okay", "great"])),
    exam: examSchema.nullable(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((state, ctx) => {
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
  });
export type Profile = z.infer<typeof profileSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
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
  const ranked = lessons
    .map((lesson) => {
      const done = history.attempts.filter((a) => a.lessonId === lesson.id);
      const stat = skillStats(history, lesson.skill);
      const score =
        (done.length === 0 ? 60 : 0) +
        (lesson.skill === state.profile.focus ? 20 : 0) +
        (state.profile.interests.includes(lesson.topic) ? 8 : 0) +
        (stat.accuracy !== null && stat.accuracy < 65 ? 15 : 0) +
        (state.profile.level === "starting" && lesson.level === "B1" ? 10 : 0) -
        done.length * 4;
      return { lesson, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked: typeof lessons = [];
  let remaining = budget;
  for (const { lesson } of ranked) {
    if (
      lesson.minutes <= remaining &&
      picked.length < 3 &&
      !picked.some((l) => l.skill === lesson.skill)
    ) {
      picked.push(lesson);
      remaining -= lesson.minutes;
    }
  }
  if (!picked.length) picked.push(ranked[0].lesson);
  return { lessons: picked, budget, mood };
}
export function mistakes(state: StudyState) {
  const result = new Map<
    string,
    {
      question: (typeof lessons)[number]["questions"][number];
      lesson: (typeof lessons)[number];
      chosen: number | undefined;
      date: string;
    }
  >();
  for (const a of state.attempts) {
    const lesson = allLessons.find((l) => l.id === a.lessonId);
    if (!lesson) continue;
    for (const question of lesson.questions) {
      if (a.answers[question.id] !== question.answer)
        result.set(question.id, {
          question,
          lesson,
          chosen: a.answers[question.id],
          date: a.date,
        });
    }
  }
  return [...result.values()];
}
export function scoreAnswers(
  lessonId: string,
  answers: Record<string, number>,
) {
  const lesson = allLessons.find((l) => l.id === lessonId);
  if (!lesson) throw Error("Không tìm thấy bài học.");
  return {
    correct: lesson.questions.filter((q) => answers[q.id] === q.answer).length,
    total: lesson.questions.length,
  };
}

export function recordAttempt(state: StudyState, attempt: Attempt): StudyState {
  if (state.attempts.some((a) => a.id === attempt.id)) return state;
  const mistakeReviews = { ...state.mistakeReviews };
  const lesson = allLessons.find((l) => l.id === attempt.lessonId);
  for (const question of lesson?.questions ?? []) {
    if (attempt.answers[question.id] !== question.answer)
      delete mistakeReviews[question.id];
  }
  return { ...state, attempts: [...state.attempts, attempt], mistakeReviews };
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
      const lesson = allLessons.find((l) => l.id === lessonId)!;
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
          ...scoreAnswers(lessonId, exam.answers),
          seconds:
            stage.skill === "writing" && exam.mode === "full"
              ? seconds * (lessonId === "writing-essay" ? 2 / 3 : 1 / 3)
              : seconds / stage.lessonIds.length,
          text: stage.skill === "writing" ? writing : undefined,
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
