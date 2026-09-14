import { describe, expect, it } from "vitest";
import {
  fullListening2,
  fullReading2,
  fullSpeaking2,
  fullWriting2,
  fullExam2Lessons,
} from "../../src/lib/full-exam-02";
import { fullListening, fullReading } from "../../src/lib/full-exam-content";
import { lessons } from "../../src/lib/content";
import {
  countTypes,
  listeningMatrix,
  maxDetailPerPassage,
  readingMatrix,
} from "../../src/lib/question-types";
import {
  advanceExam,
  freshState,
  fullExam2Stages,
  getExamStages,
  stateSchema,
  wordCount,
} from "../../src/lib/learning";

const paper1 = [...fullReading, ...fullListening];
const library = lessons;

describe("the second full-length paper", () => {
  it("has the same shape as the first", () => {
    expect(fullListening2.map((l) => l.questions.length)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 4, 5, 5, 5,
    ]);
    expect(fullReading2.map((l) => l.questions.length)).toEqual([
      10, 10, 10, 10,
    ]);
    expect(fullWriting2).toHaveLength(2);
    expect(fullSpeaking2).toHaveLength(3);
    expect(fullExam2Stages.reduce((n, s) => n + s.seconds, 0)).toBe(172 * 60);
  });
  it("keeps the Reading section inside the published length", () => {
    const words = fullReading2.reduce((n, l) => n + wordCount(l.text), 0);
    expect(words).toBeGreaterThanOrEqual(1900);
    expect(words).toBeLessThanOrEqual(2500);
  });
  it("shares no id, passage, prompt or question with paper 01 or the library", () => {
    // This is the whole point of a second paper: sitting the first one again
    // measures memory, so anything in common quietly undoes the comparison.
    const otherIds = new Set([...paper1, ...library].map((l) => l.id));
    const otherTexts = new Set([...paper1, ...library].map((l) => l.text));
    const otherQuestionIds = new Set(
      [...paper1, ...library].flatMap((l) => l.questions.map((q) => q.id)),
    );
    const otherQuestionTexts = new Set(
      [...paper1, ...library].flatMap((l) => l.questions.map((q) => q.text)),
    );
    for (const lesson of fullExam2Lessons) {
      expect(otherIds.has(lesson.id), lesson.id).toBe(false);
      expect(otherTexts.has(lesson.text), lesson.id).toBe(false);
      for (const question of lesson.questions) {
        expect(otherQuestionIds.has(question.id), question.id).toBe(false);
        expect(otherQuestionTexts.has(question.text), question.id).toBe(false);
      }
    }
  });
  it("writes the Reading section to the same question-type matrix", () => {
    const tags = fullReading2.flatMap((l) => l.questions.map((q) => q.tag));
    expect(tags).toHaveLength(40);
    expect(countTypes(tags)).toEqual(readingMatrix);
    for (const lesson of fullReading2) {
      const counts = countTypes(lesson.questions.map((q) => q.tag));
      expect(counts["Thông tin chi tiết"] ?? 0, lesson.id).toBeLessThanOrEqual(
        maxDetailPerPassage,
      );
    }
  });
  it("keeps the Listening section inside its floors and ceiling", () => {
    const counts = countTypes(
      fullListening2.flatMap((l) => l.questions.map((q) => q.tag)),
    );
    for (const [tag, most] of Object.entries(listeningMatrix.max))
      expect(counts[tag] ?? 0, tag).toBeLessThanOrEqual(most);
    for (const [tag, least] of Object.entries(listeningMatrix.min))
      expect(counts[tag] ?? 0, tag).toBeGreaterThanOrEqual(least);
  });
  it("quotes its own passages word for word in the evidence notes", () => {
    for (const lesson of fullReading2)
      for (const question of lesson.questions) {
        expect(question.evidence, `${lesson.id}/${question.id}`).toBeTruthy();
        expect(
          lesson.text.includes(question.evidence ?? ""),
          `${lesson.id}/${question.id}`,
        ).toBe(true);
        expect(question.optionNotes).toHaveLength(question.options.length);
      }
  });
  it("gives the writing tasks their own prompts and word counts", () => {
    expect(fullWriting2.map((l) => l.minWords)).toEqual([120, 250]);
    for (const lesson of fullWriting2)
      expect(wordCount(lesson.sample ?? ""), lesson.id).toBeGreaterThanOrEqual(
        lesson.minWords ?? 0,
      );
  });
  it("runs as a sitting of its own and files every section", () => {
    const state = freshState();
    const now = Date.now();
    state.exam = {
      id: "paper-two",
      mode: "full2",
      startedAt: now,
      deadline: now + 2400000,
      stage: 0,
      answers: {},
      writing: "Bài thư của tôi.",
      writingTask2: "Bài luận của tôi.",
      finished: false,
    };
    for (const lesson of [...fullListening2, ...fullReading2])
      for (const question of lesson.questions)
        state.exam.answers[question.id] = question.answer;
    const done = advanceExam(state, now + 172 * 60000);
    expect(done.exam?.finished).toBe(true);
    expect(done.attempts.reduce((n, a) => n + a.total, 0)).toBe(75);
    expect(
      done.attempts.filter((a) => a.skill === "writing").map((a) => a.text),
    ).toEqual(["Bài thư của tôi.", "Bài luận của tôi."]);
    expect(stateSchema.safeParse(done).success).toBe(true);
  });
  it("still finds the stages of a sitting saved before it existed", () => {
    expect(getExamStages("full").length).toBe(4);
    expect(getExamStages("full2")).toEqual(fullExam2Stages);
    expect(getExamStages(undefined).length).toBe(4);
    const old = freshState();
    old.exam = {
      id: "old",
      mode: "full",
      startedAt: 0,
      deadline: 1,
      stage: 0,
      answers: {},
      writing: "",
      writingTask2: "",
      finished: true,
    };
    expect(stateSchema.safeParse(old).success).toBe(true);
  });
});
