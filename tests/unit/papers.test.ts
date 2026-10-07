import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { freshState, stateSchema, type PaperRun } from "../../src/lib/learning";
import {
  LISTENING_READ_SECONDS,
  SPEAKING_PARTS,
  advancePaperRun,
  isFinalStage,
  itemStatus,
  paperCatalog,
  paperScore,
  partBreakdown,
  readingPalette,
  runStages,
  stageMinutes,
  type Paper,
} from "../../src/lib/papers";

const papers = paperCatalog.map(
  (entry) =>
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
        paper.sections
          .slice(0, 2)
          .map((section) =>
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
      for (const slot of paper.sections
        .slice(2)
        .flatMap((section) => section.slots)) {
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
    expect(paper.sections[0].slots.every((slot) => !slot.transcript)).toBe(
      true,
    );
    expect(
      paper.sections
        .slice(0, 2)
        .flatMap((section) =>
          section.slots.flatMap((slot) =>
            slot.items.map((item) => item.answer),
          ),
        ),
    ).toEqual(Array(75).fill(null));
    expect(
      paperScore(paper, firstRun(paper)).map((part) => part.total),
    ).toEqual([0, 0]);
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
    expect(advancePaperRun(advanced, paper, advanced.deadline + 1).stage).toBe(
      2,
    );
    const state = { ...freshState(), paperRuns: [advanced] };
    expect(
      stateSchema.safeParse(JSON.parse(JSON.stringify(state))).success,
    ).toBe(true);
  });

  it("accepts exam-room fields, rejects bad ones and keeps old runs valid", () => {
    const paper = papers[1];
    const old = { ...freshState(), paperRuns: [firstRun(paper)] };
    expect(stateSchema.safeParse(old).success).toBe(true);
    const sitting: PaperRun = {
      ...firstRun(paper),
      mode: "exam",
      heard: ["132-listening-1"],
      speak: { slot: "132-speaking-2", phase: "talk", until: 5000 },
    };
    const state = { ...freshState(), paperRuns: [sitting] };
    expect(
      stateSchema.safeParse(JSON.parse(JSON.stringify(state))).success,
    ).toBe(true);
    const bad = (run: object) =>
      stateSchema.safeParse({ ...freshState(), paperRuns: [run] }).success;
    expect(bad({ ...sitting, mode: "relaxed" })).toBe(false);
    expect(
      bad({ ...sitting, speak: { slot: "x", phase: "later", until: 1 } }),
    ).toBe(false);
    expect(bad({ ...sitting, heard: Array(15).fill("a") })).toBe(false);
  });

  it("models the exam-room timings and the reading question palette", () => {
    expect(LISTENING_READ_SECONDS).toBeGreaterThan(0);
    expect(SPEAKING_PARTS.map((part) => part.talkSeconds)).toEqual([
      180, 120, 180,
    ]);
    expect(SPEAKING_PARTS.map((part) => part.prepSeconds)).toEqual([0, 60, 60]);
    for (const paper of papers) {
      const palette = readingPalette(paper);
      expect(palette).toHaveLength(40);
      expect(palette.at(-1)!.slotIndex).toBe(
        paper.sections[1].slots.length - 1,
      );
    }
  });

  it("ends a single-skill sitting after its one section and logs when sections close", () => {
    const paper = papers[1];
    const start = 1000;
    const reading: PaperRun = {
      ...firstRun(paper),
      stage: 1,
      only: 1,
      deadline: start + 60 * 60_000,
    };
    expect(runStages(reading)).toEqual([1]);
    expect(isFinalStage(reading)).toBe(true);
    // Submitted after 25 minutes.
    const early = advancePaperRun(reading, paper, start + 25 * 60_000, true);
    expect(early.finishedAt).toBe(new Date(start + 25 * 60_000).toISOString());
    expect(early.stage).toBe(1);
    expect(stageMinutes(early)).toEqual([{ stage: 1, minutes: 25 }]);
    // Left open long after time ran out: closed at the deadline, not later.
    const late = advancePaperRun(reading, paper, start + 5 * 60 * 60_000);
    expect(late.stageEnds).toEqual([reading.deadline]);
    expect(stageMinutes(late)).toEqual([{ stage: 1, minutes: 60 }]);

    // A whole paper that ran out of time twice logs both closings.
    const whole = firstRun(paper);
    expect(isFinalStage(whole)).toBe(false);
    const two = advancePaperRun(whole, paper, whole.deadline + 60 * 60_000);
    expect(two.stage).toBe(2);
    expect(two.stageEnds).toEqual([
      whole.deadline,
      whole.deadline + 60 * 60_000,
    ]);
    expect(stageMinutes(two).map((entry) => entry.minutes)).toEqual([40, 60]);
    // Sittings saved before the log existed simply have no timings.
    expect(stageMinutes({ ...two, stageEnds: undefined })).toEqual([]);

    const state = {
      ...freshState(),
      paperRuns: [early, { ...two, id: "test-whole" }],
    };
    expect(
      stateSchema.safeParse(JSON.parse(JSON.stringify(state))).success,
    ).toBe(true);
    const bad = (run: object) =>
      stateSchema.safeParse({ ...freshState(), paperRuns: [run] }).success;
    expect(bad({ ...early, only: 4 })).toBe(false);
    expect(bad({ ...early, stageEnds: [1, 2, 3, 4, 5] })).toBe(false);
  });

  it("marks each answer and counts every part of Listening and Reading", () => {
    const paper = papers[1];
    const [first, second, third] = paper.sections[1].slots[0].items;
    const run: PaperRun = {
      ...firstRun(paper),
      answers: {
        [first.id]: first.answer!,
        [second.id]: (second.answer! + 1) % 4,
      },
    };
    expect(itemStatus(first, run)).toBe("correct");
    expect(itemStatus(second, run)).toBe("wrong");
    expect(itemStatus(third, run)).toBe("blank");
    const reading = partBreakdown(paper, run, 1);
    expect(reading.map((part) => part.part)).toEqual([
      "Passage 1",
      "Passage 2",
      "Passage 3",
      "Passage 4",
    ]);
    expect(reading[0]).toEqual({
      part: "Passage 1",
      correct: 1,
      wrong: 1,
      blank: 8,
      total: 10,
    });
    const listening = partBreakdown(paper, run, 0);
    expect(listening.map((part) => [part.part, part.total])).toEqual([
      ["Part 1", 8],
      ["Part 2", 12],
      ["Part 3", 15],
    ]);
    // Paper 131 has no key: nothing is marked right or wrong.
    const unkeyed = papers[0];
    const item = unkeyed.sections[0].slots[0].items[0];
    expect(
      itemStatus(item, { ...firstRun(unkeyed), answers: { [item.id]: 0 } }),
    ).toBe("ungraded");
    expect(
      partBreakdown(unkeyed, firstRun(unkeyed), 0).every(
        (part) => part.total === 0,
      ),
    ).toBe(true);
  });
});
