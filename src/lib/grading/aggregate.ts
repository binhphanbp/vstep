/**
 * Several independent gradings of one piece of work become one result.
 * The median is used, not the mean, so one outlying run cannot move the mark.
 */

export function median(values: number[]) {
  if (values.length === 0) throw new RangeError("không có giá trị nào");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export type CriterionRuns = Record<string, number[]>;

/** The spread (highest minus lowest) a criterion may show before it is called unsure. */
export const MAX_SPREAD = 1;
/** Runs at first, and the extra runs when the first ones disagree. */
export const FIRST_RUNS = 3;
export const EXTRA_RUNS = 2;

export function spreadOf(values: number[]) {
  return Math.max(...values) - Math.min(...values);
}

/** True when any criterion's runs differ by more than MAX_SPREAD. */
export function disagrees(runs: CriterionRuns) {
  return Object.values(runs).some((values) => spreadOf(values) > MAX_SPREAD);
}

export type CriterionResult = {
  /** The median of the runs. A criterion mark is a whole number, so an even
   * number of runs can still give a half; it is shown as it is. */
  score: number;
  low: number;
  high: number;
  runs: number;
  /** True when the runs still differ by more than MAX_SPREAD. */
  unsure: boolean;
};

export function summarise(
  runs: CriterionRuns,
): Record<string, CriterionResult> {
  const out: Record<string, CriterionResult> = {};
  for (const [key, values] of Object.entries(runs)) {
    out[key] = {
      score: median(values),
      low: Math.min(...values),
      high: Math.max(...values),
      runs: values.length,
      unsure: spreadOf(values) > MAX_SPREAD,
    };
  }
  return out;
}

/** Turn a list of per-run marks into per-criterion lists. */
export function collect(marks: Record<string, number>[]): CriterionRuns {
  const runs: CriterionRuns = {};
  for (const mark of marks)
    for (const [key, value] of Object.entries(mark))
      (runs[key] ??= []).push(value);
  return runs;
}
