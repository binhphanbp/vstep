import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";
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
  await page.locator('input[name="rc1"][value="0"]').check();
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("may-study-v1")))
    .toContain("rc1");
  await page.reload();
  await expect(page.locator('input[name="rc1"][value="0"]')).toBeChecked();
  for (const [id, value] of Object.entries({ rc2: 2, rc3: 0, rc4: 3, rc5: 1 }))
    await page.locator(`input[name="${id}"][value="${value}"]`).check();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".result-score")).toHaveText("4/5");
  await expect(
    page.getByText("Cả bài kể quá trình Linh", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Mở sổ tay lỗi sai" }).click();
  await expect(page.getByText("1 câu đã ghi lại")).toBeVisible();
  await page.locator('input[name="rc1"][value="1"]').check();
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();
  await expect(
    page.getByText("Cả bài kể quá trình Linh", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay không còn câu đến hạn." }),
  ).toBeVisible();
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
  await expect(page.locator(".lesson-card")).toHaveCount(4);
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
