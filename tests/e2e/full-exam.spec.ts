import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";
test("full exam navigates all materials and restores both writing tasks", async ({
  page,
}) => {
  await page.goto("/exam");
  await page.getByRole("button", { name: "Đủ cấu trúc · 172 phút" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu 172 phút của mình" }).click();
  await expect(page.getByLabel("Chọn ngữ liệu").locator("option")).toHaveCount(
    14,
  );
  await page.locator('input[name="fl1"]').first().check();
  await page.getByLabel("Chọn ngữ liệu").selectOption("13");
  await expect(page.locator('input[name="fl35"]')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('input[name="fl1"]').first()).toBeChecked();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(page.getByLabel("Chọn ngữ liệu").locator("option")).toHaveCount(
    4,
  );
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page
    .getByLabel("Bài viết trong phòng thi")
    .fill("Dear Alex, This is my email response. Best wishes.");
  await page.getByLabel("Chọn bài viết").selectOption("1");
  await page
    .getByLabel("Bài viết trong phòng thi")
    .fill("This is my separate essay response about education.");
  await page.reload();
  await expect(page.getByLabel("Bài viết trong phòng thi")).toContainText(
    "Dear Alex",
  );
  await page.getByLabel("Chọn bài viết").selectOption("1");
  await expect(page.getByLabel("Bài viết trong phòng thi")).toContainText(
    "separate essay",
  );
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(page.getByLabel("Chọn phần Nói").locator("option")).toHaveCount(
    3,
  );
  await page
    .getByRole("button", { name: "Kết thúc buổi luyện", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Buổi luyện đã khép lại." }),
  ).toBeVisible();
  const firstListeningReview = page
    .getByText("Xem đáp án và giải thích", { exact: false })
    .first();
  await firstListeningReview.click();
  await expect(
    page.getByRole("heading", {
      name: "Bản chép lời để đối chiếu sau khi nộp",
    }),
  ).toBeVisible();
  const attempts = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).attempts,
  );
  expect(
    attempts.filter((a: { skill: string }) => a.skill === "writing"),
  ).toHaveLength(2);
  expect(
    attempts.reduce((n: number, a: { total: number }) => n + a.total, 0),
  ).toBe(75);
});

test("switching speaking parts saves the recording being stopped on unmount", async ({
  page,
}) => {
  const state = freshState();
  const time = Date.now();
  state.exam = {
    id: "record-recovery",
    mode: "full",
    startedAt: time,
    deadline: time + 720000,
    stage: 3,
    answers: {},
    writing: "",
    finished: false,
  };
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("may-study-v1", JSON.stringify(s)),
    state,
  );
  await page.goto("/exam");
  await page
    .getByRole("button", { name: "Bắt đầu ghi âm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dừng ghi âm", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByLabel("Chọn phần Nói").selectOption("1");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("may-study-v1")!).attempts.length,
      ),
    )
    .toBe(1);
  await page.getByLabel("Chọn phần Nói").selectOption("0");
  await expect(
    page.getByRole("link", { name: "Tải bản ghi", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Tải bản ghi", exact: true }),
  ).toBeVisible();
  const attempts = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).attempts,
  );
  expect(attempts).toHaveLength(1);
  expect(attempts[0].seconds).toBeGreaterThan(0);
  expect(attempts[0].recordingId).toBe("exam-record-recovery-speaking-social");
});
