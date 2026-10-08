import { describe, expect, it } from "vitest";
import {
  fluencyMeasures,
  overlapWith,
  timestampsPlausible,
  writingBlock,
  writingMeasures,
  type TimedWord,
} from "../../src/lib/grading/measures";
import {
  foldQuote,
  quoteInText,
  verifyQuotes,
} from "../../src/lib/grading/verify";
import {
  meanAbsoluteError,
  pearson,
  qwk,
  withinShare,
} from "../../src/lib/grading/metrics";

const email =
  "Dear Jo,\n\nThanks for your email. I think you should run three times a week and sleep well.\n\nBest wishes,\nGua";

describe("what code counts about a piece of writing", () => {
  it("counts words, sentences and paragraphs", () => {
    const m = writingMeasures({ text: email, task: 1, prompt: "x" });
    expect(m.words).toBe(21);
    expect(m.paragraphs).toBe(3);
    expect(m.minimum).toBe(120);
    expect(m.reachesMinimum).toBe(false);
    expect(
      writingMeasures({ text: "word ".repeat(250), task: 2, prompt: "x" })
        .reachesMinimum,
    ).toBe(true);
  });
  it("measures how much was copied from the task or a model answer", () => {
    const prompt =
      "Write an email replying to Jo. In your email, you should suggest how Jo can prepare during the weeks before the trials";
    const copied = writingMeasures({ text: prompt, task: 1, prompt });
    expect(copied.promptOverlap).toBe(1);
    expect(
      overlapWith("completely different words here and there", prompt),
    ).toBe(0);
    const sample =
      "I am from Hue it is an old and quiet city with many beautiful buildings";
    expect(
      writingMeasures({ text: sample, task: 1, prompt: "x", samples: [sample] })
        .sampleOverlap,
    ).toBe(1);
  });
  it("blocks work that should not be graded as an answer", () => {
    const base = { task: 1 as const, prompt: "an unrelated prompt text here" };
    expect(writingBlock(writingMeasures({ ...base, text: "   " }))).toBe(
      "empty",
    );
    expect(writingBlock(writingMeasures({ ...base, text: "Hello Jo." }))).toBe(
      "too-short",
    );
    const vi =
      "Xin chào Jo, mình viết thư này để hỏi thăm bạn và kể về chuyện luyện tập của mình trong những tuần sắp tới nhé";
    expect(writingBlock(writingMeasures({ ...base, text: vi }))).toBe(
      "not-english",
    );
    const prompt =
      "You have received an email from your friend who wants to be chosen for the school hockey team and is worried about trials";
    expect(
      writingBlock(writingMeasures({ ...base, prompt, text: prompt })),
    ).toBe("copied");
    expect(
      writingBlock(
        writingMeasures({
          ...base,
          text: "Dear Jo, thanks for your message and I hope the trials go well for you because you have worked hard every single week.",
        }),
      ),
    ).toBeNull();
  });
});

describe("quotes must be in the text", () => {
  const essay = "I don’t think that “homework” is useful — it takes   time.";
  it("ignores spacing, curly quotes, dashes and case", () => {
    expect(foldQuote("“Hi”  there—you")).toBe('"hi" there-you');
    expect(quoteInText("i don't think that", essay)).toBe(true);
    expect(quoteInText('"HOMEWORK" is useful - it takes time', essay)).toBe(
      true,
    );
  });
  it("rejects a quote that is not there, or too short to prove anything", () => {
    expect(quoteInText("homework is not useful", essay)).toBe(false);
    expect(quoteInText("a", essay)).toBe(false);
    expect(quoteInText("", essay)).toBe(false);
  });
  it("keeps the real quotes and counts the invented ones", () => {
    const result = verifyQuotes(
      [{ quote: "takes time" }, { quote: "takes a lot of money" }],
      essay,
    );
    expect(result.kept).toEqual([{ quote: "takes time" }]);
    expect(result.dropped).toBe(1);
  });
});

describe("fluency measured from word times", () => {
  const words: TimedWord[] = [
    { word: "I", start: 0, end: 0.3 },
    { word: "think", start: 0.35, end: 0.7 },
    { word: "um", start: 1.9, end: 2.1 }, // 1.2 s after "think": a long pause
    { word: "the", start: 2.15, end: 2.3 },
    { word: "the", start: 2.35, end: 2.5 }, // an immediate repeat
    { word: "city", start: 3.2, end: 3.6 }, // 0.7 s after: a pause
  ];
  it("counts speed, pauses, runs, fillers and repeats", () => {
    const f = fluencyMeasures(words)!;
    expect(f.words).toBe(6);
    expect(f.spokenSeconds).toBeCloseTo(3.6);
    expect(f.wordsPerMinute).toBeCloseTo(100);
    expect(f.pausesPerMinute).toBeCloseTo(2 / 0.06);
    expect(f.longPausesPerMinute).toBeCloseTo(1 / 0.06);
    expect(f.meanRun).toBeCloseTo(2); // runs of 2, 3 and 1 words
    expect(f.fillers).toBe(1);
    expect(f.repeats).toBe(1);
  });
  it("gives nothing when there is too little to measure", () => {
    expect(fluencyMeasures([])).toBeNull();
    expect(fluencyMeasures([words[0]])).toBeNull();
    expect(
      fluencyMeasures([
        { word: "a", start: 1, end: 1 },
        { word: "b", start: 1, end: 1 },
      ]),
    ).toBeNull();
  });
  it("trusts word times only when they fit the recording", () => {
    const ok = Array.from({ length: 30 }, (_, i) => ({
      word: "w",
      start: i * 1.5,
      end: i * 1.5 + 0.5,
    }));
    expect(timestampsPlausible(ok, 46)).toBe(true);
    expect(timestampsPlausible(ok, 20)).toBe(false); // runs past the end
    expect(timestampsPlausible(ok, 600)).toBe(false); // covers 7% of 10 minutes
    expect(timestampsPlausible(ok.slice(0, 3), 5)).toBe(false); // too few words
    const backwards = [...ok];
    backwards[10] = { word: "w", start: 1, end: 1.5 };
    expect(timestampsPlausible(backwards, 46)).toBe(false);
    expect(
      timestampsPlausible(
        [...ok.slice(0, 5), { word: "x", start: NaN, end: 1 }],
        46,
      ),
    ).toBe(false);
  });
});

describe("agreement figures", () => {
  it("gives Pearson 1 for a straight line and -1 for its mirror", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNaN();
  });
  it("gives QWK 1 for identical marks, ~0 for chance and a negative for opposition", () => {
    const a = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0];
    expect(qwk(a, a, 5)).toBeCloseTo(1);
    expect(qwk([0, 0, 4, 4], [4, 4, 0, 0], 5)).toBeLessThan(0);
    // one step off everywhere costs far less than being far off
    const near = a.map((v) => Math.min(4, v + 1));
    const far = a.map((v) => (v < 2 ? 4 : 0));
    expect(qwk(a, near, 5)).toBeGreaterThan(qwk(a, far, 5));
    expect(() => qwk([0, 5], [0, 1], 5)).toThrow(RangeError);
  });
  it("reports mean error and the share within a tolerance", () => {
    expect(meanAbsoluteError([1, 2, 3], [1, 3, 5])).toBeCloseTo(1);
    expect(withinShare([1, 2, 3, 4], [1, 3, 5, 4], 1)).toBe(0.75);
  });
});
