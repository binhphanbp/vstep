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
