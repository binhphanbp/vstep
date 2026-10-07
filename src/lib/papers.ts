import manifest from "../../public/papers/manifest.json";
import type { PaperRun } from "./learning";
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
    if (next.stage === paper.sections.length - 1) {
      next.finishedAt = new Date(Math.min(now, next.deadline)).toISOString();
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
