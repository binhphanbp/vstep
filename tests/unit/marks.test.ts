import { describe, expect, it } from "vitest";
import {
  MARK_LIMITS,
  layoutLines,
  resolveMarks,
  sentenceSpans,
  toggleMark,
  type Mark,
} from "../../src/lib/marks";

const sentences = (text: string) =>
  sentenceSpans(text).map((span) => span.text);

describe("the sentences of a passage", () => {
  it("say where each one sits, so it can be drawn in place", () => {
    const text =
      "The cafe opens early.  It is small!\n\nIs it busy? Not really";
    const spans = sentenceSpans(text);
    expect(spans.map((span) => span.text)).toEqual([
      "The cafe opens early.",
      "It is small!",
      "Is it busy?",
      "Not really",
    ]);
    for (const span of spans)
      expect(text.slice(span.start, span.end)).toBe(span.text);
  });

  it("do not break at a title, a decimal or an abbreviation", () => {
    expect(
      sentences(
        "Dr. Hart opens at 9 a.m. today. It costs 3.5 dollars, e.g. tea.",
      ),
    ).toEqual([
      "Dr. Hart opens at 9 a.m. today.",
      "It costs 3.5 dollars, e.g. tea.",
    ]);
    expect(sentences("We met at 9 a.m. The rest came later.")).toEqual([
      "We met at 9 a.m.",
      "The rest came later.",
    ]);
  });

  it("keep a closing quote with the sentence it closes", () => {
    expect(sentences('He said "Stop." Then he left.')).toEqual([
      'He said "Stop."',
      "Then he left.",
    ]);
  });

  it("take a heading as one sentence, counted without its hashes", () => {
    const text = "# A little café\nIt opens at six. It closes at nine.";
    const spans = sentenceSpans(text);
    expect(spans.map((span) => span.text)).toEqual([
      "A little café",
      "It opens at six.",
      "It closes at nine.",
    ]);
    for (const span of spans)
      expect(text.slice(span.start, span.end)).toBe(span.text);
  });

  it("read a dialogue line by line, speaker label included in its sentence", () => {
    expect(sentences("Mai: Hello. Are you ready?\nBen: Yes!")).toEqual([
      "Mai: Hello.",
      "Are you ready?",
      "Ben: Yes!",
    ]);
  });

  it("are empty for an empty text and never break on stray spaces", () => {
    expect(sentenceSpans("")).toEqual([]);
    expect(sentenceSpans("  \n \n")).toEqual([]);
    expect(sentences("  Padded.  \n  Again  ")).toEqual(["Padded.", "Again"]);
  });
});

describe("finding a highlight again", () => {
  const text = "First one. Second one. Third one.";
  const spans = sentenceSpans(text);
  const mark = (index: number): Mark => ({
    i: index,
    q: spans[index].text.slice(0, MARK_LIMITS.quote),
  });

  it("uses the sentence number when the text has not changed", () => {
    const { marked, lost } = resolveMarks(spans, [mark(1)]);
    expect([...marked]).toEqual([1]);
    expect(lost).toEqual([]);
  });

  it("follows a sentence that moved, by its first words", () => {
    const edited = sentenceSpans(
      "New opening. First one. Second one. Third one.",
    );
    const { marked } = resolveMarks(edited, [mark(1)]);
    expect([...marked]).toEqual([2]);
  });

  it("reports a highlight it cannot place instead of drawing it elsewhere", () => {
    const rewritten = sentenceSpans("Something else entirely. And another.");
    const { marked, lost } = resolveMarks(rewritten, [mark(1)]);
    expect(marked.size).toBe(0);
    expect(lost).toEqual([mark(1)]);
  });

  it("will not guess between two sentences that begin the same way", () => {
    const twins = sentenceSpans(
      "Moved away. Second one is fine. Second one is odd.",
    );
    const { marked, lost } = resolveMarks(twins, [
      { i: 9, q: "Second one is" },
    ]);
    expect(marked.size).toBe(0);
    expect(lost).toHaveLength(1);
  });
});

describe("highlighting a sentence", () => {
  const spans = sentenceSpans("One. Two. Three. Four.");

  it("adds a highlight, keeps them in reading order and takes one off again", () => {
    let marks: Mark[] = [];
    marks = toggleMark(spans, marks, 2).marks;
    marks = toggleMark(spans, marks, 0).marks;
    expect(marks).toEqual([
      { i: 0, q: "One." },
      { i: 2, q: "Three." },
    ]);
    marks = toggleMark(spans, marks, 2).marks;
    expect(marks).toEqual([{ i: 0, q: "One." }]);
    expect(toggleMark(spans, marks, 0).marks).toEqual([]);
  });

  it("takes off a highlight that was found by its words after the text moved", () => {
    const moved = sentenceSpans("Intro. One. Two. Three. Four.");
    const old: Mark[] = [{ i: 0, q: "One." }];
    expect(toggleMark(moved, old, 1).marks).toEqual([]);
  });

  it("ignores a sentence that is not there", () => {
    expect(toggleMark(spans, [], 99).marks).toEqual([]);
  });

  it("stops at the most a text can hold, and says so", () => {
    const many = sentenceSpans(
      Array.from(
        { length: MARK_LIMITS.perText + 5 },
        (_, i) => `Line ${i}.`,
      ).join(" "),
    );
    let marks: Mark[] = [];
    for (let i = 0; i < MARK_LIMITS.perText; i++)
      marks = toggleMark(many, marks, i).marks;
    expect(marks).toHaveLength(MARK_LIMITS.perText);
    const refused = toggleMark(many, marks, MARK_LIMITS.perText);
    expect(refused.error).toMatch(/tối đa 60 câu/);
    expect(refused.marks).toHaveLength(MARK_LIMITS.perText);
    // Taking one off is always allowed.
    expect(toggleMark(many, marks, 0).marks).toHaveLength(
      MARK_LIMITS.perText - 1,
    );
  });
});

describe("laying a text out around its sentences", () => {
  const draw = (text: string) =>
    layoutLines(text, sentenceSpans(text))
      .map((line) =>
        line.pieces
          .map((piece) =>
            piece.sentence === undefined
              ? piece.text
              : `[${piece.sentence}:${piece.text}]`,
          )
          .join(""),
      )
      .join("|");

  it("keeps every character that is not part of a sentence where it was", () => {
    expect(draw("One.  Two!\n\nThree")).toBe("[0:One.]  [1:Two!]||[2:Three]");
  });

  it("gives back the original text when the pieces are joined", () => {
    for (const text of [
      "# Title\nA first. A second?\n\nDr. Hart left at 9 a.m. today.",
      "  Padded.  \n  Again  ",
      "Mai: Hello. Are you ready?\nBen: Yes!",
      "",
      "No end",
    ]) {
      const lines = layoutLines(text, sentenceSpans(text));
      const rebuilt = lines
        .map((line) => {
          const heading = /^#{1,6}\s+/.exec(
            text.split("\n")[lines.indexOf(line)],
          );
          return (
            (heading && line.heading ? heading[0] : "") +
            line.pieces.map((piece) => piece.text).join("")
          );
        })
        .join("\n");
      expect(rebuilt).toBe(text);
    }
  });

  it("marks a heading line, whose hashes are not drawn", () => {
    const [heading, body] = layoutLines(
      "# A cafe\nIt opens.",
      sentenceSpans("# A cafe\nIt opens."),
    );
    expect(heading.heading).toBe(true);
    expect(heading.pieces).toEqual([{ text: "A cafe", sentence: 0 }]);
    expect(body.heading).toBe(false);
  });
});
