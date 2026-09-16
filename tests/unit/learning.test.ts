import { describe, expect, it } from "vitest";
import {
  MINI_EXAM_MINUTES,
  PLAN_EXTRA_MINUTES,
  PLAN_MAX_LESSONS,
  SPARE_WORTH_SAYING,
  TYPE_EVIDENCE_MINIMUM,
  TYPE_STEP_MINIMUM,
  addSavedWord,
  advanceExam,
  attemptLesson,
  compareSittings,
  dayOffset,
  daysUntil,
  examMinutes,
  examSittings,
  examStages,
  examWeekPlan,
  freshState,
  getExamStages,
  libraryKey,
  localDay,
  milestones,
  mistakeReviewKey,
  mistakes,
  nextStep,
  objectiveInsights,
  openVocabulary,
  personalizeLegacyState,
  profileSchema,
  questionTypeStats,
  quickSession,
  recordAttempt,
  removeSavedWord,
  savedWords,
  scheduleReview,
  scoreAnswers,
  skillStats,
  spareStep,
  stateSchema,
  streak,
  todayPlan,
  type Attempt,
  weakQuestionTypes,
  whatsNext,
  wordCardFor,
  wordCount,
} from "../../src/lib/learning";
import { lessons, vocabulary } from "../../src/lib/content";
import { readQuizDraft } from "../../src/lib/quiz-draft";
import {
  allCriteria,
  criteriaFor,
  SELF_CHECK_DISCLAIMER,
} from "../../src/lib/criteria";
const now = new Date("2026-09-08T18:00:00+07:00");
/** Read the keys from the content so a change of option order cannot lie. */
function keys(lessonId = "reading-cafe") {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  return Object.fromEntries(
    lesson.questions.map((question) => [question.id, question.answer]),
  );
}
/** Every answer right except the named questions. */
function missing(wrong: string[], lessonId = "reading-cafe") {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  return Object.fromEntries(
    lesson.questions.map((question) => [
      question.id,
      wrong.includes(question.id)
        ? (question.answer + 1) % question.options.length
        : question.answer,
    ]),
  );
}
function attempt(date: string, extra: Partial<Attempt> = {}): Attempt {
  return {
    id: date,
    lessonId: "reading-cafe",
    skill: "reading",
    date,
    answers: keys(),
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
    expect(scoreAnswers("reading-cafe", keys())).toEqual({
      correct: 5,
      total: 5,
    });
    expect(scoreAnswers("reading-cafe", { rc1: keys().rc1 })).toEqual({
      correct: 1,
      total: 5,
    });
  });
  it("does not invent scores for productive skills or a fresh learner", () => {
    expect(scoreAnswers("writing-email", {})).toEqual({ correct: 0, total: 0 });
    expect(skillStats(freshState(), "reading").accuracy).toBeNull();
  });
  it("measures accuracy over recent questions, not recent attempts", () => {
    const s = freshState();
    // Distinct materials, so every attempt is a first meeting: six five-question
    // lessons answered perfectly, then a sitting that files one attempt per
    // material — the shape of a timed exam section.
    s.attempts = [
      ...Array.from({ length: 6 }, (_, i) => ({
        ...attempt(`2026-09-0${i + 1}T10:00:00Z`, { correct: 5 }),
        lessonId: `lesson-${i}`,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        ...attempt(`2026-09-08T1${i}:00:00Z`, { correct: 0, total: 1 }),
        id: `exam-${i}`,
        lessonId: `exam-part-${i}`,
        answers: {},
      })),
    ];
    // Eight wrong single-question parts cannot stand for the whole skill: the
    // window keeps reading back until it holds thirty questions. 25 of 33 —
    // the eight exam parts plus the five lessons it takes to fill the window.
    // Counting attempts alone would have read 0%.
    expect(skillStats(s, "reading").accuracy).toBe(76);
    expect(skillStats(s, "reading").count).toBe(14);
  });
  it("forgets work that has fallen out of the recent-question window", () => {
    const s = freshState();
    s.attempts = [
      { ...attempt("2026-09-01T10:00:00Z", { correct: 0 }), lessonId: "old" },
      ...Array.from({ length: 6 }, (_, i) => ({
        ...attempt(`2026-09-0${i + 2}T10:00:00Z`, { correct: 5 }),
        lessonId: `lesson-${i}`,
      })),
    ];
    expect(skillStats(s, "reading").accuracy).toBe(100);
  });
  it("does not let repeating a known lesson raise the ability figure", () => {
    // Two Reading lessons first done at 2 of 5 each: the honest figure is 40%.
    const s = freshState();
    for (const [index, id] of ["reading-cafe", "reading-garden"].entries())
      s.attempts.push({
        ...attempt(`2026-09-0${index + 1}T10:00:00Z`, { correct: 2 }),
        id: `first-${id}`,
        lessonId: id,
        answers: missing(
          lessons
            .find((l) => l.id === id)!
            .questions.slice(2)
            .map((q) => q.id),
          id,
        ),
      });
    expect(skillStats(s, "reading").accuracy).toBe(40);
    // Four repeats with every answer right — inevitable once the library runs
    // out. Before this was separated, the figure read 80% and the skill lost
    // the priority that todayPlan gives anything under 65%.
    for (let round = 0; round < 4; round++) {
      const id = round % 2 ? "reading-garden" : "reading-cafe";
      s.attempts.push({
        ...attempt(`2026-09-1${round}T10:00:00Z`, { correct: 5 }),
        id: `redo-${round}`,
        lessonId: id,
        answers: keys(id),
      });
    }
    const stats = skillStats(s, "reading");
    expect(stats.accuracy).toBe(40);
    expect(stats.practiceAccuracy).toBe(100);
    expect(stats.firstCount).toBe(2);
    expect(stats.practiceCount).toBe(4);
  });
  it("counts a lesson met again after a content change as new material", () => {
    const s = freshState();
    const lesson = lessons.find((l) => l.id === "reading-cafe")!;
    const snapshot = (version: number) => ({
      ...structuredClone(lesson),
      version,
    });
    s.attempts = [
      {
        ...attempt("2026-09-01T10:00:00Z", { correct: 5 }),
        id: "v2",
        lessonSnapshot: snapshot(2),
      },
      {
        ...attempt("2026-09-02T10:00:00Z", { correct: 5 }),
        id: "v3",
        lessonSnapshot: snapshot(3),
      },
    ];
    // Rewritten questions are material she has not met, so both count.
    expect(skillStats(s, "reading").firstCount).toBe(2);
    expect(skillStats(s, "reading").practiceCount).toBe(0);
  });
  it("lets the notebook forget a mistake the learner has since got right", () => {
    // Reproduces the reported behaviour: before this, answering the same
    // question correctly later left the card in the book and still due, so the
    // notebook could only ever grow and kept asking for a fixed mistake.
    const lesson = lessons.find((l) => l.id === "reading-cafe")!;
    let s = freshState();
    s = recordAttempt(s, {
      ...attempt("2026-09-01T10:00:00Z", { correct: 4 }),
      id: "wrong",
      answers: missing(["rc1"]),
    });
    expect(mistakes(s).map((m) => [m.question.id, m.due, m.fixed])).toEqual([
      ["rc1", true, false],
    ]);
    s = recordAttempt(s, {
      ...attempt("2026-09-05T10:00:00Z", { correct: 5 }),
      id: "right",
      answers: keys(),
    });
    const after = mistakes(s);
    expect(after).toHaveLength(1);
    expect(after[0].due).toBe(false);
    expect(after[0].fixed).toBe(true);
    // Getting it right counts as a review passed, so the card comes back later
    // rather than never or immediately.
    expect(s.mistakeReviews[mistakeReviewKey(lesson, "rc1")]).toBeTruthy();
  });
  it("puts a mistake back in the queue when it is repeated", () => {
    let s = freshState();
    for (const [index, answers] of [
      missing(["rc1"]),
      keys(),
      missing(["rc1"]),
    ].entries())
      s = recordAttempt(s, {
        ...attempt(`2026-09-0${index + 1}T10:00:00Z`, {
          correct: index === 1 ? 5 : 4,
        }),
        id: `round-${index}`,
        answers,
      });
    const card = mistakes(s)[0];
    expect(card.fixed).toBe(false);
    expect(card.due).toBe(true);
    expect(card.wrongCount).toBe(2);
  });
  it("offers a lesson longer than the daily budget as a split session", () => {
    // writing-essay is 40 minutes against a 30-minute rhythm, so it never once
    // appeared in fourteen simulated days before this.
    let s = freshState();
    s.profile = { ...s.profile, onboarded: true };
    const offered = new Set<string>();
    let flagged = false;
    // Three weeks, not two: after A4 the library holds more material than a
    // fortnight of 30-minute days, which is the point of expanding it. The
    // claim under test is that nothing is unreachable, not that everything
    // arrives inside two weeks.
    for (let day = 0; day < 21; day++) {
      const when = new Date(
        Date.parse("2026-09-01T10:00:00+07:00") + day * 86400000,
      );
      const plan = todayPlan(s, when);
      for (const lesson of plan.lessons) {
        offered.add(lesson.id);
        if (plan.longer.includes(lesson.id)) {
          flagged = true;
          expect(lesson.minutes).toBeGreaterThan(plan.budget);
          expect(plan.reasons[lesson.id][0]).toContain("Bài dài");
        }
        // Answer everything correctly: a learner who answers nothing keeps the
        // plan pinned to the lessons she is failing, which is a different case.
        const answers = keys(lesson.id);
        s = recordAttempt(s, {
          id: `${day}-${lesson.id}`,
          lessonId: lesson.id,
          skill: lesson.skill,
          date: when.toISOString(),
          answers,
          correct: lesson.questions.length,
          total: lesson.questions.length,
          seconds: lesson.minutes * 60,
        });
      }
    }
    expect(offered.has("writing-essay")).toBe(true);
    expect(flagged).toBe(true);
    // Every lesson in the library still has a route into the daily plan.
    expect(offered.size).toBe(lessons.length);
  });
  it("reads the error rate of each question type from first meetings only", () => {
    const lesson = lessons.find((l) => l.id === "reading-cafe")!;
    const wrongIds = lesson.questions
      .filter((q) => q.tag === "Thông tin chi tiết")
      .map((q) => q.id);
    let s = freshState();
    s = recordAttempt(s, {
      ...attempt("2026-09-01T10:00:00Z", { correct: 5 - wrongIds.length }),
      id: "first",
      answers: missing(wrongIds),
      confidence: Object.fromEntries(wrongIds.map((id) => [id, "sure"])),
    });
    const detail = questionTypeStats(s).find(
      (t) => t.tag === "Thông tin chi tiết",
    )!;
    expect(detail.wrong).toBe(wrongIds.length);
    expect(detail.confidentWrong).toBe(wrongIds.length);
    // A repeat of the same lesson is practice, not new evidence about the type.
    s = recordAttempt(s, {
      ...attempt("2026-09-05T10:00:00Z", { correct: 5 }),
      id: "again",
      answers: keys(),
    });
    expect(
      questionTypeStats(s).find((t) => t.tag === "Thông tin chi tiết")!.asked,
    ).toBe(detail.asked);
  });
  it("ignores a question type until there is enough of it to judge", () => {
    const lesson = lessons.find((l) => l.id === "reading-cafe")!;
    const rare = lesson.questions.find(
      (q) => q.tag === "Từ vựng trong ngữ cảnh",
    )!;
    let s = freshState();
    s = recordAttempt(s, {
      ...attempt("2026-09-01T10:00:00Z", { correct: 4 }),
      answers: missing([rare.id]),
    });
    // One question of that type is not evidence, however badly it went.
    expect(weakQuestionTypes(s).map((t) => t.tag)).not.toContain(rare.tag);
    expect(
      questionTypeStats(s).find((t) => t.tag === rare.tag)!.asked,
    ).toBeLessThan(TYPE_EVIDENCE_MINIMUM);
  });
  it("names the weak question type in the reason for choosing a lesson", () => {
    // Three detail questions wrong across two lessons: enough to act on.
    let s = freshState();
    s.profile = { ...s.profile, onboarded: true };
    for (const [index, id] of ["reading-cafe", "reading-garden"].entries()) {
      const lesson = lessons.find((l) => l.id === id)!;
      const wrongIds = lesson.questions
        .filter((q) => q.tag === "Thông tin chi tiết")
        .map((q) => q.id);
      s = recordAttempt(s, {
        ...attempt(`2026-09-0${index + 1}T10:00:00Z`, {
          correct: lesson.questions.length - wrongIds.length,
        }),
        id: `seed-${id}`,
        lessonId: id,
        answers: missing(wrongIds, id),
      });
    }
    const plan = todayPlan(s, new Date("2026-09-10T10:00:00+07:00"));
    const named = Object.values(plan.reasons)
      .flat()
      .filter((reason) => reason.startsWith("Thông tin chi tiết: sai"));
    expect(named.length).toBeGreaterThan(0);
    expect(named[0]).toMatch(/sai \d+\/\d+ câu đã làm/);
  });
  it("keeps offering new material to a learner who keeps answering wrong", () => {
    // Before the mistake bonus was capped and a slot reserved for unseen work,
    // this learner was served the same handful of lessons for a fortnight.
    let s = freshState();
    s.profile = { ...s.profile, onboarded: true };
    const offered = new Set<string>();
    for (let day = 0; day < 14; day++) {
      const when = new Date(
        Date.parse("2026-09-01T10:00:00+07:00") + day * 86400000,
      );
      for (const lesson of todayPlan(s, when).lessons) {
        offered.add(lesson.id);
        s = recordAttempt(s, {
          id: `${day}-${lesson.id}`,
          lessonId: lesson.id,
          skill: lesson.skill,
          date: when.toISOString(),
          answers: {},
          correct: 0,
          total: lesson.questions.length,
          seconds: lesson.minutes * 60,
        });
      }
    }
    expect(offered.size).toBeGreaterThanOrEqual(12);
  });
  it("separates misconceptions from uncertain correct answers by question type", () => {
    const questions = lessons.find(
      (lesson) => lesson.id === "reading-cafe",
    )!.questions;
    const insight = objectiveInsights(questions, missing(["rc1"]), {
      rc1: "sure",
      rc2: "unsure",
      rc3: "sure",
      rc4: "sure",
      rc5: "guess",
    });
    expect(insight.confidentErrors).toBe(1);
    expect(insight.fragileCorrect).toBe(2);
    expect(insight.secureCorrect).toBe(2);
    expect(insight.byTag.reduce((sum, item) => sum + item.total, 0)).toBe(5);
    expect(insight.byTag.find((item) => item.tag === "Ý chính")).toEqual({
      tag: "Ý chính",
      correct: 0,
      total: 1,
    });
  });
  it("stores a mistake only once even across repeated errors", () => {
    const s = freshState();
    s.attempts = [
      attempt(now.toISOString(), { answers: missing(["rc1"]) }),
      attempt(now.toISOString(), { id: "second", answers: missing(["rc1"]) }),
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
  it("keeps submitted history stable when a later content version changes", () => {
    const lesson = lessons.find((item) => item.id === "reading-cafe")!;
    const answers = Object.fromEntries(
      lesson.questions.map((question) => [question.id, question.answer]),
    );
    const saved = recordAttempt(
      freshState(),
      attempt(now.toISOString(), { answers }),
    );
    const originalAnswer = lesson.questions[0].answer;
    const originalTitle = lesson.title;
    try {
      lesson.questions[0].answer = (originalAnswer + 1) % 4;
      lesson.title = "A later editorial title";
      expect(mistakes(saved)).toHaveLength(0);
      // The copy now lives once in the shared library and the attempt points
      // at it; what it must still guarantee is unchanged.
      const kept = attemptLesson(saved, saved.attempts[0])!;
      expect(kept).toMatchObject({
        version: lesson.version,
        title: originalTitle,
      });
      expect(kept.questions[0].answer).toBe(originalAnswer);
      expect(saved.attempts[0].lessonRef).toBe(
        libraryKey("reading-cafe", lesson.version),
      );
    } finally {
      lesson.questions[0].answer = originalAnswer;
      lesson.title = originalTitle;
    }
  });
  it("keeps mistake schedules separate across lesson versions", () => {
    const first = recordAttempt(
      freshState(),
      attempt(now.toISOString(), {
        answers: missing(["rc1"]),
        correct: 4,
      }),
    ).attempts[0];
    const saved = recordAttempt(
      freshState(),
      attempt(now.toISOString(), { answers: missing(["rc1"]), correct: 4 }),
    );
    const worked = attemptLesson(saved, first)!;
    const newer = { ...structuredClone(worked), version: worked.version + 1 };
    const second = {
      ...structuredClone(first),
      id: "version-two",
      lessonRef: libraryKey(newer.id, newer.version),
    };
    const s = freshState();
    s.attempts = [first, second];
    s.library = {
      ...saved.library,
      [libraryKey(newer.id, newer.version)]: newer,
    };
    const errors = mistakes(s);
    expect(errors).toHaveLength(2);
    expect(new Set(errors.map((item) => item.key)).size).toBe(2);
  });
  it("drops incompatible quiz answers instead of applying indices to new content", () => {
    const lesson = lessons.find((item) => item.id === "reading-cafe")!;
    expect(
      readQuizDraft(
        JSON.stringify({
          contentVersion: lesson.version + 1,
          answers: { rc1: keys().rc1 },
          confidence: { rc1: "sure" },
          seconds: 30,
        }),
        lesson,
      ),
    ).toEqual({ answers: {}, confidence: {}, seconds: 0 });
  });
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
        answers: missing(["rc1", "rc2"]),
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
      answers: { lw1: keys("listening-weekend").lw1 },
      writing: "",
      finished: false,
    };
    return s;
  }
  it("does not advance before the deadline", () => {
    const s = exam();
    expect(advanceExam(s, now.getTime() + 1000)).toBe(s);
  });
  it("saves the answered section, skips the untouched one, and moves on", () => {
    const s = advanceExam(exam(), now.getTime() + 600000);
    expect(s.exam?.stage).toBe(1);
    expect(s.attempts.map((a) => a.lessonId)).toEqual(["listening-weekend"]);
    expect(s.attempts[0].correct).toBe(1);
    // The learner sat the whole stage, so all of its time belongs to the one
    // section she worked on rather than being halved with an untouched lesson.
    expect(s.attempts.reduce((n, a) => n + a.seconds, 0)).toBe(600);
  });
  it("invents no score, no minutes and no lost review schedule when abandoned", () => {
    const s = freshState();
    const earned = `reading-cafe@v${lessons.find((item) => item.id === "reading-cafe")!.version}:rc1`;
    s.mistakeReviews[earned] = {
      ...scheduleReview(undefined, "easy"),
      interval: 120,
      repetitions: 6,
    };
    s.exam = {
      id: "abandoned",
      startedAt: now.getTime(),
      stage: 0,
      deadline: now.getTime() + 600000,
      answers: {},
      writing: "",
      finished: false,
    };
    const after = advanceExam(s, now.getTime() + 4 * 86400000);
    expect(after.exam?.finished).toBe(true);
    expect(after.attempts).toHaveLength(0);
    expect(after.mistakeReviews[earned]?.interval).toBe(120);
  });
  it("keeps a schedule the learner simply ran out of time to answer", () => {
    const s = freshState();
    const cafe = lessons.find((item) => item.id === "reading-cafe")!;
    const key = (question: string) =>
      `reading-cafe@v${cafe.version}:${question}`;
    s.mistakeReviews[key("rc2")] = {
      ...scheduleReview(undefined, "easy"),
      interval: 90,
      repetitions: 5,
    };
    // rc1 answered wrong, rc2 left blank.
    const next = recordAttempt(s, {
      id: "partial",
      lessonId: "reading-cafe",
      skill: "reading",
      date: now.toISOString(),
      answers: { rc1: missing(["rc1"]).rc1 },
      correct: 0,
      total: 5,
      seconds: 60,
    });
    expect(next.mistakeReviews[key("rc1")]).toBeUndefined();
    expect(next.mistakeReviews[key("rc2")]?.interval).toBe(90);
  });
  it("anchors early submission to its real submission time", () => {
    const s = advanceExam(exam(), now.getTime() + 20000, true);
    expect(s.exam?.deadline).toBe(now.getTime() + 20000 + 900000);
    expect(s.attempts.reduce((n, a) => n + a.seconds, 0)).toBe(20);
  });
  it("catches up every expired stage after a long absence without inventing work", () => {
    const s = advanceExam(exam(), now.getTime() + 3600000);
    expect(s.exam?.finished).toBe(true);
    // Only listening-weekend was answered; the other three sections and the
    // blank writing and speaking stages leave no trace.
    expect(s.attempts.map((a) => a.lessonId)).toEqual(["listening-weekend"]);
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
  it("uses the stage plan captured when the exam started", () => {
    const s = freshState();
    const picked = [
      lessons.find((lesson) => lesson.id === "reading-cafe")!,
      lessons.find((lesson) => lesson.id === "listening-weekend")!,
      lessons.find((lesson) => lesson.id === "writing-email")!,
      lessons.find((lesson) => lesson.id === "speaking-social")!,
    ];
    s.exam = {
      id: "frozen-plan",
      startedAt: now.getTime(),
      stage: 0,
      deadline: now.getTime() + 7000,
      answers: { rc1: 1 },
      writing: "",
      finished: false,
      lessonSnapshots: structuredClone(picked),
      stagePlan: [
        {
          skill: "reading",
          label: "Đọc",
          seconds: 7,
          lessonIds: ["reading-cafe"],
        },
        {
          skill: "listening",
          label: "Nghe",
          seconds: 8,
          lessonIds: ["listening-weekend"],
        },
        {
          skill: "writing",
          label: "Viết",
          seconds: 9,
          lessonIds: ["writing-email"],
        },
        {
          skill: "speaking",
          label: "Nói",
          seconds: 10,
          lessonIds: ["speaking-social"],
        },
      ],
    };
    expect(stateSchema.safeParse(s).success).toBe(true);
    const result = advanceExam(s, s.exam.deadline);
    expect(result.exam?.stage).toBe(1);
    expect(result.exam?.deadline).toBe(now.getTime() + 15000);
    expect(result.attempts.map((item) => item.lessonId)).toEqual([
      "reading-cafe",
    ]);
  });
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
    for (const l of lessons.filter((l) => l.sample && l.minWords))
      expect(wordCount(l.sample!), l.id).toBeGreaterThanOrEqual(l.minWords!);
  });
  it("gives every speaking prompt an answer to compare against", () => {
    // Writing has had a sample since the start; speaking had none, which is
    // the harder half to self-study precisely because nothing shows what a
    // finished answer sounds like.
    for (const lesson of lessons.filter((item) => item.skill === "speaking")) {
      expect(lesson.sample, lesson.id).toBeTruthy();
      expect(wordCount(lesson.sample!), lesson.id).toBeGreaterThanOrEqual(120);
    }
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
  it("rejects inconsistent lesson snapshots in imported history", () => {
    const saved = recordAttempt(freshState(), attempt(now.toISOString()));
    const ref = saved.attempts[0].lessonRef!;
    const shared = () => saved.library![ref];
    expect(stateSchema.safeParse(saved).success).toBe(true);

    const invalidAnswer = structuredClone(saved);
    invalidAnswer.library![ref].questions[0].answer = 7;
    expect(stateSchema.safeParse(invalidAnswer).success).toBe(false);

    // A backup that points an attempt at another lesson is rejected, whether
    // the copy travels on the attempt or in the shared library.
    const mismatchedLesson = structuredClone(saved);
    mismatchedLesson.library![ref].id = "another-lesson";
    expect(stateSchema.safeParse(mismatchedLesson).success).toBe(false);

    const mismatchedScore = structuredClone(saved);
    mismatchedScore.attempts[0].correct = 0;
    expect(stateSchema.safeParse(mismatchedScore).success).toBe(false);

    const shortened = structuredClone(saved);
    shortened.library![ref].questions.pop();
    expect(stateSchema.safeParse(shortened).success).toBe(false);

    const duplicateOption = structuredClone(saved);
    duplicateOption.library![ref].questions[0].options[1] =
      shared().questions[0].options[0];
    expect(stateSchema.safeParse(duplicateOption).success).toBe(false);

    // And an attempt carrying its own copy, as every older one does, is still
    // checked exactly as before.
    const legacy = structuredClone(saved);
    legacy.attempts[0] = {
      ...legacy.attempts[0],
      lessonRef: undefined,
      lessonSnapshot: structuredClone(shared()),
    };
    expect(stateSchema.safeParse(legacy).success).toBe(true);
    legacy.attempts[0].lessonSnapshot!.id = "another-lesson";
    expect(stateSchema.safeParse(legacy).success).toBe(false);
  });
  it("upgrades compatible legacy history and active exams to frozen content", () => {
    const legacy = freshState();
    legacy.attempts = [attempt(now.toISOString())];
    legacy.exam = {
      id: "legacy-exam",
      startedAt: now.getTime(),
      stage: 0,
      deadline: now.getTime() + 600000,
      answers: {},
      writing: "",
      finished: false,
    };
    const upgraded = personalizeLegacyState(legacy);
    expect(attemptLesson(upgraded, upgraded.attempts[0])).toMatchObject({
      id: "reading-cafe",
      version: lessons.find((item) => item.id === "reading-cafe")!.version,
    });
    expect(upgraded.exam?.stagePlan).toEqual(examStages);
    expect(upgraded.exam?.lessonSnapshots).not.toHaveLength(0);
    expect(stateSchema.safeParse(upgraded).success).toBe(true);
  });
});

describe("the exam date as a plan for the week", () => {
  const withExam = (days: number | null) => {
    const state = freshState();
    state.profile = {
      ...state.profile,
      onboarded: true,
      examDate: days === null ? "" : dayOffset(localDay(now), days),
    };
    return state;
  };
  it("says nothing at all when no exam date is set", () => {
    // The old behaviour invented nothing either, but the interface had no way
    // of telling "no date" from "date far away".
    expect(examWeekPlan(withExam(null), now)).toBeNull();
    expect(todayPlan(withExam(null), now).phase).toBeNull();
  });
  it("says nothing once the date has passed rather than counting backwards", () => {
    expect(examWeekPlan(withExam(-3), now)).toBeNull();
  });
  it("splits the remaining time into phases that do different things", () => {
    expect(examWeekPlan(withExam(90), now)?.key).toBe("foundation");
    expect(examWeekPlan(withExam(30), now)?.key).toBe("weak-types");
    expect(examWeekPlan(withExam(10), now)?.key).toBe("rehearsal");
    // The boundaries themselves belong to the nearer phase.
    expect(examWeekPlan(withExam(42), now)?.key).toBe("weak-types");
    expect(examWeekPlan(withExam(14), now)?.key).toBe("rehearsal");
  });
  it("builds the week from real data, and admits when there is none", () => {
    const empty = examWeekPlan(withExam(30), now)!;
    expect(empty.thisWeek.join(" ")).toContain("Chưa đủ dữ liệu");
    // reading-garden carries four detail questions: enough of one type for an
    // error rate to mean anything.
    const wrongIds = lessons
      .find((lesson) => lesson.id === "reading-garden")!
      .questions.filter((question) => question.tag === "Thông tin chi tiết")
      .slice(0, 3)
      .map((question) => question.id);
    const state = recordAttempt(withExam(30), {
      ...attempt("2026-09-01T10:00:00Z", {
        id: "first",
        lessonId: "reading-garden",
        answers: missing(wrongIds, "reading-garden"),
        correct: 5 - wrongIds.length,
      }),
    });
    const named = examWeekPlan(state, now)!;
    expect(named.thisWeek[0]).toContain("Thông tin chi tiết");
    expect(named.thisWeek.join(" ")).not.toContain("Chưa đủ dữ liệu");
  });
  it("prefers B2 material only in the last two weeks", () => {
    const soon = todayPlan(withExam(7), now);
    const far = todayPlan(withExam(90), now);
    const b2 = (plan: ReturnType<typeof todayPlan>) =>
      plan.lessons.filter((lesson) => lesson.level === "B2").length;
    expect(b2(soon)).toBeGreaterThan(b2(far));
    expect(
      Object.values(soon.reasons)
        .flat()
        .some((reason) => reason.includes("hai tuần cuối")),
    ).toBe(true);
  });
});
describe("milestones that really happened", () => {
  it("shows nothing to a learner who has done nothing", () => {
    expect(milestones(freshState(), now)).toEqual([]);
  });
  it("counts a streak only from days that have attempts", () => {
    const state = freshState();
    state.attempts = [
      attempt("2026-09-06T10:00:00Z"),
      attempt("2026-09-07T10:00:00Z"),
    ];
    expect(milestones(state, now)).toEqual([]);
    state.attempts.push(attempt("2026-09-08T03:00:00Z"));
    const found = milestones(state, now);
    expect(found[0].title).toContain("3 ngày");
    expect(found[0].detail).toContain("2026-09-08");
  });
  it("celebrates a question type only after it was actually wrong first", () => {
    const garden = (id: string, date: string, wrong: string[]) =>
      attempt(date, {
        id,
        lessonId: "reading-garden",
        answers: missing(wrong, "reading-garden"),
        correct: 5 - wrong.length,
      });
    const clean = freshState();
    clean.attempts = [garden("clean", "2026-09-06T10:00:00Z", [])];
    expect(
      milestones(clean, now).some((item) => item.id.startsWith("type:")),
    ).toBe(false);
    const detail = lessons
      .find((lesson) => lesson.id === "reading-garden")!
      .questions.filter((question) => question.tag === "Thông tin chi tiết")
      .map((question) => question.id);
    const fixed = freshState();
    fixed.attempts = [
      garden("wrong", "2026-09-06T10:00:00Z", detail),
      garden("right", "2026-09-07T10:00:00Z", []),
    ];
    const earned = milestones(fixed, now).find((item) =>
      item.id.startsWith("type:"),
    );
    expect(earned?.title).toContain("Thông tin chi tiết");
    expect(earned?.detail).toContain("2026-09-07");
    expect(earned?.detail).toContain(`${detail.length}/${detail.length} câu`);
  });
  it("reports a word only once it is genuinely remembered long", () => {
    const state = freshState();
    state.reviews[vocabulary[0].id] = {
      due: "2026-11-01T10:00:00.000Z",
      interval: 59,
      ease: 2.5,
      repetitions: 6,
      lastDate: "2026-09-03",
    };
    expect(milestones(state, now).some((i) => i.id.startsWith("word:"))).toBe(
      false,
    );
    state.reviews[vocabulary[0].id].interval = 61;
    const word = milestones(state, now).find((i) => i.id.startsWith("word:"));
    expect(word?.title).toContain(vocabulary[0].word);
    expect(word?.detail).toContain("2026-09-03");
  });
});

describe("a ten-minute session for a day with no time in it", () => {
  it("fits inside ten minutes and starts with something short to listen to", () => {
    const session = quickSession(freshState(), now)!;
    expect(session.lesson.minutes).toBeLessThanOrEqual(8);
    expect(session.lesson.skill).toBe("listening");
    expect(session.words.length).toBeLessThanOrEqual(3);
  });
  it("prefers material she has not met yet", () => {
    const first = quickSession(freshState(), now)!;
    const state = freshState();
    state.attempts = [
      attempt("2026-09-07T10:00:00Z", {
        id: "done",
        lessonId: first.lesson.id,
        skill: first.lesson.skill,
        answers: {},
        correct: 0,
        total: first.lesson.questions.length,
      }),
    ];
    expect(quickSession(state, now)!.lesson.id).not.toBe(first.lesson.id);
  });
  it("says plainly when there is nothing due rather than inventing work", () => {
    const state = freshState();
    for (const word of vocabulary)
      state.reviews[word.id] = {
        due: "2026-12-01T10:00:00.000Z",
        interval: 30,
        ease: 2.5,
        repetitions: 3,
        lastDate: "2026-09-01",
      };
    const session = quickSession(state, now)!;
    expect(session.words).toEqual([]);
    expect(session.mistake).toBeUndefined();
  });
  it("puts the most repeated mistake first", () => {
    let state = freshState();
    const wrong = ["rc1"];
    state = recordAttempt(state, {
      ...attempt("2026-09-05T10:00:00Z", {
        id: "one",
        answers: missing(wrong),
        correct: 4,
      }),
    });
    state = recordAttempt(state, {
      ...attempt("2026-09-06T10:00:00Z", {
        id: "two",
        answers: missing(wrong),
        correct: 4,
      }),
    });
    const session = quickSession(state, now)!;
    expect(session.mistake?.question.id).toBe("rc1");
    expect(session.mistake?.wrongCount).toBe(2);
  });
});

describe("word cards that grow out of her own mistakes", () => {
  it("only offers a card for a question one was written for", () => {
    expect(wordCardFor("rk4")?.word).toBe("doubtful");
    expect(wordCardFor("rk1")).toBeUndefined();
  });
  it("adds a card once, keeps the source, and takes its schedule away again", () => {
    let state = addSavedWord(freshState(), "rk4", now);
    state = addSavedWord(state, "rk4", now);
    const deck = savedWords(state);
    expect(deck).toHaveLength(1);
    expect(deck[0].id).toBe("w:rk4");
    expect(deck[0].questionId).toBe("rk4");
    expect(deck[0].meaning).toContain("thuyết phục");
    state = {
      ...state,
      reviews: {
        ...state.reviews,
        "w:rk4": scheduleReview(undefined, "good", now),
      },
    };
    state = removeSavedWord(state, "rk4");
    expect(savedWords(state)).toEqual([]);
    expect(state.reviews["w:rk4"]).toBeUndefined();
  });
  it("ignores a question with no card instead of inventing one", () => {
    expect(savedWords(addSavedWord(freshState(), "rk1", now))).toEqual([]);
  });
  it("keeps reading backups written before word cards existed", () => {
    const old = freshState();
    delete (old as { savedWords?: unknown }).savedWords;
    expect(stateSchema.safeParse(old).success).toBe(true);
    expect(savedWords(old)).toEqual([]);
  });
});

describe("Mây's own self-check criteria", () => {
  it("gives Writing and Speaking a checklist and objective lessons none", () => {
    const letter = criteriaFor({
      id: "writing-email",
      skill: "writing",
      part: "Task 1 • Email",
    });
    const essay = criteriaFor({
      id: "writing-essay",
      skill: "writing",
      part: "Task 2 • Essay",
    });
    expect(letter?.key).toBe("w1");
    expect(essay?.key).toBe("w2");
    expect(letter?.items).not.toEqual(essay?.items);
    expect(
      criteriaFor({
        id: "speaking-topic",
        skill: "speaking",
        part: "Part 3 • Topic development",
      })?.key,
    ).toBe("s3");
    expect(
      criteriaFor({
        id: "reading-cafe",
        skill: "reading",
        part: "Đọc hiểu • Bài ngắn",
      }),
    ).toBeNull();
  });
  it("says in words that this is not the examiner's scale", () => {
    expect(SELF_CHECK_DISCLAIMER).toContain("không phải thang chấm");
  });
  it("keeps every criterion id unique and findable from history", () => {
    const ids = allCriteria.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of allCriteria) {
      expect(item.question.length).toBeGreaterThan(10);
      expect(item.look.length).toBeGreaterThan(10);
    }
  });
  it("stores a rating and a teacher's note without breaking older backups", () => {
    const state = freshState();
    const filed = {
      ...attempt("2026-09-08T10:00:00Z", { id: "w", skill: "writing" }),
      selfCheck: { "w1-task": 2 as const },
      feedback: "Cần một câu kết rõ hơn.",
    };
    state.attempts = [filed];
    expect(stateSchema.safeParse(state).success).toBe(true);
    // Out of range is rejected rather than silently stored.
    state.attempts = [{ ...filed, selfCheck: { "w1-task": 9 } }];
    expect(stateSchema.safeParse(state).success).toBe(false);
    const old = freshState();
    old.attempts = [attempt("2026-09-08T10:00:00Z", { id: "old" })];
    expect(stateSchema.safeParse(old).success).toBe(true);
  });
});

describe("sittings of the timed room", () => {
  const sitting = (
    id: string,
    prefix: string,
    date: string,
    listening: number,
    reading: number,
  ): Attempt[] => [
    attempt(date, {
      id: `exam:${id}:${prefix}-listen-1`,
      lessonId: `${prefix}-listen-1`,
      skill: "listening",
      correct: listening,
      total: 35,
      seconds: 2400,
    }),
    attempt(date, {
      id: `exam:${id}:${prefix}-read-1`,
      lessonId: `${prefix}-read-1`,
      skill: "reading",
      correct: reading,
      total: 40,
      seconds: 3600,
    }),
    attempt(date, {
      id: `exam:${id}:${prefix}-writing-1`,
      lessonId: `${prefix}-writing-1`,
      skill: "writing",
      correct: 0,
      total: 0,
      seconds: 1200,
    }),
  ];
  it("groups each sitting's parts back into one row", () => {
    const state = freshState();
    state.attempts = [
      ...sitting("s1", "full", "2026-08-01T02:00:00Z", 20, 24),
      ...sitting("s2", "exam2", "2026-09-01T02:00:00Z", 27, 28),
      // A single lesson practised outside the timed room stays out of it.
      attempt("2026-09-02T02:00:00Z", { id: "plain" }),
    ];
    const rows = examSittings(state);
    expect(rows.map((row) => row.paper)).toEqual(["full", "full2"]);
    expect(rows[1].listening).toEqual({ correct: 27, total: 35 });
    expect(rows[1].reading).toEqual({ correct: 28, total: 40 });
    expect(rows[1].writing).toBe(1);
    expect(rows[1].minutes).toBe(120);
  });
  it("reports the shift between two different papers", () => {
    const state = freshState();
    state.attempts = [
      ...sitting("s1", "full", "2026-08-01T02:00:00Z", 20, 24),
      ...sitting("s2", "exam2", "2026-09-01T02:00:00Z", 27, 28),
    ];
    const comparison = compareSittings(state)!;
    expect(comparison.comparable).toBe(true);
    // 20/35 → 27/35 is +20 points; 24/40 → 28/40 is +10.
    expect(comparison.listening).toBe(20);
    expect(comparison.reading).toBe(10);
  });
  it("refuses to call a repeat of one paper a measure of ability", () => {
    const state = freshState();
    state.attempts = [
      ...sitting("s1", "full", "2026-08-01T02:00:00Z", 20, 24),
      ...sitting("s2", "full", "2026-09-01T02:00:00Z", 31, 36),
    ];
    expect(compareSittings(state)!.comparable).toBe(false);
  });
  it("says nothing until there are two full-length sittings", () => {
    const state = freshState();
    state.attempts = sitting("s1", "full", "2026-08-01T02:00:00Z", 20, 24);
    expect(compareSittings(state)).toBe(null);
  });
});
describe("the day's budget", () => {
  const planFor = (dailyMinutes: number) => {
    const base = freshState();
    return todayPlan(
      { ...base, profile: { ...base.profile, dailyMinutes } },
      new Date("2026-09-14T08:00:00+07:00"),
    );
  };
  it("never plans more minutes than the learner set aside", () => {
    for (const dailyMinutes of [15, 20, 30, 45, 60, 90]) {
      const plan = planFor(dailyMinutes);
      const minutes = plan.lessons
        .filter((lesson) => !plan.longer.includes(lesson.id))
        .reduce((sum, lesson) => sum + lesson.minutes, 0);
      expect(minutes).toBeLessThanOrEqual(dailyMinutes);
    }
  });
  it("leaves a short day exactly as it was", () => {
    // Measured before this change: 18 of 20 minutes and 24 of 30.
    expect(
      planFor(20).lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    ).toBe(18);
    expect(
      planFor(30).lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    ).toBe(24);
  });
  it("fills an hour instead of handing back half of it", () => {
    const plan = planFor(60);
    const minutes = plan.lessons.reduce(
      (sum, lesson) => sum + lesson.minutes,
      0,
    );
    // The old plan stopped at three lessons: 38 of 60 minutes.
    expect(minutes).toBeGreaterThan(45);
    expect(plan.spare).toBeLessThan(PLAN_EXTRA_MINUTES);
    // No skill is allowed to take over the day.
    for (const skill of new Set(plan.lessons.map((lesson) => lesson.skill)))
      expect(
        plan.lessons.filter((lesson) => lesson.skill === skill).length,
      ).toBeLessThanOrEqual(2);
    expect(new Set(plan.lessons.map((lesson) => lesson.id)).size).toBe(
      plan.lessons.length,
    );
  });
  it("still explains why each extra lesson is there", () => {
    const plan = planFor(60);
    for (const lesson of plan.lessons)
      expect(plan.reasons[lesson.id].length).toBeGreaterThan(0);
  });
});

describe("the Writing and Speaking bank", () => {
  const of = (skill: string) => lessons.filter((l) => l.skill === skill);
  it("holds enough prompts for a fortnight of practice", () => {
    expect(of("writing").length).toBeGreaterThanOrEqual(9);
    expect(of("speaking").length).toBeGreaterThanOrEqual(9);
    // Both halves of the paper, and all three speaking parts, are present.
    for (const part of ["Task 1", "Task 2"])
      expect(
        of("writing").filter((l) => l.part.includes(part)).length,
      ).toBeGreaterThanOrEqual(3);
    for (const part of ["Part 1", "Part 2", "Part 3"])
      expect(
        of("speaking").filter((l) => l.part.includes(part)).length,
      ).toBeGreaterThanOrEqual(3);
  });
  it("shows the self-check list that matches each prompt", () => {
    for (const lesson of [...of("writing"), ...of("speaking")]) {
      const group = criteriaFor(lesson);
      expect(group, lesson.id).not.toBe(null);
      const expected = lesson.part.includes("Task 2")
        ? "w2"
        : lesson.part.includes("Task 1")
          ? "w1"
          : lesson.part.includes("Part 2")
            ? "s2"
            : lesson.part.includes("Part 3")
              ? "s3"
              : "s1";
      expect(group!.key, lesson.id).toBe(expected);
    }
  });
  it("gives every writing prompt a sample worth comparing against", () => {
    for (const lesson of of("writing")) {
      expect(lesson.minWords, lesson.id).toBeGreaterThan(0);
      expect(wordCount(lesson.sample ?? ""), lesson.id).toBeGreaterThan(
        lesson.minWords!,
      );
    }
  });
  it("no longer repeats a speaking prompt inside a fortnight", () => {
    // Measured before the bank grew: the first repeat fell on day 6.
    let state = freshState();
    const seen = new Set<string>();
    let firstRepeat = 0;
    for (let day = 0; day < 14; day++) {
      const now = new Date(
        Date.parse("2026-09-14T08:00:00+07:00") + day * 86400000,
      );
      for (const lesson of todayPlan(state, now).lessons) {
        if (lesson.skill === "speaking" && seen.has(lesson.id) && !firstRepeat)
          firstRepeat = day + 1;
        seen.add(lesson.id);
        state = recordAttempt(state, {
          id: `d${day}:${lesson.id}`,
          lessonId: lesson.id,
          skill: lesson.skill,
          date: now.toISOString(),
          correct: lesson.questions.length,
          total: lesson.questions.length,
          seconds: lesson.minutes * 60,
          answers: Object.fromEntries(
            lesson.questions.map((question) => [question.id, question.answer]),
          ),
        });
      }
    }
    expect(firstRepeat).toBe(0);
  });
});

describe("the vocabulary garden grows out of the lessons", () => {
  const sourced = vocabulary.filter((word) => word.source);
  it("holds enough cards, most of them from the lessons themselves", () => {
    expect(vocabulary.length).toBeGreaterThanOrEqual(60);
    expect(vocabulary.length).toBeLessThanOrEqual(80);
    expect(sourced.length).toBeGreaterThanOrEqual(40);
  });
  it("quotes the sentence she actually met, word for word", () => {
    for (const word of sourced) {
      const lesson = lessons.find((item) => item.id === word.source);
      expect(lesson, word.id).toBeTruthy();
      // The example must be a real sentence of the passage or transcript,
      // not a sentence written to look like one.
      expect(
        lesson!.text.includes(word.example),
        `${word.id}: ${word.example}`,
      ).toBe(true);
      expect(
        word.example.toLowerCase().includes(word.word.toLowerCase()),
        word.id,
      ).toBe(true);
      expect(word.ipa.startsWith("/"), word.id).toBe(true);
      expect(word.meaning.length, word.id).toBeGreaterThan(2);
    }
  });
  it("keeps a card out of the deck until its lesson has been worked", () => {
    const state = freshState();
    const open = openVocabulary(state);
    expect(open.length).toBe(vocabulary.length - sourced.length);
    const first = sourced[0];
    state.attempts = [
      attempt("2026-09-10T02:00:00Z", {
        id: "met",
        lessonId: first.source!,
        skill: lessons.find((item) => item.id === first.source)!.skill,
      }),
    ];
    const after = openVocabulary(state);
    expect(after.some((word) => word.id === first.id)).toBe(true);
    // Only that lesson's cards joined; the rest still wait.
    expect(after.length).toBeLessThan(vocabulary.length);
  });
});

describe("what to do about a question just got wrong", () => {
  const question = lessons
    .find((lesson) => lesson.id === "reading-cafe")!
    .questions.find((item) => item.tag === "Thông tin chi tiết")!;
  it("names a lesson that trains the type once the type has evidence", () => {
    const state = freshState();
    // Two wrong answers of this type is the minimum before the app is
    // willing to describe it as a weakness.
    const sameType = lessons
      .find((lesson) => lesson.id === "reading-cafe")!
      .questions.filter((item) => item.tag === question.tag)
      .map((item) => item.id);
    expect(sameType.length).toBeGreaterThanOrEqual(TYPE_STEP_MINIMUM);
    state.attempts = [
      attempt("2026-09-07T10:00:00+07:00", {
        id: "a1",
        answers: missing(sameType),
        correct: 5 - sameType.length,
      }),
    ];
    const step = nextStep(state, question, "reading-cafe");
    const wrong = questionTypeStats(state).find(
      (entry) => entry.tag === question.tag,
    )!;
    expect(wrong.wrong).toBeGreaterThanOrEqual(TYPE_STEP_MINIMUM);
    expect(step.text).toContain(question.tag);
    expect(step.href.startsWith("/practice/")).toBe(true);
    // It never sends her back to the lesson she is already looking at.
    expect(step.href).not.toBe("/practice/reading-cafe");
  });
  it("says something true when there is not enough evidence yet", () => {
    const step = nextStep(freshState(), question, "reading-cafe");
    expect(step.href).toBe("/mistakes");
    expect(step.text).toContain("Sổ lỗi");
  });
  it("treats a confident mistake as its own kind of step", () => {
    const step = nextStep(freshState(), question, "reading-cafe", "sure");
    expect(step.text).toContain("Rất chắc");
    expect(step.href).toBe("/mistakes");
  });
});
describe("a skill is not pinned to one lesson", () => {
  it("offers a different lesson of the same skill the next day", () => {
    let state = freshState();
    const seen: string[] = [];
    for (let day = 0; day < 6; day++) {
      const now = new Date(
        Date.parse("2026-09-15T08:00:00+07:00") + day * 86400000,
      );
      const plan = todayPlan(state, now);
      const reading = plan.lessons.find((lesson) => lesson.skill === "reading");
      if (reading) seen.push(reading.id);
      for (const lesson of plan.lessons)
        state = recordAttempt(state, {
          id: `d${day}:${lesson.id}`,
          lessonId: lesson.id,
          skill: lesson.skill,
          date: now.toISOString(),
          // Half wrong, without claiming to have been certain.
          correct: Math.floor(lesson.questions.length / 2),
          total: lesson.questions.length,
          seconds: lesson.minutes * 60,
          answers: Object.fromEntries(
            lesson.questions.map((item, index) => [
              item.id,
              index % 2 === 0
                ? item.answer
                : (item.answer + 1) % item.options.length,
            ]),
          ),
        });
    }
    // Measured before this rule: the same Reading lesson six days running.
    expect(new Set(seen).size).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < seen.length; index++)
      expect(seen[index]).not.toBe(seen[index - 1]);
  });
});

describe("the saved history stops paying for the same lesson twice", () => {
  const study = (days: number) => {
    let state = freshState();
    for (let day = 0; day < days; day++) {
      const at = new Date(
        Date.parse("2026-09-15T08:00:00+07:00") + day * 86400000,
      );
      for (const lesson of todayPlan(state, at).lessons)
        state = recordAttempt(state, {
          id: `d${day}:${lesson.id}`,
          lessonId: lesson.id,
          skill: lesson.skill,
          date: at.toISOString(),
          correct: lesson.questions.length,
          total: lesson.questions.length,
          seconds: lesson.minutes * 60,
          answers: Object.fromEntries(
            lesson.questions.map((item) => [item.id, item.answer]),
          ),
        });
    }
    return state;
  };
  it("files each lesson version once, however often it is worked", () => {
    const state = study(30);
    const worked = new Set(state.attempts.map((a) => a.lessonRef));
    expect(state.attempts.length).toBeGreaterThan(worked.size);
    expect(Object.keys(state.library ?? {}).length).toBe(worked.size);
    // Measured before this: 306 KB after a month, 980 KB after three, on a
    // 5 MB localStorage budget.
    expect(JSON.stringify(state).length).toBeLessThan(250000);
    expect(stateSchema.safeParse(state).success).toBe(true);
  });
  it("still shows each attempt the material it was worked on", () => {
    const state = study(3);
    for (const filed of state.attempts) {
      const lesson = attemptLesson(state, filed)!;
      expect(lesson.id).toBe(filed.lessonId);
      expect(lesson.questions.length).toBe(filed.total);
    }
  });
  it("compacts a history that still carries its own copies", () => {
    const legacy = freshState();
    const lesson = lessons.find((item) => item.id === "reading-cafe")!;
    legacy.attempts = [
      attempt("2026-09-05T10:00:00Z", {
        id: "one",
        lessonSnapshot: structuredClone(lesson),
      }),
      attempt("2026-09-06T10:00:00Z", {
        id: "two",
        lessonSnapshot: structuredClone(lesson),
      }),
    ];
    const before = JSON.stringify(legacy).length;
    const after = personalizeLegacyState(legacy);
    expect(after.attempts.every((item) => !item.lessonSnapshot)).toBe(true);
    expect(Object.keys(after.library ?? {})).toEqual([
      libraryKey("reading-cafe", lesson.version),
    ]);
    expect(JSON.stringify(after).length).toBeLessThan(before);
    // Nothing about what she did changed.
    expect(attemptLesson(after, after.attempts[0])).toMatchObject({
      id: "reading-cafe",
      version: lesson.version,
    });
    expect(stateSchema.safeParse(after).success).toBe(true);
  });
});

describe("what to do once the library runs out", () => {
  const finished = () => {
    let state = freshState();
    for (const [index, lesson] of lessons.entries())
      state = recordAttempt(state, {
        id: `done-${lesson.id}`,
        lessonId: lesson.id,
        skill: lesson.skill,
        date: `2026-09-${String((index % 28) + 1).padStart(2, "0")}T10:00:00Z`,
        correct: lesson.questions.length,
        total: lesson.questions.length,
        seconds: lesson.minutes * 60,
        answers: Object.fromEntries(
          lesson.questions.map((item) => [item.id, item.answer]),
        ),
      });
    return state;
  };
  const sitting = (id: string, prefix: string): Attempt[] =>
    ["listen-1", "read-1"].map((part) => ({
      ...attempt("2026-09-20T02:00:00Z", {
        id: `exam:${id}:${prefix}-${part}`,
        lessonId: `${prefix}-${part}`,
        skill: part.startsWith("listen") ? "listening" : "reading",
        correct: 20,
        total: 35,
        seconds: 2400,
      }),
    }));
  it("says nothing while there is still new material", () => {
    expect(whatsNext(freshState())).toBe(null);
  });
  it("points at the timed room once every lesson has been met", () => {
    const step = whatsNext(finished())!;
    expect(step.href).toBe("/exam");
    expect(step.text).toContain(String(lessons.length));
  });
  it("asks for the other paper when only one has been sat", () => {
    const state = finished();
    state.attempts = [...state.attempts, ...sitting("s1", "full")];
    expect(whatsNext(state)?.text).toContain("chưa làm");
    // Both papers sat: there is nothing left to point at, so it stays quiet.
    const both = {
      ...state,
      attempts: [...state.attempts, ...sitting("s2", "exam2")],
    };
    expect(whatsNext(both)).toBe(null);
  });
});
describe("the day of the exam", () => {
  const onExamDay = (days: number) => {
    const state = freshState();
    state.profile = {
      ...state.profile,
      onboarded: true,
      examDate: dayOffset(localDay(now), days),
    };
    return examWeekPlan(state, now);
  };
  it("does not ask for a full mock on the morning of the exam", () => {
    const today = onExamDay(0)!;
    expect(today.key).toBe("exam-day");
    expect(today.thisWeek.join(" ")).not.toContain("đề đủ cấu trúc");
    expect(today.thisWeek.join(" ")).toContain("giữ sức");
    expect(today.focus).toContain(freshState().profile.name);
  });
  it("still rehearses the day before", () => {
    expect(onExamDay(1)?.key).toBe("rehearsal");
    expect(onExamDay(-1)).toBe(null);
  });
});

describe("the minutes the plan cannot fill", () => {
  // The library holds at most two lessons per skill a day. A learner who sets
  // aside two hours therefore has real time left over, and before this the
  // plan recorded it in `spare` and showed nothing.
  it("fills a large budget once the lesson cap stops binding", () => {
    const state = freshState();
    state.profile.dailyMinutes = 90;
    // Ten days of history, so "unseen lesson" bonuses are not what decides.
    state.attempts = Array.from({ length: 10 }, (_, index) => {
      const lesson = lessons[(index * 3) % lessons.length];
      return {
        id: `seed${index}`,
        lessonId: lesson.id,
        skill: lesson.skill,
        date: `${dayOffset(localDay(), -index - 3)}T03:00:00.000Z`,
        lessonRef: `${lesson.id}@v${lesson.version}`,
        answers: Object.fromEntries(
          lesson.questions.map((question) => [question.id, question.answer]),
        ),
        correct: lesson.questions.length,
        total: lesson.questions.length,
        seconds: lesson.minutes * 60,
      };
    });
    const plan = todayPlan(state);
    const spent = plan.lessons.reduce(
      (sum, lesson) =>
        sum +
        (plan.longer.includes(lesson.id)
          ? Math.round(lesson.minutes / 2)
          : lesson.minutes),
      0,
    );
    expect(plan.lessons.length).toBeLessThanOrEqual(PLAN_MAX_LESSONS);
    expect(spent).toBeLessThanOrEqual(plan.budget);
    // Measured at the old cap of six: 58 minutes of 90, and Reading got one
    // lesson. The cap must not be what wastes half an evening.
    expect(spent).toBeGreaterThan(80);
    const reading = plan.lessons.filter(
      (lesson) => lesson.skill === "reading",
    ).length;
    expect(reading).toBeGreaterThan(1);
    expect(spent + plan.spare).toBe(plan.budget);
  });
  it("says the leftover out loud, and offers something that fits it", () => {
    const state = freshState();
    state.profile.dailyMinutes = 180;
    const step = spareStep(state);
    expect(step).not.toBeNull();
    expect(step!.minutes).toBeGreaterThanOrEqual(SPARE_WORTH_SAYING);
    expect(step!.text).toContain(`Còn ${step!.minutes} phút`);
    // The only thing that uses a long stretch as one piece is a timed sitting.
    expect(step!.href).toBe("/exam");
    expect(step!.text).toContain(`${MINI_EXAM_MINUTES} phút`);
  });
  it("stays silent when the leftover is rounding, not an evening", () => {
    const state = freshState();
    state.profile.dailyMinutes = 30;
    const plan = todayPlan(state);
    expect(plan.spare).toBeLessThan(SPARE_WORTH_SAYING);
    expect(spareStep(state)).toBeNull();
  });
  it("offers the notebook when the leftover is too short for a sitting", () => {
    const state = freshState();
    state.profile.dailyMinutes = 60;
    const lesson = lessons.find((item) => item.skill === "reading")!;
    const missed = lesson.questions[0];
    state.attempts = [
      {
        id: "wrong",
        lessonId: lesson.id,
        skill: lesson.skill,
        date: `${dayOffset(localDay(), -4)}T03:00:00.000Z`,
        lessonRef: `${lesson.id}@v${lesson.version}`,
        answers: Object.fromEntries(
          lesson.questions.map((question) => [
            question.id,
            question.id === missed.id
              ? (question.answer + 1) % question.options.length
              : question.answer,
          ]),
        ),
        correct: lesson.questions.length - 1,
        total: lesson.questions.length,
        seconds: lesson.minutes * 60,
      },
    ];
    state.library = { [`${lesson.id}@v${lesson.version}`]: lesson };
    const plan = todayPlan(state);
    const step = spareStep(state);
    if (plan.spare >= SPARE_WORTH_SAYING && plan.spare < MINI_EXAM_MINUTES) {
      expect(step?.href).toBe("/mistakes");
      expect(step?.text).toContain("đến lịch ôn");
    } else {
      // The plan filled the evening; nothing to offer is the correct answer.
      expect(plan.spare < SPARE_WORTH_SAYING || step?.href === "/exam").toBe(
        true,
      );
    }
  });
  it("counts a sitting's length from its own stages, not a literal", () => {
    // "51 phút" and "172 phút" used to be typed into the exam room by hand.
    expect(examMinutes("mini")).toBe(MINI_EXAM_MINUTES);
    expect(examMinutes("full")).toBe(examMinutes("full2"));
    for (const mode of ["mini", "full", "full2"] as const)
      expect(examMinutes(mode)).toBe(
        Math.round(
          getExamStages(mode).reduce((sum, stage) => sum + stage.seconds, 0) /
            60,
        ),
      );
  });
});
