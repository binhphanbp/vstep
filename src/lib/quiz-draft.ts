import type { Lesson } from "./content";
export function readQuizDraft(
  raw: string | undefined,
  lesson: Lesson,
): { answers: Record<string, number>; seconds: number } {
  try {
    const value = JSON.parse(raw ?? "{}");
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
        seconds:
          typeof value.seconds === "number" && Number.isFinite(value.seconds)
            ? Math.max(0, Math.min(18000, value.seconds))
            : 0,
      };
  } catch {
    /* Old or malformed drafts start empty without affecting history. */
  }
  return { answers: {}, seconds: 0 };
}
