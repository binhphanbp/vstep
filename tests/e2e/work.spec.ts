import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { freshState, type StudyState } from "../../src/lib/learning";
import { lessons } from "../../src/lib/content";

/** The paper the tests are built on, read from its own file. */
const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8")) as {
  version: number;
  sections: { slots: { id: string; part: string; passage: string }[] }[];
};
const listening = paper.sections[0].slots[0];
const reading = paper.sections[1].slots[0];
const writing = paper.sections[2].slots[0];
const speakingPart2 = paper.sections[3].slots[1];

const run = (over: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    id: "run-active",
    paperId: "132",
    version: paper.version,
    startedAt: now,
    stage: 1,
    deadline: now + 60 * 60_000,
    material: 0,
    answers: {},
    essays: {},
    spoken: [],
    mode: "practice",
    ...over,
  };
};
const withRun = (over: Record<string, unknown> = {}): StudyState =>
  ({ ...freshState(), paperRuns: [run(over)] }) as unknown as StudyState;

async function seed(page: Page, state: StudyState) {
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state);
}
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("may-study-v1")!));

const cafe = lessons.find((lesson) => lesson.id === "reading-cafe")!;
async function answerCafe(page: Page) {
  for (const entry of cafe.questions) {
    await page
      .locator(`input[name="${entry.id}"][value="${entry.answer}"]`)
      .check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${entry.id}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".result-score")).toHaveText("5/5");
}

test("a lesson: highlight by tap and by keyboard, jot, file it, write about a sentence, start again clean", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  const toggle = page.getByRole("button", { name: "Tô câu" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  const sentences = page.locator(".hl-pick");
  await sentences.nth(1).click();
  await expect(sentences.nth(1)).toHaveAttribute("aria-pressed", "true");
  // Tab and Enter do what a tap does; Space takes it back off.
  await sentences.nth(3).focus();
  await page.keyboard.press("Enter");
  await expect(sentences.nth(3)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press(" ");
  await expect(sentences.nth(3)).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Enter");
  await toggle.click();
  // Off, the page reads normally and the highlights are plain <mark>s.
  await expect(page.locator(".hl-pick")).toHaveCount(0);
  await expect(page.locator("mark.hl")).toHaveCount(2);

  // Reading starts with the scratch page shut; it is opened and written on.
  await page.locator("summary", { hasText: "Nháp" }).click();
  const pad = page.getByRole("textbox", { name: "Nháp khi đọc" });
  await pad.fill("Ý chính: quán cà phê nhỏ → chỗ học");
  // Both survive a reload, because a lesson in the middle is kept.
  await page.reload();
  await expect(page.locator("mark.hl")).toHaveCount(2);
  await expect(pad).toHaveValue("Ý chính: quán cà phê nhỏ → chỗ học");
  const draft = (await saved(page)).drafts["work:reading-cafe"];
  expect(JSON.parse(draft).scratch.main).toContain("quán cà phê");

  await answerCafe(page);
  // Filed: the highlights stay on the passage and the scratch is read back.
  await expect(page.locator("mark.hl")).toHaveCount(2);
  const state = await saved(page);
  expect(state.drafts["work:reading-cafe"]).toBeUndefined();
  expect(state.attempts.at(-1).scratch).toEqual({
    main: "Ý chính: quán cà phê nhỏ → chỗ học",
  });
  expect(state.attempts.at(-1).marks.text).toHaveLength(2);
  const review = page.locator("details.scratch-review");
  await review.locator("summary").click();
  await expect(review).toContainText("quán cà phê nhỏ");
  await review.getByRole("button", { name: "Lưu thành ghi chú" }).click();
  await expect(
    review.getByRole("button", { name: "Đã lưu thành ghi chú" }),
  ).toBeDisabled();

  // Write about a highlighted sentence: the note carries the sentence.
  const marked = page.locator("details.highlight-notes");
  await marked.locator("summary").click();
  await expect(marked.locator("li")).toHaveCount(2);
  const first = marked.locator("li").first();
  const quote = (await first.locator("q").innerText()).trim();
  await first.getByRole("button", { name: "Ghi chú về câu này" }).click();
  await first
    .getByRole("textbox", { name: "Ghi chú về câu đã tô" })
    .fill("Câu này nói ý chính");
  await expect(first.getByRole("status")).toHaveText("Đã lưu");
  await first.getByRole("button", { name: "Xong" }).click();
  const whole = page.getByRole("region", { name: "Ghi chú về cả bài" });
  await expect(whole.locator(".note-quote")).toHaveText(quote);
  // The page kept as a note and the note about the sentence sit together.
  await expect(whole.locator(".note-card")).toHaveCount(2);
  const notes = (await saved(page)).notes;
  expect(notes).toHaveLength(2);
  expect(
    notes.map((note: { anchor: { quote?: string } }) => note.anchor.quote),
  ).toContain(quote);

  // Practising again starts on a clean page, with nothing highlighted.
  await page.getByRole("button", { name: "Luyện lại" }).click();
  await expect(page.locator("mark.hl")).toHaveCount(0);
  await page.locator("summary", { hasText: "Nháp" }).click();
  await expect(pad).toHaveValue("");
});

test("a paper in practice mode: highlights and a scratch page for each passage", async ({
  page,
}) => {
  await seed(page, withRun());
  await page.goto("/papers/132");
  await expect(
    page.getByRole("heading", { name: "Đọc", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tô câu" }).click();
  await page.locator(".hl-pick").nth(2).click();
  await expect
    .poll(
      async () => (await saved(page)).paperRuns[0].marks?.[`${reading.id}:p`],
    )
    .toHaveLength(1);
  await page.getByRole("button", { name: "Tô câu" }).click();
  await page.locator("summary", { hasText: "Nháp" }).click();
  const pad = page.getByRole("textbox", { name: `Nháp cho ${reading.part}` });
  await pad.fill("Đoạn 1: động vật ăn thịt");
  await expect
    .poll(async () => (await saved(page)).paperRuns[0].scratch?.[reading.id])
    .toBe("Đoạn 1: động vật ăn thịt");

  // The next passage has a page and highlights of its own.
  await page.getByLabel("Chọn ngữ liệu hoặc bài").selectOption("1");
  await expect(page.locator("mark.hl")).toHaveCount(0);
  await page.locator("summary", { hasText: "Nháp" }).click();
  await expect(
    page.getByRole("textbox", { name: /^Nháp cho Passage 2/ }),
  ).toHaveValue("");
  await page.getByLabel("Chọn ngữ liệu hoặc bài").selectOption("0");
  await page.reload();
  await expect(page.locator("mark.hl")).toHaveCount(1);
  await expect(pad).toHaveValue("Đoạn 1: động vật ăn thịt");
});

test("an outline beside an essay is not part of the essay", async ({
  page,
}) => {
  await seed(page, withRun({ stage: 2 }));
  await page.goto("/papers/132");
  const outline = page.getByRole("textbox", {
    name: `Dàn ý cho ${writing.part}`,
  });
  // The practice page opens with the outline; the exam room's drawer leaves the
  // room to the essay until it is asked for.
  await expect(outline).toBeVisible();
  await outline.fill(
    "Mở bài: cảm ơn Jo. Thân bài: hai ý. Kết bài: hẹn gặp lại",
  );
  await page
    .getByRole("textbox", { name: `Bài viết ${writing.part}` })
    .fill("Dear Jo, thank you.");
  await expect(page.getByText(/^4 từ/)).toBeVisible();
  await expect
    .poll(async () => (await saved(page)).paperRuns[0].essays[writing.id])
    .toBe("Dear Jo, thank you.");
  expect((await saved(page)).paperRuns[0].scratch[writing.id]).toContain(
    "Mở bài",
  );
});

test("the exam room has the same pages, and typing on one does not disturb the sitting", async ({
  page,
}) => {
  await seed(page, withRun({ stage: 0, mode: "exam" }));
  await page.goto("/papers/132");
  const pad = page.getByRole("textbox", { name: `Nháp cho ${listening.part}` });
  await expect(pad).toBeVisible();
  const audio = await page.locator("audio").first().elementHandle();
  await pad.fill("Thứ Bảy, 9 giờ, lớp vẽ");
  await expect
    .poll(async () => (await saved(page)).paperRuns[0].scratch?.[listening.id])
    .toBe("Thứ Bảy, 9 giờ, lớp vẽ");
  // The recording's element is the very one that was there: nothing remounted.
  expect(await audio!.evaluate((element) => element.isConnected)).toBe(true);
  await page.reload();
  await expect(pad).toHaveValue("Thứ Bảy, 9 giờ, lớp vẽ");
});

test("the exam room's Reading and Speaking pages", async ({ page }) => {
  await seed(
    page,
    withRun({
      stage: 1,
      mode: "exam",
    }),
  );
  await page.goto("/papers/132");
  const region = page.getByRole("region", { name: "Bài đọc 1" });
  await region.getByRole("button", { name: "Tô câu" }).click();
  await region.locator(".hl-pick").first().click();
  await expect
    .poll(
      async () => (await saved(page)).paperRuns[0].marks?.[`${reading.id}:p`],
    )
    .toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Bài đọc 1" }).locator("mark.hl"),
  ).toHaveCount(1);
});

test("Speaking: an outline during the minute of preparation", async ({
  page,
}) => {
  await seed(
    page,
    withRun({
      stage: 3,
      mode: "exam",
      material: 1,
      speak: {
        slot: speakingPart2.id,
        phase: "prep",
        until: Date.now() + 60_000,
      },
    }),
  );
  await page.goto("/papers/132");
  const outline = page.getByRole("textbox", {
    name: `Dàn ý cho ${speakingPart2.part}`,
  });
  await expect(outline).toBeVisible();
  await outline.fill("1. lợi ích 2. ví dụ 3. kết luận");
  await expect
    .poll(
      async () => (await saved(page)).paperRuns[0].scratch?.[speakingPart2.id],
    )
    .toBe("1. lợi ích 2. ví dụ 3. kết luận");
});

test("a finished sitting shows what was jotted, keeps it on request, and highlights can still change", async ({
  page,
}) => {
  // The highlight must name a real sentence of the passage, as the app would
  // have saved it.
  const sentence = reading.passage.split(/(?<=[.!?])\s+/)[1].slice(0, 60);
  const finished = run({
    stage: 3,
    finishedAt: "2026-10-07T04:30:00.000Z",
    scratch: { [listening.id]: "Số 15, tên Hart" },
    marks: { [`${reading.id}:p`]: [{ i: 1, q: sentence }] },
  });
  await seed(page, {
    ...freshState(),
    paperRuns: [finished],
  } as unknown as StudyState);
  await page.goto("/papers/132");
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  // Listening part: the page that was written that day.
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  const kept = page.locator("details.scratch-review").first();
  await kept.locator("summary").click();
  await expect(kept).toContainText("Số 15, tên Hart");
  await kept.getByRole("button", { name: "Lưu thành ghi chú" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu nháp thành ghi chú" }),
  ).toBeVisible();
  const notes = (await saved(page)).notes;
  expect(notes).toHaveLength(1);
  expect(notes[0].body).toBe("Số 15, tên Hart");
  expect(notes[0].anchor.label).toMatch(/^Đề 132 · Nghe · Part 1 · .+ · nháp$/);

  // Reading passage: the saved highlight is drawn, and can be changed after the sitting.
  await page
    .locator(".paper-review")
    .nth(1)
    .locator("details")
    .first()
    .locator("summary")
    .first()
    .click();
  const passage = page
    .locator(".paper-review")
    .nth(1)
    .locator("details")
    .first();
  await expect(passage.locator("mark.hl")).toHaveCount(1);
  await passage.getByRole("button", { name: "Tô câu" }).first().click();
  await passage.locator(".hl-pick").nth(4).click();
  await expect
    .poll(async () => (await saved(page)).paperRuns[0].marks[`${reading.id}:p`])
    .toHaveLength(2);
});

test("a timed exam keeps its scratch page and highlights through a reload", async ({
  page,
}) => {
  await page.goto("/exam");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu 51 phút của mình" }).click();
  const pad = page.getByRole("textbox", { name: /^Nháp cho / });
  await expect(pad).toBeVisible();
  await pad.fill("từ khóa nghe được");
  await expect
    .poll(async () => Object.values((await saved(page)).exam.scratch ?? {})[0])
    .toBe("từ khóa nghe được");
  await page.reload();
  await expect(page.getByRole("textbox", { name: /^Nháp cho / })).toHaveValue(
    "từ khóa nghe được",
  );
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Đọc: cứ tập trung từng bước." }),
  ).toBeVisible();
  const passage = page.getByRole("region", { name: "Ngữ liệu của phần thi" });
  await page.getByRole("button", { name: "Tô câu" }).click();
  await passage.locator(".hl-pick").first().click();
  await expect
    .poll(async () => Object.values((await saved(page)).exam.marks ?? {})[0])
    .toHaveLength(1);
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Ngữ liệu của phần thi" })
      .locator("mark.hl"),
  ).toHaveCount(1);
});

test("highlight mode, scratch pages and a filed lesson pass the accessibility checks", async ({
  page,
}) => {
  await seed(
    page,
    withRun({
      stage: 2,
      scratch: { [writing.id]: "dàn ý" },
    }),
  );
  const check = async (label: string) => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
      label,
    ).toEqual([]);
  };
  await page.goto("/papers/132");
  await expect(
    page.getByRole("textbox", { name: `Dàn ý cho ${writing.part}` }),
  ).toBeVisible();
  await check("paper writing");
  await page.goto("/practice/reading-cafe");
  await page.getByRole("button", { name: "Tô câu" }).click();
  await page.locator(".hl-pick").nth(1).click();
  await page.locator("summary", { hasText: "Nháp" }).click();
  await check("lesson with highlight mode on");
  await page.getByRole("button", { name: "Tô câu" }).click();
  await answerCafe(page);
  await page.locator("details.highlight-notes summary").click();
  await page
    .locator("details.highlight-notes")
    .getByRole("button", { name: "Ghi chú về câu này" })
    .click();
  await check("filed lesson with highlights and a note box");
});

test("a note kept from a scratch page opens its part in the review, and the retry drill can highlight a transcript", async ({
  page,
}) => {
  await seed(page, {
    ...freshState(),
    paperRuns: [
      run({
        stage: 3,
        finishedAt: "2026-10-07T04:30:00.000Z",
        scratch: { [listening.id]: "Số 15, tên Hart" },
      }),
    ],
  } as unknown as StudyState);
  await page.goto("/papers/132");
  const kept = page.locator("details.scratch-review").first();
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  await kept.locator("summary").click();
  await kept.getByRole("button", { name: "Lưu thành ghi chú" }).click();
  await page.goto("/notes");
  await page.getByRole("link", { name: "Mở chỗ đã ghi" }).click();
  await expect(page).toHaveURL(new RegExp(`item=${listening.id}`));
  // The part is open and in view without being asked.
  await expect(page.locator(`#item-${listening.id}`)).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.locator(`#item-${listening.id}`).locator(".note-card"),
  ).toContainText("Số 15, tên Hart");

  // Retrying a missed question shows the transcript, which can be highlighted.
  await page
    .getByRole("button", { name: /Làm lại \d+ câu sai và bỏ trống/ })
    .click();
  const drill = page.getByRole("region", { name: "Làm lại câu sai" });
  await drill.getByRole("radio").first().check();
  await drill.locator("summary", { hasText: "Bản chép lời" }).click();
  await drill.getByRole("button", { name: "Tô câu" }).click();
  await drill.locator(".hl-pick").first().click();
  await expect
    .poll(
      async () => (await saved(page)).paperRuns[0].marks?.[`${listening.id}:t`],
    )
    .toHaveLength(1);
});
