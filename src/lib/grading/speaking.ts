import * as z from "zod/mini";
import {
  EXTRA_RUNS,
  FIRST_RUNS,
  collect,
  disagrees,
  summarise,
} from "./aggregate";
import type { CriterionGrade } from "./writing";
import {
  GRADER_MODEL,
  PROMPT_VERSION,
  RUBRIC_VERSION,
  TRANSCRIBE_MODEL,
} from "./config";
import type { Generate, OnProgress, Part } from "./generate";
import { GATES, SHOW_UNVALIDATED_SCORES, type Gates } from "./gates";
import {
  fluencyMeasures,
  timestampsPlausible,
  type FluencyMeasures,
} from "./measures";
import { TRANSCRIBE_SYSTEM, speakingScorePrompt } from "./prompts";
import {
  checkCriteria,
  speakingScoreJson,
  speakingScoreSchema,
  transcriptJson,
  transcriptSchema,
} from "./schema";
import {
  SPEAKING_CRITERIA,
  speakingScore,
  type SpeakingCriterion,
} from "./scores";
import { bandOfMark } from "../rubric/vstep-3-5";
import { verifyQuotes } from "./verify";
import { wordCount } from "../learning";

export type SpeakingPartInput = {
  id: string;
  title: string;
  prompt: string;
  audio: { mimeType: string; base64: string };
  /** Length of the recording in seconds, as the browser measured it. */
  durationSeconds: number;
};

export type SpeakingBlock = "silent";
/** Fewer words than this across all parts is treated as no answer. */
export const MIN_SPOKEN_WORDS = 15;

export type SpeakingGrade =
  | { status: "blocked"; reason: SpeakingBlock; words: number }
  | {
      status: "graded";
      model: string;
      promptVersion: string;
      rubricVersion: string;
      parts: {
        id: string;
        transcript: string;
        fluency: FluencyMeasures | null;
        timesPlausible: boolean;
      }[];
      criteria: Record<SpeakingCriterion, CriterionGrade>;
      /** Mean of the five median marks, rounded to 0.5; null unless all five may show. */
      speakingScore: number | null;
      rawSpeakingScore: number;
      droppedQuotes: number;
      totalQuotes: number;
      runs: number;
      lowConfidence: boolean;
      summary: string;
    };

async function scoreRun(
  parts: {
    input: SpeakingPartInput;
    transcript: string;
    fluency: FluencyMeasures | null;
  }[],
  generate: Generate,
  model: string,
  index: number,
) {
  const prompt = speakingScorePrompt({
    parts: parts.map((p) => ({
      id: p.input.id,
      title: p.input.title,
      prompt: p.input.prompt,
      transcript: p.transcript,
      fluency: p.fluency,
    })),
  });
  const content: Part[] = [{ text: prompt.user }];
  for (const p of parts) {
    content.push({ text: `RECORDING: ${p.input.title}` });
    content.push({ audio: p.input.audio });
  }
  const scored = z.parse(
    speakingScoreSchema,
    await generate({
      label: `speaking-score-${index}`,
      model,
      system: prompt.system,
      parts: content,
      jsonSchema: speakingScoreJson,
      thinking: "HIGH",
    }),
  );
  checkCriteria(scored.criteria, SPEAKING_CRITERIA);
  const all = parts.map((p) => p.transcript).join("\n");
  const marks = {} as Record<SpeakingCriterion, number>;
  const detail = {} as Record<
    SpeakingCriterion,
    {
      evidence: string[];
      whyNotHigher: string;
      whyNotLower: string;
      toRaise: string;
    }
  >;
  let dropped = 0;
  let quotes = 0;
  for (const item of scored.criteria) {
    const key = item.criterion as SpeakingCriterion;
    const checked = verifyQuotes(
      item.evidence.map((quote) => ({ quote })),
      all,
    );
    dropped += checked.dropped;
    quotes += item.evidence.length;
    marks[key] = item.score;
    detail[key] = {
      evidence: checked.kept.map((e) => e.quote),
      whyNotHigher: item.whyNotHigher,
      whyNotLower: item.whyNotLower,
      toRaise: item.toRaise,
    };
  }
  return { marks, detail, dropped, quotes, summary: scored.summary };
}

function distance(
  marks: Record<SpeakingCriterion, number>,
  criteria: Record<SpeakingCriterion, CriterionGrade>,
) {
  return SPEAKING_CRITERIA.reduce(
    (sum, key) => sum + Math.abs(marks[key] - criteria[key].score),
    0,
  );
}

export async function gradeSpeaking(
  inputs: SpeakingPartInput[],
  deps: {
    generate: Generate;
    model?: string;
    transcribeModel?: string;
    gates?: Gates;
    showUnvalidated?: boolean;
    onProgress?: OnProgress;
  },
): Promise<SpeakingGrade> {
  const model = deps.model ?? GRADER_MODEL;
  const gates = deps.gates ?? GATES;
  const showUnvalidated = deps.showUnvalidated ?? SHOW_UNVALIDATED_SCORES;

  // One transcript per part, made once: the scoring runs all read the same one.
  let transcribed = 0;
  deps.onProgress?.({ stage: "transcribe", done: 0, total: inputs.length });
  const parts = await Promise.all(
    inputs.map(async (input, index) => {
      const heard = z.parse(
        transcriptSchema,
        await deps.generate({
          label: `speaking-transcribe-${index}`,
          model: deps.transcribeModel ?? TRANSCRIBE_MODEL,
          system: TRANSCRIBE_SYSTEM,
          parts: [{ audio: input.audio }],
          jsonSchema: transcriptJson,
          thinking: "LOW",
        }),
      );
      const timesPlausible = timestampsPlausible(
        heard.words,
        input.durationSeconds,
      );
      deps.onProgress?.({
        stage: "transcribe",
        done: ++transcribed,
        total: inputs.length,
      });
      return {
        input,
        transcript: heard.transcript,
        timesPlausible,
        fluency: timesPlausible ? fluencyMeasures(heard.words) : null,
      };
    }),
  );
  const words = parts.reduce((sum, p) => sum + wordCount(p.transcript), 0);
  if (words < MIN_SPOKEN_WORDS)
    return { status: "blocked", reason: "silent", words };

  const track = async (
    count: number,
    first: number,
    stage: "runs" | "extra",
  ) => {
    let done = 0;
    deps.onProgress?.({ stage, done, total: count });
    return Promise.all(
      Array.from({ length: count }, (_, i) =>
        scoreRun(parts, deps.generate, model, first + i).then((run) => {
          deps.onProgress?.({ stage, done: ++done, total: count });
          return run;
        }),
      ),
    );
  };
  const runs = await track(FIRST_RUNS, 0, "runs");
  if (disagrees(collect(runs.map((r) => r.marks))))
    runs.push(...(await track(EXTRA_RUNS, FIRST_RUNS, "extra")));

  const summary = summarise(collect(runs.map((r) => r.marks)));
  // Fluency numbers rest on word times; without believable times in every
  // part the criterion keeps its comments and loses its score.
  const timed = parts.every((p) => p.timesPlausible);
  const criteria = {} as Record<SpeakingCriterion, CriterionGrade>;
  for (const key of SPEAKING_CRITERIA) {
    const result = summary[key];
    const closest = [...runs].sort(
      (a, b) =>
        Math.abs(a.marks[key] - result.score) -
        Math.abs(b.marks[key] - result.score),
    )[0];
    criteria[key] = {
      ...result,
      band: bandOfMark(result.score),
      ...closest.detail[key],
      // Fluency is built on word times: without believable times in every
      // part it has no mark, validated or not.
      showScore:
        (gates.speaking[key] || showUnvalidated) &&
        (key !== "fluency" || timed),
      validated: gates.speaking[key] && (key !== "fluency" || timed),
    };
  }
  const raw = speakingScore(
    Object.fromEntries(
      SPEAKING_CRITERIA.map((key) => [key, criteria[key].score]),
    ) as Record<SpeakingCriterion, number>,
  );
  return {
    status: "graded",
    model,
    promptVersion: PROMPT_VERSION,
    rubricVersion: RUBRIC_VERSION,
    parts: parts.map((p) => ({
      id: p.input.id,
      transcript: p.transcript,
      fluency: p.fluency,
      timesPlausible: p.timesPlausible,
    })),
    criteria,
    speakingScore: SPEAKING_CRITERIA.every((key) => criteria[key].showScore)
      ? raw
      : null,
    rawSpeakingScore: raw,
    droppedQuotes: runs.reduce((sum, r) => sum + r.dropped, 0),
    totalQuotes: runs.reduce((sum, r) => sum + r.quotes, 0),
    runs: runs.length,
    lowConfidence: SPEAKING_CRITERIA.some((key) => criteria[key].unsure),
    summary: [...runs].sort(
      (a, b) => distance(a.marks, criteria) - distance(b.marks, criteria),
    )[0].summary,
  };
}
