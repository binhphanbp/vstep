/**
 * The arithmetic of a VSTEP score. None of this is left to the model: the
 * model gives whole-number marks per criterion and code does the rest, so the
 * sum, the weighting and the rounding are the same every time.
 *
 * Sources: QĐ 729/QĐ-BGDĐT (each skill 0–10 in steps of 0.5; overall is the
 * mean of the four); Thông tư 23/2017 (the rounding rule); Nguyễn Thị Ngọc
 * Quỳnh 2018, VNU JFS 34(4) (Writing: four criteria, task = their mean,
 * Writing = (T1 + 2·T2) / 3). The way Speaking's five criteria combine is NOT
 * documented anywhere found; the mean is used and the UI says so.
 */

const EPSILON = 1e-9;

/** Nearest 0.5, with an exact half going up: 6.25 → 6.5, 6.75 → 7.0, 6.24 → 6.0. */
export function roundHalf(value: number) {
  return Math.floor(value * 2 + 0.5 + EPSILON) / 2;
}

export const WRITING_CRITERIA = [
  "task",
  "organization",
  "vocabulary",
  "grammar",
] as const;
export type WritingCriterion = (typeof WRITING_CRITERIA)[number];

export const SPEAKING_CRITERIA = [
  "grammar",
  "vocabulary",
  "pronunciation",
  "fluency",
  "discourse",
] as const;
export type SpeakingCriterion = (typeof SPEAKING_CRITERIA)[number];

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function assertScores(values: number[]) {
  for (const value of values)
    if (!Number.isFinite(value) || value < SCORE_MIN || value > SCORE_MAX)
      throw new RangeError(`điểm ${value} nằm ngoài ${SCORE_MIN}–${SCORE_MAX}`);
}

/** One Writing task: the mean of its four criteria, not yet rounded. */
export function writingTaskScore(marks: Record<WritingCriterion, number>) {
  const values = WRITING_CRITERIA.map((key) => marks[key]);
  assertScores(values);
  return mean(values);
}

/** The Writing skill: Task 1 counts one third, Task 2 two thirds. */
export function writingScore(task1: number, task2: number) {
  assertScores([task1, task2]);
  return roundHalf((task1 + 2 * task2) / 3);
}

/** The Speaking skill, under the presumed rule: mean of the five criteria. */
export function speakingScore(marks: Record<SpeakingCriterion, number>) {
  const values = SPEAKING_CRITERIA.map((key) => marks[key]);
  assertScores(values);
  return roundHalf(mean(values));
}

/** The overall score: mean of the four skills, rounded to 0.5. */
export function overallScore(skills: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}) {
  const values = [
    skills.listening,
    skills.reading,
    skills.writing,
    skills.speaking,
  ];
  assertScores(values);
  return roundHalf(mean(values));
}

export type Band = "below-b1" | "b1" | "b2" | "c1";
export const BAND_LABEL: Record<Band, string> = {
  "below-b1": "Dưới bậc 3 (B1)",
  b1: "Bậc 3 (B1)",
  b2: "Bậc 4 (B2)",
  c1: "Bậc 5 (C1)",
};

/** Official conversion: under 4.0 is not rated, 4.0–5.5 B1, 6.0–8.0 B2, 8.5–10 C1. */
export function bandOf(score: number): Band {
  if (score >= 8.5) return "c1";
  if (score >= 6) return "b2";
  if (score >= 4) return "b1";
  return "below-b1";
}
