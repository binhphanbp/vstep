import { describe, expect, it } from "vitest";
import {
  bandOf,
  overallScore,
  roundHalf,
  speakingScore,
  writingScore,
  writingTaskScore,
} from "../../src/lib/grading/scores";
import {
  collect,
  disagrees,
  median,
  summarise,
} from "../../src/lib/grading/aggregate";

describe("rounding to 0.5 (Thông tư 23/2017)", () => {
  it("sends 0.25–0.74 to .5 and 0.75–1.24 to the whole number", () => {
    const cases: [number, number][] = [
      [6.0, 6.0],
      [6.1, 6.0],
      [6.2, 6.0],
      [6.24, 6.0],
      [6.25, 6.5],
      [6.5, 6.5],
      [6.74, 6.5],
      [6.75, 7.0],
      [7.0, 7.0],
      [7.24, 7.0],
      [7.25, 7.5],
      [0, 0],
      [10, 10],
    ];
    for (const [input, expected] of cases)
      expect(roundHalf(input), String(input)).toBe(expected);
  });
  it("is not thrown by floating-point error at the exact boundaries", () => {
    // Task means of four whole marks land exactly on .25, .5 and .75.
    expect(
      writingTaskScore({ task: 6, organization: 6, vocabulary: 6, grammar: 7 }),
    ).toBe(6.25);
    expect(writingScore(6.25, 6.25)).toBe(6.5);
    expect(writingScore(6.75, 6.75)).toBe(7);
    expect(writingScore(6.24, 6.24)).toBe(6);
    expect(roundHalf(0.1 + 0.15)).toBe(0.5); // 0.25 as floating point
    expect(roundHalf(0.1 * 3 + 0.45)).toBe(1); // 0.75 as floating point
  });
});

describe("Writing: four criteria → task → skill", () => {
  it("takes a task as the mean of its four criteria", () => {
    expect(
      writingTaskScore({ task: 6, organization: 7, vocabulary: 6, grammar: 7 }),
    ).toBe(6.5);
  });
  it("weights Task 1 one third and Task 2 two thirds, then rounds", () => {
    expect(writingScore(6, 7)).toBe(6.5); // 20/3 = 6.67
    expect(writingScore(5, 8)).toBe(7.0); // 21/3 = 7
    expect(writingScore(4.5, 5.5)).toBe(5.0); // 15.5/3 = 5.17
  });
  it("rejects marks outside 0–10 instead of passing them on", () => {
    expect(() => writingScore(11, 5)).toThrow(RangeError);
    expect(() =>
      writingTaskScore({
        task: 5,
        organization: -1,
        vocabulary: 5,
        grammar: 5,
      }),
    ).toThrow(RangeError);
    expect(() => writingScore(Number.NaN, 5)).toThrow(RangeError);
  });
});

describe("Speaking and the overall score", () => {
  it("takes Speaking as the mean of five criteria (presumed rule)", () => {
    expect(
      speakingScore({
        grammar: 6,
        vocabulary: 6,
        pronunciation: 7,
        fluency: 6,
        discourse: 7,
      }),
    ).toBe(6.5); // 32/5 = 6.4 → 6.5
  });
  it("takes the overall as the mean of the four skills, rounded to 0.5", () => {
    expect(
      overallScore({ listening: 7, reading: 6.5, writing: 6, speaking: 6.5 }),
    ).toBe(6.5); // 26/4 = 6.5
    expect(
      overallScore({ listening: 7, reading: 7, writing: 6, speaking: 6 }),
    ).toBe(6.5);
    expect(
      overallScore({ listening: 5, reading: 5, writing: 5, speaking: 5.5 }),
    ).toBe(5.0); // 5.125 → 5.0
  });
  it("maps a score to the official bands", () => {
    expect(bandOf(3.5)).toBe("below-b1");
    expect(bandOf(4)).toBe("b1");
    expect(bandOf(5.5)).toBe("b1");
    expect(bandOf(6)).toBe("b2");
    expect(bandOf(8)).toBe("b2");
    expect(bandOf(8.5)).toBe("c1");
    expect(bandOf(10)).toBe("c1");
  });
});

describe("combining several gradings", () => {
  it("uses the median so one stray run cannot move a mark", () => {
    expect(median([6, 6, 9])).toBe(6);
    expect(median([7, 5, 6])).toBe(6);
    expect(median([6, 7])).toBe(6.5);
    expect(() => median([])).toThrow();
  });
  it("calls runs unsure only when they differ by more than one mark", () => {
    const runs = collect([
      { a: 6, b: 5 },
      { a: 7, b: 7 },
      { a: 6, b: 6 },
    ]);
    expect(disagrees(runs)).toBe(true); // b: 5..7
    const result = summarise(runs);
    expect(result.a).toMatchObject({
      score: 6,
      low: 6,
      high: 7,
      unsure: false,
    });
    expect(result.b).toMatchObject({ score: 6, low: 5, high: 7, unsure: true });
    expect(disagrees(collect([{ a: 6 }, { a: 7 }, { a: 6 }]))).toBe(false);
  });
});
