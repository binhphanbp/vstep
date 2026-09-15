import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { allLessons } from "../../src/lib/full-exam-content";
import { lessons } from "../../src/lib/content";
import { questionNotes } from "../../src/lib/question-notes";

/**
 * The documents are checked against the code, not against memory.
 *
 * Three times now a figure has gone stale: the Word cover said "57 unit test
 * and 40 E2E" through three releases, and three roadmap rows still described
 * work that had already shipped. A number that lives in four files drifts in
 * three of them. These tests read the documents and compare every current
 * figure with what the source actually contains, so the drift is a red build
 * rather than something a reader has to catch.
 */
const doc = (name: string) =>
  readFileSync(join(process.cwd(), "docs", name), "utf8");
const sources = (dir: string) =>
  readdirSync(join(process.cwd(), dir))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => ({
      file,
      body: readFileSync(join(process.cwd(), dir, file), "utf8"),
    }));
const cases = (body: string, keyword: string) =>
  body.split("\n").filter((line) => line.trim().startsWith(`${keyword}(`))
    .length;

/** Vitest cases, counted the way the runner reports them. */
const unitTests = sources("tests/unit").reduce(
  (sum, source) => sum + cases(source.body, "it"),
  0,
);
/**
 * Playwright cases. Chromium runs every spec; the cross-browser spec runs
 * again under firefox-smoke and webkit-smoke, which is why it counts three
 * times in the total the runner prints.
 */
const e2eFiles = sources("tests/e2e");
const chromiumTests = e2eFiles.reduce(
  (sum, source) => sum + cases(source.body, "test"),
  0,
);
const crossBrowserTests = cases(
  e2eFiles.find((source) => source.file === "cross-browser.spec.ts")!.body,
  "test",
);
const e2eTests = chromiumTests + crossBrowserTests * 2;
/**
 * Pages `next build` prerenders: one per lesson, plus the fifteen entries the
 * build lists beside them (fourteen fixed routes and the `/practice/[id]`
 * row itself).
 */
const NON_LESSON_ROUTES = 15;
const routes = allLessons.length + NON_LESSON_ROUTES;
const questions = allLessons.reduce(
  (sum, lesson) => sum + lesson.questions.length,
  0,
);
/** One reading of a figure out of a document, with the line it came from. */
function figures(body: string, pattern: RegExp): number[][] {
  const found = [...body.matchAll(new RegExp(pattern, "gm"))];
  expect(
    found.length,
    `không tìm thấy ${pattern} trong tài liệu`,
  ).toBeGreaterThan(0);
  return found.map((match) => match.slice(1).map(Number));
}
describe("the documents say what the code says", () => {
  it("reports the same number of tests everywhere it is stated", () => {
    for (const [unit, e2e] of figures(
      doc("HANDOVER.md"),
      /đạt \*\*(\d+) unit, (\d+) E2E\*\*/,
    ))
      expect([unit, e2e]).toEqual([unitTests, e2eTests]);
    for (const [unit, e2e] of figures(
      doc("HANDOVER.md"),
      /đạt (\d+) unit và (\d+) E2E trên cùng ba engine/,
    ))
      expect([unit, e2e]).toEqual([unitTests, e2eTests]);
    for (const [unit, e2e] of figures(
      doc("STATUS.md"),
      /(\d+) kiểm thử Vitest và (\d+) kiểm thử Playwright/,
    ))
      expect([unit, e2e]).toEqual([unitTests, e2eTests]);
    for (const [unit] of figures(doc("QUALITY.md"), /^- (\d+) kiểm thử Vitest/))
      expect(unit).toBe(unitTests);
    for (const [e2e, chromium] of figures(
      doc("QUALITY.md"),
      /^- (\d+) kiểm thử Playwright trên bản production: (\d+) ca Chromium/,
    ))
      expect([e2e, chromium]).toEqual([e2eTests, chromiumTests]);
  });
  it("reports the same number of routes everywhere it is stated", () => {
    for (const [unit, e2e, stated] of figures(
      doc("QUALITY.md"),
      /có đủ (\d+) unit \/ (\d+) E2E \/ (\d+) route/,
    ))
      expect([unit, e2e, stated]).toEqual([unitTests, e2eTests, routes]);
    for (const [stated] of figures(
      doc("HANDOVER.md"),
      /build (\d+) route, axe/,
    ))
      expect(stated).toBe(routes);
    for (const [stated] of figures(
      doc("STATUS.md"),
      /production build (\d+) route/,
    ))
      expect(stated).toBe(routes);
  });
  it("reports the real size of the question bank and its notes", () => {
    // A question carries its notes either in the shared notes file or, for
    // the second paper, on the question itself.
    const annotated = allLessons
      .flatMap((lesson) => lesson.questions)
      .filter(
        (question) =>
          questionNotes[question.id] ??
          (question.evidence && question.optionNotes),
      ).length;
    for (const [total] of figures(
      doc("PRODUCTION-ROADMAP.md"),
      /Tổng \*\*(\d+) câu Reading\/Listening\*\*/,
    ))
      expect(total).toBe(questions);
    for (const [covered, total] of figures(
      doc("PRODUCTION-ROADMAP.md"),
      /Phủ (\d+)\/(\d+) câu/,
    ))
      expect([covered, total]).toEqual([annotated, questions]);
    for (const [stated] of figures(
      doc("PRODUCTION-ROADMAP.md"),
      /Ngân hàng nay là (\d+) bài/,
    ))
      expect(stated).toBe(lessons.length);
  });
});
