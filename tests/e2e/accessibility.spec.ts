import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("main learning surfaces have no WCAG A/AA violations", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/settings",
    "/journey",
    "/practice",
    "/exam",
    "/guide",
    "/mistakes",
    "/practice/listening-weekend",
    "/practice/speaking-social",
    "/practice/reading-cafe",
    "/practice/writing-email",
    "/vocabulary",
    "/progress",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
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
