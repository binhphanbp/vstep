import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test("an imported paper keeps answers across reload and files all four parts", async ({
  page,
}) => {
  await page.goto("/papers");
  const card = page
    .locator(".paper-card")
    .filter({ hasText: "Đề thi thử VSTEP 132" });
  await card.getByRole("link", { name: "Mở đề" }).click();
  await expect(
    page.getByRole("heading", { name: "Đề thi thử VSTEP 132" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 132" }).click();
  const first = page.locator('.paper-question input[type="radio"]').first();
  await first.check();
  await page.reload();
  await expect(
    page.locator('.paper-question input[type="radio"]').first(),
  ).toBeChecked();
  await expect(page.locator("audio").first()).toHaveAttribute(
    "src",
    /\/papers\/audio\/.*\.mp3/,
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Đọc", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page
    .getByRole("textbox", { name: "Bài viết Task 1" })
    .fill("Dear Jo, I will practise with you. Best wishes.");
  await page.getByLabel("Chọn ngữ liệu hoặc bài").selectOption("1");
  await page
    .getByRole("textbox", { name: "Bài viết Task 2" })
    .fill("Training and talent both matter. Regular practice is essential.");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Bài viết Task 2" }),
  ).toHaveValue(/Regular practice/);
  await page.getByLabel("Chọn ngữ liệu hoặc bài").selectOption("0");
  await expect(
    page.getByRole("textbox", { name: "Bài viết Task 1" }),
  ).toHaveValue(/Dear Jo/);
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Nói", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /Tôi đã trả lời phần này/ }).check();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(page.locator(".stat-card strong").first()).toContainText("/35");
  const firstReview = page
    .locator(".paper-review")
    .first()
    .locator("details")
    .first();
  await firstReview.locator("summary").first().click();
  await firstReview.getByText("Bản dịch câu hỏi và lựa chọn").first().click();
  await expect(
    firstReview.getByText("Người phụ nữ có lẽ sẽ làm gì vào thứ Bảy?"),
  ).toBeVisible();
  const runs = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns,
  );
  expect(runs).toHaveLength(1);
  expect(runs[0].finishedAt).toBeTruthy();
  expect(Object.keys(runs[0].answers)).toHaveLength(1);
  expect(Object.keys(runs[0].essays)).toHaveLength(2);
  expect(runs[0].spoken).toHaveLength(1);
  await page.goto("/settings");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản sao", exact: true }).click();
  const exported = JSON.parse(
    await readFile(await (await event).path(), "utf8"),
  );
  expect(exported.paperRuns).toEqual(runs);
});

test("an old paper tab cannot submit the next section", async ({
  page,
  context,
}) => {
  await page.goto("/papers/132");
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 132" }).click();
  const second = await context.newPage();
  await second.goto("/papers/132");
  const dialogEvent = page.waitForEvent("dialog");
  const click = page
    .getByRole("button", { name: "Nộp phần này & tiếp tục" })
    .click();
  const dialog = await dialogEvent;
  second.on("dialog", (entry) => entry.accept());
  await second.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(
    second.getByRole("heading", { name: "Đọc", exact: true }),
  ).toBeVisible();
  await dialog.accept();
  await click;
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0].stage,
    ),
  ).toBe(1);
});

test("paper 131 is usable without inventing a score", async ({ page }) => {
  await page.goto("/papers/131");
  await expect(
    page.getByText(/Đề 131 thiếu toàn bộ khóa đáp án/),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 131" }).click();
  await expect(
    page.getByRole("heading", { name: "Nghe", exact: true }),
  ).toBeVisible();
  await page.locator('.paper-question input[type="radio"]').first().check();
  page.on("dialog", (dialog) => dialog.accept());
  for (let section = 0; section < 3; section++)
    await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(page.getByText(/Đề 131 không có khóa đáp án/)).toBeVisible();
  await expect(page.getByText("0/75")).toHaveCount(0);
});

test("Review 13/09 is a separate gradable paper", async ({ page }) => {
  await page.goto("/papers/review-1309");
  await expect(
    page.getByRole("heading", { name: /Review 13\/09/ }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Review 13/09" }).click();
  await expect(page.locator("audio").first()).toHaveAttribute(
    "src",
    /VSTEP-01-P1-L1\.mp3/,
  );
  await page.locator('.paper-question input[type="radio"]').first().check();
  page.on("dialog", (dialog) => dialog.accept());
  for (let section = 0; section < 3; section++)
    await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(page.getByText("REVIEW 13/09 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(page.locator(".stat-card strong").first()).toContainText("/35");
});

// ── The exam room ──────────────────────────────────────────────────────────
// The recordings are real MP3s a minute or more long, so the tests replace
// playback with one that finishes at once and drive the clock instead.
async function sitExam(page: import("@playwright/test").Page, id = "132") {
  await page.addInitScript(() => {
    const plays: string[] = [];
    (window as unknown as { __plays: string[] }).__plays = plays;
    HTMLMediaElement.prototype.play = function () {
      plays.push(this.getAttribute("src") ?? "");
      this.dispatchEvent(new Event("playing"));
      setTimeout(() => this.dispatchEvent(new Event("ended")), 20);
      return Promise.resolve();
    };
  });
  await page.clock.install();
  await page.goto(`/papers/${id}`);
  await page.getByRole("checkbox", { name: /Tôi đã đeo tai nghe/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await expect(page.locator(".exam-head")).toBeVisible();
}
const plays = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __plays: string[] }).__plays);

test("the exam room fills the screen and plays each recording once", async ({
  page,
}) => {
  await sitExam(page);
  // Her own app is out of the way, and nothing names the topic of a recording.
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".topbar")).toBeHidden();
  await expect(page.getByText("Sở thích vẽ tranh")).toHaveCount(0);
  const next = page.getByRole("button", { name: "Tiếp theo" });
  await expect(next).toBeDisabled();
  expect(await plays(page)).toEqual([]);
  await page.clock.runFor("00:09");
  await expect(page.locator(".exam-audio-status")).toContainText("đã kết thúc");
  expect(await plays(page)).toHaveLength(1);
  await expect(next).toBeEnabled();
  // Nothing to pause, rewind, replay or go back with.
  await expect(
    page.getByRole("button", {
      name: /Phát|Tạm dừng|Nghe lại|Câu trước|Quay lại/,
    }),
  ).toHaveCount(0);
  // Reloading mid-exam must not hand back a second listen.
  await page.reload();
  await expect(page.locator(".exam-audio-status")).toContainText(
    "không phát lại được",
  );
  await page.clock.runFor("00:09");
  expect(await plays(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Tiếp theo" })).toBeEnabled();
  await page.getByRole("button", { name: "Tiếp theo" }).click();
  await expect(
    page.getByRole("heading", { name: /Part 1 · Câu 2/ }),
  ).toBeVisible();
  const run = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0],
  );
  expect(run.mode).toBe("exam");
  expect(run.heard).toEqual(["132-listening-1"]);
});

test("when a section's time runs out the exam room moves on by itself", async ({
  page,
}) => {
  await sitExam(page);
  await page.clock.fastForward("40:05");
  await expect(page.locator(".exam-where")).toContainText("Phần 2/4 · Đọc");
  await expect(page.locator(".exam-palette button")).toHaveCount(40);
});

test("Reading, Writing and Speaking run like the sections of the exam", async ({
  page,
}) => {
  await sitExam(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Nộp phần này" }).click();
  // Reading: passage left, questions right, a palette for all 40.
  await expect(page.locator(".exam-where")).toContainText("Phần 2/4 · Đọc");
  await expect(page.locator(".exam-palette button")).toHaveCount(40);
  await expect(page.locator(".exam-passage")).not.toContainText("# ");
  await page.locator('input[name^="132-"]').first().check();
  await expect(page.locator(".exam-palette button.answered")).toHaveCount(1);
  await page.getByRole("button", { name: "Bài tiếp theo" }).click();
  await expect(page.getByRole("heading", { name: "Passage 2" })).toBeVisible();
  await page.getByRole("button", { name: "Câu 1, đã trả lời" }).click();
  await expect(page.getByRole("heading", { name: "Passage 1" })).toBeVisible();
  await page.getByRole("button", { name: "Nộp phần này" }).click();
  // Writing: a live word count and two tasks.
  await page
    .getByRole("textbox", { name: /Bài viết Task 1/ })
    .fill("Dear Jo, I think you should practise every day.");
  await expect(page.getByText(/9 từ · yêu cầu: ít nhất 120 từ/)).toBeVisible();
  await page.getByRole("tab", { name: /Task 2/ }).click();
  await page
    .getByRole("textbox", { name: /Bài viết Task 2/ })
    .fill("Talent and work both matter.");
  await page.getByRole("button", { name: "Nộp phần này" }).click();
  // Speaking: Part 1 records at once, Parts 2 and 3 give a minute to prepare.
  await expect(page.locator(".exam-where")).toContainText("Phần 4/4 · Nói");
  await page.getByRole("button", { name: /^Bắt đầu Part 1/ }).click();
  // The label turns to "Đang ghi âm" only once the microphone is really open.
  await expect(page.locator(".exam-speak-clock")).toContainText(
    "Đang ghi âm · 03:00",
  );
  // A take shorter than the recorder's first chunk can come out empty; give
  // the fake microphone a real moment, as a real answer would.
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Kết thúc phần này" }).click();
  await page.getByRole("button", { name: /^Bắt đầu Part 2/ }).click();
  await expect(page.locator(".exam-speak-clock")).toContainText(
    "Chuẩn bị · 01:00",
  );
  await page.clock.runFor("01:00");
  await expect(page.locator(".exam-speak-clock")).toContainText(
    /Đang ghi âm · 0[12]:/,
  );
  await expect(page.locator(".exam-speak-clock")).toContainText("Đang ghi âm");
  // Out of time, the part ends by itself and the next one is offered.
  // A single jump: stepping through every second while a take is being
  // recorded makes the fake clock crawl.
  await page.waitForTimeout(1500);
  await page.clock.fastForward("02:05");
  await expect(page.getByRole("heading", { name: /Part 3/ })).toBeVisible();
  await page.getByRole("button", { name: /^Bắt đầu Part 3/ }).click();
  await page.getByRole("button", { name: "Bắt đầu nói ngay" }).click();
  await expect(page.locator(".exam-speak-clock")).toContainText("Đang ghi âm");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Kết thúc phần Nói" }).click();
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  const run = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0],
  );
  expect(Object.keys(run.essays)).toHaveLength(2);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0].spoken
            .length,
      ),
    )
    .toBe(3);
});

test("every exam-room screen passes the automatic WCAG A/AA check", async ({
  page,
}) => {
  const audit = async (where: string) => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      where,
    ).toEqual([]);
  };
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    };
  });
  await page.clock.install();
  await page.goto("/papers/132");
  await audit("check-in");
  await page.getByRole("checkbox", { name: /Tôi đã đeo tai nghe/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await expect(page.locator(".exam-head")).toBeVisible();
  await audit("listening");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Nộp phần này" }).click();
  await expect(page.locator(".exam-palette button")).toHaveCount(40);
  await audit("reading");
  await page.getByRole("button", { name: "Nộp phần này" }).click();
  await page
    .getByRole("textbox", { name: /Bài viết Task 1/ })
    .fill("Dear Jo, practise every day.");
  await audit("writing");
  await page.getByRole("button", { name: "Nộp phần này" }).click();
  await expect(page.locator(".exam-where")).toContainText("Phần 4/4 · Nói");
  await audit("speaking intro");
  await page.getByRole("button", { name: /^Bắt đầu Part 1/ }).click();
  await audit("speaking talk");
});
