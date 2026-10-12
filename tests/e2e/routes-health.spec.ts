import { test, expect, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";
import { lessons } from "../../src/lib/content";

/**
 * Every page of the app, one after another: none may log an error or fail to
 * load something, and none may scroll sideways at a phone or a desktop width.
 * The lists come from the content itself, so a new lesson or paper is covered
 * without anyone remembering to add it here.
 */
const papers = readdirSync("public/papers")
  .filter((file) => /^[\w-]+\.json$/.test(file) && file !== "index.json")
  .map((file) => file.replace(".json", ""));
const routes = [
  "/",
  "/journey",
  "/practice",
  "/vocabulary",
  "/mistakes",
  "/notes",
  "/papers",
  "/exam",
  "/guide",
  "/progress",
  "/settings",
  ...lessons.map((lesson) => `/practice/${lesson.id}`),
  ...papers.map((paper) => `/papers/${paper}`),
];

test("no page logs an error or fails to load a file", async ({ page }) => {
  test.setTimeout(240_000);
  const problems: string[] = [];
  let current = "";
  page.on("console", (message) => {
    if (message.type() === "error")
      problems.push(`${current} console: ${message.text().slice(0, 160)}`);
  });
  page.on("pageerror", (error) =>
    problems.push(`${current} exception: ${error.message.slice(0, 160)}`),
  );
  page.on("requestfailed", (request) => {
    // Leaving a page cancels what it was still prefetching: not a failure.
    if (request.failure()?.errorText === "net::ERR_ABORTED") return;
    problems.push(`${current} failed: ${request.url().slice(0, 100)}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      problems.push(
        `${current} HTTP ${response.status()}: ${response.url().slice(0, 100)}`,
      );
  });
  for (const route of routes) {
    current = route;
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(200);
  }
  expect(problems).toEqual([]);
});

async function expectNoSidewaysScroll(
  page: Page,
  width: number,
  height: number,
  /** How far past the edge counts as scrolling; fractional scaling needs none. */
  tolerance = 1,
) {
  await page.setViewportSize({ width, height });
  const wide: string[] = [];
  for (const route of routes) {
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(150);
    const sideways = await page.evaluate(
      (slack) =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + slack,
      tolerance,
    );
    if (sideways) wide.push(route);
  }
  expect(wide).toEqual([]);
}

test("no page scrolls sideways at a phone's width (390 px)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await expectNoSidewaysScroll(page, 390, 844);
});

test("no page scrolls sideways at a laptop's width (1280 px)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await expectNoSidewaysScroll(page, 1280, 720);
});

test("the pages are measured with real scrollbars, as Chrome, Brave and Edge draw them", async ({
  page,
}) => {
  // Headless Chromium hides scrollbars unless told otherwise (see
  // playwright.config.ts). If this reads 0 the width tests above and the
  // layout tests elsewhere are measuring a window wider than Gùa's.
  // A lesson is drawn after the page loads, so its scrollbar comes a moment
  // later: wait for it rather than read the first frame.
  await page.goto("/practice/reading-cafe");
  await expect
    .poll(() =>
      page.evaluate(() => innerWidth - document.documentElement.clientWidth),
    )
    .toBeGreaterThanOrEqual(10);
});

test("the top bar stands still between a page with a scrollbar and one without", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const edge = async (path: string) => {
    await page.goto(path);
    // The pages draw their content a moment after they load.
    await expect(page.locator("main h1")).toBeVisible();
    return page.evaluate(() => ({
      right: Math.round(
        document.querySelector(".topbar-right")!.getBoundingClientRect().right,
      ),
      scrolls:
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    }));
  };
  const long = await edge("/guide");
  const short = await edge("/notes");
  // The two pages are what make this a test: one scrolls, the other does not.
  expect(long.scrolls).toBe(true);
  expect(short.scrolls).toBe(false);
  expect(short.right).toBe(long.right);
});

test("no page scrolls sideways at the sizes laptops use: 1366 px, 125% and 150% scaling", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  // 1366×768 at 100%, 1920×1080 at 125% and at 150%: what a browser leaves of
  // the screen once its own toolbar and the taskbar are taken off. The fractional
  // scales are where a pixel that does not divide shows up as a scrollbar.
  for (const [width, height, scale] of [
    [1366, 625, 1],
    [1536, 716, 1.25],
    [1280, 570, 1.5],
  ]) {
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      viewport: { width, height },
      deviceScaleFactor: scale,
    });
    const page = await context.newPage();
    await expectNoSidewaysScroll(page, width, height, 0);
    await context.close();
  }
});
