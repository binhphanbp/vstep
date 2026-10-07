import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { freshState, stateSchema, type PaperRun } from "../../src/lib/learning";
import {
  advancePaperRun,
  paperCatalog,
  paperScore,
  type Paper,
} from "../../src/lib/papers";

const papers = paperCatalog.map((entry) =>
  JSON.parse(readFileSync(`public/papers/${entry.id}.json`, "utf8")) as Paper,
);
const firstRun = (paper: Paper): PaperRun => ({
  id: `test-${paper.id}`,
  paperId: paper.id,
  version: paper.version,
  startedAt: 1000,
  stage: 0,
  deadline: 1000 + 40 * 60_000,
  material: 0,
  answers: {},
  essays: {},
  spoken: [],
});

describe("imported exam papers", () => {
  it("contains six distinct complete four-skill papers and every local audio", () => {
    expect(papers.map((paper) => paper.id)).toEqual([
      "131",
      "132",
      "133",
      "134",
      "135",
      "review-1309",
    ]);
    for (const paper of papers) {
      expect(paper.sections.map((section) => section.skill)).toEqual([
        "listening",
        "reading",
        "writing",
        "speaking",
      ]);
      expect(paper.sections.map((section) => section.minutes)).toEqual([
        40, 60, 60, 12,
      ]);
      expect(paper.sections.map((section) => section.slots.length)).toEqual([
        14, 4, 2, 3,
      ]);
      expect(
        paper.sections.slice(0, 2).map((section) =>
          section.slots.reduce((count, slot) => count + slot.items.length, 0),
        ),
      ).toEqual([35, 40]);
      const ids = paper.sections.flatMap((section) =>
        section.slots.flatMap((slot) => slot.items.map((item) => item.id)),
      );
      expect(new Set(ids).size).toBe(75);
      for (const slot of paper.sections[0].slots) {
        expect(slot.audio).toBeTruthy();
        expect(existsSync(`public${slot.audio}`)).toBe(true);
      }
      for (const slot of paper.sections[1].slots)
        expect(slot.passage.length).toBeGreaterThan(500);
      for (const slot of paper.sections.slice(2).flatMap((section) => section.slots)) {
        expect(slot.prompt || slot.cues.length).toBeTruthy();
        expect(slot.samples.length).toBeGreaterThan(0);
        for (const sample of slot.samples)
          for (const audio of sample.audio)
            expect(existsSync(`public${audio}`)).toBe(true);
      }
    }
  });

  it("never invents a key or score for paper 131", () => {
    const paper = papers[0];
    expect(paper.graded).toBe(false);
    expect(paper.sections[0].slots.every((slot) => !slot.transcript)).toBe(true);
    expect(
      paper.sections.slice(0, 2).flatMap((section) =>
        section.slots.flatMap((slot) => slot.items.map((item) => item.answer)),
      ),
    ).toEqual(Array(75).fill(null));
    expect(paperScore(paper, firstRun(paper)).map((part) => part.total)).toEqual([
      0, 0,
    ]);
  });

  it("has an internally consistent answer key for all 375 gradable items", () => {
    expect(papers[5].title).toContain("Review 13/09");
    for (const paper of papers.slice(1)) {
      expect(paper.graded).toBe(true);
      const run = firstRun(paper);
      for (const section of paper.sections.slice(0, 2))
        for (const slot of section.slots)
          for (const item of slot.items) {
            expect(item.options).toHaveLength(4);
            expect(item.answer).toBeGreaterThanOrEqual(0);
            expect(item.answer).toBeLessThan(4);
            expect(item.explanation.trim()).toBeTruthy();
            run.answers[item.id] = item.answer!;
          }
      expect(paperScore(paper, run).map((part) => part.correct)).toEqual([
        35, 40,
      ]);
    }
  });

  it("keeps old backups valid and preserves a running paper through restore", () => {
    const old = freshState();
    delete old.paperRuns;
    expect(stateSchema.safeParse(old).success).toBe(true);
    const paper = papers[1];
    const run = firstRun(paper);
    const advanced = advancePaperRun(run, paper, run.deadline + 1000);
    expect(advanced.stage).toBe(1);
    expect(advanced.deadline).toBe(run.deadline + 60 * 60_000);
    expect(advancePaperRun(advanced, paper, advanced.deadline + 1).stage).toBe(2);
    const state = { ...freshState(), paperRuns: [advanced] };
    expect(stateSchema.safeParse(JSON.parse(JSON.stringify(state))).success).toBe(
      true,
    );
  });
});
