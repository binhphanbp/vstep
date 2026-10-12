import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("main learning surfaces have no accessibility violations, with every section opened", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/settings",
    "/journey",
    "/practice",
    "/exam",
    "/papers",
    "/papers/132",
    "/papers/review-1309",
    "/guide",
    "/mistakes",
    "/notes",
    "/practice/listening-weekend",
    "/practice/speaking-social",
    "/practice/reading-cafe",
    "/practice/writing-email",
    "/vocabulary",
    "/progress",
    "/offline",
    "/khong-co-trang-nay",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    // The hidden half of a review counts too, and so do the best practices:
    // landmarks that can be told apart and headings that step down one level.
    await page.evaluate(() =>
      document
        .querySelectorAll("details")
        .forEach((d) => d.setAttribute("open", "")),
    );
    const result = await new AxeBuilder({ page })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
        "best-practice",
      ])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
});
