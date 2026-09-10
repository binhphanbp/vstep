import { describe, expect, it } from "vitest";
import {
  advanceExam,
  dayOffset,
  daysUntil,
  examStages,
  freshState,
  localDay,
  mistakes,
  profileSchema,
  scheduleReview,
  scoreAnswers,
  skillStats,
  stateSchema,
  streak,
  todayPlan,
  wordCount,
  type Attempt,
} from "../../src/lib/learning";
import { lessons, vocabulary } from "../../src/lib/content";
const now = new Date("2026-09-08T18:00:00+07:00");
function attempt(date: string, extra: Partial<Attempt> = {}): Attempt {
  return {
    id: date,
    lessonId: "reading-cafe",
    skill: "reading",
    date,
    answers: { rc1: 1, rc2: 2, rc3: 0, rc4: 3, rc5: 1 },
    correct: 5,
    total: 5,
    seconds: 300,
    ...extra,
  };
}
describe("Vietnam-local study dates", () => {
  it("handles the day boundary independently of server timezone", () => {
    expect(localDay("2026-09-08T17:00:00Z")).toBe("2026-09-09");
    expect(localDay("2026-09-08T16:59:59Z")).toBe("2026-09-08");
  });
  it("handles month and year rollover", () => {
    expect(dayOffset("2026-01-01", -1)).toBe("2025-12-31");
    expect(dayOffset("2024-03-01", -1)).toBe("2024-02-29");
  });
  it("does not break yesterday’s streak before today ends", () => {
    expect(
      streak(
        [attempt("2026-09-06T10:00:00Z"), attempt("2026-09-07T10:00:00Z")],
        now,
      ),
    ).toBe(2);
  });
  it("does not count duplicate sessions as extra days", () => {
    expect(
      streak(
        [attempt("2026-09-08T09:00:00Z"), attempt("2026-09-08T10:00:00Z")],
        now,
      ),
    ).toBe(1);
  });
  it("resets after a full missed day", () =>
    expect(streak([attempt("2026-09-06T10:00:00Z")], now)).toBe(0));
  it("handles missing, same-day and past exam dates", () => {
    expect(daysUntil("", now)).toBeNull();
    expect(daysUntil("2026-09-08", now)).toBe(0);
    expect(daysUntil("2026-09-10", now)).toBe(2);
    expect(daysUntil("2026-09-07", now)).toBe(-1);
  });
});
describe("scoring and honest progress", () => {
  it("scores all answers and counts unanswered questions as incorrect", () => {
    expect(
      scoreAnswers("reading-cafe", { rc1: 1, rc2: 2, rc3: 0, rc4: 3, rc5: 1 }),
    ).toEqual({ correct: 5, total: 5 });
    expect(scoreAnswers("reading-cafe", { rc1: 1 })).toEqual({
      correct: 1,
      total: 5,
    });
  });
  it("does not invent scores for productive skills or a fresh learner", () => {
    expect(scoreAnswers("writing-email", {})).toEqual({ correct: 0, total: 0 });
    expect(skillStats(freshState(), "reading").accuracy).toBeNull();
  });
  it("uses the last five scored attempts, weighted by question count", () => {
    const s = freshState();
    s.attempts = Array.from({ length: 6 }, (_, i) =>
      attempt(`2026-09-0${i + 1}T10:00:00Z`, { correct: i === 0 ? 0 : 5 }),
    );
    expect(skillStats(s, "reading").accuracy).toBe(100);
  });
  it("stores a mistake only once even across repeated errors", () => {
    const s = freshState();
    s.attempts = [
      attempt(now.toISOString(), {
        answers: { rc1: 0, rc2: 2, rc3: 0, rc4: 3, rc5: 1 },
      }),
      attempt(now.toISOString(), {
        id: "second",
        answers: { rc1: 0, rc2: 2, rc3: 0, rc4: 3, rc5: 1 },
      }),
    ];
    expect(mistakes(s)).toHaveLength(1);
    expect(mistakes(s)[0].question.id).toBe("rc1");
  });
  it("counts natural words without treating punctuation as words", () => {
    expect(wordCount("  ")).toBe(0);
    expect(wordCount("I'm a part-time learner. Hello, world!")).toBe(6);
  });
});
describe("adaptive plan and memory scheduling", () => {
  it("fits a low-energy day and avoids repeating the same skill", () => {
    const s = freshState();
    s.mood[localDay(now)] = "low";
    const p = todayPlan(s, now);
    expect(p.budget).toBe(15);
    expect(p.lessons.reduce((n, l) => n + l.minutes, 0)).toBeLessThanOrEqual(
      15,
    );
    expect(new Set(p.lessons.map((l) => l.skill)).size).toBe(p.lessons.length);
  });
  it("prioritises the selected skill when it fits the budget", () => {
    const s = freshState();
    s.profile.focus = "speaking";
    expect(todayPlan(s, now).lessons[0].skill).toBe("speaking");
  });
  it("explains due misconceptions and prioritises confident mistakes", () => {
    const s = freshState();
    s.attempts = [
      attempt("2026-09-07T10:00:00+07:00", {
        answers: { rc1: 0, rc2: 0, rc3: 0, rc4: 3, rc5: 1 },
        correct: 3,
        confidence: { rc1: "sure", rc2: "guess" },
      }),
    ];
    const errors = mistakes(s, now);
    expect(errors[0].question.id).toBe("rc1");
    expect(errors[0]).toMatchObject({ confidence: "sure", due: true });
    const plan = todayPlan(s, now);
    expect(plan.reasons["reading-cafe"]).toContain(
      "1 câu sai dù đã chọn “Rất chắc” cần sửa ngay",
    );
  });
  it("delays well-recalled cards and brings failed cards back in 10 minutes", () => {
    const good = scheduleReview(undefined, "good", now);
    expect(good.interval).toBe(1);
    const next = scheduleReview(good, "good", now);
    expect(next.interval).toBe(3);
    const again = scheduleReview(next, "again", now);
    expect(again.repetitions).toBe(0);
    expect(Date.parse(again.due) - now.getTime()).toBe(600000);
  });
  it("keeps difficulty factors and long intervals bounded", () => {
    let r = scheduleReview(undefined, "good", now);
    for (let i = 0; i < 50; i++) r = scheduleReview(r, "easy", now);
    expect(r.interval).toBe(365);
    expect(r.ease).toBeLessThanOrEqual(3);
    for (let i = 0; i < 50; i++) r = scheduleReview(r, "again", now);
    expect(r.ease).toBe(1.3);
  });
});
describe("exam persistence and deadlines", () => {
  function exam() {
    const s = freshState();
    s.exam = {
      id: "test",
      startedAt: now.getTime(),
      stage: 0,
      deadline: now.getTime() + 600000,
      answers: { lw1: 2 },
      writing: "",
      finished: false,
    };
    return s;
  }
  it("does not advance before the deadline", () => {
    const s = exam();
    expect(advanceExam(s, now.getTime() + 1000)).toBe(s);
  });
  it("automatically saves unanswered items and moves to the next part", () => {
    const s = advanceExam(exam(), now.getTime() + 600000);
    expect(s.exam?.stage).toBe(1);
    expect(s.attempts).toHaveLength(2);
    expect(s.attempts[0].correct).toBe(1);
    expect(s.attempts.reduce((n, a) => n + a.seconds, 0)).toBe(600);
  });
  it("anchors early submission to its real submission time", () => {
    const s = advanceExam(exam(), now.getTime() + 20000, true);
    expect(s.exam?.deadline).toBe(now.getTime() + 20000 + 900000);
    expect(s.attempts.reduce((n, a) => n + a.seconds, 0)).toBe(20);
  });
  it("catches up every expired stage after a long absence without inventing writing/speaking work", () => {
    const s = advanceExam(exam(), now.getTime() + 3600000);
    expect(s.exam?.finished).toBe(true);
    expect(s.attempts).toHaveLength(4);
    expect(s.attempts.every((a) => a.total > 0)).toBe(true);
    expect(advanceExam(s, now.getTime() + 4000000)).toBe(s);
  });
  it("deduplicates repeated submissions by stable attempt ids", () => {
    const s = exam();
    s.attempts = [
      attempt(now.toISOString(), {
        id: "exam:test:listening-weekend",
        lessonId: "listening-weekend",
        skill: "listening",
      }),
    ];
    const result = advanceExam(s, s.exam!.deadline);
    expect(
      result.attempts.filter((a) => a.id === "exam:test:listening-weekend"),
    ).toHaveLength(1);
  });
  it("mini session duration matches the user-facing 51 minutes", () =>
    expect(examStages.reduce((s, p) => s + p.seconds, 0)).toBe(51 * 60));
});
describe("content and backup integrity", () => {
  it("rejects impossible scores and duplicate attempt ids in a backup", () => {
    const s = freshState();
    s.attempts = [attempt(now.toISOString(), { correct: 6, total: 5 })];
    expect(stateSchema.safeParse(s).success).toBe(false);
    s.attempts = [attempt(now.toISOString()), attempt(now.toISOString())];
    expect(stateSchema.safeParse(s).success).toBe(false);
  });
  it("has unique lesson, question and vocabulary ids", () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    const questions = lessons.flatMap((l) => l.questions);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    expect(new Set(vocabulary.map((v) => v.id)).size).toBe(vocabulary.length);
  });
  it("every question has four distinct options, a valid answer and feedback", () => {
    for (const q of lessons.flatMap((l) => l.questions)) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(20);
    }
  });
  it("writing examples meet their stated minimum word counts", () => {
    for (const l of lessons.filter((l) => l.sample))
      expect(wordCount(l.sample!), l.id).toBeGreaterThanOrEqual(l.minWords!);
  });
  it("accepts a valid export and rejects incompatible versions and invalid answers", () => {
    expect(stateSchema.safeParse(freshState()).success).toBe(true);
    expect(stateSchema.safeParse({ ...freshState(), version: 2 }).success).toBe(
      false,
    );
    const s = freshState();
    s.attempts = [attempt(now.toISOString(), { answers: { rc1: 99 } })];
    expect(stateSchema.safeParse(s).success).toBe(false);
  });
  it("rejects missing names and out-of-range daily goals", () => {
    expect(
      profileSchema.safeParse({ ...freshState().profile, name: "" }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...freshState().profile, dailyMinutes: 0 })
        .success,
    ).toBe(false);
  });
});
