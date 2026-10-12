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
) {
  await page.setViewportSize({ width, height });
  const wide: string[] = [];
  for (const route of routes) {
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(150);
    const sideways = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
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
