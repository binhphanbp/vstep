import { describe, expect, it } from "vitest";
import { freshState, type StudyState } from "../../src/lib/learning";
import { TREND_POINTS, gradeTrend } from "../../src/lib/grade-trend";

const writing = (id: string, at: string, taskScore: number | null) => ({
  id,
  at,
  inputHash: "h",
  grade: { status: "graded", criteria: {}, taskScore, rawTaskScore: 6 },
});
const speaking = (id: string, at: string, speakingScore: number | null) => ({
  id,
  at,
  inputHash: "h",
  grade: { status: "graded", parts: [], criteria: {}, speakingScore },
});
const withGrades = (grades: Record<string, unknown>) =>
  ({ ...freshState(), grades }) as unknown as StudyState;

describe("the chart of the AI's marks", () => {
  it("is empty before anything is graded", () => {
    expect(gradeTrend(freshState())).toEqual([]);
  });
  it("lists writing and speaking marks oldest first", () => {
    const state = withGrades({
      "attempt:b": writing("attempt:b", "2026-10-05T10:00:00.000Z", 6.5),
      "paper:r:speaking": speaking(
        "paper:r:speaking",
        "2026-10-07T10:00:00.000Z",
        5.5,
      ),
      "attempt:a": writing("attempt:a", "2026-10-01T10:00:00.000Z", 5),
    });
    expect(gradeTrend(state).map((p) => [p.id, p.skill, p.score])).toEqual([
      ["attempt:a", "writing", 5],
      ["attempt:b", "writing", 6.5],
      ["paper:r:speaking", "speaking", 5.5],
    ]);
  });
  it("leaves out a mark the learner was never shown", () => {
    const state = withGrades({
      "attempt:a": writing("attempt:a", "2026-10-01T10:00:00.000Z", null),
      "paper:r:speaking": speaking(
        "paper:r:speaking",
        "2026-10-02T10:00:00.000Z",
        null,
      ),
      "attempt:b": writing("attempt:b", "2026-10-03T10:00:00.000Z", 6),
    });
    expect(gradeTrend(state).map((p) => p.id)).toEqual(["attempt:b"]);
  });
  it("ignores a grade with an unreadable date", () => {
    const state = withGrades({
      "attempt:a": writing("attempt:a", "not a date", 6),
    });
    expect(gradeTrend(state)).toEqual([]);
  });
  it("keeps only the newest points", () => {
    const grades: Record<string, unknown> = {};
    for (let i = 0; i < TREND_POINTS + 6; i++) {
      const day = String(1 + (i % 28)).padStart(2, "0");
      const month = i < 28 ? "09" : "10";
      grades[`attempt:${i}`] = writing(
        `attempt:${i}`,
        `2026-${month}-${day}T10:00:00.000Z`,
        5,
      );
    }
    const points = gradeTrend(withGrades(grades));
    expect(points).toHaveLength(TREND_POINTS);
    const times = points.map((p) => Date.parse(p.at));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
