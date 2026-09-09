import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";
import AxeBuilder from "@axe-core/playwright";
test("opening the same quiz in a second tab does not erase newer answers", async ({
  context,
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  const second = await context.newPage();
  await second.goto("/practice/reading-cafe");
  await page.bringToFront();
  await page.locator('input[name="rc1"][value="1"]').check();
  await second.bringToFront();
  await expect(second.locator('input[name="rc1"][value="1"]')).toBeChecked();
  await second.locator('input[name="rc2"][value="2"]').check();
  await page.bringToFront();
  await expect(page.locator('input[name="rc2"][value="2"]')).toBeChecked();
  await page.reload();
  await expect(page.locator('input[name="rc1"][value="1"]')).toBeChecked();
  await expect(page.locator('input[name="rc2"][value="2"]')).toBeChecked();
});

test("an old exam tab cannot submit the following stage by accident", async ({
  context,
  page,
}) => {
  await page.goto("/exam");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu 51 phút của mình" }).click();
  const second = await context.newPage();
  await second.goto("/exam");
  const dialogEvent = page.waitForEvent("dialog");
  const click = page
    .getByRole("button", { name: "Nộp phần này & tiếp tục" })
    .click();
  const dialog = await dialogEvent;
  second.on("dialog", (d) => d.accept());
  await second.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expect(
    second.getByRole("heading", { name: "Đọc: cứ tập trung từng bước." }),
  ).toBeVisible();
  await dialog.accept();
  await click;
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("may-study-v1")!).exam.stage,
    ),
  ).toBe(1);
});

test("storage failure preserves the session and reports the failed save", async ({
  page,
}) => {
  await page.goto("/practice/writing-email");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  const input = page.getByRole("textbox", { name: "Bài viết của bạn" });
  await input.fill(
    "This draft should remain available even when the disk is full.",
  );
  await expect(input).toHaveValue(
    "This draft should remain available even when the disk is full.",
  );
  await expect(page.locator("main [role=alert]").first()).toContainText(
    "Không lưu được",
  );
});

test("invalid microphone permission shows an actionable error and saves no attempt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await page.goto("/practice/speaking-social");
  await page
    .getByRole("button", { name: "Bắt đầu ghi âm", exact: true })
    .click();
  await expect(page.locator("main [role=alert]").first()).toContainText(
    "Chưa được cấp quyền micro",
  );
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await expect(page.locator("main [role=alert]").last()).toContainText(
    "Ghi âm câu trả lời trước",
  );
});

test("a finished full exam exposes accessible reading feedback on mobile", async ({
  page,
}) => {
  const s = freshState();
  s.exam = {
    id: "accessibility-exam",
    mode: "full",
    startedAt: Date.now(),
    deadline: Date.now(),
    stage: 3,
    answers: {},
    writing: "",
    finished: true,
  };
  await page.goto("/");
  await page.evaluate(
    (value) => localStorage.setItem("may-study-v1", JSON.stringify(value)),
    s,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exam");
  await expect(
    page.getByRole("heading", { name: "Buổi luyện đã khép lại." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("details")
    .filter({ hasText: "A change at the station" })
    .locator("summary")
    .click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("server serves security headers and a real 404 status", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  expect((await request.get("/not-a-real-route")).status()).toBe(404);
});
test("profile fields remain editable when another tab saves vocabulary progress", async ({
  context,
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByPlaceholder("Tên hoặc biệt danh của bạn")
    .fill("Unsaved name");
  const second = await context.newPage();
  await second.goto("/vocabulary");
  await second.getByRole("button", { name: "Lật thẻ để xem nghĩa" }).click();
  await second.getByRole("button", { name: "Nhớ rồi", exact: false }).click();
  await page.bringToFront();
  await expect(page.getByPlaceholder("Tên hoặc biệt danh của bạn")).toHaveValue(
    "Unsaved name",
  );
});
