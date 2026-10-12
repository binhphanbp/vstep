import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { freshState } from "../../src/lib/learning";
import { lessons } from "../../src/lib/content";

/**
 * The rules checked here are every set axe ships for WCAG 2.0 to 2.2 A/AA plus
 * its best practices (landmarks that can be told apart, heading levels that
 * only step down one at a time), on a page with every <details> opened so the
 * hidden half of a review is checked too, and in the states a learner actually
 * reaches: answered, filed, flipped, writing, finishing a sitting.
 */
const RULES = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
async function expectAccessible(page: Page, label: string) {
  await page.evaluate(() =>
    document
      .querySelectorAll("details")
      .forEach((d) => d.setAttribute("open", "")),
  );
  await page.waitForTimeout(150);
  const result = await new AxeBuilder({ page }).withTags(RULES).analyze();
  expect(
    result.violations.map((v) => ({
      rule: v.id,
      first: `${v.nodes[0].target.join(" ")} | ${v.nodes[0].html.slice(0, 90)}`,
    })),
    label,
  ).toEqual([]);
}

const q = (id: string) =>
  lessons.flatMap((l) => l.questions).find((x) => x.id === id)!;
test("every state of a study session is accessible", async ({ page }) => {
  test.setTimeout(900000);
  await page.setViewportSize({ width: 1280, height: 720 });
  page.on("dialog", (d) => d.accept());
  // Reading with answers + result
  await page.goto("/practice/reading-garden");
  await expectAccessible(page, "reading before answers");
  for (const id of ["rg1", "rg2", "rg3", "rg4", "rg5"]) {
    const miss = ["rg1", "rg2"].includes(id);
    await page
      .locator(
        `input[name="${id}"][value="${miss ? (q(id).answer + 1) % 4 : q(id).answer}"]`,
      )
      .check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${id}"]`) })
      .getByRole("button", { name: miss ? "Rất chắc" : "Chưa chắc" })
      .click();
  }
  await expectAccessible(page, "reading answered");
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await page.waitForTimeout(400);
  await expectAccessible(page, "reading result");
  // Listening result
  await page.goto("/practice/listening-weekend");
  for (const id of ["lw1", "lw2", "lw3", "lw4"]) {
    await page
      .locator(`input[name="${id}"][value="${(q(id).answer + 1) % 4}"]`)
      .check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${id}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await page.waitForTimeout(400);
  await expectAccessible(page, "listening result");
  // Writing: typed + self-check + result
  await page.goto("/practice/writing-email");
  await page
    .getByRole("textbox", { name: "Bài viết của bạn" })
    .fill(
      "Dear Alex, I am really happy to hear that you are visiting my city next month. We could visit the book street together and eat some local food.",
    );
  await expectAccessible(page, "writing typed");
  for (const row of await page.locator(".self-check .criteria-list li").all())
    await row.getByRole("button", { name: "Tạm ổn" }).click();
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await page.waitForTimeout(400);
  await expectAccessible(page, "writing result");
  // Speaking: recorded + result
  await page.goto("/practice/speaking-social");
  await page
    .getByRole("button", { name: "Bắt đầu ghi âm", exact: true })
    .click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Dừng ghi âm", exact: true }).click();
  await page.getByRole("link", { name: "Tải bản ghi", exact: true }).waitFor();
  await expectAccessible(page, "speaking recorded");
  for (const row of await page.locator(".self-check .criteria-list li").all())
    await row.getByRole("button", { name: "Tạm ổn" }).click();
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await page.waitForTimeout(400);
  await expectAccessible(page, "speaking result");
  // Pages with data
  for (const [label, path] of [
    ["home with data", "/"],
    ["mistakes with data", "/mistakes"],
    ["progress with data", "/progress"],
    ["journey", "/journey"],
    ["settings", "/settings"],
    ["notes empty", "/notes"],
    ["practice list", "/practice"],
  ]) {
    await page.goto(path);
    await page.waitForTimeout(300);
    await expectAccessible(page, label);
  }
  // Vocabulary: flipped card and the full list
  await page.goto("/vocabulary");
  await page.locator(".flashcard").click();
  await expectAccessible(page, "vocabulary flipped");
  await page.getByRole("button", { name: /Tất cả từ vựng/ }).click();
  await page.waitForTimeout(300);
  await expectAccessible(page, "vocabulary all");
  // A note on a question, then the notes page
  await page.goto("/practice/reading-garden");
  await page
    .getByRole("button", { name: "Xem kết quả", exact: true })
    .click()
    .catch(() => {});
  const noteButton = page
    .getByRole("button", { name: /Ghi chú cho câu này/ })
    .first();
  if (await noteButton.count()) {
    await noteButton.click();
    await page.waitForTimeout(300);
    await expectAccessible(page, "note editor open");
  }
  // Mini exam stages
  await page.goto("/exam");
  await expectAccessible(page, "exam start");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu 51 phút của mình" }).click();
  await page.waitForTimeout(500);
  await expectAccessible(page, "exam listening stage");
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expectAccessible(page, "exam reading stage");
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expectAccessible(page, "exam writing stage");
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expectAccessible(page, "exam speaking stage");
  await page
    .getByRole("button", { name: "Kết thúc buổi luyện", exact: true })
    .click();
  await page.waitForTimeout(500);
  await expectAccessible(page, "exam finished");
  // Paper 132 sitting
  await page.goto("/papers/132");
  await expectAccessible(page, "paper check-in");
  await page.getByRole("radio", { name: /Luyện thoải mái/ }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu đề 132" }).click();
  await page.waitForTimeout(500);
  await expectAccessible(page, "paper listening stage");
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expectAccessible(page, "paper reading stage");
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expectAccessible(page, "paper writing stage");
  await page.getByRole("button", { name: "Nộp phần này & tiếp tục" }).click();
  await expectAccessible(page, "paper speaking stage");
  await page.getByRole("checkbox", { name: /Tôi đã trả lời phần này/ }).check();
  await page.getByRole("button", { name: "Kết thúc buổi luyện" }).click();
  await page.waitForTimeout(600);
  await expectAccessible(page, "paper finished review");
});

const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8"));
const slots = paper.sections[2].slots as { id: string }[];
const speaking = paper.sections[3].slots as { id: string }[];
const crit = (score: number) => ({
  score,
  low: score,
  high: score,
  runs: 3,
  unsure: false,
  band: "b2",
  evidence: ["You should practise every day"],
  whyNotHigher: "Ý chưa được phát triển bằng ví dụ.",
  whyNotLower: "Đủ các ý chính của đề.",
  toRaise: "Thêm một ví dụ cụ thể.",
  showScore: true,
  validated: false,
});
const writing = (taskScore: number) => ({
  status: "graded",
  model: "m",
  promptVersion: "p1",
  rubricVersion: "cefr-fallback-1",
  criteria: {
    task: crit(6),
    organization: crit(6),
    vocabulary: crit(6),
    grammar: crit(7),
  },
  taskScore,
  rawTaskScore: taskScore,
  requirements: [
    { id: "r1", text: "suggest how Jo can prepare", met: "yes" },
    { id: "r3", text: "advice about food", met: "partly" },
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
  droppedQuotes: 0,
  totalQuotes: 12,
  runs: 3,
  lowConfidence: false,
  summary: "x",
  measures: { words: 47 },
});
const flu = {
  spokenSeconds: 40,
  words: 35,
  wordsPerMinute: 52,
  pausesPerMinute: 6.5,
  longPausesPerMinute: 1,
  meanRun: 5,
  fillers: 2,
  repeats: 0,
};
const spk = {
  status: "graded",
  model: "m",
  promptVersion: "p1",
  rubricVersion: "cefr-fallback-1",
  parts: speaking.map((p, i) => ({
    id: p.id,
    transcript: `I am from Hue number ${i + 1}.`,
    fluency: flu,
    timesPlausible: true,
  })),
  criteria: {
    grammar: crit(6),
    vocabulary: crit(6),
    pronunciation: crit(7),
    fluency: crit(6),
    discourse: crit(7),
  },
  speakingScore: 6.5,
  rawSpeakingScore: 6.5,
  droppedQuotes: 0,
  totalQuotes: 9,
  runs: 3,
  lowConfidence: false,
  summary: "x",
};
const essay =
  "Dear Jo, thanks for your email and I am sure you can make the team. You should practise every day and I could training with you on Saturday morning. Also you should eat lots of vegetables.";
const run = {
  id: "run-done",
  paperId: "132",
  version: paper.version,
  startedAt: Date.now() - 3600000,
  stage: 3,
  deadline: 2,
  material: 0,
  answers: {},
  essays: {
    [slots[0].id]: essay,
    [slots[1].id]: "Some people think online learning is better. ".repeat(20),
  },
  spoken: speaking.map((p) => p.id),
  mode: "practice",
  finishedAt: new Date().toISOString(),
};
const g = (id: string, grade: unknown) => ({
  id,
  at: new Date().toISOString(),
  inputHash: "h",
  grade,
});
test("the pages that show AI grades are accessible", async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const state = {
    ...freshState(),
    paperRuns: [run],
    grades: {
      [`paper:run-done:${slots[0].id}`]: g(
        `paper:run-done:${slots[0].id}`,
        writing(6.25),
      ),
      [`paper:run-done:${slots[1].id}`]: g(
        `paper:run-done:${slots[1].id}`,
        writing(7),
      ),
      "paper:run-done:speaking": g("paper:run-done:speaking", spk),
    },
  };
  (state.profile as { onboarded: boolean }).onboarded = true;
  await page.addInitScript((s) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(s));
    localStorage.setItem("may.ai.consent", "yes");
    localStorage.setItem("may.ai.passcode", "x");
  }, state);
  await page.route("**/api/grade/status", (r) =>
    r.fulfill({ json: { available: true } }),
  );
  await page.goto("/papers/132");
  await page.waitForTimeout(600);
  await expectAccessible(page, "paper review with grades");
  await page.goto("/progress");
  await page.waitForTimeout(400);
  await expectAccessible(page, "progress with chart");
  await page.goto("/settings");
  await page.waitForTimeout(400);
  await expectAccessible(page, "settings with ai card");
});
