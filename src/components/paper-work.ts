import type { PaperRun, StudyState } from "@/lib/learning";
import type { Mark } from "@/lib/marks";
import { setRunScratch, toggleRunMark } from "@/lib/work";
import { applyChange } from "./apply-change";

/**
 * How a screen reads and writes the scratch pages and highlights of one paper
 * sitting. Each write returns why it was refused, or nothing.
 */
export type PaperWork = {
  scratch: (key: string) => string;
  setScratch: (key: string, value: string) => string | undefined;
  marks: (key: string) => Mark[] | undefined;
  toggle: (key: string, text: string, index: number) => string | undefined;
};

/** Keys are the part's id, with `:p`, `:t` or `:q` for passage, transcript, task. */
export const passageKey = (slotId: string) => `${slotId}:p`;
export const transcriptKey = (slotId: string) => `${slotId}:t`;
export const taskKey = (slotId: string) => `${slotId}:q`;

export function paperWork(
  run: PaperRun,
  update: (fn: (state: StudyState) => StudyState) => void,
): PaperWork {
  return {
    scratch: (key) => run.scratch?.[key] ?? "",
    setScratch: (key, value) =>
      applyChange(update, (state) => setRunScratch(state, run.id, key, value))
        ?.error,
    marks: (key) => run.marks?.[key],
    toggle: (key, text, index) =>
      applyChange(update, (state) =>
        toggleRunMark(state, run.id, key, text, index),
      )?.error,
  };
}

/** What the empty scratch page suggests writing, by skill. */
export const SCRATCH_HINTS = {
  listening: "Từ khóa, con số, tên riêng nghe được…",
  reading: "Ý chính của từng đoạn, từ khóa tìm được…",
  writing: "Dàn ý trước khi viết: mở bài, các ý chính, kết bài…",
  speaking: "Dàn ý 3–4 ý trước khi nói…",
} as const;
