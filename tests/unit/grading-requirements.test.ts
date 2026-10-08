import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ESSAY_TEMPLATES_APPROVED,
  bulletRequirements,
  essayTemplateFor,
  requirementsFor,
} from "../../src/lib/grading/requirements";
import {
  BAND_MARKS,
  SPEAKING_RUBRIC,
  WRITING_RUBRIC,
  bandOfMark,
  RUBRIC_SOURCE,
} from "../../src/lib/rubric/vstep-3-5";
import {
  SPEAKING_CRITERIA,
  WRITING_CRITERIA,
  bandOf,
} from "../../src/lib/grading/scores";
import { THRESHOLDS, GATES } from "../../src/lib/grading/gates";

type Slot = { id: string; part: string; prompt: string };
function writingSlots(paper: string): Slot[] {
  const data = JSON.parse(
    readFileSync(`public/papers/${paper}.json`, "utf8"),
  ) as { sections: { skill: string; slots: Slot[] }[] };
  return data.sections.find((s) => s.skill === "writing")!.slots;
}

describe("what each task requires", () => {
  it("reads the three points of every imported Task 1 from the task text", () => {
    for (const paper of ["132", "133", "134", "135", "review-1309"]) {
      const task1 = writingSlots(paper)[0];
      const list = requirementsFor(task1.id, task1.prompt)!;
      expect(list, task1.id).toHaveLength(3);
      expect(list.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    }
  });
  it("strips the bullet and trailing punctuation", () => {
    expect(
      bulletRequirements(
        "Intro\n• suggest a plan\n- give advice;\n1. say thanks.",
      ),
    ).toEqual([
      { id: "r1", text: "suggest a plan" },
      { id: "r2", text: "give advice" },
      { id: "r3", text: "say thanks" },
    ]);
  });
  it("does not grade an essay against a template nobody has approved", () => {
    expect(ESSAY_TEMPLATES_APPROVED).toBe(false);
    for (const paper of ["132", "133", "134", "135"]) {
      const task2 = writingSlots(paper)[1];
      expect(requirementsFor(task2.id, task2.prompt), task2.id).toBeNull();
    }
  });
  it("recognises the essay types of all four imported Task 2 prompts once approved", () => {
    const types = ["132", "133", "134", "135"].map((paper) => {
      const task2 = writingSlots(paper)[1];
      return essayTemplateFor(task2.prompt)?.type;
    });
    expect(types).toEqual([
      "discuss both views",
      "extent of agreement",
      "causes and solutions",
      "discuss both views",
    ]);
    const task2 = writingSlots("132")[1];
    expect(
      requirementsFor(task2.id, task2.prompt, { templatesApproved: true })!.map(
        (r) => r.id,
      ),
    ).toEqual(["view1", "view2", "opinion", "support"]);
  });
});

describe("the marking scale", () => {
  it("covers marks 0–10 once each, in four ordered bands", () => {
    const seen: number[] = [];
    for (const [low, high] of Object.values(BAND_MARKS))
      for (let m = low; m <= high; m++) seen.push(m);
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let m = 0; m <= 10; m++) {
      const [low, high] = BAND_MARKS[bandOfMark(m)];
      expect(m >= low && m <= high).toBe(true);
    }
  });
  it("describes every criterion at every band, in both languages", () => {
    for (const [rubric, keys] of [
      [WRITING_RUBRIC, WRITING_CRITERIA],
      [SPEAKING_RUBRIC, SPEAKING_CRITERIA],
    ] as const) {
      expect(Object.keys(rubric).sort()).toEqual([...keys].sort());
      for (const { label, scale } of Object.values(rubric)) {
        expect(label.length).toBeGreaterThan(2);
        for (const band of ["below-b1", "b1", "b2", "c1"] as const) {
          expect(scale[band].en.length).toBeGreaterThan(30);
          expect(scale[band].vi.length).toBeGreaterThan(20);
        }
      }
    }
  });
  it("agrees with the official bands at the points where a criterion mark can sit on them", () => {
    // A criterion mark of 4 / 6 / 9 opens B1 / B2 / C1; the official skill bands open at 4.0 / 6.0 / 8.5.
    expect(bandOf(4)).toBe("b1");
    expect(bandOf(6)).toBe("b2");
    expect(bandOf(8.5)).toBe("c1");
    expect(bandOfMark(4)).toBe("b1");
    expect(bandOfMark(6)).toBe("b2");
    expect(bandOfMark(9)).toBe("c1");
  });
  it("says plainly that it is not the official text", () => {
    expect(RUBRIC_SOURCE.official).toBe(false);
    expect(RUBRIC_SOURCE.label).toMatch(/chưa đối chiếu/);
  });
});

describe("the gates", () => {
  it("are all closed until a harness report opens them", () => {
    expect(GATES.measuredOn).toBeNull();
    for (const open of [
      ...Object.values(GATES.writing),
      ...Object.values(GATES.speaking),
    ])
      expect(open).toBe(false);
  });
  it("hold the thresholds written in the plan", () => {
    expect(THRESHOLDS.writingLevel.qwk).toBe(0.75);
    expect(THRESHOLDS.writingCriterion.qwk).toBe(0.45);
    expect(THRESHOLDS.speakingLevel.pearson).toBe(0.75);
    expect(THRESHOLDS.speechCriterion.pearson).toBe(0.6);
  });
});
