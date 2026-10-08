/**
 * Everything that, when it changes, changes what a grade means. A saved grade
 * records these, and its cache key includes them, so an old grade is never
 * mistaken for a new one.
 */
import { RUBRIC_VERSION } from "../rubric/vstep-3-5";

/**
 * The model is pinned by its exact id and changed only after the eval harness
 * has been re-run on the new one. `gemini-3.8-flash` is the working default;
 * the harness compares it with `gemini-3.1-pro-preview` before Đợt 2 relies on it.
 */
export const GRADER_MODEL = "gemini-3.8-flash";
export const TRANSCRIBE_MODEL = "gemini-3.8-flash";

/** Bump when any prompt or response schema in prompts.ts / schema.ts changes. */
export const PROMPT_VERSION = "p1";

export { RUBRIC_VERSION };

/** The sentence every grade carries on screen and in exports. */
export const ESTIMATE_LABEL =
  "Điểm ước lượng theo thang VSTEP do AI chấm, không phải điểm chính thức.";
