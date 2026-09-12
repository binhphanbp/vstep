import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";

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
  for (const [id, value] of Object.entries({
    rc1: 0,
    rc2: 2,
    rc3: 0,
    rc4: 3,
    rc5: 1,
  })) {
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
