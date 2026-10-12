import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { freshState, type StudyState } from "../../src/lib/learning";

/**
 * The page is Vietnamese and the exam material on it is English. Marking the
 * English as such (WCAG 3.1.2) is what lets a screen reader or a read-aloud
 * tool use an English voice for a question instead of spelling it out in
 * Vietnamese, and it costs nothing to see.
 */
const english = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    const nodes = [...document.querySelectorAll(selector)];
    const marked = nodes.filter(
      (node) =>
        node.closest("[lang='en']") || node.querySelector("[lang='en']"),
    );
    return { total: nodes.length, marked: marked.length };
  }, selector);

test("a lesson's title, questions and options are marked as English", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await expect(page.locator("main h1")).toHaveAttribute("lang", "en");
  const legends = await english(page, ".question legend");
  expect(legends.total).toBeGreaterThan(0);
  expect(legends.marked).toBe(legends.total);
  // Each option's letter stays in the page's own language; its words do not.
  const options = await page.evaluate(() =>
    [...document.querySelectorAll(".question .option > span")].map(
      (span) => span.querySelector("[lang='en']")?.textContent?.length ?? 0,
    ),
  );
  expect(options.length).toBeGreaterThan(0);
  expect(options.every((length) => length > 0)).toBe(true);
  // The Vietnamese around it is left alone: the lesson's subtitle is not English.
  expect(
    await page.evaluate(() => {
      const note = [...document.querySelectorAll("main p")].find((p) =>
        p.textContent?.includes("Nhìn nhanh"),
      );
      return note ? Boolean(note.closest("[lang='en']")) : null;
    }),
  ).not.toBe(true);
});

test("a paper in progress and its review mark the questions as English", async ({
  page,
}) => {
  const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8")) as {
    version: number;
  };
  const state = {
    ...freshState(),
    paperRuns: [
      {
        id: "run-lang",
        paperId: "132",
        version: paper.version,
        startedAt: 1,
        stage: 3,
        deadline: 2,
        material: 0,
        answers: {},
        essays: {},
        spoken: [],
        mode: "practice",
        finishedAt: "2026-10-08T04:30:00.000Z",
      },
    ],
  } as unknown as StudyState;
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state);
  await page.goto("/papers/132");
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  for (const details of await page
    .locator(".paper-review details")
    .filter({ hasText: "Đã chọn" })
    .all())
    await details.locator("summary").first().click();
  const items = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".paper-review-item strong")];
    return {
      total: rows.length,
      marked: rows.filter((row) => row.querySelector("[lang='en']")).length,
    };
  });
  expect(items.total).toBeGreaterThan(0);
  expect(items.marked).toBe(items.total);
});

test("the English slogans on the page headings are marked as English", async ({
  page,
}) => {
  for (const [route, slogan] of [
    ["/journey", "YOUR OWN PACE"],
    ["/practice", "PRACTICE MAKES PROGRESS"],
    ["/vocabulary", "A LITTLE GARDEN OF WORDS"],
    ["/mistakes", "MISTAKES ARE PART OF LEARNING"],
    ["/exam", "A QUIET PLACE TO CHALLENGE YOURSELF"],
    ["/progress", "LOOK HOW FAR YOU’VE COME"],
    ["/guide", "KNOW THE TEST, FEEL MORE PREPARED"],
  ]) {
    await page.goto(route);
    const marked = await page
      .getByText(slogan, { exact: true })
      .first()
      .evaluate((node) => Boolean(node.closest("[lang='en']")));
    expect(marked, `${route}: ${slogan}`).toBe(true);
  }
});
