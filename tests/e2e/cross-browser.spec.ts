import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";
import { lessons } from "../../src/lib/content";
import { NOTE_LIMITS } from "../../src/lib/notes";
const cafe = lessons.find((lesson) => lesson.id === "reading-cafe")!;
/** Read the keys from the content so a change of option order cannot lie. */
const key = (id: string) =>
  cafe.questions.find((question) => question.id === id)!.answer;
const missed = (id: string) => (key(id) + 1) % 4;

const priorityLessonRoutes = [
  "/practice/reading-cafe",
  "/practice/reading-commute",
  "/practice/reading-memory",
  "/practice/reading-garden",
  "/practice/listening-weekend",
  "/practice/listening-library",
  "/practice/listening-repair",
  "/practice/listening-flexible",
];

test("every Reading and Listening lesson loads cleanly on mobile", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of priorityLessonRoutes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main h1"), route).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }

  expect(runtimeErrors).toEqual([]);
});

test("core Reading and Listening loop works across browser engines", async ({
  page,
}) => {
  const state = freshState();
  await page.addInitScript((initial) => {
    localStorage.setItem("may-study-v1", JSON.stringify(initial));
    const violations: string[] = [];
    Object.defineProperty(window, "__mayCspViolations", {
      value: violations,
      configurable: true,
    });
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(`${event.violatedDirective}:${event.blockedURI}`);
    });
  }, state);

  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Một ngày mới, một bước tiến." }),
  ).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#fff8fb",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.goto("/practice/reading-cafe");
  for (const id of ["rc1", "rc2", "rc3", "rc4", "rc5"]) {
    const value = id === "rc1" ? missed(id) : key(id);
    await page.locator(`input[name="${id}"][value="${value}"]`).check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${id}"]`) })
      .getByRole("button", { name: id === "rc1" ? "Rất chắc" : "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".result-score")).toHaveText("4/5");
  await expect(
    page.getByRole("heading", { name: "Mình vừa học được gì?" }),
  ).toBeVisible();

  await page.goto("/practice/listening-weekend");
  await expect(
    page.getByRole("button", { name: "Phát bài nghe", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Bản chép lời", { exact: false })).toHaveCount(0);
  await expect(page.locator(".evidence-block")).toHaveCount(0);
  const questionNames = await page
    .locator('.question input[type="radio"]')
    .evaluateAll((inputs) => [
      ...new Set(inputs.map((input) => (input as HTMLInputElement).name)),
    ]);
  for (const name of questionNames) {
    await page.locator(`input[name="${name}"]`).first().check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${name}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mình vừa học được gì?" }),
  ).toBeVisible();
  await expect(page.getByText("Bản chép lời", { exact: false })).toBeVisible();
  await expect(page.locator(".evidence-block q").first()).toContainText(
    "Please meet at the bookshop opposite the main post office instead.",
  );
  await expect(
    page.getByRole("button", { name: "Nghe lại câu này" }).first(),
  ).toBeVisible();

  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản sao", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/may-backup.*\.json/);

  const cspViolations = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __mayCspViolations?: string[];
        }
      ).__mayCspViolations ?? [],
  );
  expect(cspViolations.filter((item) => item.startsWith("script-src"))).toEqual(
    [],
  );
  expect(runtimeErrors).toEqual([]);
});

test("the browser leaves room for a full notebook beside a year of study", async ({
  page,
}, testInfo) => {
  // The notes may take 1.5 MB of the saved profile and the study history about
  // 20 KB a month; the profile is one localStorage value, so the room that
  // matters is the browser's own. Measured here, not assumed: engines count
  // the quota differently, and the number is printed so it can be written down.
  await page.goto("/settings");
  const room = await page.evaluate(() => {
    const chunk = "x".repeat(100_000);
    const keys: string[] = [];
    try {
      for (let index = 0; index < 200; index++) {
        localStorage.setItem(`may-quota-probe-${index}`, chunk);
        keys.push(`may-quota-probe-${index}`);
      }
    } catch {
      // The browser's limit: what was written before this is what fits.
    }
    keys.forEach((name) => localStorage.removeItem(name));
    return keys.length * chunk.length;
  });
  console.log(`localStorage ${testInfo.project.name}: ${room} ký tự`);
  expect(room).toBeGreaterThan(NOTE_LIMITS.bytes + 400_000);
});

test("a note written after a lesson is kept and found again", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  const names = await page
    .locator(".question input[type=radio]")
    .evaluateAll((inputs) => [
      ...new Set(inputs.map((input) => (input as HTMLInputElement).name)),
    ]);
  for (const name of names) {
    await page.locator(`input[name="${name}"]`).first().check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${name}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  const first = page.locator(".question").first();
  await first.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await first
    .getByRole("textbox", { name: "Ghi chú của Gùa cho câu này" })
    .fill("Bẫy: từ đồng nghĩa ở đoạn hai");
  await expect(first.getByRole("status")).toHaveText("Đã lưu");
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Tìm trong ghi chú" })
    .fill("bay dong nghia");
  await expect(page.locator(".note-card")).toContainText("từ đồng nghĩa");
  await page.reload();
  await expect(page.locator(".note-card")).toContainText("đoạn hai");
});
