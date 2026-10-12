import { expect, it } from "vitest";
import { lessons } from "../../src/lib/content";
import {
  UTTERANCE_LIMIT,
  speechChunks,
  speechPieces,
} from "../../src/lib/speech";
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

const long =
  "You are expected to submit one piece of writing a week; if you miss two in a row, we will contact you to arrange extra support before the next unit begins.";
it("says a short sentence whole and a long one in pieces that put it back together", () => {
  expect(speechPieces("It opens at nine.")).toEqual(["It opens at nine."]);
  expect(speechPieces("   ")).toEqual([]);
  const pieces = speechPieces(long);
  expect(long.length).toBeGreaterThan(UTTERANCE_LIMIT);
  expect(pieces.length).toBeGreaterThan(1);
  for (const piece of pieces)
    expect(piece.length).toBeLessThanOrEqual(UTTERANCE_LIMIT);
  expect(pieces.join(" ")).toBe(long);
});
it("cuts at the break nearest the middle and keeps the punctuation with the words before it", () => {
  // The semicolon is nearer the start; the comma after "row" is the middle.
  expect(speechPieces(long)).toEqual([
    "You are expected to submit one piece of writing a week; if you miss two in a row,",
    "we will contact you to arrange extra support before the next unit begins.",
  ]);
});
it("cuts at a space when there is no comma, and splits again until each piece is short", () => {
  const text = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
  const pieces = speechPieces(text, 100);
  expect(pieces.length).toBeGreaterThan(3);
  for (const piece of pieces) expect(piece.length).toBeLessThanOrEqual(100);
  expect(pieces.join(" ")).toBe(text);
});
it("does not cut inside a time, a number or a word, and never leaves a tiny piece", () => {
  const time =
    "The shuttle leaves the airport at 10:30 and again at 11:45, so please be at the gate early because the second one is always full of people";
  for (const piece of speechPieces(time, 60)) {
    expect(piece).not.toMatch(/\d:$/);
    expect(piece).not.toMatch(/^\d\d/);
  }
  const unbroken = "x".repeat(300);
  expect(speechPieces(unbroken)).toEqual([unbroken]);
  // A comma near the end is not a place to cut: it would leave "so it goes."
  const lopsided = `${"word ".repeat(40)}end, so it goes.`;
  for (const piece of speechPieces(lopsided))
    expect(piece.length).toBeGreaterThanOrEqual(20);
});
it("keeps every sentence of every listening lesson within the limit", () => {
  let cut = 0;
  for (const lesson of lessons) {
    if (lesson.skill !== "listening") continue;
    for (const part of speechChunks(lesson.text)) {
      const pieces = speechPieces(part.text);
      if (pieces.length > 1) cut++;
      for (const piece of pieces)
        expect(piece.length, `${lesson.id}: ${piece}`).toBeLessThanOrEqual(
          UTTERANCE_LIMIT,
        );
      expect(pieces.join(" ")).toBe(part.text);
    }
  }
  // Only the few sentences that are long enough to be at risk are touched.
  expect(cut).toBeGreaterThan(0);
  expect(cut).toBeLessThan(15);
});
