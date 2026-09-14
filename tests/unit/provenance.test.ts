import { describe, expect, it } from "vitest";
import { lessons } from "../../src/lib/content";
import { allLessons } from "../../src/lib/full-exam-content";
import {
  defaultProvenance,
  provenanceById,
  provenanceFor,
  provenanceLabel,
} from "../../src/lib/provenance";

describe("who wrote each lesson, and who has checked it", () => {
  it("never lets a lesson call itself reviewed without a named reviewer and date", () => {
    // The whole point of the field is that "đã duyệt" cannot be self-awarded.
    for (const [id, entry] of Object.entries(provenanceById)) {
      if (entry.status !== "reviewed") continue;
      expect(entry.reviewer?.trim(), id).toBeTruthy();
      expect(entry.reviewedOn, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("says plainly that nothing has been validated yet", () => {
    expect(defaultProvenance.status).toBe("self");
    expect(provenanceLabel(defaultProvenance)).toContain("Chưa qua thẩm định");
    for (const lesson of allLessons)
      expect(provenanceFor(lesson.id).author.length).toBeGreaterThan(0);
  });
  it("covers every lesson in the library without a gap", () => {
    for (const lesson of lessons) {
      const entry = provenanceFor(lesson.id);
      expect(entry.source.length, lesson.id).toBeGreaterThan(20);
    }
  });
  it("only overrides lessons that exist", () => {
    const ids = new Set(allLessons.map((lesson) => lesson.id));
    for (const id of Object.keys(provenanceById))
      expect(ids.has(id)).toBe(true);
  });
});
