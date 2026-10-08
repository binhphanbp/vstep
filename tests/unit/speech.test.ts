import { expect, it } from "vitest";
import { speechChunks } from "../../src/lib/speech";
it("keeps conversational voices consistent and removes speaker labels", () => {
  expect(
    speechChunks("Mai: Hello. Are you ready?\nBen: Yes!\nMai: Let us begin."),
  ).toEqual([
    { text: "Hello.", speaker: 0 },
    { text: "Are you ready?", speaker: 0 },
    { text: "Yes!", speaker: 1 },
    { text: "Let us begin.", speaker: 0 },
  ]);
});
it("preserves prose and the final sentence without punctuation", () => {
  expect(speechChunks("A quiet place.\n\nOne more paragraph")).toEqual([
    { text: "A quiet place.", speaker: 0 },
    { text: "One more paragraph", speaker: 0 },
  ]);
});
it("does not cut a sentence at a title, a decimal or an abbreviation", () => {
  expect(
    speechChunks(
      "Dr. Hart opens at 9 a.m. today. It costs 3.5 dollars, e.g. a coffee.",
    ),
  ).toEqual([
    { text: "Dr. Hart opens at 9 a.m. today.", speaker: 0 },
    { text: "It costs 3.5 dollars, e.g. a coffee.", speaker: 0 },
  ]);
  expect(
    speechChunks("Mrs. Tam waved. Mr. Lee did not.").map((c) => c.text),
  ).toEqual(["Mrs. Tam waved.", "Mr. Lee did not."]);
  // A real end of sentence after a time is still an end.
  expect(
    speechChunks("We met at 9 a.m. The rest came later.").map((c) => c.text),
  ).toEqual(["We met at 9 a.m.", "The rest came later."]);
  // Ordinary text is unchanged, and no marker leaks out.
  const plain = speechChunks("It was late. Really late!");
  expect(plain.map((c) => c.text)).toEqual(["It was late.", "Really late!"]);
  expect(JSON.stringify(speechChunks("Dr. Hart, 3.5, e.g."))).not.toContain(
    "\\u0001",
  );
});
