import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { freshState, type StudyState } from "../../src/lib/learning";

const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8")) as {
  version: number;
  sections: { slots: { id: string; part: string }[] }[];
};
const task1 = paper.sections[2].slots[0];
const task2 = paper.sections[2].slots[1];

const essay =
  "Dear Jo, thanks for your email and I am sure you can make the team. You should practise every day and I could training with you on Saturday morning. Also you should eat lots of vegetables, fruit and rice to have energy before each long practice. Best wishes, Gua";

const criterion = (score: number, showScore: boolean) => ({
  score,
  low: score,
  high: score,
  runs: 3,
  unsure: false,
  band: "b2",
  evidence: ["You should practise every day"],
  whyNotHigher: "Ý chưa được phát triển bằng ví dụ.",
  whyNotLower: "Đủ các ý chính của đề.",
  toRaise: "Thêm một ví dụ cụ thể cho lời khuyên ăn uống.",
  showScore,
  validated: false,
});
function gradeBody(showScore: boolean, over: Record<string, unknown> = {}) {
  return {
    status: "graded",
    model: "gemini-3.8-flash",
    promptVersion: "p1",
    rubricVersion: "cefr-fallback-1",
    criteria: {
      task: criterion(6, showScore),
      organization: criterion(6, showScore),
      vocabulary: criterion(6, showScore),
      grammar: criterion(7, showScore),
    },
    taskScore: showScore ? 6.25 : null,
    rawTaskScore: 6.25,
    requirements: [
      { id: "r1", text: "suggest how Jo can prepare", met: "yes" },
      { id: "r2", text: "respond to practising together", met: "yes" },
      { id: "r3", text: "give some advice about what to eat", met: "partly" },
    ],
    errors: [
      {
        quote: "I could training with you",
        type: "grammar",
        correction: "I could train with you",
        explanation: "Sau could dùng động từ nguyên mẫu.",
      },
    ],
    errorsPer100: 2.1,
    droppedQuotes: 1,
    totalQuotes: 12,
    runs: 3,
    lowConfidence: false,
    summary: "Bài đủ ý, còn vài lỗi ngữ pháp.",
    measures: { words: 47 },
    ...over,
  };
}

const finishedRun = {
  id: "run-done",
  paperId: "132",
  version: paper.version,
  startedAt: 1,
  stage: 3,
  deadline: 2,
  material: 0,
  answers: {},
  essays: { [task1.id]: essay, [task2.id]: "x ".repeat(120) },
  spoken: [],
  mode: "practice",
  finishedAt: "2026-10-08T04:30:00.000Z",
};
async function seed(page: Page, extra: Record<string, unknown> = {}) {
  const state = {
    ...freshState(),
    paperRuns: [finishedRun],
    ...extra,
  } as unknown as StudyState;
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state);
}
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("may-study-v1")!));

async function serverIs(page: Page, available: boolean) {
  await page.route("**/api/grade/status", (route) =>
    route.fulfill({ json: { available } }),
  );
}
/** Records each grading request and answers with `reply`. */
async function grading(
  page: Page,
  reply: (route: Route) => Promise<void> | void,
) {
  const requests: {
    passcode: string | undefined;
    body: Record<string, unknown>;
  }[] = [];
  await page.route("**/api/grade/writing", async (route) => {
    const request = route.request();
    requests.push({
      passcode: request.headers()["x-grader-passcode"],
      body: JSON.parse(request.postData() ?? "{}"),
    });
    await reply(route);
  });
  return requests;
}
async function openTask1(page: Page) {
  await page.goto("/papers/132");
  const details = page
    .locator(".paper-review details")
    .filter({ hasText: "Bài viết của bạn" })
    .first();
  await details.locator("summary").first().click();
  return details;
}
const panel = (page: Page) =>
  page.getByRole("region", { name: "Chấm bằng AI" }).first();

test("nothing about AI grading shows while the server has it switched off", async ({
  page,
}) => {
  await serverIs(page, false);
  await seed(page);
  const details = await openTask1(page);
  await expect(details).toContainText("Bài viết của bạn");
  await expect(page.getByRole("heading", { name: "Chấm bằng AI" })).toHaveCount(
    0,
  );
  await page.goto("/settings");
  await expect(page.getByText("chưa bật chức năng này")).toBeVisible();
});

test("asks once for agreement and a passcode, sends the task and the writing, and shows the result without a score while the gates are closed", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  const requests = await grading(page, (route) =>
    route.fulfill({ json: { grade: gradeBody(false) } }),
  );
  await openTask1(page);
  await panel(page).getByRole("button", { name: "Chấm bài viết này" }).click();
  // Nothing is sent before she agrees.
  expect(requests).toHaveLength(0);
  const consent = panel(page).locator(".grade-consent");
  await expect(consent).toContainText("đề bài và bài viết này");
  await expect(consent).toContainText(
    "không dùng nội dung gửi lên để cải thiện sản phẩm",
  );
  await consent.getByLabel(/Mã chấm bài/).fill("open sesame");
  await consent.getByRole("button", { name: "Đồng ý và chấm" }).click();
  const result = panel(page).locator(".grade-result");
  await expect(result).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].passcode).toBe("open sesame");
  expect(requests[0].body).toMatchObject({
    task: 1,
    slotId: task1.id,
    text: essay,
  });
  expect(String(requests[0].body.prompt)).toContain("hockey");
  // Only the task and the writing went: no name, notes or other data.
  expect(Object.keys(requests[0].body).sort()).toEqual(
    ["prompt", "samples", "slotId", "task", "text"].sort(),
  );
  await expect(result).toContainText(
    "Điểm ước lượng theo thang VSTEP do AI chấm, không phải điểm chính thức.",
  );
  await expect(result).toContainText("chưa đối chiếu văn bản chính thức");
  await expect(result).toContainText("Chưa hiện điểm số");
  await expect(
    result.locator(".pill", { hasText: "chưa hiện điểm" }),
  ).toHaveCount(4);
  // No "n/10" mark anywhere (the date "8/10/2026" is not one).
  await expect(result).not.toContainText(/\d\/10(?![\d/])/);
  await expect(result).toContainText("mới nhắc qua");
  // The error is marked inside her own writing, and listed with its fix.
  await expect(result.locator("mark.grade-err")).toHaveText(
    "I could training with you1",
  );
  await expect(result.locator(".grade-errors")).toContainText(
    "I could train with you",
  );
  await expect(result).toContainText(
    "1 câu trích không có trong bài đã bị loại",
  );
  // Kept with her other data; the passcode and the agreement stay on the device.
  const state = await saved(page);
  expect(Object.keys(state.grades)).toEqual([`paper:run-done:${task1.id}`]);
  expect(JSON.stringify(state)).not.toContain("open sesame");
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.consent")),
  ).toBe("yes");
  // Back on the page later: shown again from storage, with no new request.
  await page.reload();
  await page
    .locator(".paper-review details")
    .filter({ hasText: "Bài viết của bạn" })
    .first()
    .locator("summary")
    .first()
    .click();
  await expect(panel(page).locator(".grade-result")).toContainText(
    "Chưa hiện điểm số",
  );
  expect(requests).toHaveLength(1);
  // Asking again needs no second agreement.
  await panel(page).getByRole("button", { name: "Chấm lại" }).click();
  await expect(panel(page).locator(".grade-consent")).toHaveCount(0);
  await expect.poll(() => requests.length).toBe(2);
});

test("shows the numbers only when the grade says the criteria may show", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  await grading(page, (route) =>
    route.fulfill({
      json: { grade: gradeBody(true, { lowConfidence: true }) },
    }),
  );
  await openTask1(page);
  await panel(page).getByRole("button", { name: "Chấm bài viết này" }).click();
  const result = panel(page).locator(".grade-result");
  await expect(result).toContainText("Điểm bài (ước lượng): 6,25/10");
  await expect(result).toContainText("Bậc 4 (B2)");
  // Shown, but never passed off as checked: a note and a label on every score.
  await expect(result.getByRole("note").first()).toContainText(
    "chưa được so với điểm của người chấm",
  );
  await expect(result.locator(".pill", { hasText: "6/10" })).toHaveCount(3);
  await expect(result.locator(".pill", { hasText: "7/10" })).toHaveCount(1);
  await expect(result).toContainText("độ tin cậy thấp");
});

test("says what went wrong in plain words and keeps the writing", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "wrong code");
  });
  let attempt = 0;
  await grading(page, async (route) => {
    attempt++;
    if (attempt === 1)
      return route.fulfill({ status: 401, json: { error: "passcode" } });
    if (attempt === 2)
      return route.fulfill({
        status: 429,
        json: { error: "rate", retryAfter: 42 },
      });
    if (attempt === 3)
      return route.fulfill({ status: 502, json: { error: "model" } });
    if (attempt === 4) return route.abort();
    if (attempt === 5)
      return route.fulfill({
        json: { grade: { status: "blocked", reason: "too-short" } },
      });
    return route.fulfill({ status: 200, body: "not json" });
  });
  await openTask1(page);
  const ask = () =>
    panel(page).getByRole("button", { name: "Chấm bài viết này" });
  await ask().click();
  // A wrong code is forgotten, so she is asked for it again rather than failing in a loop.
  await expect(panel(page).getByRole("alert")).toContainText(
    "Mã chấm bài chưa đúng",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.passcode")),
  ).toBeNull();
  await ask().click();
  await panel(page)
    .locator(".grade-consent")
    .getByLabel(/Mã chấm bài/)
    .fill("right code");
  await panel(page).getByRole("button", { name: "Đồng ý và chấm" }).click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Thử lại sau 42 giây",
  );
  await ask().click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Dịch vụ chấm đang gặp lỗi",
  );
  await ask().click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Không kết nối được",
  );
  // Every error says what happened, in a line she can read out.
  await expect(panel(page).locator(".grade-detail")).toContainText(
    "Chi tiết kỹ thuật",
  );
  await ask().click();
  await expect(
    panel(page).getByRole("status").filter({ hasText: "ngắn hơn 20 từ" }),
  ).toBeVisible();
  await ask().click();
  await expect(panel(page).getByRole("alert")).toContainText("không đọc được");
  // Nothing was saved and the essay is untouched.
  const state = await saved(page);
  expect(state.grades).toBeUndefined();
  expect(state.paperRuns[0].essays[task1.id]).toBe(essay);
});

test("can be stopped while it works", async ({ page }) => {
  await serverIs(page, true);
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  await grading(page, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 60_000)).catch(() => {});
    await route.abort().catch(() => {});
  });
  await openTask1(page);
  await panel(page).getByRole("button", { name: "Chấm bài viết này" }).click();
  await expect(panel(page).locator(".grade-wait")).toContainText("Đang chấm");
  await expect(
    panel(page).getByRole("button", { name: "Đang chấm…" }),
  ).toBeDisabled();
  await panel(page).getByRole("button", { name: "Dừng" }).click();
  await expect(panel(page).getByRole("alert")).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", { name: "Chấm bài viết này" }),
  ).toBeEnabled();
});

test("grades Task 2 too, and then works out the Writing mark from both tasks", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  const requests = await grading(page, (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    return route.fulfill({
      json: {
        grade: gradeBody(true, { taskScore: body.task === 1 ? 6 : 7 }),
      },
    });
  });
  await page.goto("/papers/132");
  const details = page
    .locator(".paper-review details")
    .filter({ hasText: "Bài viết của bạn" });
  // No Writing mark until both tasks are graded.
  await expect(page.locator("#writing-total")).toHaveCount(0);
  await details.nth(0).locator("summary").first().click();
  await details
    .nth(0)
    .getByRole("button", { name: "Chấm bài viết này" })
    .click();
  await expect(details.nth(0).locator(".grade-result")).toBeVisible();
  await expect(page.locator("#writing-total")).toHaveCount(0);
  await details.nth(1).locator("summary").first().click();
  await details
    .nth(1)
    .getByRole("button", { name: "Chấm bài viết này" })
    .click();
  await expect(details.nth(1).locator(".grade-result")).toBeVisible();
  expect(requests.map((r) => r.body.task)).toEqual([1, 2]);
  // (6 + 2 × 7) / 3 = 6,67 → 6,5
  const total = page.getByRole("region", { name: /Điểm Viết của lượt này/ });
  await expect(total).toContainText("6,5/10");
  await expect(total).toContainText("Bài 1 chiếm 1/3 (6)");
  await expect(total).toContainText("Bài 2 chiếm 2/3 (7)");
  await expect(total).toContainText("chưa được so với điểm của người chấm");
});

test("warns when the writing is not what was graded", async ({ page }) => {
  await serverIs(page, true);
  await seed(page, {
    grades: {
      [`paper:run-done:${task1.id}`]: {
        id: `paper:run-done:${task1.id}`,
        at: "2026-10-08T05:00:00.000Z",
        inputHash: "0".repeat(64),
        grade: gradeBody(false),
      },
    },
  });
  await openTask1(page);
  await expect(panel(page)).toContainText(
    "Bài viết đã thay đổi sau lần chấm này",
  );
  // An old grade is still shown when the server has switched grading off.
  await page.unroute("**/api/grade/status");
  await serverIs(page, false);
  await page.reload();
  await page
    .locator(".paper-review details")
    .filter({ hasText: "Bài viết của bạn" })
    .first()
    .locator("summary")
    .first()
    .click();
  await expect(panel(page).locator(".grade-result")).toBeVisible();
});

test("Settings: agreement, passcode and saved grades are in the owner's hands", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page, {
    grades: {
      [`paper:run-done:${task1.id}`]: {
        id: `paper:run-done:${task1.id}`,
        at: "2026-10-08T05:00:00.000Z",
        inputHash: "0".repeat(64),
        grade: gradeBody(false),
      },
    },
  });
  await page.goto("/settings");
  const section = page.getByRole("region", { name: "Chấm bài bằng AI" });
  await expect(section).toContainText("đã bật chức năng này");
  await expect(section).toContainText(
    "File báo lỗi không bao giờ chứa bài viết",
  );
  const consent = section.getByLabel(
    "Cho phép gửi bài viết tới Google để chấm khi mình bấm nút",
  );
  await expect(consent).not.toBeChecked();
  await consent.check();
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.consent")),
  ).toBe("yes");
  await section.getByLabel(/Mã chấm bài/).fill("open sesame");
  await section.getByRole("button", { name: "Lưu mã" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.passcode")),
  ).toBe("open sesame");
  await section.getByRole("button", { name: "Xóa mã" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.passcode")),
  ).toBeNull();
  await consent.uncheck();
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.consent")),
  ).toBeNull();
  // The saved grades are counted, and can be cleared without touching the writing.
  await expect(page.getByText("1 lần chấm", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await section
    .getByRole("button", { name: /Xóa các lần chấm đã lưu \(1\)/ })
    .click();
  await expect.poll(async () => (await saved(page)).grades).toBeUndefined();
  expect((await saved(page)).paperRuns[0].essays[task1.id]).toBe(essay);
});

test("the grading panel and the Settings card pass the accessibility checks", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page, {
    grades: {
      [`paper:run-done:${task1.id}`]: {
        id: `paper:run-done:${task1.id}`,
        at: "2026-10-08T05:00:00.000Z",
        inputHash: "0".repeat(64),
        grade: gradeBody(true, { lowConfidence: true }),
      },
    },
  });
  await openTask1(page);
  await expect(panel(page).locator(".grade-result")).toBeVisible();
  await panel(page).getByRole("button", { name: "Chấm lại" }).click();
  await expect(panel(page).locator(".grade-consent")).toBeVisible();
  for (const route of ["review", "settings"]) {
    if (route === "settings") await page.goto("/settings");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      route,
    ).toEqual([]);
  }
});

test("the real server says grading is off, and refuses a request, when it has no key", async ({
  request,
}) => {
  test.skip(
    Boolean(process.env.GEMINI_API_KEY || process.env.GRADER_PASSCODE),
    "this machine has grading configured",
  );
  const status = await request.get("/api/grade/status");
  expect(status.status()).toBe(200);
  expect(status.headers()["cache-control"]).toContain("no-store");
  expect(await status.json()).toEqual({ available: false });
  const refused = await request.post("/api/grade/writing", {
    headers: { "x-grader-passcode": "anything" },
    data: { task: 1, slotId: task1.id, prompt: "Write an email.", text: essay },
  });
  expect(refused.status()).toBe(503);
  expect(await refused.json()).toEqual({ error: "not-configured" });
  // Only POST is allowed.
  expect((await request.get("/api/grade/writing")).status()).toBe(405);
});

test("looks alive while it works: a moving clock, a bar, and what it is doing", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  await grading(page, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: [
        { type: "progress", stage: "started" },
        { type: "progress", stage: "runs", done: 0, total: 3 },
        { type: "progress", stage: "runs", done: 3, total: 3 },
        { type: "grade", grade: gradeBody(false) },
      ]
        .map((event) => JSON.stringify(event))
        .join("\n"),
    });
  });
  await openTask1(page);
  await panel(page).getByRole("button", { name: "Chấm bài viết này" }).click();
  const wait = panel(page).locator(".grade-wait");
  await expect(wait).toBeVisible();
  await expect(wait.locator(".grade-spinner")).toBeVisible();
  await expect(wait.getByRole("status")).toContainText("đang chờ máy chủ");
  // Nothing known yet: a bar that slides (no value), never a frozen one.
  expect(await wait.locator("progress").getAttribute("value")).toBeNull();
  await expect(wait).toContainText("Thường mất một đến ba phút");
  // The clock moves.
  await expect(wait.locator(".grade-clock")).not.toHaveText("0:00");
  // The answer is read from the stream and shown.
  await expect(panel(page).locator(".grade-result")).toBeVisible({
    timeout: 15_000,
  });
  await expect(wait).toHaveCount(0);
  expect(Object.keys((await saved(page)).grades)).toEqual([
    `paper:run-done:${task1.id}`,
  ]);
});

test("says why it failed, with a technical line, when the answer cannot be read or the stream breaks", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  const lines = (...events: object[]) => ({
    contentType: "application/x-ndjson",
    body: events.map((event) => JSON.stringify(event)).join("\n"),
  });
  let attempt = 0;
  await grading(page, (route) => {
    attempt++;
    // The connection ends before any result.
    if (attempt === 1)
      return route.fulfill(lines({ type: "progress", stage: "started" }));
    // The server reports a failure inside the stream.
    if (attempt === 2)
      return route.fulfill(
        lines(
          { type: "progress", stage: "started" },
          { type: "error", error: "model" },
        ),
      );
    // A grade arrives that this device cannot store.
    if (attempt === 3)
      return route.fulfill(
        lines({ type: "grade", grade: { status: "graded" } }),
      );
    // A gateway answers with a page instead of JSON.
    return route.fulfill({
      status: 504,
      contentType: "text/html",
      body: "<html>timeout</html>",
    });
  });
  await openTask1(page);
  const ask = () =>
    panel(page).getByRole("button", { name: "Chấm bài viết này" });
  const alert = () => panel(page).getByRole("alert");
  await ask().click();
  await expect(alert()).toContainText("Không kết nối được");
  await expect(alert()).toContainText("kết nối đứt trước khi có kết quả");
  await ask().click();
  await expect(alert()).toContainText("Dịch vụ chấm đang gặp lỗi");
  await ask().click();
  await expect(alert()).toContainText("Có lỗi khi xử lý kết quả trên máy này");
  await expect(alert()).toContainText("TypeError");
  await ask().click();
  await expect(alert()).toContainText("Dịch vụ chấm đang gặp lỗi");
  await expect(alert()).toContainText("HTTP 504");
  expect((await saved(page)).grades).toBeUndefined();
});

test("the content of a review is not pressed against its edges", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  const details = await openTask1(page);
  const box = await details.boundingBox();
  const label = await details
    .getByRole("heading", { name: "Bài viết của bạn" })
    .boundingBox();
  const grade = await panel(page).boundingBox();
  expect(label!.x - box!.x).toBeGreaterThanOrEqual(12);
  expect(grade!.x - box!.x).toBeGreaterThanOrEqual(12);
  expect(
    box!.x + box!.width - (grade!.x + grade!.width),
  ).toBeGreaterThanOrEqual(12);
});

test("a Writing lesson can be graded after it is filed, with the lesson's own points", async ({
  page,
}) => {
  await serverIs(page, true);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  const requests = await grading(page, (route) =>
    route.fulfill({ json: { grade: gradeBody(true) } }),
  );
  await page.goto("/practice/writing-email");
  // Nothing to grade before the lesson is filed.
  await expect(page.getByRole("region", { name: "Chấm bằng AI" })).toHaveCount(
    0,
  );
  await page.getByRole("textbox", { name: "Bài viết của bạn" }).fill(essay);
  for (const row of await page.locator(".self-check .criteria-list li").all())
    await row.getByRole("button", { name: "Tạm ổn" }).click();
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  const grade = page.getByRole("region", { name: "Chấm bằng AI" });
  await grade.getByRole("button", { name: "Chấm bài viết này" }).click();
  const result = grade.locator(".grade-result");
  await expect(result).toContainText("Điểm bài (ước lượng): 6,25/10");
  await expect(result.getByRole("note").first()).toContainText(
    "chưa được so với điểm của người chấm",
  );
  expect(requests).toHaveLength(1);
  expect(requests[0].body).toMatchObject({
    task: 1,
    slotId: "writing-email",
    text: essay,
  });
  const state = await saved(page);
  expect(Object.keys(state.grades)).toHaveLength(1);
  expect(Object.keys(state.grades)[0]).toMatch(/^attempt:/);
});

test("a mock sitting's two essays can be graded when it ends, and the Writing mark follows", async ({
  page,
}) => {
  await serverIs(page, true);
  await page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });
  const requests = await grading(page, (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    return route.fulfill({
      json: { grade: gradeBody(true, { taskScore: body.task === 1 ? 6 : 7 }) },
    });
  });
  const essay2 =
    "Some people think that learning online is better than learning in a classroom, while others disagree. In my opinion both ways have clear strengths. Online classes save travel time and let students repeat lessons as often as they need. However, a classroom gives learners real conversation and a teacher who can see who is confused. For example, my English speaking improved faster when I could talk with classmates every day. Therefore I believe the best choice is a mix of both.";
  page.on("dialog", (d) => d.accept());
  await page.goto("/exam");
  await page.getByRole("button", { name: "Đề 01 · 172 phút" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu 172 phút của mình" }).click();
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page.getByLabel("Bài viết trong phòng thi").fill(essay);
  await page.getByLabel("Chọn bài viết").selectOption("1");
  await page.getByLabel("Bài viết trong phòng thi").fill(essay2);
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await page
    .getByRole("button", { name: "Kết thúc buổi luyện", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Buổi luyện đã khép lại." }),
  ).toBeVisible();
  const panels = page.getByRole("region", { name: "Chấm bằng AI" });
  await expect(panels).toHaveCount(2);
  await expect(page.locator("#writing-total")).toHaveCount(0);
  await panels
    .nth(0)
    .getByRole("button", { name: "Chấm bài viết này" })
    .click();
  await expect(panels.nth(0).locator(".grade-result")).toBeVisible();
  await panels
    .nth(1)
    .getByRole("button", { name: "Chấm bài viết này" })
    .click();
  await expect(panels.nth(1).locator(".grade-result")).toBeVisible();
  expect(requests.map((r) => r.body.task)).toEqual([1, 2]);
  expect(requests[0].body.text).toBe(essay);
  expect(requests[1].body.text).toBe(essay2);
  // (6 + 2 × 7) / 3 = 6,67 → 6,5
  await expect(
    page.getByRole("region", { name: /Điểm Viết của lượt này/ }),
  ).toContainText("6,5/10");
  const state = await saved(page);
  expect(
    Object.keys(state.grades).every((k) => k.startsWith("attempt:exam:")),
  ).toBe(true);
  // Starting a new sitting does not take the grades away with it.
  await page.getByRole("button", { name: "Chuẩn bị lượt mới" }).click();
  expect(Object.keys((await saved(page)).grades)).toHaveLength(2);
});

test("the progress page charts the AI's marks, says they are estimates, and has a table", async ({
  page,
}) => {
  const grade = (id: string, at: string, over: Record<string, unknown>) => ({
    id,
    at,
    inputHash: "h",
    grade: gradeBody(true, over),
  });
  const speaking = {
    id: "paper:run-done:speaking",
    at: "2026-10-08T09:00:00.000Z",
    inputHash: "h",
    grade: {
      status: "graded",
      model: "gemini-3.8-flash",
      promptVersion: "p1",
      rubricVersion: "cefr-fallback-1",
      parts: [],
      criteria: {},
      speakingScore: 5.5,
      rawSpeakingScore: 5.5,
      droppedQuotes: 0,
      totalQuotes: 0,
      runs: 3,
      lowConfidence: false,
      summary: "x",
    },
  };
  await seed(page, {
    grades: {
      [`paper:run-done:${task1.id}`]: grade(
        `paper:run-done:${task1.id}`,
        "2026-10-06T09:00:00.000Z",
        { taskScore: 5 },
      ),
      [`paper:run-done:${task2.id}`]: grade(
        `paper:run-done:${task2.id}`,
        "2026-10-07T09:00:00.000Z",
        { taskScore: 6.5 },
      ),
      "paper:run-done:speaking": speaking,
    },
  });
  await page.goto("/progress");
  const section = page.getByRole("region", {
    name: /Điểm AI ước lượng theo thời gian/,
  });
  await expect(section).toBeVisible();
  const chart = section.getByRole("img");
  await expect(chart).toHaveAttribute("aria-label", /Viết 06\/10 5\/10/);
  await expect(chart).toHaveAttribute("aria-label", /Nói 08\/10 5,5\/10/);
  await expect(chart.locator(".trend-mark")).toHaveCount(3);
  await expect(chart.locator("polyline.writing")).toHaveCount(1);
  // One Speaking mark makes no line: a line needs two points.
  await expect(chart.locator("polyline.speaking")).toHaveCount(0);
  await expect(section).toContainText("chưa được so với điểm của người chấm");
  await section.getByText("Xem dạng bảng").click();
  const rows = section.locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("08/10");
  await expect(rows.first()).toContainText("Nói");
  await expect(rows.first()).toContainText("5,5/10");
  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("the progress page shows no chart before anything is graded", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Nhịp học 7 ngày gần nhất" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Điểm AI ước lượng theo thời gian/ }),
  ).toHaveCount(0);
});
