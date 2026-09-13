import { describe, expect, it } from "vitest";
import { lessons } from "../../src/lib/content";
import { allLessons } from "../../src/lib/full-exam-content";
import { questionNotes } from "../../src/lib/question-notes";

const annotated = allLessons.flatMap((lesson) =>
  lesson.questions
    .filter((question) => question.evidence || question.optionNotes)
    .map((question) => ({ lesson, question })),
);

describe("evidence and distractor notes", () => {
  it("quotes the passage or transcript word for word", () => {
    for (const { lesson, question } of annotated)
      expect(
        lesson.text.includes(question.evidence ?? ""),
        `${lesson.id}/${question.id} trích dẫn không khớp ngữ liệu`,
      ).toBe(true);
  });

  it("explains every option exactly once", () => {
    for (const { lesson, question } of annotated) {
      expect(
        question.optionNotes?.length,
        `${lesson.id}/${question.id} thiếu ghi chú cho một lựa chọn`,
      ).toBe(question.options.length);
      for (const note of question.optionNotes ?? [])
        expect(note.trim().length).toBeGreaterThan(0);
    }
  });

  it("marks the key and only the key with “Đúng:”", () => {
    for (const { lesson, question } of annotated)
      question.optionNotes?.forEach((note, option) =>
        expect(
          note.startsWith("Đúng:"),
          `${lesson.id}/${question.id} lựa chọn ${option}`,
        ).toBe(option === question.answer),
      );
  });

  it("carries both fields together so the review loop stays complete", () => {
    for (const { lesson, question } of annotated) {
      expect(
        question.evidence?.trim(),
        `${lesson.id}/${question.id}`,
      ).toBeTruthy();
      expect(question.optionNotes, `${lesson.id}/${question.id}`).toBeTruthy();
    }
  });

  it("covers every short reading and listening question", () => {
    const short = lessons.filter(
      (lesson) => lesson.skill === "reading" || lesson.skill === "listening",
    );
    expect(short.length).toBe(8);
    for (const lesson of short)
      for (const question of lesson.questions)
        expect(
          Boolean(question.evidence && question.optionNotes),
          `${lesson.id}/${question.id} chưa có bằng chứng`,
        ).toBe(true);
  });

  it("keeps annotations attached to questions that really exist", () => {
    const ids = new Set(
      allLessons.flatMap((lesson) =>
        lesson.questions.map((question) => question.id),
      ),
    );
    for (const id of Object.keys(questionNotes)) expect(ids.has(id)).toBe(true);
  });

  it("annotates the exam questions written against the shared passages", () => {
    // The exam owns its questions, so the evidence layer has to be written for
    // them too: reusing the short lesson's items is no longer an option.
    const full = allLessons.find((lesson) => lesson.id === "full-reading-cafe");
    const first = full?.questions.find((question) => question.id === "frc1");
    expect(first?.evidence).toBe(questionNotes.frc1.evidence);
    expect(first?.optionNotes).toHaveLength(4);
  });
});
