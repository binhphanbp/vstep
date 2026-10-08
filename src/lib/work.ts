import type { StudyState } from "./learning";
import { MARK_LIMITS, sentenceSpans, toggleMark, type Mark } from "./marks";

/**
 * What Gùa jots and highlights while she works, as opposed to the notes she
 * writes about a question afterwards.
 *
 * It belongs to the sitting, not to a question: a paper sitting, a lesson
 * attempt or a timed exam carries its own scratch pad and highlights, so doing
 * the same paper again starts on a clean page, an old sitting shows what was
 * written on it that day, and a sitting let go of by the 100-sitting cap takes
 * its scratch with it. Nothing has to be cleaned up because nothing is kept
 * anywhere else.
 *
 * As with notes, every limit is checked where the value is written, not only
 * in the schema: the saved profile is written unvalidated and a value the
 * schema rejects would be reported as damaged data on the next load.
 */
export const WORK_LIMITS = {
  /** Characters on one page of scratch (one part of one sitting). */
  scratch: 2000,
  /** Pages of scratch, and passages with highlights, in one sitting. */
  keys: 40,
  /** What all scratch and highlights may take in the saved profile. */
  bytes: 512 * 1024,
} as const;

export type Work = {
  scratch?: Record<string, string>;
  marks?: Record<string, Mark[]>;
};
export type WorkResult = { state: StudyState; error?: string };

const bytesOf = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length;

const KEY_LIMIT = 120;
const FULL =
  "Nháp và câu tô đã dùng hết phần dung lượng dành cho chúng (0,5 MB). Xóa bớt nháp ở các lượt cũ hoặc bỏ tô vài câu rồi thử lại.";

/** The scratch page, or the highlights, of one part of one text. */
export function withScratch<T extends Work>(
  holder: T,
  key: string,
  value: string,
): { holder: T; error?: string } {
  if (key.length > KEY_LIMIT) return { holder, error: "Không ghi được nháp." };
  if (value.length > WORK_LIMITS.scratch)
    return {
      holder,
      error: `Nháp dài tối đa ${WORK_LIMITS.scratch} ký tự cho mỗi phần.`,
    };
  const current = holder.scratch ?? {};
  if (!(key in current) && Object.keys(current).length >= WORK_LIMITS.keys)
    return { holder, error: "Không ghi thêm được nháp cho lượt này nữa." };
  const pages = { ...current };
  if (value) pages[key] = value;
  else delete pages[key];
  const next = { ...holder };
  if (Object.keys(pages).length) next.scratch = pages;
  else delete next.scratch;
  return { holder: next };
}

export function withMark<T extends Work>(
  holder: T,
  key: string,
  text: string,
  index: number,
): { holder: T; error?: string } {
  if (key.length > KEY_LIMIT)
    return { holder, error: "Không tô được câu này." };
  const current = holder.marks ?? {};
  const result = toggleMark(sentenceSpans(text), current[key], index);
  if (result.error) return { holder, error: result.error };
  if (!(key in current) && Object.keys(current).length >= WORK_LIMITS.keys)
    return { holder, error: "Không tô thêm được ở lượt này nữa." };
  const lists = { ...current };
  if (result.marks.length) lists[key] = result.marks;
  else delete lists[key];
  const next = { ...holder };
  if (Object.keys(lists).length) next.marks = lists;
  else delete next.marks;
  return { holder: next };
}

const sizes = new WeakMap<StudyState, number>();
/** Bytes of all scratch and highlights in the profile, as they are stored. */
export function workBytes(state: StudyState): number {
  const known = sizes.get(state);
  if (known !== undefined) return known;
  let size = 0;
  const count = (holder: Work | null | undefined) => {
    if (holder?.scratch || holder?.marks)
      size += bytesOf([holder.scratch ?? null, holder.marks ?? null]);
  };
  for (const run of state.paperRuns ?? []) count(run);
  for (const attempt of state.attempts) count(attempt);
  count(state.exam);
  for (const [key, value] of Object.entries(state.drafts))
    if (key.startsWith(DRAFT_PREFIX)) size += bytesOf(value);
  sizes.set(state, size);
  return size;
}

/** A change that makes the pile bigger than it may be is refused. */
function checked(before: StudyState, after: StudyState): WorkResult {
  if (after === before) return { state: before };
  if (
    workBytes(after) > WORK_LIMITS.bytes &&
    workBytes(after) > workBytes(before)
  )
    return { state: before, error: FULL };
  return { state: after };
}

function onRun(
  state: StudyState,
  runId: string,
  change: (run: NonNullable<StudyState["paperRuns"]>[number]) => {
    holder: NonNullable<StudyState["paperRuns"]>[number];
    error?: string;
  },
): WorkResult {
  const runs = state.paperRuns ?? [];
  const found = runs.find((run) => run.id === runId);
  if (!found) return { state, error: "Không tìm thấy lượt làm này." };
  const result = change(found);
  if (result.error) return { state, error: result.error };
  return checked(state, {
    ...state,
    paperRuns: runs.map((run) => (run.id === runId ? result.holder : run)),
  });
}

export function setRunScratch(
  state: StudyState,
  runId: string,
  key: string,
  value: string,
): WorkResult {
  return onRun(state, runId, (run) => withScratch(run, key, value));
}

export function toggleRunMark(
  state: StudyState,
  runId: string,
  key: string,
  text: string,
  index: number,
): WorkResult {
  return onRun(state, runId, (run) => withMark(run, key, text, index));
}

function onExam(
  state: StudyState,
  examId: string,
  change: (exam: NonNullable<StudyState["exam"]>) => {
    holder: NonNullable<StudyState["exam"]>;
    error?: string;
  },
): WorkResult {
  // The exam an old tab was showing may have been replaced by a new one.
  if (!state.exam || state.exam.id !== examId)
    return { state, error: "Buổi thi này không còn mở." };
  const result = change(state.exam);
  if (result.error) return { state, error: result.error };
  return checked(state, { ...state, exam: result.holder });
}

export function setExamScratch(
  state: StudyState,
  examId: string,
  key: string,
  value: string,
): WorkResult {
  return onExam(state, examId, (exam) => withScratch(exam, key, value));
}

export function toggleExamMark(
  state: StudyState,
  examId: string,
  key: string,
  text: string,
  index: number,
): WorkResult {
  return onExam(state, examId, (exam) => withMark(exam, key, text, index));
}

export function toggleAttemptMark(
  state: StudyState,
  attemptId: string,
  key: string,
  text: string,
  index: number,
): WorkResult {
  const found = state.attempts.find((attempt) => attempt.id === attemptId);
  if (!found) return { state, error: "Không tìm thấy buổi học này." };
  const result = withMark(found, key, text, index);
  if (result.error) return { state, error: result.error };
  return checked(state, {
    ...state,
    attempts: state.attempts.map((attempt) =>
      attempt.id === attemptId ? result.holder : attempt,
    ),
  });
}

/* A lesson has no sitting object until it is filed, so what is written while
   it is open lives in one draft per lesson. It goes onto the attempt when the
   lesson is filed and is dropped when the lesson is started again. */
const DRAFT_PREFIX = "work:";
export const workDraftKey = (lessonId: string) => `${DRAFT_PREFIX}${lessonId}`;

const isMark = (value: unknown): value is Mark =>
  typeof value === "object" &&
  value !== null &&
  Number.isInteger((value as Mark).i) &&
  (value as Mark).i >= 0 &&
  (value as Mark).i < MARK_LIMITS.sentences &&
  typeof (value as Mark).q === "string" &&
  (value as Mark).q.length <= MARK_LIMITS.quote;

/** What a lesson's draft holds; anything malformed reads as nothing. */
export function readWork(raw: string | undefined): Work {
  try {
    const value = JSON.parse(raw ?? "") as Work;
    const work: Work = {};
    const scratch = Object.entries(value?.scratch ?? {}).filter(
      ([key, text]) =>
        key.length <= KEY_LIMIT &&
        typeof text === "string" &&
        text.length <= WORK_LIMITS.scratch,
    );
    if (scratch.length) work.scratch = Object.fromEntries(scratch);
    const marks = Object.entries(value?.marks ?? {})
      .map(
        ([key, list]) =>
          [
            key,
            Array.isArray(list)
              ? list.filter(isMark).slice(0, MARK_LIMITS.perText)
              : [],
          ] as const,
      )
      .filter(([key, list]) => key.length <= KEY_LIMIT && list.length);
    if (marks.length) work.marks = Object.fromEntries(marks);
    return work;
  } catch {
    return {};
  }
}

export function draftWork(state: StudyState, lessonId: string): Work {
  return readWork(state.drafts[workDraftKey(lessonId)]);
}

function writeDraft(
  state: StudyState,
  lessonId: string,
  work: Work,
): StudyState {
  const drafts = { ...state.drafts };
  if (work.scratch || work.marks)
    drafts[workDraftKey(lessonId)] = JSON.stringify(work);
  else delete drafts[workDraftKey(lessonId)];
  return { ...state, drafts };
}

export function setDraftScratch(
  state: StudyState,
  lessonId: string,
  key: string,
  value: string,
): WorkResult {
  const result = withScratch(draftWork(state, lessonId), key, value);
  if (result.error) return { state, error: result.error };
  return checked(state, writeDraft(state, lessonId, result.holder));
}

export function toggleDraftMark(
  state: StudyState,
  lessonId: string,
  key: string,
  text: string,
  index: number,
): WorkResult {
  const result = withMark(draftWork(state, lessonId), key, text, index);
  if (result.error) return { state, error: result.error };
  return checked(state, writeDraft(state, lessonId, result.holder));
}

/** Takes the lesson's scratch and highlights out of the draft, to file them. */
export function takeDraftWork(
  state: StudyState,
  lessonId: string,
): { state: StudyState; work: Work } {
  const work = draftWork(state, lessonId);
  if (!(workDraftKey(lessonId) in state.drafts)) return { state, work };
  return { state: writeDraft(state, lessonId, {}), work };
}
