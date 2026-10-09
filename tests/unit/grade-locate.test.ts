import { describe, expect, it } from "vitest";
import {
  errorSpans,
  locateQuote,
  markedPieces,
} from "../../src/lib/grading/locate";

const text =
  "Dear Jo,\n\nI don’t think you   could training with me. “Best” wishes - Gua.";

describe("finding a quote in the writing", () => {
  it("finds it whatever the case, spacing, apostrophe, quote or dash style", () => {
    expect(locateQuote(text, "you could training")).toEqual({
      start: text.indexOf("you   could training"),
      end: text.indexOf("you   could training") + "you   could training".length,
    });
    expect(locateQuote(text, "I DON'T think")).not.toBeNull();
    expect(locateQuote(text, '"Best" wishes — Gua')).not.toBeNull();
    expect(locateQuote(text, "wishes - Gua.")).not.toBeNull();
  });
  it("returns null for a quote that is not there, empty, or only spaces", () => {
    expect(locateQuote(text, "completely absent")).toBeNull();
    expect(locateQuote(text, "")).toBeNull();
    expect(locateQuote(text, "   ")).toBeNull();
  });
  it("treats regular-expression characters in a quote as plain text", () => {
    const odd = "Cost is $5 (about) [maybe] 3.5+ per day?";
    expect(locateQuote(odd, "$5 (about) [maybe]")).not.toBeNull();
    expect(locateQuote(odd, "3.5+ per day?")).not.toBeNull();
    expect(locateQuote(odd, "3x5+ per day?")).toBeNull();
  });
});

describe("marking several errors", () => {
  it("places them in order and leaves out one that overlaps an earlier one", () => {
    const spans = errorSpans(text, [
      "could training with me",
      "you   could training",
      "Dear Jo",
      "not here",
    ]);
    expect(spans.map((s) => s.index)).toEqual([2, 0]);
    expect(spans[0].start).toBe(0);
  });
  it("cuts the text into pieces that join back to the original", () => {
    const spans = errorSpans(text, ["could training", "Best"]);
    const pieces = markedPieces(text, spans);
    expect(pieces.map((p) => p.text).join("")).toBe(text);
    expect(
      pieces.filter((p) => p.error !== undefined).map((p) => p.error),
    ).toEqual([0, 1]);
    expect(markedPieces("abc", [])).toEqual([{ text: "abc" }]);
  });
});
