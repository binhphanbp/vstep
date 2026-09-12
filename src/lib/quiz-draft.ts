import type { Lesson } from "./content";
import type { Confidence } from "./learning";
export function readQuizDraft(
  raw: string | undefined,
  lesson: Lesson,
): {
  answers: Record<string, number>;
  confidence: Record<string, Confidence>;
  seconds: number;
} {
  try {
    const value = JSON.parse(raw ?? "{}");
    const storedVersion =
      typeof value?.contentVersion === "number" ? value.contentVersion : 1;
    if (storedVersion !== lesson.version)
      return { answers: {}, confidence: {}, seconds: 0 };
    if (value && typeof value === "object")
      return {
        answers:
          value.answers && typeof value.answers === "object"
            ? (Object.fromEntries(
                Object.entries(value.answers).filter(
                  ([id, answer]) =>
                    lesson.questions.some((q) => q.id === id) &&
                    Number.isInteger(answer) &&
                    Number(answer) >= 0 &&
                    Number(answer) <= 3,
                ),
              ) as Record<string, number>)
            : {},
        confidence:
          value.confidence && typeof value.confidence === "object"
            ? (Object.fromEntries(
                Object.entries(value.confidence).filter(
                  ([id, confidence]) =>
                    lesson.questions.some((q) => q.id === id) &&
                    ["guess", "unsure", "sure"].includes(String(confidence)),
                ),
              ) as Record<string, Confidence>)
            : {},
        seconds:
          typeof value.seconds === "number" && Number.isFinite(value.seconds)
            ? Math.max(0, Math.min(18000, value.seconds))
            : 0,
      };
  } catch {
    /* Old or malformed drafts start empty without affecting history. */
  }
  return { answers: {}, confidence: {}, seconds: 0 };
}
