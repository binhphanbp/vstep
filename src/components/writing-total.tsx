"use client";
import { useStudy } from "./study-provider";
import { scoreText } from "./grade-parts";
import { paperGradeId, type StoredGrade } from "@/lib/grades";
import { BAND_LABEL, bandOf, writingScore } from "@/lib/grading/scores";

/**
 * The Writing skill's mark, once both tasks of a sitting have been graded: the
 * way the exam works it out (Task 1 one third, Task 2 two thirds, rounded to
 * the nearest 0.5), done in code from the two task marks.
 */
export function WritingTotal({
  runId,
  slots,
}: {
  runId: string;
  slots: { id: string; part: string }[];
}) {
  const { state } = useStudy();
  const grades = state.grades as Record<string, StoredGrade> | undefined;
  const task1 = slots.find((slot) => slot.part.includes("1"));
  const task2 = slots.find((slot) => slot.part.includes("2"));
  if (!task1 || !task2 || !grades) return null;
  const first = grades[paperGradeId(runId, task1.id)]?.grade;
  const second = grades[paperGradeId(runId, task2.id)]?.grade;
  if (
    !first ||
    !second ||
    !("criteria" in first) ||
    !("criteria" in second) ||
    first.taskScore === null ||
    second.taskScore === null
  )
    return null;
  const total = writingScore(first.taskScore, second.taskScore);
  const validated = [first, second].every((grade) =>
    Object.values(grade.criteria).every((item) => item.validated === true),
  );
  return (
    <section className="grade-panel" aria-labelledby="writing-total">
      <h3 id="writing-total">Điểm Viết của lượt này (ước lượng)</h3>
      <p className="grade-total">
        <strong>{scoreText(total)}/10</strong> · {BAND_LABEL[bandOf(total)]}
      </p>
      <p className="help-copy">
        Tính đúng như bài thi: Bài 1 chiếm 1/3 ({scoreText(first.taskScore)}),
        Bài 2 chiếm 2/3 ({scoreText(second.taskScore)}), rồi làm tròn đến 0,5.
        {validated
          ? ""
          : " Hai điểm bài do AI ước lượng và chưa được đối chiếu với giám khảo thật, nên điểm Viết cũng vậy."}
      </p>
    </section>
  );
}
