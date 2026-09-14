import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";
import { lessons } from "../../src/lib/content";
/** Read the keys from the content so a change of option order cannot lie. */
const question = (id: string) => {
  const found = lessons
    .flatMap((lesson) => lesson.questions)
    .find((item) => item.id === id);
  if (!found) throw Error(`Không tìm thấy câu ${id}`);
  return found;
};
const key = (id: string) => question(id).answer;
const missed = (id: string) => (key(id) + 1) % question(id).options.length;
const letter = (index: number) => "ABCD"[index];

test("dashboard is honest, responsive, and energy changes the plan", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Một ngày mới, một bước tiến." }),
  ).toBeVisible();
  await expect(page.getByText("Chào Gùa,", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Rùa nhỏ vẫn đang tiến về phía trước."),
  ).toBeVisible();
  await expect(page.locator(".streak-pill")).toHaveText("0 ngày");
  await page.getByRole("button", { name: "Hơi mệt" }).click();
  await expect(page.getByRole("button", { name: "Hơi mệt" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByText("Hôm nay học nhẹ thôi.", { exact: false }),
  ).toBeVisible();
  // A tired day gets a session shorter than one lesson, not the same lessons
  // in a smaller budget.
  const quick = page.locator(".quick-session");
  await expect(quick).toContainText("Buổi 10 phút");
  await expect(quick.locator("li")).toHaveCount(3);
  await expect(quick.locator("li").first().locator("a")).toHaveAttribute(
    "href",
    /\/practice\//,
  );
  await page.screenshot({
    path: ".qa/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".qa/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("link", { name: "Vườn từ vựng", exact: true }).click();
  await expect(page).toHaveURL(/vocabulary/);
});
test("personalisation persists through reload", async ({ page }) => {
  await page.goto("/settings");
  await page.getByPlaceholder("Tên hoặc biệt danh").fill("Linh");
  await page.getByLabel("Mục tiêu VSTEP").selectOption("B1");
  await page.getByLabel("Số phút học mỗi ngày").fill("20");
  await page.getByRole("button", { name: "Lưu nhịp học của mình" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.reload();
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue("Linh");
  await page.goto("/");
  await expect(page.getByText("Chào Linh,", { exact: false })).toBeVisible();
  await expect(page.locator(".target-pill")).toContainText("B1");
});
test("reading draft survives reload, scoring is correct, mistakes get reviewed", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await page.locator(`input[name="rc1"][value="${missed("rc1")}"]`).check();
  await page
    .locator(".question")
    .filter({ has: page.locator('input[name="rc1"]') })
    .getByRole("button", { name: "Rất chắc" })
    .click();
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("may-study-v1")))
    .toContain("rc1");
  await page.reload();
  await expect(
    page.locator(`input[name="rc1"][value="${missed("rc1")}"]`),
  ).toBeChecked();
  await expect(
    page
      .locator(".question")
      .filter({ has: page.locator('input[name="rc1"]') })
      .getByRole("button", { name: "Rất chắc" }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const id of ["rc2", "rc3", "rc4", "rc5"]) {
    await page.locator(`input[name="${id}"][value="${key(id)}"]`).check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${id}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".result-score")).toHaveText("4/5");
  await expect(
    page.getByRole("heading", { name: "Mình vừa học được gì?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sai dù đã rất chắc", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ưu tiên xem lại câu sai", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Cả bài kể quá trình Linh", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".evidence-block q").first()).toContainText(
    "she was providing a place to learn",
  );
  await expect(page.locator(".option-notes").first()).toContainText(
    `Vì sao ${letter(missed("rc1"))} chưa đúng:`,
  );
  await expect(page.locator(".option-notes").first()).toContainText(
    `Vì sao ${letter(key("rc1"))} đúng:`,
  );
  await page.getByRole("link", { name: "Mở sổ tay lỗi sai" }).click();
  await expect(page.getByText("1 câu đang cần sửa")).toBeVisible();
  await expect(page.getByText("Ưu tiên · Đã rất chắc")).toBeVisible();
  await page.locator(`input[name="rc1"][value="${key("rc1")}"]`).check();
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();
  await expect(
    page.getByText("Cả bài kể quá trình Linh", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".evidence-block q")).toContainText(
    "she was providing a place to learn",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay không còn câu đến hạn." }),
  ).toBeVisible();
});
test("a mistake answered right later leaves the queue, and repeats are counted apart", async ({
  page,
}) => {
  const answer = async (wrong: string[]) => {
    for (const id of ["rc1", "rc2", "rc3", "rc4", "rc5"]) {
      const value = wrong.includes(id) ? missed(id) : key(id);
      await page.locator(`input[name="${id}"][value="${value}"]`).check();
      await page
        .locator(".question")
        .filter({ has: page.locator(`input[name="${id}"]`) })
        .getByRole("button", { name: "Chưa chắc" })
        .click();
    }
    await page
      .getByRole("button", { name: "Xem kết quả", exact: true })
      .click();
  };

  await page.goto("/practice/reading-cafe");
  await answer(["rc1"]);
  await page.goto("/mistakes");
  await expect(page.getByText("1 câu đang cần sửa")).toBeVisible();

  // Meet the same question again in a normal session and get it right. Before
  // this, the card stayed in the book and stayed due for ever: only the
  // notebook's own review button moved the schedule.
  await page.goto("/practice/reading-cafe");
  await answer([]);
  await page.goto("/mistakes");
  await expect(page.getByText("0 câu đang cần sửa")).toBeVisible();
  await expect(page.getByText("1 câu đã sửa được")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hôm nay không còn câu đến hạn." }),
  ).toBeVisible();

  // The repeat must not flatter the ability figure that picks tomorrow's
  // lessons: first meeting was 4/5, so Reading stays at 80%.
  await page.goto("/progress");
  const reading = page
    .locator(".history-row")
    .filter({ hasText: "Reading" })
    .first();
  await expect(reading).toContainText("80%");
  await expect(reading).toContainText("Luyện lại 100%");
  await expect(reading).toContainText("1 bài lần đầu");
  await expect(reading).toContainText("1 lượt luyện lại");
});

test("the notebook shows the shape of the mistakes, not just the list", async ({
  page,
}) => {
  // reading-garden carries four detail questions: enough of one type for its
  // error rate to mean something. Get three of them wrong, two while sure.
  await page.goto("/practice/reading-garden");
  const wrong = ["rg1", "rg2", "rg3"];
  for (const id of ["rg1", "rg2", "rg3", "rg4", "rg5"]) {
    const miss = wrong.includes(id);
    await page
      .locator(`input[name="${id}"][value="${miss ? missed(id) : key(id)}"]`)
      .check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${id}"]`) })
      .getByRole("button", { name: miss ? "Rất chắc" : "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();

  await page.goto("/mistakes");
  const panel = page.locator(".weak-spots");
  await expect(
    panel.getByRole("heading", { name: "Chỗ mình hay vấp" }),
  ).toBeVisible();
  const detailRow = panel
    .locator("li")
    .filter({ hasText: "Thông tin chi tiết" });
  await expect(detailRow).toContainText("Sai 3/4 câu");
  await expect(detailRow).toContainText("3 câu sai dù đã chọn “Rất chắc”");
  // A type with a single question must not be reported as a rate.
  await expect(
    panel.locator("li").filter({ hasText: "Từ tham chiếu" }),
  ).toContainText("chưa đủ để kết luận");
  await detailRow.getByRole("link", { name: "Luyện dạng này" }).click();
  // Wait for the navigation itself: /mistakes has an h1 too, so asserting the
  // heading first can pass before the click has taken effect.
  await page.waitForURL(/\/practice\//);
  await expect(page.locator("main h1")).toBeVisible();
});

test("the exam date becomes a plan for the week, and nothing without one", async ({
  page,
}) => {
  await page.goto("/journey");
  const panel = page.locator(".week-plan");
  await expect(panel).toContainText("Chưa có ngày thi");
  await page.goto("/settings");
  const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Ngày thi dự kiến").fill(soon);
  await page.getByRole("button", { name: "Lưu nhịp học của mình" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.goto("/journey");
  await expect(panel).toContainText("Hai tuần cuối");
  await expect(panel).toContainText("đề đủ cấu trúc");
  const far = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  await page.goto("/settings");
  await page.getByLabel("Ngày thi dự kiến").fill(far);
  await page.getByRole("button", { name: "Lưu nhịp học của mình" }).click();
  await page.goto("/journey");
  await expect(panel).toContainText("xây nền");
});

test("a word she got wrong can join the vocabulary garden", async ({
  page,
}) => {
  // rk4 is the vocabulary-in-context question of reading-market: get it wrong
  // and the notebook can turn it into a card.
  await page.goto("/practice/reading-market");
  for (const id of ["rk1", "rk2", "rk3", "rk4", "rk5"]) {
    await page
      .locator(
        `input[name="${id}"][value="${id === "rk4" ? missed(id) : key(id)}"]`,
      )
      .check();
    // Every question needs a confidence before the lesson can be submitted.
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${id}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await page.goto("/mistakes");
  const add = page.getByRole("button", { name: /Thêm .*doubtful/ });
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.locator(".saved-word-add")).toContainText(
    /Đã thêm .*doubtful/,
  );
  await page.goto("/vocabulary");
  await page.getByRole("button", { name: "Tất cả từ vựng" }).click();
  await page.getByLabel("Tìm từ vựng").fill("doubtful");
  const row = page.locator(".vocab-list-item");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Tự thêm");
  await expect(row).toContainText("thuyết phục");
  await row.getByRole("button", { name: "Bỏ khỏi vườn" }).click();
  await expect(page.locator(".vocab-list-item")).toHaveCount(0);
});

test("cannot submit unanswered practice; writing is saved and reviewable", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText("chưa trả lời");
  await page.goto("/practice/writing-email");
  const draft =
    "Hi Alex, I am really happy to hear that you are visiting my city next month. We could visit the book street together.";
  await page.getByRole("textbox", { name: "Bài viết của bạn" }).fill(draft);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Bài viết của bạn" }),
  ).toHaveValue(draft);
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await expect(
    page.getByText("Chưa có điểm chấm của giáo viên hoặc AI.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto("/progress");
  await page.getByText("Xem lại bài viết đã nộp").click();
  await expect(page.getByText(draft, { exact: true })).toBeVisible();
});
test("vocabulary recall schedules and persists", async ({ page }) => {
  await page.goto("/vocabulary");
  await expect(
    page.getByRole("heading", { name: "reliable", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lật thẻ để xem nghĩa" }).click();
  await expect(page.getByText("đáng tin cậy", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nhớ rồi" }).click();
  await expect(
    page.getByRole("heading", { name: "affordable", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "affordable", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tất cả từ vựng", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Tìm từ vựng" }).fill("reliable");
  await expect(page.locator(".vocab-list-item")).toHaveCount(1);
});
test("library search, skill filter, and unknown route", async ({ page }) => {
  await page.goto("/practice?skill=reading");
  // Counted from the bank so that adding a lesson never fails this filter test.
  await expect(page.locator(".lesson-card")).toHaveCount(
    lessons.filter((lesson) => lesson.skill === "reading").length,
  );
  await page.getByRole("textbox", { name: "Tìm bài học" }).fill("commute");
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Tìm bài học" }).fill("zzzz");
  await expect(
    page.getByRole("heading", { name: "Chưa có bài phù hợp" }),
  ).toBeVisible();
  await page.goto("/practice/not-a-lesson");
  await expect(
    page.getByRole("heading", { name: "Hình như mình đi lạc một chút." }),
  ).toBeVisible();
});
test("timed exam continues through reload and finishes expired stages", async ({
  page,
}) => {
  await page.goto("/exam");
  await expect(
    page.getByRole("button", { name: "Bắt đầu 51 phút của mình" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu 51 phút của mình" }).click();
  await page.locator('input[name="lw1"][value="2"]').check();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).exam.deadline,
  );
  await page.reload();
  await expect(page.locator('input[name="lw1"][value="2"]')).toBeChecked();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("may-study-v1")!).exam.deadline,
    ),
  ).toBe(before);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Đọc: cứ tập trung từng bước." }),
  ).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("may-study-v1")!);
    s.exam.deadline = Date.now() - 7200000;
    localStorage.setItem("may-study-v1", JSON.stringify(s));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Buổi luyện đã khép lại." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("may-study-v1")!).attempts.filter(
          (a: { skill: string }) =>
            a.skill === "writing" || a.skill === "speaking",
        ).length,
    ),
  ).toBe(0);
});
test("backup export/import and invalid data protection", async ({ page }) => {
  await page.goto("/settings");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản sao", exact: true }).click();
  expect((await event).suggestedFilename()).toMatch(/may-backup.*json/);
  const s = freshState();
  s.profile.name = "Mai";
  s.profile.onboarded = true;
  page.on("dialog", (d) => d.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue("Mai");
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator("main [role=alert]")).toContainText(
    "Không nhập được",
  );
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue("Mai");
});
test("corrupt local state is preserved instead of overwritten", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("may-study-v1", "corrupt-json"),
  );
  await page.goto("/");
  await expect(page.locator("main [role=alert]")).toContainText(
    "Bản gốc chưa bị ghi đè",
  );
  expect(await page.evaluate(() => localStorage.getItem("may-study-v1"))).toBe(
    "corrupt-json",
  );
  // The banner sends the learner to Cài đặt to export, so that export must
  // carry the damaged original: it is the only copy of her history left.
  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản sao", exact: true }).click();
  const saved = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of saved) chunks.push(chunk as Buffer);
  expect(Buffer.concat(chunks).toString()).toContain("corrupt-json");
});
test("recording uses a real MediaRecorder and survives reload", async ({
  browser,
}) => {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  await page.goto("/practice/speaking-social");
  await page
    .getByRole("button", { name: "Bắt đầu ghi âm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dừng ghi âm", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Dừng ghi âm", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Tải bản ghi", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("audio")
      .evaluate((audio: HTMLAudioElement) => audio.src.startsWith("blob:")),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Tải bản ghi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await expect(
    page.getByRole("heading", { name: "Gùa đã dành thời gian để luyện tập." }),
  ).toBeVisible();
  // Coming back later, the take already filed must not pass as a new answer.
  await page.goto("/practice/speaking-social");
  await expect(
    page.getByRole("link", { name: "Tải bản ghi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await expect(page.locator("main [role=alert]")).toContainText("Ghi âm");
  const speaking = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("may-study-v1")!).attempts.filter(
        (a: { skill: string }) => a.skill === "speaking",
      ).length,
  );
  expect(speaking).toBe(1);
  // Every filed session keeps its own copy on the device, so the history has to
  // offer a way to remove one.
  await page.goto("/progress");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByText("Nghe lại bản ghi của buổi này").click();
  await expect(page.locator("audio")).toBeVisible();
  await page.getByRole("button", { name: "Xóa bản ghi này" }).click();
  await expect(page.getByText("Đã xóa bản ghi của buổi này")).toBeVisible();
  await page.reload();
  await page.getByText("Nghe lại bản ghi của buổi này").click();
  await expect(page.getByText("Không có bản ghi cho buổi này")).toBeVisible();
  await context.close();
});
test("every main route loads without runtime errors and fits mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/journey",
    "/practice",
    "/exam",
    "/vocabulary",
    "/mistakes",
    "/progress",
    "/guide",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
