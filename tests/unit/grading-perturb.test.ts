import { describe, expect, it } from "vitest";
import {
  addGrammarErrors,
  hostile,
  shuffleSentences,
  truncate,
} from "../../scripts/grading-eval/perturb";
import {
  parseCsv,
  sample,
  seeded,
  splitOf,
  pool,
} from "../../scripts/grading-eval/lib";

const essay =
  "The city is very big. It has a lot of people. The people are friendly and they help visitors. The food is cheap and the markets are open late. A visitor will enjoy it. The weather is hot but the evenings are cool. There are many parks. The parks are quiet in the morning.";

describe("edits with a known direction", () => {
  it("cuts to 80 words and leaves shorter text alone", () => {
    const long = "word ".repeat(200);
    expect(truncate.apply(long).split(" ")).toHaveLength(80);
    expect(truncate.apply("a b c")).toBe("a b c");
  });
  it("shuffles sentences without losing or adding any, the same way each time", () => {
    const a = shuffleSentences.apply(essay, 3);
    expect(a).not.toBe(essay);
    expect(a.match(/[.!?]/g)).toHaveLength(essay.match(/[.!?]/g)!.length);
    expect([...a.split(/(?<=[.!?])\s+/)].sort()).toEqual(
      [...essay.split(/(?<=[.!?])\s+/)].sort(),
    );
    expect(shuffleSentences.apply(essay, 3)).toBe(a);
    expect(shuffleSentences.apply("One. Two.")).toBe("One. Two.");
  });
  it("adds grammar errors deterministically and changes the text", () => {
    const a = addGrammarErrors.apply(essay, 5);
    expect(a).not.toBe(essay);
    expect(addGrammarErrors.apply(essay, 5)).toBe(a);
  });
  it("puts an instruction before the untouched text", () => {
    expect(hostile.apply(essay).endsWith(essay)).toBe(true);
    expect(hostile.apply(essay)).toMatch(/Ignore all previous instructions/);
  });
});

describe("harness helpers", () => {
  it("reads quoted CSV fields with commas, quotes and newlines", () => {
    const rows = parseCsv('a,b,c\n1,"x, y",3\n4,"line1\nline2","say ""hi"""\n');
    expect(rows).toEqual([
      { a: "1", b: "x, y", c: "3" },
      { a: "4", b: "line1\nline2", c: 'say "hi"' },
    ]);
  });
  it("splits ids into tune and holdout for good, roughly in half", () => {
    const ids = Array.from({ length: 400 }, (_, i) => `id${i}`);
    const tune = ids.filter((id) => splitOf(id) === "tune").length;
    expect(tune).toBeGreaterThan(150);
    expect(tune).toBeLessThan(250);
    expect(splitOf("id7")).toBe(splitOf("id7"));
  });
  it("samples the same items every time", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    expect(sample(items, 5, 9)).toEqual(sample(items, 5, 9));
    expect(sample(items, 5, 9)).not.toEqual(sample(items, 5, 10));
    const r = seeded(4);
    const r2 = seeded(4);
    expect([r(), r()]).toEqual([r2(), r2()]);
  });
  it("runs work at most `limit` at a time and keeps the order", async () => {
    let active = 0;
    let peak = 0;
    const out = await pool([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12]);
    expect(peak).toBe(2);
  });
});
