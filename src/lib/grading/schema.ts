import * as z from "zod/mini";
import {
  SPEAKING_CRITERIA,
  WRITING_CRITERIA,
  type SpeakingCriterion,
  type WritingCriterion,
} from "./scores";

// The same reason as learning.ts: the production CSP forbids eval.
z.config({ jitless: true });

const text = (max: number) => z.string().check(z.maxLength(max));
const mark = z.number().check(z.minimum(0), z.maximum(10));

export const ERROR_TYPES = [
  "grammar",
  "vocabulary",
  "spelling",
  "punctuation",
  "style",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

/* ---------------- Writing: the analysis call ---------------- */

export const writingAnalysisSchema = z.object({
  requirements: z.array(
    z.object({
      id: text(40),
      met: z.enum(["yes", "partly", "no"]),
      /** A quote from the essay that shows it, or "" when there is none. */
      quote: text(600),
    }),
  ),
  errors: z.array(
    z.object({
      quote: text(400),
      type: z.enum(ERROR_TYPES),
      correction: text(400),
      /** In Vietnamese. */
      explanation: text(600),
    }),
  ),
});
export type WritingAnalysis = z.infer<typeof writingAnalysisSchema>;

/* ---------------- Writing and speaking: the scoring call ---------------- */

const criterionMark = (keys: readonly string[]) =>
  z.object({
    criterion: z.enum(keys as [string, ...string[]]),
    score: mark,
    /** Quotes that support the mark. */
    evidence: z.array(text(500)),
    whyNotHigher: text(800),
    whyNotLower: text(800),
    /** What would earn the next half-band, in Vietnamese. */
    toRaise: text(800),
  });

export const writingScoreSchema = z.object({
  criteria: z.array(criterionMark(WRITING_CRITERIA)),
  summary: text(1200),
});
export type WritingScoreOutput = z.infer<typeof writingScoreSchema>;

export const speakingScoreSchema = z.object({
  criteria: z.array(criterionMark(SPEAKING_CRITERIA)),
  summary: text(1200),
});
export type SpeakingScoreOutput = z.infer<typeof speakingScoreSchema>;

/* ---------------- Speaking: the transcription call ---------------- */

export const transcriptSchema = z.object({
  transcript: text(20000),
  words: z.array(
    z.object({
      word: text(60),
      start: z.number().check(z.minimum(0)),
      end: z.number().check(z.minimum(0)),
    }),
  ),
});
export type Transcript = z.infer<typeof transcriptSchema>;

/* ---------------- The same shapes for Gemini's `responseJsonSchema` ----------------
 * Written by hand: Gemini accepts a subset of JSON Schema, and only the syntax
 * of the reply is guaranteed, so the Zod schemas above check the values. */

const str = { type: "string" } as const;
const arr = (items: object) => ({ type: "array", items });
const obj = (properties: Record<string, object>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
});

export const writingAnalysisJson = obj({
  requirements: arr(
    obj({
      id: str,
      met: { type: "string", enum: ["yes", "partly", "no"] },
      quote: str,
    }),
  ),
  errors: arr(
    obj({
      quote: str,
      type: { type: "string", enum: [...ERROR_TYPES] },
      correction: str,
      explanation: str,
    }),
  ),
});

const criterionJson = (keys: readonly string[]) =>
  obj({
    criterion: { type: "string", enum: [...keys] },
    score: { type: "integer", minimum: 0, maximum: 10 },
    evidence: arr(str),
    whyNotHigher: str,
    whyNotLower: str,
    toRaise: str,
  });

export const writingScoreJson = obj({
  criteria: arr(criterionJson(WRITING_CRITERIA)),
  summary: str,
});
export const speakingScoreJson = obj({
  criteria: arr(criterionJson(SPEAKING_CRITERIA)),
  summary: str,
});
export const transcriptJson = obj({
  transcript: str,
  words: arr(
    obj({
      word: str,
      start: { type: "number" },
      end: { type: "number" },
    }),
  ),
});

/** Check a scoring reply names each criterion once and whole-number marks only. */
export function checkCriteria<K extends string>(
  criteria: { criterion: string; score: number }[],
  expected: readonly K[],
) {
  const seen = new Set<string>();
  for (const item of criteria) {
    if (!expected.includes(item.criterion as K))
      throw new Error(`tiêu chí lạ: ${item.criterion}`);
    if (seen.has(item.criterion))
      throw new Error(`tiêu chí lặp: ${item.criterion}`);
    if (!Number.isInteger(item.score))
      throw new Error(`điểm không nguyên: ${item.criterion}`);
    seen.add(item.criterion);
  }
  for (const key of expected)
    if (!seen.has(key)) throw new Error(`thiếu tiêu chí: ${key}`);
}
export type { WritingCriterion, SpeakingCriterion };
