import { test, expect, type Page } from "@playwright/test";
import { freshState } from "../../src/lib/learning";
import { lessons } from "../../src/lib/content";

/**
 * A laptop screen (1280 × 720) is the smallest the pages are made for. These
 * keep the things a learner reaches for on it within sight, without a scroll.
 */
test.use({ viewport: { width: 1280, height: 720 } });

async function open(page: Page, path: string) {
  const state = freshState();
  state.profile.onboarded = true;
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state);
  await page.goto(path);
}
const cafe = lessons.find((lesson) => lesson.id === "reading-cafe")!;

test("turning a word card over shows the four ways to rate it, without scrolling", async ({
  page,
}) => {
  await open(page, "/vocabulary");
  await page.locator(".flashcard").click();
  const rates = page.locator(".review-buttons button");
  await expect(rates).toHaveCount(4);
  for (const rate of await rates.all())
    await expect(rate).toBeInViewport({ ratio: 1 });
});

test("the notebook of mistakes shows the first mistake on the first screen", async ({
  page,
}) => {
  await open(page, "/practice/reading-cafe");
  for (const [index, entry] of cafe.questions.entries()) {
    const pick = index < 2 ? (entry.answer + 1) % 4 : entry.answer;
    await page.locator(`input[name="${entry.id}"][value="${pick}"]`).check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${entry.id}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".result-score")).toHaveText("3/5");
  await page.goto("/mistakes");
  const card = page
    .locator("section.panel")
    .filter({ hasText: "Kiểm tra lại" })
    .first();
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  // The first mistake starts in the upper part of the screen, with room to read.
  expect(box.y).toBeLessThan(480);
  // And the filter buttons do not touch the card above them.
  const gap = await page.evaluate(() => {
    const above = document
      .querySelector(".weak-spots")!
      .getBoundingClientRect();
    const filters = document.querySelector(".filters")!.getBoundingClientRect();
    return filters.top - above.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(16);
});

test("the listening player puts its three ways round the passage on one row", async ({
  page,
}) => {
  await open(page, "/practice/listening-weekend");
  const row = page.locator(".audio-seek-row");
  await expect(row).toBeVisible();
  const tops = await row
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    );
  expect(tops).toHaveLength(3);
  expect(new Set(tops).size).toBe(1);
  // Shortened on the face, whole in the name a screen reader gives.
  await expect(
    row.getByRole("button", { name: "Nghe lại câu này" }),
  ).toHaveText("Nghe lại");
});

test("a list of tips has its bullets, so its lines hang from something", async ({
  page,
}) => {
  await open(page, "/practice/listening-weekend");
  const style = await page
    .locator(".tips-list")
    .first()
    .evaluate((list) => getComputedStyle(list).listStyleType);
  expect(style).toBe("disc");
});

test("the paper bank puts five papers three and two across, not four and one", async ({
  page,
}) => {
  await open(page, "/papers");
  await expect(page.locator(".paper-card")).toHaveCount(5);
  const columns = await page
    .locator(".paper-card")
    .evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().left)),
    );
  expect(columns).toHaveLength(5);
  expect(new Set(columns).size).toBe(3);
});
