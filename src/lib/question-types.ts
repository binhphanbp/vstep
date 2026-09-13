/**
 * The question-type matrix the exam is written against.
 *
 * The first draft of the bank had no matrix, and the result was a section that
 * tested one sub-skill: 24 of the 40 Reading questions and 29 of the 35
 * Listening questions were plain detail lookups. A learner can pass a section
 * like that by scanning for a matching phrase, which is not what either skill
 * is. The counts below are what `tests/unit/question-types.test.ts` enforces,
 * so adding material means writing to the matrix rather than around it.
 *
 * These are Mây's own authoring targets, not a published specification: the
 * official format states how many questions and how long, not how many of each
 * type. They follow the sub-skills the format's own descriptions name.
 */
export const readingTypes = [
  "Ý chính",
  "Thông tin chi tiết",
  "Suy luận",
  "Từ vựng trong ngữ cảnh",
  "Từ tham chiếu",
  "Mục đích tác giả",
  "Quan điểm tác giả",
] as const;

export const listeningTypes = [
  "Ý chính",
  "Thông tin chi tiết",
  "Thông tin thay đổi",
  "Suy luận",
  "Mục đích người nói",
  "Quan điểm người nói",
] as const;

/** Exactly this many of each type across the exam's four Reading passages. */
export const readingMatrix: Record<string, number> = {
  "Ý chính": 4,
  "Thông tin chi tiết": 14,
  "Suy luận": 9,
  "Từ vựng trong ngữ cảnh": 4,
  "Từ tham chiếu": 4,
  // Purpose of a sentence and the writer's stance are one family: each passage
  // carries at least one, and the exam needs both kinds represented.
  "Mục đích tác giả": 4,
  "Quan điểm tác giả": 1,
};

/**
 * Listening is written to floors and a ceiling rather than exact counts. Part 1
 * is eight separate announcements of a few sentences each, and a short notice
 * genuinely does mostly carry facts; forcing an even spread there would mean
 * inventing inference where the material holds none.
 */
export const listeningMatrix: {
  max: Record<string, number>;
  min: Record<string, number>;
} = {
  max: { "Thông tin chi tiết": 18 },
  min: {
    "Ý chính": 3,
    "Thông tin thay đổi": 2,
    "Suy luận": 5,
    "Mục đích người nói": 3,
    "Quan điểm người nói": 4,
  },
};

/** No Reading passage may be a detail drill, whatever the bank totals say. */
export const maxDetailPerPassage = 5;

export function countTypes(tags: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tag of tags) counts[tag] = (counts[tag] ?? 0) + 1;
  return counts;
}
