import type { SpeakingCriterion, WritingCriterion } from "./scores";

/**
 * Which criteria may show a number. A criterion is released only after the
 * eval harness has measured it against human raters and it met its threshold
 * (see THRESHOLDS and docs/PLAN-CHAM-AI.md §7.2). Until then it shows comments
 * and quoted errors only. Nothing has been measured yet, so nothing is open.
 *
 * Edit this file only from a harness report, and record the report's date.
 */
/**
 * Whether a mark is shown before it has been measured against human raters.
 * It is, because a grader that gives only comments is of little use to a
 * learner, but never unlabelled: every such mark carries `validated: false`
 * and the screen says it is an AI estimate not yet checked against examiners.
 * Set to false to go back to comments only until a harness report opens a gate.
 */
export const SHOW_UNVALIDATED_SCORES = true;

export type Gates = {
  writing: Record<WritingCriterion, boolean>;
  speaking: Record<SpeakingCriterion, boolean>;
  /** The report the flags above come from, or null while nothing is measured. */
  measuredOn: string | null;
};

export const GATES: Gates = {
  writing: {
    task: false,
    organization: false,
    vocabulary: false,
    grammar: false,
  },
  speaking: {
    grammar: false,
    vocabulary: false,
    pronunciation: false,
    fluency: false,
    discourse: false,
  },
  measuredOn: null,
};

/** The bars a criterion must clear, from docs/PLAN-CHAM-AI.md §7.2. */
export const THRESHOLDS = {
  /** Writing level (Write & Improve): quadratic weighted kappa, exact, within one level. */
  writingLevel: { qwk: 0.75, exact: 0.6, withinOne: 0.95 },
  /** Writing criteria against ELLIPSE (human–human is 0.48–0.53). */
  writingCriterion: { qwk: 0.45, maxBias: 0.25 },
  /** Speaking level (Speak & Improve): Pearson (a model without fine-tuning reaches ~0.76). */
  speakingLevel: { pearson: 0.75 },
  /** Pronunciation and fluency against speechocean762 (human–human 0.66–0.71). */
  speechCriterion: { pearson: 0.6 },
  /** The same work graded ten times: the median may move by at most this. */
  stability: { maxMove: 0.5, share: 0.95 },
  /** Quotes the model gave that are not in the text. */
  quotes: { maxFalse: 0.02 },
} as const;
