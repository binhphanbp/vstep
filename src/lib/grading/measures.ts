import { wordCount } from "../learning";

/**
 * What code can count about a piece of work, so the model is never asked to
 * count. Every figure here is exact and the same on every run.
 */

export const WRITING_MINIMUM = { task1: 120, task2: 250 } as const;

const VIETNAMESE_MARKS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/** Contiguous word runs of `size` words, lower-cased, for overlap checks. */
function ngrams(text: string, size: number) {
  const words = (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).map((w) =>
    w.replace(/'+$/g, ""),
  );
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i++)
    out.add(words.slice(i, i + size).join(" "));
  return out;
}

/** The share of `essay`'s 4-word runs that also occur in `source` (0–1). */
export function overlapWith(essay: string, source: string) {
  const mine = ngrams(essay, 4);
  if (mine.size === 0) return 0;
  const theirs = ngrams(source, 4);
  let shared = 0;
  for (const gram of mine) if (theirs.has(gram)) shared++;
  return shared / mine.size;
}

export type WritingMeasures = {
  words: number;
  sentences: number;
  paragraphs: number;
  /** Words in the shortest allowed answer, and whether this one reaches it. */
  minimum: number;
  reachesMinimum: boolean;
  /** Share of words carrying Vietnamese letters; high means not English. */
  vietnameseShare: number;
  /** Share of the essay copied from the task text, and from a model answer. */
  promptOverlap: number;
  sampleOverlap: number;
  /** Distinct words over words, 0–1 (rough, falls with length). */
  distinctShare: number;
};

export function writingMeasures(input: {
  text: string;
  task: 1 | 2;
  prompt: string;
  samples?: string[];
}): WritingMeasures {
  const text = input.text;
  const tokens = text.match(/[\p{L}\p{N}]+(?:['’.,-][\p{L}\p{N}]+)*/gu) ?? [];
  const words = wordCount(text);
  const minimum =
    input.task === 1 ? WRITING_MINIMUM.task1 : WRITING_MINIMUM.task2;
  const sentences = (text.match(/[^.!?\n]+[.!?]+(?=\s|$)|[^.!?\n]+$/gm) ?? [])
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphs = text
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part)).length;
  const vietnamese = tokens.filter((token) => VIETNAMESE_MARKS.test(token));
  return {
    words,
    sentences,
    paragraphs,
    minimum,
    reachesMinimum: words >= minimum,
    vietnameseShare: tokens.length ? vietnamese.length / tokens.length : 0,
    promptOverlap: overlapWith(text, input.prompt),
    sampleOverlap: Math.max(
      0,
      ...(input.samples ?? []).map((sample) => overlapWith(text, sample)),
    ),
    distinctShare: tokens.length
      ? new Set(tokens.map((t) => t.toLowerCase())).size / tokens.length
      : 0,
  };
}

/** Why a piece of writing should not be graded as an answer, if it should not. */
export type WritingBlock = "empty" | "too-short" | "not-english" | "copied";
export const TOO_SHORT_WORDS = 20;
export const COPY_THRESHOLD = 0.6;

export function writingBlock(m: WritingMeasures): WritingBlock | null {
  if (m.words === 0) return "empty";
  if (m.words < TOO_SHORT_WORDS) return "too-short";
  if (m.vietnameseShare > 0.25) return "not-english";
  if (m.promptOverlap >= COPY_THRESHOLD || m.sampleOverlap >= COPY_THRESHOLD)
    return "copied";
  return null;
}

/* ------------------------------------------------------------------ */

export type TimedWord = { word: string; start: number; end: number };

const FILLERS = new Set(["um", "uh", "er", "erm", "ah", "hmm", "mm", "uhm"]);
/** A gap this long between words counts as a pause. */
export const PAUSE_SECONDS = 0.5;
export const LONG_PAUSE_SECONDS = 1;

export type FluencyMeasures = {
  /** Seconds from the first word to the last (silence at either end is not counted). */
  spokenSeconds: number;
  words: number;
  wordsPerMinute: number;
  pausesPerMinute: number;
  longPausesPerMinute: number;
  /** Mean number of words said between two pauses. */
  meanRun: number;
  fillers: number;
  /** Immediate repeats of the same word ("the the"). */
  repeats: number;
};

export function fluencyMeasures(words: TimedWord[]): FluencyMeasures | null {
  const timed = words.filter(
    (w) =>
      Number.isFinite(w.start) && Number.isFinite(w.end) && w.end >= w.start,
  );
  if (timed.length < 2) return null;
  const spokenSeconds = timed[timed.length - 1].end - timed[0].start;
  if (spokenSeconds <= 0) return null;
  const minutes = spokenSeconds / 60;
  let pauses = 0;
  let longPauses = 0;
  let repeats = 0;
  const runs: number[] = [];
  let run = 1;
  for (let i = 1; i < timed.length; i++) {
    const gap = timed[i].start - timed[i - 1].end;
    if (gap >= PAUSE_SECONDS) {
      pauses++;
      if (gap >= LONG_PAUSE_SECONDS) longPauses++;
      runs.push(run);
      run = 1;
    } else run++;
    if (
      timed[i].word.toLowerCase().replace(/\W+/g, "") ===
        timed[i - 1].word.toLowerCase().replace(/\W+/g, "") &&
      /\w/.test(timed[i].word)
    )
      repeats++;
  }
  runs.push(run);
  const fillers = timed.filter((w) =>
    FILLERS.has(w.word.toLowerCase().replace(/\W+/g, "")),
  ).length;
  return {
    spokenSeconds,
    words: timed.length,
    wordsPerMinute: timed.length / minutes,
    pausesPerMinute: pauses / minutes,
    longPausesPerMinute: longPauses / minutes,
    meanRun: runs.reduce((a, b) => a + b, 0) / runs.length,
    fillers,
    repeats,
  };
}

/**
 * Word times from a model are an estimate until proven otherwise, and fluency
 * figures built on invented times would be worse than none. Accept them only
 * if they are ordered, inside the recording and cover a believable share of it.
 */
export function timestampsPlausible(
  words: TimedWord[],
  durationSeconds: number,
) {
  if (words.length < 5 || !(durationSeconds > 0)) return false;
  let previousStart = -1;
  for (const w of words) {
    if (!Number.isFinite(w.start) || !Number.isFinite(w.end)) return false;
    if (w.end < w.start || w.start < previousStart) return false;
    if (w.end > durationSeconds + 1) return false;
    previousStart = w.start;
  }
  const spoken = words[words.length - 1].end - words[0].start;
  // Speech can fill 15%–100% of a recording; outside that the times are suspect.
  return spoken >= durationSeconds * 0.15 && spoken <= durationSeconds + 1;
}
