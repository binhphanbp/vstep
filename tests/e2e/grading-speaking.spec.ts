import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { freshState, type StudyState } from "../../src/lib/learning";

const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8")) as {
  version: number;
  sections: { slots: { id: string; part: string }[] }[];
};
const parts = paper.sections[3].slots;

const criterion = (score: number, showScore: boolean) => ({
  score,
  low: score,
  high: score,
  runs: 3,
  unsure: false,
  band: "b2",
  evidence: ["a quiet city"],
  whyNotHigher: "Còn ngập ngừng khi nói dài.",
  whyNotLower: "Trả lời đúng các câu hỏi.",
  toRaise: "Nói liền mạch hơn ở phần hai.",
  showScore,
  validated: false,
});
function gradeBody(showScore: boolean, over: Record<string, unknown> = {}) {
  const fluency = {
    spokenSeconds: 40,
    words: 35,
    wordsPerMinute: 52,
    pausesPerMinute: 6.5,
    longPausesPerMinute: 1,
    meanRun: 5,
    fillers: 2,
    repeats: 0,
  };
  return {
    status: "graded",
    model: "gemini-3.8-flash",
    promptVersion: "p1",
    rubricVersion: "cefr-fallback-1",
    parts: parts.map((part, i) => ({
      id: part.id,
      transcript: `I am from Hue and it is a quiet city number ${i + 1}.`,
      fluency,
      timesPlausible: true,
    })),
    criteria: {
      grammar: criterion(6, showScore),
      vocabulary: criterion(6, showScore),
      pronunciation: criterion(7, showScore),
      fluency: criterion(6, showScore),
      discourse: criterion(7, showScore),
    },
    speakingScore: showScore ? 6.5 : null,
    rawSpeakingScore: 6.5,
    droppedQuotes: 0,
    totalQuotes: 9,
    runs: 3,
    lowConfidence: false,
    summary: "Trả lời đủ ý, còn ngập ngừng.",
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
  essays: {},
  spoken: parts.map((part) => part.id),
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

/** Puts a decodable WAV of silence into the recordings store, as the recorder would. */
async function putRecordings(
  page: Page,
  which: { slot: string; seconds: number; savedAt?: number }[],
) {
  await page.goto("/settings");
  await page.evaluate(
    async ({ items, run }) => {
      const wav = (seconds: number) => {
        const rate = 8000;
        const samples = Math.round(seconds * rate);
        const bytes = new Uint8Array(44 + samples * 2);
        const view = new DataView(bytes.buffer);
        const text = (at: number, value: string) =>
          [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
        text(0, "RIFF");
        view.setUint32(4, 36 + samples * 2, true);
        text(8, "WAVEfmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, rate, true);
        view.setUint32(28, rate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        text(36, "data");
        view.setUint32(40, samples * 2, true);
        return bytes;
      };
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open("may-recordings", 1);
        open.onupgradeneeded = () =>
          open.result.createObjectStore("recordings");
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction("recordings", "readwrite");
        for (const item of items)
          tx.objectStore("recordings").put(
            {
              blob: new Blob([wav(item.seconds)], { type: "audio/wav" }),
              savedAt: item.savedAt ?? 1_700_000_000_000,
            },
            `paper-${run}-${item.slot}`,
          );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      database.close();
    },
    { items: which, run: finishedRun.id },
  );
}
const allThree = () => parts.map((part) => ({ slot: part.id, seconds: 2 }));

async function serverIs(page: Page, available: boolean) {
  await page.route("**/api/grade/status", (route) =>
    route.fulfill({ json: { available } }),
  );
}
async function grading(
  page: Page,
  reply: (route: Route) => Promise<void> | void,
) {
  const requests: { passcode: string | undefined; body: string }[] = [];
  await page.route("**/api/grade/speaking", async (route) => {
    const request = route.request();
    requests.push({
      passcode: request.headers()["x-grader-passcode"],
      body: (request.postDataBuffer() ?? Buffer.alloc(0)).toString("latin1"),
    });
    await reply(route);
  });
  return requests;
}
async function openSpeaking(page: Page) {
  await page.goto("/papers/132");
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
}
const panel = (page: Page) =>
  page.getByRole("region", { name: "Chấm phần Nói bằng AI" });
const agreed = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "open sesame");
  });

test("new recordings are made at 32 kbps, so a whole test fits in one request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const options: unknown[] = [];
    (window as unknown as { __options: unknown[] }).__options = options;
    const Real = window.MediaRecorder;
    window.MediaRecorder = class extends Real {
      constructor(stream: MediaStream, init?: MediaRecorderOptions) {
        super(stream, init);
        options.push(init ?? null);
      }
    };
  });
  await page.goto("/practice/speaking-social");
  await page
    .getByRole("button", { name: "Bắt đầu ghi âm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dừng ghi âm", exact: true }),
  ).toBeVisible();
  const options = await page.evaluate(
    () => (window as unknown as { __options: unknown[] }).__options,
  );
  expect(options).toHaveLength(1);
  expect(options[0]).toMatchObject({ audioBitsPerSecond: 32000 });
});

test("nothing shows while the server has grading switched off", async ({
  page,
}) => {
  await serverIs(page, false);
  await seed(page);
  await putRecordings(page, allThree());
  await openSpeaking(page);
  await expect(
    page.getByRole("heading", { name: /Chấm phần Nói/ }),
  ).toHaveCount(0);
});

test("sends every recording as one form after agreement, and shows the transcript without a score while the gates are closed", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await putRecordings(page, allThree());
  const requests = await grading(page, (route) =>
    route.fulfill({ json: { grade: gradeBody(false) } }),
  );
  await openSpeaking(page);
  await panel(page).getByRole("button", { name: "Chấm phần Nói" }).click();
  expect(requests).toHaveLength(0);
  const consent = panel(page).locator(".grade-consent");
  await expect(consent).toContainText("bản ghi âm phần Nói của lượt này");
  await consent.getByLabel(/Mã chấm bài/).fill("open sesame");
  await consent.getByRole("button", { name: "Đồng ý và chấm" }).click();
  const result = panel(page).locator(".grade-result");
  await expect(result).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].passcode).toBe("open sesame");
  const body = requests[0].body;
  expect(body).toContain('name="meta"');
  for (const i of [0, 1, 2]) expect(body).toContain(`name="audio${i}"`);
  expect(body).not.toContain('name="audio3"');
  const meta = JSON.parse(body.match(/\{"parts":[\s\S]*?\}\]\}/)![0]);
  expect(meta.parts.map((p: { id: string }) => p.id)).toEqual(
    parts.map((p) => p.id),
  );
  for (const p of meta.parts) {
    expect(p.durationSeconds).toBeCloseTo(2, 0);
    expect(p.prompt.length).toBeGreaterThan(20);
  }
  await expect(result).toContainText(
    "Điểm ước lượng theo thang VSTEP do AI chấm",
  );
  await expect(result).toContainText("Chưa hiện điểm số");
  await expect(
    result.locator(".pill", { hasText: "chưa hiện điểm" }),
  ).toHaveCount(5);
  await expect(result).not.toContainText(/\d\/10(?![\d/])/);
  const first = result
    .locator("details")
    .filter({ hasText: parts[0].part })
    .first();
  await first.locator("summary").click();
  await expect(first).toContainText("a quiet city number 1");
  await expect(first).toContainText("khoảng 52 từ mỗi phút");
  const state = await saved(page);
  expect(Object.keys(state.grades)).toEqual(["paper:run-done:speaking"]);
  expect(JSON.stringify(state)).not.toContain("open sesame");
  // Shown again from storage with no new request; asking again needs no new agreement.
  await page.reload();
  await expect(panel(page).locator(".grade-result")).toContainText(
    "Chưa hiện điểm số",
  );
  expect(requests).toHaveLength(1);
  await panel(page).getByRole("button", { name: "Chấm lại phần Nói" }).click();
  await expect(panel(page).locator(".grade-consent")).toHaveCount(0);
  await expect.poll(() => requests.length).toBe(2);
});

test("shows the Speaking score, with how it is worked out, only when the grade says the criteria may show", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await agreed(page);
  await putRecordings(page, allThree());
  await grading(page, (route) =>
    route.fulfill({
      json: { grade: gradeBody(true, { lowConfidence: true }) },
    }),
  );
  await openSpeaking(page);
  await panel(page).getByRole("button", { name: "Chấm phần Nói" }).click();
  const result = panel(page).locator(".grade-result");
  await expect(result).toContainText("Điểm Nói (ước lượng): 6,5/10");
  await expect(result).toContainText("Bậc 4 (B2)");
  await expect(result).toContainText("trung bình năm tiêu chí");
  await expect(result).toContainText("độ tin cậy thấp");
  await expect(result.locator(".pill", { hasText: "6/10" })).toHaveCount(3);
  await expect(result.locator(".pill", { hasText: "7/10" })).toHaveCount(2);
  await expect(result.getByRole("note").first()).toContainText(
    "chỉ là ước lượng",
  );
});

test("says what is wrong with the recordings before sending anything", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await agreed(page);
  const requests = await grading(page, (route) =>
    route.fulfill({ json: { grade: gradeBody(false) } }),
  );
  // One part has no recording on this device.
  await putRecordings(page, allThree().slice(0, 2));
  await openSpeaking(page);
  await panel(page).getByRole("button", { name: "Chấm phần Nói" }).click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Không tìm thấy bản ghi",
  );
  await expect(panel(page).getByRole("alert")).toContainText(parts[2].part);
  // Recordings made before the lower bitrate can be too big for one request.
  await putRecordings(page, [
    { slot: parts[0].id, seconds: 150 },
    { slot: parts[1].id, seconds: 150 },
    { slot: parts[2].id, seconds: 2 },
  ]);
  await openSpeaking(page);
  await panel(page).getByRole("button", { name: "Chấm phần Nói" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("quá giới hạn");
  await expect(panel(page).getByRole("alert")).toContainText("ghi lại");
  expect(requests).toHaveLength(0);
  expect((await saved(page)).grades).toBeUndefined();
});

test("says what went wrong in plain words, forgets a wrong passcode, and can be stopped", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page);
  await agreed(page);
  await putRecordings(page, allThree());
  let attempt = 0;
  await grading(page, async (route) => {
    attempt++;
    if (attempt === 1)
      return route.fulfill({ status: 401, json: { error: "passcode" } });
    if (attempt === 2)
      return route.fulfill({ status: 413, json: { error: "too-large" } });
    if (attempt === 3)
      return route.fulfill({
        status: 415,
        json: { error: "unsupported-audio" },
      });
    if (attempt === 4)
      return route.fulfill({
        json: { grade: { status: "blocked", reason: "silent", words: 0 } },
      });
    if (attempt === 5) return route.abort();
    await new Promise((resolve) => setTimeout(resolve, 60_000)).catch(() => {});
    await route.abort().catch(() => {});
  });
  await openSpeaking(page);
  const ask = () => panel(page).getByRole("button", { name: "Chấm phần Nói" });
  await ask().click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Mã chấm bài chưa đúng",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("may.ai.passcode")),
  ).toBeNull();
  // Asked for again: the consent box takes the code and sends.
  await ask().click();
  await panel(page)
    .locator(".grade-consent")
    .getByLabel(/Mã chấm bài/)
    .fill("open sesame");
  await panel(page).getByRole("button", { name: "Đồng ý và chấm" }).click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "quá mức cho phép",
  );
  await ask().click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "định dạng mà dịch vụ chấm chưa đọc được",
  );
  await ask().click();
  await expect(
    panel(page)
      .getByRole("status")
      .filter({ hasText: "Hầu như không nghe thấy" }),
  ).toBeVisible();
  await ask().click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Không kết nối được",
  );
  await ask().click();
  await expect(panel(page).locator(".grade-wait")).toContainText("Đang chấm");
  await expect(panel(page).locator(".grade-wait")).toContainText("bản ghi");
  await expect(
    panel(page).getByRole("button", { name: "Đang chấm…" }),
  ).toBeDisabled();
  await panel(page).getByRole("button", { name: "Dừng" }).click();
  await expect(panel(page).getByRole("alert")).toHaveCount(0);
  await expect(ask()).toBeEnabled();
  expect((await saved(page)).grades).toBeUndefined();
});

test("warns when the speaking was recorded again after the grade", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page, {
    grades: {
      "paper:run-done:speaking": {
        id: "paper:run-done:speaking",
        at: "2026-10-08T05:00:00.000Z",
        inputHash: "0".repeat(64),
        grade: gradeBody(false),
      },
    },
  });
  await putRecordings(page, allThree());
  await openSpeaking(page);
  await expect(panel(page)).toContainText(
    "Bản ghi đã được ghi lại sau lần chấm này",
  );
});

test("the Speaking grading panel passes the accessibility checks", async ({
  page,
}) => {
  await serverIs(page, true);
  await seed(page, {
    grades: {
      "paper:run-done:speaking": {
        id: "paper:run-done:speaking",
        at: "2026-10-08T05:00:00.000Z",
        inputHash: "0".repeat(64),
        grade: gradeBody(true, { lowConfidence: true }),
      },
    },
  });
  await putRecordings(page, allThree());
  await openSpeaking(page);
  await expect(panel(page).locator(".grade-result")).toBeVisible();
  await panel(page).getByRole("button", { name: "Chấm lại phần Nói" }).click();
  await expect(panel(page).locator(".grade-consent")).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("the real server refuses a Speaking request when it has no key", async ({
  request,
}) => {
  test.skip(
    Boolean(process.env.GEMINI_API_KEY || process.env.GRADER_PASSCODE),
    "this machine has grading configured",
  );
  const refused = await request.post("/api/grade/speaking", {
    headers: { "x-grader-passcode": "anything" },
    multipart: { meta: "{}" },
  });
  expect(refused.status()).toBe(503);
  expect(await refused.json()).toEqual({ error: "not-configured" });
  expect((await request.get("/api/grade/speaking")).status()).toBe(405);
});
