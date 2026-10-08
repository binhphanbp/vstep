import manifest from "../../public/papers/manifest.json";
import { MAX_PAPER_RUNS, type PaperRun } from "./learning";
import type { Skill } from "./content";

export type PaperItem = {
  id: string;
  number: number;
  text: string;
  translation: string;
  options: { text: string; translation: string }[];
  answer: number | null;
  explanation: string;
  evidence: string;
  notes: string[];
};
export type PaperSlot = {
  id: string;
  part: string;
  title: string;
  code: string;
  audio?: string;
  passage: string;
  passageTranslation: string;
  transcript: string;
  transcriptTranslation: string;
  prompt: string;
  promptTranslation: string;
  cues: string[];
  wordMin?: number;
  items: PaperItem[];
  samples: {
    band: string;
    title: string;
    text: string;
    translation: string;
    audio: string[];
  }[];
};
export type Paper = {
  id: PaperRun["paperId"];
  version: number;
  title: string;
  graded: boolean;
  source: string;
  sourceHash: string;
  sections: { skill: Skill; minutes: number; slots: PaperSlot[] }[];
};
export const paperCatalog = manifest as {
  id: PaperRun["paperId"];
  title: string;
  graded: boolean;
  version: number;
}[];

export function paperScore(paper: Paper, run: PaperRun) {
  return paper.sections.slice(0, 2).map((section) => {
    const items = section.slots.flatMap((slot) => slot.items);
    const gradable = items.filter((item) => item.answer !== null);
    return {
      skill: section.skill,
      correct: gradable.filter((item) => run.answers[item.id] === item.answer)
        .length,
      answered: items.filter((item) => run.answers[item.id] !== undefined)
        .length,
      total: gradable.length,
    };
  });
}

export function paperAnswered(paper: Paper, run: PaperRun, stage: number) {
  const section = paper.sections[stage];
  if (section.skill === "writing")
    return section.slots.filter((slot) => (run.essays[slot.id] ?? "").trim())
      .length;
  if (section.skill === "speaking")
    return section.slots.filter((slot) => run.spoken.includes(slot.id)).length;
  return section.slots
    .flatMap((slot) => slot.items)
    .filter((item) => run.answers[item.id] !== undefined).length;
}

export function paperStageTotal(paper: Paper, stage: number) {
  const section = paper.sections[stage];
  return section.skill === "listening" || section.skill === "reading"
    ? section.slots.reduce((sum, slot) => sum + slot.items.length, 0)
    : section.slots.length;
}

/** The sections a sitting covers, in order: all four, or a single skill. */
export function runStages(run: Pick<PaperRun, "only">): number[] {
  return run.only === undefined ? [0, 1, 2, 3] : [run.only];
}

/** True when closing this section ends the sitting. */
export function isFinalStage(run: Pick<PaperRun, "only" | "stage">) {
  return run.only !== undefined || run.stage === 3;
}

/**
 * Minutes used on each section of a finished sitting, from the times its
 * sections closed. Sittings saved before the log existed have none.
 */
export function stageMinutes(run: PaperRun) {
  const ends = run.stageEnds ?? [];
  // A log that stops short of the sections sat cannot be lined up with them.
  if (run.finishedAt && ends.length !== runStages(run).length) return [];
  return runStages(run)
    .map((stage, index) => {
      const end = ends[index];
      if (end === undefined) return undefined;
      const start = index ? ends[index - 1] : run.startedAt;
      return { stage, minutes: Math.max(0, (end - start) / 60_000) };
    })
    .filter((entry) => entry !== undefined);
}

export type ItemStatus = "correct" | "wrong" | "blank" | "ungraded";
export function itemStatus(item: PaperItem, run: PaperRun): ItemStatus {
  const chosen = run.answers[item.id];
  if (item.answer === null) return "ungraded";
  if (chosen === undefined) return "blank";
  return chosen === item.answer ? "correct" : "wrong";
}

/** Correct, wrong and blank counts for each part of Listening and Reading. */
export function partBreakdown(paper: Paper, run: PaperRun, stage: 0 | 1) {
  const parts = new Map<
    string,
    {
      part: string;
      correct: number;
      wrong: number;
      blank: number;
      total: number;
    }
  >();
  for (const slot of paper.sections[stage].slots) {
    const entry = parts.get(slot.part) ?? {
      part: slot.part,
      correct: 0,
      wrong: 0,
      blank: 0,
      total: 0,
    };
    for (const item of slot.items) {
      const status = itemStatus(item, run);
      if (status === "ungraded") continue;
      entry[status]++;
      entry.total++;
    }
    parts.set(slot.part, entry);
  }
  return [...parts.values()];
}

/** Deadline stays absolute across reloads, background tabs and sleep. */
export function advancePaperRun(
  run: PaperRun,
  paper: Paper,
  now: number,
  force = false,
): PaperRun {
  if (run.finishedAt || (!force && now < run.deadline)) return run;
  let next = { ...run };
  while (!next.finishedAt && (force || now >= next.deadline)) {
    const closed = Math.min(now, next.deadline);
    // The log is positional: entry n belongs to the n-th section of the
    // sitting. A sitting begun before the log existed would put a Reading
    // time in Listening's place, so it simply keeps no log.
    const logged = next.stageEnds?.length ?? 0;
    if (logged === runStages(next).indexOf(next.stage))
      next.stageEnds = [...(next.stageEnds ?? []), closed];
    if (isFinalStage(next)) {
      next.finishedAt = new Date(closed).toISOString();
      break;
    }
    const base = force ? now : next.deadline;
    next = {
      ...next,
      stage: next.stage + 1,
      material: 0,
      deadline: base + paper.sections[next.stage + 1].minutes * 60_000,
    };
    if (force) break;
  }
  return next;
}

/**
 * How the exam room paces the parts.
 *
 * These come from public descriptions by test centres and prep sites, not from
 * an official specification, and the app says so on the check-in screen:
 * Listening recordings play once; Speaking is Part 1 about three minutes, Part
 * 2 one minute to prepare and two to talk, Part 3 one minute to prepare and
 * three to talk. The pause before a recording starts is the app's own choice.
 */
export const LISTENING_READ_SECONDS = 8;
export const SPEAKING_PARTS = [
  { prepSeconds: 0, talkSeconds: 180 },
  { prepSeconds: 60, talkSeconds: 120 },
  { prepSeconds: 60, talkSeconds: 180 },
] as const;

/** Where each reading question sits, for the question palette. */
export function readingPalette(paper: Paper) {
  const section = paper.sections[1];
  return section.slots.flatMap((slot, slotIndex) =>
    slot.items.map((item) => ({ item, slotIndex })),
  );
}

/**
 * Adds a new sitting to the saved ones.
 *
 * - If the paper already has one in progress (a second tab that still showed
 *   the start screen), nothing is added and that sitting is returned instead:
 *   two open sittings of one paper would leave the older one stranded.
 * - The saved list is capped. A sitting past the cap would be written to the
 *   device but fail validation on the next load and make the whole app read
 *   as damaged, so the oldest finished sittings are let go first.
 */
export function addPaperRun(
  runs: readonly PaperRun[],
  next: PaperRun,
  cap = MAX_PAPER_RUNS,
): { runs: PaperRun[]; reused?: PaperRun; dropped: PaperRun[] } {
  const open = runs.find(
    (run) => run.paperId === next.paperId && !run.finishedAt,
  );
  if (open) return { runs: [...runs], reused: open, dropped: [] };
  const kept = [...runs];
  const dropped: PaperRun[] = [];
  while (kept.length >= cap) {
    const oldest = kept.findIndex((run) => run.finishedAt);
    if (oldest === -1) break;
    dropped.push(...kept.splice(oldest, 1));
  }
  return { runs: [...kept, next], dropped };
}
