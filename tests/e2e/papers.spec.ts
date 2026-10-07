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

test("one section can be sat on its own, then reviewed part by part and retried", async ({
  page,
}) => {
  const paper = JSON.parse(await readFile("public/papers/132.json", "utf8"));
  const [first, second] = paper.sections[1].slots[0].items;
  await page.goto("/papers/132");
  await page.getByRole("radio", { name: /Chỉ Đọc/ }).check();
  // The check-in speaks of this section alone, not of 172 minutes.
  await expect(page.locator(".exam-facts")).toContainText("Đọc 60′");
  await expect(page.locator(".exam-facts")).not.toContainText("Nghe");
  await page.getByRole("checkbox", { name: /đủ 60 phút/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await expect(page.locator(".exam-where")).toContainText("Luyện riêng · Đọc");
  await expect(page.locator(".exam-palette button")).toHaveCount(40);
  // One right, one wrong, the rest left blank.
  await page.locator(`input[name="${first.id}"]`).nth(first.answer).check();
  await page
    .locator(`input[name="${second.id}"]`)
    .nth((second.answer + 1) % 4)
    .check();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Nộp bài" }).click();

  // The review covers Reading only, with time used and a part breakdown.
  await expect(
    page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH · CHỈ ĐỌC"),
  ).toBeVisible();
  await expect(page.locator(".stat-card")).toHaveCount(1);
  await expect(page.locator(".stat-card strong")).toHaveText("1/40");
  await expect(page.getByRole("heading", { name: "1. Nghe" })).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: /^Đọc dưới 1 phút 60 phút$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /^Đọc · Passage 1 1\/10 1 8$/ }),
  ).toBeVisible();
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
  await audit("review");
  // Only the missed questions: the right one disappears.
  await page
    .getByRole("radio", { name: /Chỉ câu sai và bỏ trống \(39\)/ })
    .check();
  await page.locator(".paper-review details summary").first().click();
  await expect(page.getByText(`1. ${first.text}`)).toHaveCount(0);
  await expect(
    page.locator(".paper-review-item").first().locator(".review-mark"),
  ).toHaveText("✗ Sai");

  // Retry the 39, with the answer shown straight away.
  await page
    .getByRole("button", { name: "Làm lại 39 câu sai và bỏ trống" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Làm lại câu sai · 1/39" }),
  ).toBeVisible();
  await page
    .locator(".retry-drill .paper-option input")
    .nth(second.answer)
    .check();
  await expect(page.locator(".retry-drill .review-mark")).toHaveText("✓ Đúng");
  await audit("retry");
  await expect(
    page.locator(".retry-drill .paper-option input").first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(
    page.getByRole("heading", { name: "Làm lại câu sai · 2/39" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dừng làm lại" }).click();
  // The saved result is the result of the sitting, not of the retry.
  await expect(page.locator(".stat-card strong")).toHaveText("1/40");
  const runs = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns,
  );
  expect(runs).toHaveLength(1);
  expect(runs[0].only).toBe(1);
  expect(runs[0].stageEnds).toHaveLength(1);
  expect(Object.keys(runs[0].answers)).toHaveLength(2);

  // A second sitting shows up beside the first.
  await page.getByRole("button", { name: "Làm lại đề này" }).click();
  await page.getByRole("radio", { name: /Chỉ Viết/ }).check();
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox", { name: /đủ 60 phút/ }).check();
  await page.getByRole("button", { name: /Bắt đầu đề 132 · chỉ Viết/ }).click();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(
    page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH · CHỈ VIẾT"),
  ).toBeVisible();
  const attempts = page.locator(".review-attempts tbody tr");
  await expect(attempts).toHaveCount(2);
  await expect(attempts.nth(0)).toContainText("Chỉ Đọc");
  await expect(attempts.nth(0)).toContainText("1/40");
  await expect(attempts.nth(1)).toContainText("Chỉ Viết");
});

test("a single section ends the sitting when its time runs out", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/papers/132");
  await page.getByRole("radio", { name: /Chỉ Viết/ }).check();
  // The rules speak of Writing only, and of the sitting ending.
  await expect(page.locator(".exam-rules")).toContainText("Viết:");
  await expect(page.locator(".exam-rules")).not.toContainText("Nghe:");
  await expect(page.locator(".exam-rules")).toContainText(
    "lượt luyện kết thúc",
  );
  await page.getByRole("checkbox", { name: /đủ 60 phút/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await page
    .getByRole("textbox", { name: /Bài viết Task 1/ })
    .fill("Dear Jo, practise every day.");
  await page.clock.fastForward("01:00:05");
  await expect(
    page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH · CHỈ VIẾT"),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(
    page.getByRole("row", { name: /^Viết 60 phút 60 phút$/ }),
  ).toBeVisible();
  await expect(page.getByText("Dear Jo, practise every day.")).toBeHidden();
  await page.locator(".paper-review details summary").first().click();
  await expect(page.getByText("Dear Jo, practise every day.")).toBeVisible();
});

test("paper 131 sat as one section has no marks, tables or retry", async ({
  page,
}) => {
  await page.goto("/papers/131");
  await page.getByRole("radio", { name: /Chỉ Đọc/ }).check();
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox", { name: /đủ 60 phút/ }).check();
  await page.getByRole("button", { name: /Bắt đầu đề 131 · chỉ Đọc/ }).click();
  await page.locator(".paper-question input").first().check();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(
    page.getByText("ĐỀ 131 · ĐÃ HOÀN THÀNH · CHỈ ĐỌC"),
  ).toBeVisible();
  await expect(page.locator(".stat-card")).toHaveCount(0);
  await expect(page.getByText(/không có khóa đáp án/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Làm lại \d+ câu/ }),
  ).toHaveCount(0);
  await expect(page.locator(".review-filter")).toHaveCount(0);
  await expect(page.locator(".review-mark")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Kết quả theo từng phần" }),
  ).toHaveCount(0);
  // The time used is still true of an unmarked paper.
  await expect(
    page.getByRole("heading", { name: "Thời gian đã dùng" }),
  ).toBeVisible();
});

test("a sitting saved before the time log existed still opens and reviews", async ({
  page,
}) => {
  const paper = JSON.parse(await readFile("public/papers/132.json", "utf8"));
  const first = paper.sections[0].slots[0].items[0];
  await page.goto("/papers/132");
  // Start any sitting so the app has written its state, then swap in one
  // like an older version saved: no mode, no log, in its last section, with
  // its time long gone.
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox", { name: /đủ 172 phút/ }).check();
  await page.getByRole("button", { name: /Bắt đầu đề 132/ }).click();
  await expect(page.locator(".paper-clock")).toBeVisible();
  await page.evaluate(
    ({ id, hash, version }) => {
      const state = JSON.parse(localStorage.getItem("may-study-v1")!);
      state.paperRuns = [
        {
          id: "old-1",
          paperId: "132",
          version,
          sourceHash: hash,
          startedAt: Date.now() - 3 * 3600_000,
          stage: 3,
          deadline: Date.now() - 1000,
          material: 0,
          answers: { [id]: 0 },
          essays: {},
          spoken: [],
        },
      ];
      localStorage.setItem("may-study-v1", JSON.stringify(state));
    },
    { id: first.id, hash: paper.sourceHash, version: paper.version },
  );
  await page.reload();
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kết quả theo từng phần" }),
  ).toBeVisible();
  // No log was kept, so no time is shown against a section it may not belong to.
  await expect(
    page.getByRole("heading", { name: "Thời gian đã dùng" }),
  ).toHaveCount(0);
});

// ── Rare paths of the exam room ────────────────────────────────────────────
test("a recording the browser will not autoplay, or loses part-way, never traps the sitting", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let calls = 0;
    HTMLMediaElement.prototype.play = function () {
      calls++;
      // First try: the browser refuses to autoplay. After that it plays, and
      // the second recording breaks off after it has started.
      if (calls === 1)
        return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      this.dispatchEvent(new Event("playing"));
      setTimeout(
        () => this.dispatchEvent(new Event(calls === 2 ? "ended" : "error")),
        20,
      );
      return Promise.resolve();
    };
  });
  await page.clock.install();
  await page.goto("/papers/132");
  await page.getByRole("checkbox", { name: /Tôi đã đeo tai nghe/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await page.clock.runFor("00:09");
  await expect(page.locator(".exam-audio-status")).toContainText(
    "chưa cho phát tự động",
  );
  const next = page.getByRole("button", { name: "Tiếp theo" });
  await expect(next).toBeDisabled();
  // One press starts it, and it still only plays once.
  await page.getByRole("button", { name: /Phát bản ghi âm/ }).click();
  await expect(page.locator(".exam-audio-status")).toContainText("đã kết thúc");
  await expect(
    page.getByRole("button", { name: /Phát bản ghi âm/ }),
  ).toHaveCount(0);
  await next.click();
  // The next recording starts, then fails: no retry that cannot work, and the
  // way forward stays open.
  await page.clock.runFor("00:09");
  await expect(page.locator(".exam-audio-status")).toContainText(
    "bị gián đoạn và không phát lại được",
  );
  await expect(
    page.getByRole("button", { name: /Phát bản ghi âm/ }),
  ).toHaveCount(0);
  await expect(next).toBeEnabled();
  // Leaving in the middle of Listening warns that the recording will not return.
  const messages: string[] = [];
  page.on("dialog", (dialog) => {
    messages.push(dialog.message());
    void dialog.dismiss();
  });
  await page.getByRole("link", { name: "Thoát" }).click();
  expect(messages.join(" ")).toContain("không phát lại khi bạn quay về");
});

test("Speaking keeps what was recorded when the microphone drops, the page reloads or time runs out", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Real = window.MediaRecorder;
    const seen: MediaRecorder[] = [];
    (window as unknown as { __recs: MediaRecorder[] }).__recs = seen;
    class Spy extends Real {
      constructor(...args: ConstructorParameters<typeof MediaRecorder>) {
        super(...args);
        seen.push(this);
      }
    }
    window.MediaRecorder = Spy as typeof MediaRecorder;
  });
  const spoken = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0].spoken,
    );
  await page.goto("/papers/132");
  await page.getByRole("radio", { name: /Chỉ Nói/ }).check();
  await page.getByRole("checkbox", { name: /Tôi đã đeo tai nghe/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await page.getByRole("button", { name: /^Bắt đầu Part 1/ }).click();
  await expect(page.locator(".exam-speak-clock")).toContainText("Đang ghi âm");
  await page.waitForTimeout(1500);
  // The microphone drops: the label stops claiming to record, and says why.
  await page.evaluate(() =>
    (window as unknown as { __recs: MediaRecorder[] }).__recs.at(-1)!.stop(),
  );
  await expect(page.locator(".exam-speak-clock")).toContainText(
    "Không ghi âm được",
  );
  await expect(page.locator(".notice.error")).toContainText("Micro bị ngắt");
  await page.getByRole("button", { name: "Kết thúc phần này" }).click();
  await expect.poll(spoken).toEqual(["132-speaking-1"]);

  // Reload in the middle of Part 2's talk: the clock carries on from where it
  // was, and the part still counts.
  await page.getByRole("button", { name: /^Bắt đầu Part 2/ }).click();
  await page.getByRole("button", { name: "Bắt đầu nói ngay" }).click();
  await expect(page.locator(".exam-speak-clock")).toContainText("Đang ghi âm");
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.locator(".exam-speak-clock")).toContainText(
    /Đang (ghi âm|mở micro) · 0[12]:/,
  );
  await expect(page.locator(".exam-speak-clock")).toContainText("Đang ghi âm");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Kết thúc phần này" }).click();
  await expect.poll(spoken).toEqual(["132-speaking-1", "132-speaking-2"]);
});

test("Speaking keeps the take in progress when the section's own time runs out", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/papers/132");
  await page.getByRole("radio", { name: /Chỉ Nói/ }).check();
  await page.getByRole("checkbox", { name: /Tôi đã đeo tai nghe/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await page.getByRole("button", { name: /^Bắt đầu Part 1/ }).click();
  await expect(page.locator(".exam-speak-clock")).toContainText("Đang ghi âm");
  await page.waitForTimeout(1500);
  await page.clock.fastForward("12:05");
  await expect(
    page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH · CHỈ NÓI"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0].spoken,
      ),
    )
    .toEqual(["132-speaking-1"]);
});

test("the back button returns the app's own screens, and a full disk is announced once", async ({
  page,
}) => {
  await page.goto("/");
  await page.goto("/papers/132");
  await page.getByRole("radio", { name: /Chỉ Viết/ }).check();
  await page.getByRole("checkbox", { name: /Tôi đã đeo tai nghe/ }).check();
  await page.getByRole("button", { name: "Chấp nhận và bắt đầu thi" }).click();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  const box = page.getByRole("textbox", { name: /Bài viết Task 1/ });
  await box.fill("Dear Jo, the page keeps what I type.");
  await expect(box).toHaveValue("Dear Jo, the page keeps what I type.");
  const alerts = page.locator("[role=alert]", { hasText: "Không lưu được" });
  await expect(alerts).toHaveCount(1);
  await expect(alerts).toBeVisible();
  await page.goBack();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/exam-immersive/);
});
