import { describe, expect, it } from "vitest";
import { lessons, type Question } from "../../src/lib/content";
import { fullListening, fullReading } from "../../src/lib/full-exam-content";
import { withStableOptionOrder } from "../../src/lib/option-order";

/** Best score a repeating key pattern of up to five letters can reach. */
function bestCycle(keys: number[]) {
  let best = 0;
  for (let length = 1; length <= 5; length++)
    for (let candidate = 0; candidate < 4 ** length; candidate++) {
      const pattern = Array.from(
        { length },
        (_, index) => Math.floor(candidate / 4 ** index) % 4,
      );
      const hits = keys.filter(
        (key, index) => key === pattern[index % length],
      ).length;
      if (hits > best) best = hits;
    }
  return best / keys.length;
}

const banks: Record<string, Question[]> = {
  fullReading: fullReading.flatMap((lesson) => lesson.questions),
  fullListening: fullListening.flatMap((lesson) => lesson.questions),
  shortReading: lessons
    .filter((lesson) => lesson.skill === "reading")
    .flatMap((lesson) => lesson.questions),
  shortListening: lessons
    .filter((lesson) => lesson.skill === "listening")
    .flatMap((lesson) => lesson.questions),
};

describe("answer keys carry no guessable pattern", () => {
  it("cannot be beaten by a repeating cycle", () => {
    // The authored order let BCADB score 33/40 on the exam's Reading section.
    // A short bank overfits any cycle, so the bar is loosest where n is small.
    const limits: Record<string, number> = {
      fullReading: 0.55,
      fullListening: 0.55,
      shortReading: 0.65,
      shortListening: 0.65,
    };
    for (const [name, questions] of Object.entries(banks))
      expect(
        bestCycle(questions.map((question) => question.answer)),
        name,
      ).toBeLessThanOrEqual(limits[name]);
  });

  it("spreads the key across all four positions", () => {
    for (const [name, questions] of Object.entries(banks)) {
      const counts = [0, 0, 0, 0];
      for (const question of questions) counts[question.answer]++;
      for (const count of counts)
        expect(count / questions.length, name).toBeLessThanOrEqual(0.4);
    }
  });

  it("never repeats a key three times running inside one lesson", () => {
    // Whole banks can look fine while a single lesson reads DDDD on screen.
    for (const lesson of [...lessons, ...fullReading, ...fullListening]) {
      const keys = lesson.questions.map((question) => question.answer);
      if (keys.length >= 3)
        expect(new Set(keys).size, lesson.id).toBeGreaterThan(1);
      let run = 1;
      for (let index = 1; index < keys.length; index++) {
        run = keys[index] === keys[index - 1] ? run + 1 : 1;
        expect(run, `${lesson.id} at ${index}`).toBeLessThan(3);
      }
    }
  });

  it("keeps the same option in front of the same id every time", () => {
    const question = fullReading[0].questions[0];
    expect(withStableOptionOrder(question)).toEqual(
      withStableOptionOrder(question),
    );
  });

  it("moves the notes with the options it reorders", () => {
    const source: Question = {
      id: "order-test",
      text: "q",
      options: ["a", "b", "c", "d"],
      answer: 2,
      explanation: "e",
      tag: "t",
      optionNotes: ["na", "nb", "Đúng: nc", "nd"],
    };
    const moved = withStableOptionOrder(source);
    expect(moved.options).toHaveLength(4);
    expect([...moved.options].sort()).toEqual(["a", "b", "c", "d"]);
    expect(moved.options[moved.answer]).toBe("c");
    expect(moved.optionNotes![moved.answer]).toBe("Đúng: nc");
    for (const [index, option] of moved.options.entries())
      expect(moved.optionNotes![index]).toBe(
        source.optionNotes![source.options.indexOf(option)],
      );
  });
});
