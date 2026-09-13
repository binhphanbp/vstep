import { describe, expect, it } from "vitest";
import {
  allLessons,
  fullListening,
  fullReading,
} from "../../src/lib/full-exam-content";
import { lessons } from "../../src/lib/content";
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
  it("shares no Reading or Listening question with the library lessons", () => {
    // Reused questions filed one mistake under two notebook keys, halved its
    // wrong count, and handed 20 of the 40 Reading marks to anyone who had
    // drilled the short lessons. The exam now owns every question it asks.
    const shortQuestions = lessons
      .filter(
        (lesson) => lesson.skill === "reading" || lesson.skill === "listening",
      )
      .flatMap((lesson) => lesson.questions);
    const shortIds = new Set(
      shortQuestions.flatMap((q) => [q.id, `full-${q.id}`]),
    );
    const shortTexts = new Set(shortQuestions.map((q) => q.text));
    const examQuestions = [...fullReading, ...fullListening].flatMap(
      (lesson) => lesson.questions,
    );
    expect(examQuestions.filter((q) => q.id.startsWith("full-"))).toHaveLength(
      0,
    );
    for (const q of examQuestions) {
      expect(shortIds.has(q.id), q.id).toBe(false);
      expect(shortTexts.has(q.text), q.id).toBe(false);
    }
    expect(fullReading.flatMap((l) => l.questions)).toHaveLength(40);
    expect(fullListening.flatMap((l) => l.questions)).toHaveLength(35);
  });
  it("answers every Reading question from the passage the exam shows", () => {
    // The exam passage is the short text plus new paragraphs, so an item
    // written for the short lesson could ask about an end that moved.
    for (const lesson of fullReading)
      for (const q of lesson.questions) {
        if (!q.evidence) continue;
        expect(lesson.text.includes(q.evidence), `${lesson.id}/${q.id}`).toBe(
          true,
        );
      }
  });
  it("points every end-of-passage question at the real last paragraph", () => {
    for (const lesson of fullReading) {
      const paragraphs = lesson.text.split(/\n\n+/);
      const last = paragraphs[paragraphs.length - 1];
      for (const q of lesson.questions) {
        if (!/final paragraph|last paragraph/i.test(q.text)) continue;
        if (!q.evidence) continue;
        expect(last.includes(q.evidence), `${lesson.id}/${q.id}`).toBe(true);
      }
    }
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
    // Answer every objective question so the recovery of all four stages is
    // what is under test, not the abandoned-exam path.
    for (const lesson of [...fullListening, ...fullReading])
      for (const question of lesson.questions)
        s.exam.answers[question.id] = question.answer;
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
  it("scores an active exam against its frozen lesson version", () => {
    const lesson = fullListening[0];
    const originalAnswer = lesson.questions[0].answer;
    const s = freshState();
    const now = Date.now();
    s.exam = {
      id: "versioned-exam",
      mode: "full",
      startedAt: now,
      deadline: now + 2400000,
      stage: 0,
      answers: { [lesson.questions[0].id]: originalAnswer },
      writing: "",
      writingTask2: "",
      finished: false,
      lessonSnapshots: structuredClone(fullListening),
    };
    try {
      lesson.questions[0].answer = (originalAnswer + 1) % 4;
      const result = advanceExam(s, now + 1000, true);
      const attempt = result.attempts.find(
        (item) => item.lessonId === lesson.id,
      );
      expect(attempt).toMatchObject({ correct: 1, total: 1 });
      expect(attempt?.lessonSnapshot?.questions[0].answer).toBe(originalAnswer);
    } finally {
      lesson.questions[0].answer = originalAnswer;
    }
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
