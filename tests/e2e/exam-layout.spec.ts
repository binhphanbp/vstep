import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { freshState, type StudyState } from "../../src/lib/learning";

/**
 * The exam room is laid out like the computer-based exam software it follows:
 * one frame that fits the screen, a bar above and a bar below that stay where
 * they are, and panes that scroll on their own. These tests keep that shape.
 */
const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8")) as {
  version: number;
  sections: { slots: { id: string; part: string }[] }[];
};

const run = (over: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    id: "run-layout",
    paperId: "132",
    version: paper.version,
    startedAt: now,
    stage: 1,
    deadline: now + 60 * 60_000,
    material: 0,
    answers: {},
    essays: {},
    spoken: [],
    mode: "exam",
    ...over,
  };
};
async function sit(page: Page, over: Record<string, unknown> = {}) {
  const state = {
    ...freshState(),
    paperRuns: [run(over)],
  } as unknown as StudyState;
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state);
  await page.goto("/papers/132");
  await expect(page.locator(".exam-head")).toBeVisible();
}

// A common laptop screen: the room has to work without the extra height.
test.use({ viewport: { width: 1280, height: 720 } });

test("the room fits the screen: the page does not scroll and both bars stay in view", async ({
  page,
}) => {
  await sit(page);
  await expect(page.locator(".exam-palette button")).toHaveCount(40);
  const frame = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    screen: innerHeight,
    head: document.querySelector(".exam-head")!.getBoundingClientRect(),
    dock: document.querySelector(".exam-dock")!.getBoundingClientRect(),
    lastQuestion: document
      .querySelector(".exam-palette button:last-child")!
      .getBoundingClientRect(),
  }));
  expect(frame.page).toBeLessThanOrEqual(frame.screen);
  expect(frame.head.top).toBe(0);
  expect(Math.round(frame.dock.bottom)).toBe(frame.screen);
  // The way round the questions is on screen from the start: no scrolling to it.
  expect(frame.lastQuestion.bottom).toBeLessThanOrEqual(frame.screen);
  expect(frame.lastQuestion.top).toBeGreaterThan(frame.head.bottom);
});

test("the passage and the questions scroll on their own, and nothing else moves", async ({
  page,
}) => {
  await sit(page);
  const passage = page.locator(".exam-passage");
  const questions = page.locator(".exam-questions");
  await expect(passage).toBeVisible();
  expect(
    await passage.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  expect(
    await questions.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  const before = await page.locator(".exam-dock").boundingBox();
  await passage.evaluate((el) => (el.scrollTop = 400));
  const after = await page.evaluate(() => ({
    passage: document.querySelector(".exam-passage")!.scrollTop,
    questions: document.querySelector(".exam-questions")!.scrollTop,
    page: document.scrollingElement!.scrollTop,
  }));
  expect(after.passage).toBeGreaterThan(0);
  expect(after.questions).toBe(0);
  expect(after.page).toBe(0);
  expect(await page.locator(".exam-dock").boundingBox()).toEqual(before);
});

test("a number in the question list takes Gùa to that question, in another passage too", async ({
  page,
}) => {
  await sit(page);
  await page.getByRole("button", { name: /^Câu 25$/ }).click();
  await expect(page.getByRole("region", { name: "Bài đọc 3" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Bài đọc 3, đang xem" }),
  ).toBeVisible();
  await expect(
    page.locator("fieldset.paper-question", { hasText: /^25\./ }),
  ).toBeInViewport();
  // An answered question is marked in the list.
  await page
    .locator("fieldset.paper-question", { hasText: /^25\./ })
    .getByRole("radio")
    .first()
    .check();
  await expect(
    page.getByRole("button", { name: "Câu 25, đã trả lời" }),
  ).toHaveClass(/answered/);
});

test("the scratch page opens above the bar, keeps the questions in view, and keeps its words", async ({
  page,
}) => {
  await sit(page);
  const tool = page.getByRole("button", { name: "Nháp", exact: true });
  await expect(tool).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".exam-scratch")).toHaveCount(0);
  await tool.click();
  await expect(tool).toHaveAttribute("aria-expanded", "true");
  const pad = page.getByRole("textbox", { name: /^Nháp cho / });
  await expect(pad).toBeVisible();
  // It pushes the work up instead of lying on top of it.
  const gap = await page.evaluate(() => {
    const body = document.querySelector(".exam-body")!.getBoundingClientRect();
    const drawer = document
      .querySelector(".exam-scratch")!
      .getBoundingClientRect();
    return drawer.top - body.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(-1);
  await pad.fill("đoạn 1: động vật ăn thịt");
  // Shut, the page says there is something on it; open again, it is all there.
  await page.getByRole("button", { name: "Thu gọn" }).click();
  await expect(page.locator(".exam-scratch")).toHaveCount(0);
  await expect(page.locator(".exam-tool-dot")).toBeVisible();
  await tool.click();
  await expect(pad).toHaveValue("đoạn 1: động vật ăn thịt");
});

test("Listening and Speaking sit in a centred column with the bar below", async ({
  page,
}) => {
  await sit(page, { stage: 0 });
  const column = page.locator(".exam-column");
  await expect(column).toBeVisible();
  const box = (await column.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(860);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(20);
  await expect(page.locator(".exam-bar")).toContainText("Đoạn 1/");
});

test("the room shows the system pointer, not the ring that trails it elsewhere", async ({
  page,
}) => {
  // Elsewhere in the app the ring is on: this is what proves the room's rule
  // does something. The page may not be live yet when the pointer first moves,
  // so it moves until the ring answers.
  await page.goto("/papers");
  let x = 300;
  await expect
    .poll(async () => {
      await page.mouse.move((x += 7), 310);
      return page.evaluate(() =>
        document.documentElement.classList.contains("custom-cursor-active"),
      );
    })
    .toBe(true);
  await sit(page);
  for (let i = 0; i < 5; i++) await page.mouse.move((x += 9), 320);
  await expect(page.locator(".custom-cursor-ring.is-visible")).toHaveCount(0);
  await expect(page.locator("html.custom-cursor-active")).toHaveCount(0);
});

test("in a Reading lesson the scratch page stays under the passage, in view while the questions are answered", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  const heading = page.locator("summary", { hasText: "Nháp" });
  await expect(heading).toBeVisible();
  // Down at the last question: the passage column has followed, and the page
  // is not stranded at the end of the passage's own scroll.
  await page.locator(".question").last().scrollIntoViewIfNeeded();
  await expect(heading).toBeInViewport();
  await heading.click();
  await expect(
    page.getByRole("textbox", { name: "Nháp khi đọc" }),
  ).toBeInViewport();
});

test("a Writing section opens with the room given to the essay, and the outline one click away", async ({
  page,
}) => {
  await sit(page, { stage: 2 });
  await expect(page.locator(".exam-scratch")).toHaveCount(0);
  const essay = await page
    .getByRole("textbox", { name: /^Bài viết / })
    .boundingBox();
  expect(essay!.height).toBeGreaterThan(250);
  await page.getByRole("button", { name: "Nháp", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /^Dàn ý cho / }),
  ).toBeVisible();
});
