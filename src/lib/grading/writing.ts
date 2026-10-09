import * as z from "zod/mini";
import {
  EXTRA_RUNS,
  FIRST_RUNS,
  collect,
  disagrees,
  median,
  summarise,
  type CriterionResult,
} from "./aggregate";
import { GRADER_MODEL, PROMPT_VERSION, RUBRIC_VERSION } from "./config";
import type { Generate, OnProgress } from "./generate";
import { GATES, SHOW_UNVALIDATED_SCORES, type Gates } from "./gates";
import {
  writingMeasures,
  writingBlock,
  type WritingBlock,
  type WritingMeasures,
} from "./measures";
import { writingAnalysisPrompt, writingScorePrompt } from "./prompts";
import type { Requirement } from "./requirements";
import {
  checkCriteria,
  writingAnalysisJson,
  writingAnalysisSchema,
  writingScoreJson,
  writingScoreSchema,
  type ErrorType,
} from "./schema";
import {
  WRITING_CRITERIA,
  bandOf,
  writingTaskScore,
  type Band,
  type WritingCriterion,
} from "./scores";
import { bandOfMark } from "../rubric/vstep-3-5";
import { foldQuote, verifyQuotes } from "./verify";

export type WritingInput = {
  task: 1 | 2;
  prompt: string;
  requirements: Requirement[];
  text: string;
  /** Model answers for this task, so a copied sample is caught. */
  samples?: string[];
};

export type GradedError = {
  quote: string;
  type: ErrorType;
  correction: string;
  explanation: string;
};

export type CriterionGrade = CriterionResult & {
  band: Band;
  evidence: string[];
  whyNotHigher: string;
  whyNotLower: string;
  toRaise: string;
  /** Whether the mark is shown (see SHOW_UNVALIDATED_SCORES in gates.ts). */
  showScore: boolean;
  /** True only once this criterion has met its bar against human raters. */
  validated: boolean;
};

export type WritingGrade =
  | { status: "blocked"; reason: WritingBlock; measures: WritingMeasures }
  | {
      status: "graded";
      model: string;
      promptVersion: string;
      rubricVersion: string;
      measures: WritingMeasures;
      criteria: Record<WritingCriterion, CriterionGrade>;
      /** Mean of the four median marks; null unless every criterion may show a score. */
      taskScore: number | null;
      /** Same mean, always computed, for the harness and for comparisons. */
      rawTaskScore: number;
      requirements: {
        id: string;
        text: string;
        met: "yes" | "partly" | "no";
      }[];
      errors: GradedError[];
      errorsPer100: number;
      /** Quotes the model gave that were not in the text, over all runs. */
      droppedQuotes: number;
      totalQuotes: number;
      runs: number;
      /** True when any criterion's runs still disagree after the extra runs. */
      lowConfidence: boolean;
      summary: string;
    };

type Run = {
  marks: Record<WritingCriterion, number>;
  detail: Record<
    WritingCriterion,
    {
      evidence: string[];
      whyNotHigher: string;
      whyNotLower: string;
      toRaise: string;
    }
  >;
  requirements: Record<string, "yes" | "partly" | "no">;
  errors: GradedError[];
  dropped: number;
  quotes: number;
  summary: string;
};

const MET_ORDER = { no: 0, partly: 1, yes: 2 } as const;
const MET_BY_ORDER = ["no", "partly", "yes"] as const;

async function oneRun(
  input: WritingInput,
  measures: WritingMeasures,
  generate: Generate,
  model: string,
  index: number,
): Promise<Run> {
  const analysisPrompt = writingAnalysisPrompt(input);
  const analysis = z.parse(
    writingAnalysisSchema,
    await generate({
      label: `writing-analysis-${index}`,
      model,
      system: analysisPrompt.system,
      parts: [{ text: analysisPrompt.user }],
      jsonSchema: writingAnalysisJson,
      thinking: "HIGH",
    }),
  );
  let dropped = 0;
  let quotes = 0;

  const errorCheck = verifyQuotes(analysis.errors, input.text);
  dropped += errorCheck.dropped;
  quotes += analysis.errors.length;
  const requirementsMet: Record<string, "yes" | "partly" | "no"> = {};
  for (const requirement of input.requirements) {
    const found = analysis.requirements.find((r) => r.id === requirement.id);
    let met = found?.met ?? "no";
    if (met !== "no") {
      quotes++;
      // A point claimed without a real quote behind it is not credited.
      if (
        !found?.quote ||
        verifyQuotes([{ quote: found.quote }], input.text).kept.length === 0
      ) {
        dropped++;
        met = "no";
      }
    }
    requirementsMet[requirement.id] = met;
  }
  const errorsPer100 =
    (errorCheck.kept.length / Math.max(1, measures.words)) * 100;

  const scorePrompt = writingScorePrompt({
    task: input.task,
    prompt: input.prompt,
    text: input.text,
    measures,
    analysis: {
      requirements: input.requirements.map((r) => ({
        id: r.id,
        text: r.text,
        met: requirementsMet[r.id],
      })),
      errors: errorCheck.kept,
      errorsPer100,
    },
  });
  const scored = z.parse(
    writingScoreSchema,
    await generate({
      label: `writing-score-${index}`,
      model,
      system: scorePrompt.system,
      parts: [{ text: scorePrompt.user }],
      jsonSchema: writingScoreJson,
      thinking: "HIGH",
    }),
  );
  checkCriteria(scored.criteria, WRITING_CRITERIA);

  const marks = {} as Run["marks"];
  const detail = {} as Run["detail"];
  for (const item of scored.criteria) {
    const key = item.criterion as WritingCriterion;
    const evidence = verifyQuotes(
      item.evidence.map((quote) => ({ quote })),
      input.text,
    );
    dropped += evidence.dropped;
    quotes += item.evidence.length;
    marks[key] = item.score;
    detail[key] = {
      evidence: evidence.kept.map((e) => e.quote),
      whyNotHigher: item.whyNotHigher,
      whyNotLower: item.whyNotLower,
      toRaise: item.toRaise,
    };
  }
  return {
    marks,
    detail,
    requirements: requirementsMet,
    errors: errorCheck.kept,
    dropped,
    quotes,
    summary: scored.summary,
  };
}

/** Two quotes name the same slip when one contains the other (after folding). */
function sameSlip(a: string, b: string) {
  const x = foldQuote(a);
  const y = foldQuote(b);
  return x.includes(y) || y.includes(x);
}

/** An error is kept only when a majority of the runs found it. */
export function consensusErrors(runs: GradedError[][]) {
  const need = Math.ceil(runs.length / 2);
  const kept: GradedError[] = [];
  for (const errors of runs) {
    for (const error of errors) {
      if (kept.some((k) => sameSlip(k.quote, error.quote))) continue;
      const support = runs.filter((other) =>
        other.some((e) => sameSlip(e.quote, error.quote)),
      ).length;
      if (support >= need) kept.push(error);
    }
  }
  return kept;
}

export async function gradeWriting(
  input: WritingInput,
  deps: {
    generate: Generate;
    model?: string;
    gates?: Gates;
    /** Show marks that no harness report has validated yet (default: SHOW_UNVALIDATED_SCORES). */
    showUnvalidated?: boolean;
    onProgress?: OnProgress;
  },
): Promise<WritingGrade> {
  const model = deps.model ?? GRADER_MODEL;
  const gates = deps.gates ?? GATES;
  const showUnvalidated = deps.showUnvalidated ?? SHOW_UNVALIDATED_SCORES;
  const measures = writingMeasures(input);
  const block = writingBlock(measures);
  if (block) return { status: "blocked", reason: block, measures };

  const track = async (
    count: number,
    first: number,
    stage: "runs" | "extra",
  ) => {
    let done = 0;
    deps.onProgress?.({ stage, done, total: count });
    return Promise.all(
      Array.from({ length: count }, (_, i) =>
        oneRun(input, measures, deps.generate, model, first + i).then((run) => {
          deps.onProgress?.({ stage, done: ++done, total: count });
          return run;
        }),
      ),
    );
  };
  const runs: Run[] = await track(FIRST_RUNS, 0, "runs");
  if (disagrees(collect(runs.map((r) => r.marks))))
    runs.push(...(await track(EXTRA_RUNS, FIRST_RUNS, "extra")));

  const summary = summarise(collect(runs.map((r) => r.marks)));
  const criteria = {} as Record<WritingCriterion, CriterionGrade>;
  for (const key of WRITING_CRITERIA) {
    const result = summary[key];
    // The explanation comes from the run whose mark is closest to the median.
    const closest = [...runs].sort(
      (a, b) =>
        Math.abs(a.marks[key] - result.score) -
        Math.abs(b.marks[key] - result.score),
    )[0];
    criteria[key] = {
      ...result,
      band: bandOfMark(result.score),
      ...closest.detail[key],
      showScore: gates.writing[key] || showUnvalidated,
      validated: gates.writing[key],
    };
  }
  const rawTaskScore = writingTaskScore(
    Object.fromEntries(
      WRITING_CRITERIA.map((key) => [key, criteria[key].score]),
    ) as Record<WritingCriterion, number>,
  );
  const errors = consensusErrors(runs.map((r) => r.errors));
  const requirements = input.requirements.map((r) => ({
    id: r.id,
    text: r.text,
    met: MET_BY_ORDER[
      Math.round(median(runs.map((run) => MET_ORDER[run.requirements[r.id]])))
    ],
  }));
  const closestOverall = [...runs].sort(
    (a, b) =>
      Math.abs(writingTaskScore(a.marks) - rawTaskScore) -
      Math.abs(writingTaskScore(b.marks) - rawTaskScore),
  )[0];
  return {
    status: "graded",
    model,
    promptVersion: PROMPT_VERSION,
    rubricVersion: RUBRIC_VERSION,
    measures,
    criteria,
    taskScore: WRITING_CRITERIA.every((key) => criteria[key].showScore)
      ? rawTaskScore
      : null,
    rawTaskScore,
    requirements,
    errors,
    errorsPer100: (errors.length / Math.max(1, measures.words)) * 100,
    droppedQuotes: runs.reduce((sum, r) => sum + r.dropped, 0),
    totalQuotes: runs.reduce((sum, r) => sum + r.quotes, 0),
    runs: runs.length,
    lowConfidence: WRITING_CRITERIA.some((key) => criteria[key].unsure),
    summary: closestOverall.summary,
  };
}

/** The level a Writing task score falls in, for display next to the mark. */
export const taskBand = (score: number) => bandOf(score);
