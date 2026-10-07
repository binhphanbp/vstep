import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("an imported paper keeps answers across reload and files all four parts", async ({
  page,
}) => {
  await page.goto("/papers");
  const card = page.locator(".paper-card").filter({ hasText: "Đề thi thử VSTEP 132" });
  await card.getByRole("link", { name: "Mở đề" }).click();
  await expect(page.getByRole("heading", { name: "Đề thi thử VSTEP 132" })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 132" }).click();
  const first = page.locator('.paper-question input[type="radio"]').first();
  await first.check();
  await page.reload();
  await expect(page.locator('.paper-question input[type="radio"]').first()).toBeChecked();
  await expect(page.locator("audio").first()).toHaveAttribute("src", /\/papers\/audio\/.*\.mp3/);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(page.getByRole("heading", { name: "Đọc", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page.getByRole("textbox", { name: "Bài viết Task 1" }).fill("Dear Jo, I will practise with you. Best wishes.");
  await page.getByLabel("Chọn ngữ liệu hoặc bài").selectOption("1");
  await page.getByRole("textbox", { name: "Bài viết Task 2" }).fill("Training and talent both matter. Regular practice is essential.");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Bài viết Task 2" })).toHaveValue(/Regular practice/);
  await page.getByLabel("Chọn ngữ liệu hoặc bài").selectOption("0");
  await expect(page.getByRole("textbox", { name: "Bài viết Task 1" })).toHaveValue(/Dear Jo/);
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(page.getByRole("heading", { name: "Nói", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Tôi đã trả lời phần này/ }).check();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(page.locator(".stat-card strong").first()).toContainText("/35");
  const firstReview = page.locator(".paper-review").first().locator("details").first();
  await firstReview.locator("summary").first().click();
  await firstReview.getByText("Bản dịch câu hỏi và lựa chọn").first().click();
  await expect(firstReview.getByText("Người phụ nữ có lẽ sẽ làm gì vào thứ Bảy?")).toBeVisible();
  const runs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns,
  );
  expect(runs).toHaveLength(1);
  expect(runs[0].finishedAt).toBeTruthy();
  expect(Object.keys(runs[0].answers)).toHaveLength(1);
  expect(Object.keys(runs[0].essays)).toHaveLength(2);
  expect(runs[0].spoken).toHaveLength(1);
  await page.goto("/settings");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản sao", exact: true }).click();
  const exported = JSON.parse(await readFile(await (await event).path(), "utf8"));
  expect(exported.paperRuns).toEqual(runs);
});

test("an old paper tab cannot submit the next section", async ({ page, context }) => {
  await page.goto("/papers/132");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 132" }).click();
  const second = await context.newPage();
  await second.goto("/papers/132");
  const dialogEvent = page.waitForEvent("dialog");
  const click = page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  const dialog = await dialogEvent;
  second.on("dialog", (entry) => entry.accept());
  await second.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(second.getByRole("heading", { name: "Đọc", exact: true })).toBeVisible();
  await dialog.accept();
  await click;
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("may-study-v1")!).paperRuns[0].stage,
  )).toBe(1);
});

test("paper 131 is usable without inventing a score", async ({ page }) => {
  await page.goto("/papers/131");
  await expect(page.getByText(/Đề 131 thiếu toàn bộ khóa đáp án/)).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 131" }).click();
  await expect(page.getByRole("heading", { name: "Nghe", exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /Review 13\/09/ })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Review 13/09" }).click();
  await expect(page.locator("audio").first()).toHaveAttribute("src", /VSTEP-01-P1-L1\.mp3/);
  await page.locator('.paper-question input[type="radio"]').first().check();
  page.on("dialog", (dialog) => dialog.accept());
  for (let section = 0; section < 3; section++)
    await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await expect(page.getByText("REVIEW 13/09 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(page.locator(".stat-card strong").first()).toContainText("/35");
});
