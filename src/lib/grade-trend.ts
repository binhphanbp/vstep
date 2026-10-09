import { isSpeakingGrade, type AnyStoredGrade } from "./grades";
import type { StudyState } from "./learning";

export type TrendPoint = {
  id: string;
  at: string;
  skill: "writing" | "speaking";
  score: number;
};

/** How many of the newest graded pieces the chart keeps; older ones are in their own sittings. */
export const TREND_POINTS = 24;

/**
 * The marks the AI gave, oldest first: one point per graded Writing task and
 * per graded Speaking test. A grade whose mark was not shown (score hidden) is
 * left out, so the chart never plots a number the learner was not shown.
 */
export function gradeTrend(state: StudyState): TrendPoint[] {
  const grades = (state.grades ?? {}) as Record<string, AnyStoredGrade>;
  const points: TrendPoint[] = [];
  for (const [id, stored] of Object.entries(grades)) {
    const speaking = isSpeakingGrade(stored);
    const score = speaking
      ? (stored.grade as { speakingScore: number | null }).speakingScore
      : (stored.grade as { taskScore: number | null }).taskScore;
    if (typeof score !== "number" || Number.isNaN(Date.parse(stored.at)))
      continue;
    points.push({
      id,
      at: stored.at,
      skill: speaking ? "speaking" : "writing",
      score,
    });
  }
  points.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return points.slice(-TREND_POINTS);
}
