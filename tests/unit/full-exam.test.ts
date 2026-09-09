import { describe, expect, it } from "vitest";
import {
  allLessons,
  fullListening,
  fullReading,
} from "../../src/lib/full-exam-content";
import {
  advanceExam,
  freshState,
  fullExamStages,
  localDay,
  recordAttempt,
  scheduleReview,
  stateSchema,
  todayPlan,
  wordCount,
} from "../../src/lib/learning";

describe("full exam content and recovery", () => {
  it("matches the published section counts, reading length and total time", () => {
    expect(fullListening.map((l) => l.questions.length)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 4, 5, 5, 5,
    ]);
    expect(fullReading.map((l) => l.questions.length)).toEqual([
      10, 10, 10, 10,
    ]);
    const words = fullReading.reduce((n, l) => n + wordCount(l.text), 0);
    expect(words).toBeGreaterThanOrEqual(1900);
    expect(words).toBeLessThanOrEqual(2050);
    expect(fullExamStages.reduce((n, s) => n + s.seconds, 0)).toBe(172 * 60);
  });
  it("uses unique ids and complete answer feedback across both banks", () => {
    expect(new Set(allLessons.map((l) => l.id)).size).toBe(allLessons.length);
    const questions = allLessons.flatMap((l) => l.questions);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.options[q.answer], q.id).toBeTruthy();
      expect(q.explanation.length, q.id).toBeGreaterThan(20);
    }
  });
  it("recovers all expired sections and preserves both writing tasks once", () => {
    const s = freshState();
    const now = Date.now();
    s.exam = {
      id: "full-test",
      mode: "full",
      startedAt: now,
      deadline: now + 2400000,
      stage: 0,
      answers: {},
      writing: "My email response.",
      writingTask2: "My independent essay response.",
      finished: false,
    };
    const result = advanceExam(s, now + 172 * 60000);
    expect(result.exam?.finished).toBe(true);
    expect(result.attempts.reduce((n, a) => n + a.total, 0)).toBe(75);
    expect(
      result.attempts.filter((a) => a.skill === "writing").map((a) => a.text),
    ).toEqual(["My email response.", "My independent essay response."]);
    expect(result.attempts.filter((a) => a.skill === "speaking")).toHaveLength(
      0,
    );
    expect(stateSchema.safeParse(result).success).toBe(true);
    expect(advanceExam(result, now + 200 * 60000)).toBe(result);
  });
  it("keeps today's plan stable after completing its first lesson", () => {
    const s = freshState();
    const now = new Date();
    const plan = todayPlan(s, now);
    const l = plan.lessons[0];
    const next = recordAttempt(s, {
      id: "today",
      lessonId: l.id,
      skill: l.skill,
      date: now.toISOString(),
      answers: {},
      correct: 0,
      total: l.questions.length,
      seconds: 60,
    });
    expect(todayPlan(next, now).lessons.map((l) => l.id)).toEqual(
      plan.lessons.map((l) => l.id),
    );
    expect(localDay(next.attempts[0].date)).toBe(localDay(now));
  });
  it("makes a newly repeated mistake due again without duplicating the attempt", () => {
    const s = freshState();
    s.mistakeReviews.rc1 = scheduleReview(undefined, "easy");
    const a = {
      id: "repeat",
      lessonId: "reading-cafe",
      skill: "reading" as const,
      date: new Date().toISOString(),
      answers: { rc1: 0 },
      correct: 0,
      total: 5,
      seconds: 60,
    };
    const next = recordAttempt(s, a);
    expect(next.mistakeReviews.rc1).toBeUndefined();
    expect(recordAttempt(next, a)).toBe(next);
  });
});
