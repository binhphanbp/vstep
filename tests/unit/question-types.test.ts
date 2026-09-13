import { describe, expect, it } from "vitest";
import { fullListening, fullReading } from "../../src/lib/full-exam-content";
import { lessons } from "../../src/lib/content";
import {
  countTypes,
  listeningMatrix,
  listeningTypes,
  maxDetailPerPassage,
  readingMatrix,
  readingTypes,
} from "../../src/lib/question-types";

const DETAIL = "Thông tin chi tiết";

describe("question-type matrix", () => {
  it("writes the Reading section to the matrix, not to one sub-skill", () => {
    const tags = fullReading.flatMap((lesson) =>
      lesson.questions.map((question) => question.tag),
    );
    expect(tags).toHaveLength(40);
    expect(countTypes(tags)).toEqual(readingMatrix);
  });

  it("gives every Reading passage all six families of question", () => {
    for (const lesson of fullReading) {
      const tags = lesson.questions.map((question) => question.tag);
      const counts = countTypes(tags);
      // A passage that asks ten detail questions is a scanning drill: the
      // learner never has to follow an argument, infer, or read a word in
      // context to finish it.
      expect(counts[DETAIL] ?? 0, lesson.id).toBeLessThanOrEqual(
        maxDetailPerPassage,
      );
      for (const family of [
        ["Ý chính"],
        [DETAIL],
        ["Suy luận"],
        ["Từ vựng trong ngữ cảnh"],
        ["Từ tham chiếu"],
        // Purpose of a sentence and the writer's stance are close enough that
        // a passage may carry either one.
        ["Mục đích tác giả", "Quan điểm tác giả"],
      ])
        expect(
          family.some((tag) => (counts[tag] ?? 0) > 0),
          `${lesson.id} thiếu dạng ${family.join(" hoặc ")}`,
        ).toBe(true);
    }
  });

  it("keeps the Listening section within its floors and ceiling", () => {
    const tags = fullListening.flatMap((lesson) =>
      lesson.questions.map((question) => question.tag),
    );
    expect(tags).toHaveLength(35);
    const counts = countTypes(tags);
    for (const [tag, most] of Object.entries(listeningMatrix.max))
      expect(counts[tag] ?? 0, tag).toBeLessThanOrEqual(most);
    for (const [tag, least] of Object.entries(listeningMatrix.min))
      expect(counts[tag] ?? 0, tag).toBeGreaterThanOrEqual(least);
  });

  it("labels every question with a type from its skill's vocabulary", () => {
    // The labels drive the per-type breakdown the learner reads after a
    // session, so an invented one silently creates a category of its own.
    for (const lesson of [...fullReading, ...fullListening, ...lessons]) {
      const allowed: readonly string[] =
        lesson.skill === "listening" ? listeningTypes : readingTypes;
      if (lesson.skill !== "reading" && lesson.skill !== "listening") {
        expect(lesson.questions, lesson.id).toHaveLength(0);
        continue;
      }
      for (const question of lesson.questions)
        expect(allowed, `${lesson.id}/${question.id}`).toContain(question.tag);
    }
  });

  it("asks more than facts in every short Reading and Listening lesson", () => {
    // The library lessons are four or five questions, too short for the full
    // matrix, but a lesson made only of lookups teaches only looking up.
    for (const lesson of lessons) {
      if (lesson.skill !== "reading" && lesson.skill !== "listening") continue;
      const tags = lesson.questions.map((question) => question.tag);
      expect(new Set(tags).size, lesson.id).toBeGreaterThan(1);
      expect(
        tags.filter((tag) => tag !== DETAIL).length,
        lesson.id,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
