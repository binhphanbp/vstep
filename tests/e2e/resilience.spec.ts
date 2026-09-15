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

test("a device with no microphone can still finish a Speaking lesson", async ({
  page,
}) => {
  // Without this path Speaking is unfinishable, so all three lessons keep the
  // "never practised" bonus and hold a slot in the daily plan for ever.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await page.goto("/practice/speaking-social");
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await expect(page.locator("main [role=alert]").last()).toContainText(
    "Ghi âm câu trả lời trước",
  );
  await page
    .getByText("Thiết bị này không ghi âm được", { exact: false })
    .click();
  // Speaking is filed only once every self-check row has been rated.
  const rows = page.locator(".self-check .criteria-list li");
  const total = await rows.count();
  for (let index = 0; index < total; index++)
    await rows.nth(index).getByRole("button", { name: "Tạm ổn" }).click();
  await page.getByRole("button", { name: "Hoàn thành buổi luyện" }).click();
  await expect(
    page.getByRole("heading", { name: "đã dành thời gian để luyện tập" }),
  ).toBeVisible();
  const attempts = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!).attempts,
  );
  expect(attempts).toHaveLength(1);
  expect(attempts[0].skill).toBe("speaking");
  // Nothing was captured, so nothing may claim to be playable later.
  expect(attempts[0].recordingId).toBeUndefined();
});

test("the practice clock is stored in batches, and the last seconds survive leaving", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  const draft = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("may-study-v1") ?? "{}").drafts?.[
          "quiz:reading-cafe"
        ] ?? "",
    );
  await page.waitForTimeout(4000);
  // Four seconds of study must not have cost four full reads, validations and
  // writes of the whole profile.
  expect(await draft()).toBe("");
  await page.getByRole("link", { name: "Về kho bài học" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Mỗi kỹ năng",
  );
  const saved = JSON.parse((await draft()) || "{}");
  expect(saved.seconds).toBeGreaterThan(0);
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
  // The lesson's own summary, not the per-question "other options" one that
  // the evidence notes now add inside it.
  await page
    .getByText("A change at the station · Xem đáp án và giải thích")
    .click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("the timed Reading passage stays on screen next to its questions", async ({
  page,
}) => {
  const s = freshState();
  s.exam = {
    id: "reading-layout-exam",
    mode: "full",
    startedAt: Date.now(),
    deadline: Date.now() + 3600_000,
    stage: 1,
    answers: {},
    writing: "",
    finished: false,
  };
  await page.goto("/");
  await page.evaluate(
    (value) => localStorage.setItem("may-study-v1", JSON.stringify(value)),
    s,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exam");
  const panel = page.locator(".practice-layout .reading-panel");
  await expect(panel).toBeVisible();
  const layout = await panel.evaluate((el) => ({
    position: getComputedStyle(el).position,
    scrolls: el.scrollHeight > el.clientHeight,
    height: el.getBoundingClientRect().height,
  }));
  // The passage scrolls inside its own box instead of pushing the questions
  // hundreds of words down the page.
  expect(layout.position).toBe("sticky");
  expect(layout.scrolls).toBe(true);
  expect(layout.height).toBeLessThan(844);
  // It is still on screen while the last question of the passage is answered.
  await page.locator(".question").last().scrollIntoViewIfNeeded();
  const visible = await panel.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return Math.min(box.bottom, innerHeight) - Math.max(box.top, 0);
  });
  expect(visible).toBeGreaterThan(200);
});

test("server serves security headers and a real 404 status", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["content-security-policy"]).toContain(
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  );
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  expect((await request.get("/not-a-real-route")).status()).toBe(404);
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  await expect(manifest).toBeOK();
  expect(await manifest.json()).toMatchObject({
    name: "Mây VSTEP · Góc học của Gùa",
    display: "standalone",
    start_url: "/",
    theme_color: "#fff8fb",
  });
});

test("strict production CSP does not trigger an eval violation", async ({
  page,
}) => {
  const initial = freshState();
  await page.addInitScript((state) => {
    localStorage.setItem("may-study-v1", JSON.stringify(state));
    const violations: string[] = [];
    Object.defineProperty(window, "__mayCspViolations", {
      value: violations,
      configurable: true,
    });
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(`${event.violatedDirective}:${event.blockedURI}`);
    });
  }, initial);
  await page.goto("/settings");
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue(
    initial.profile.name,
  );
  const violations = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __mayCspViolations?: string[];
        }
      ).__mayCspViolations ?? [],
  );
  expect(violations.filter((item) => item.startsWith("script-src"))).toEqual(
    [],
  );
});
test("profile fields remain editable when another tab saves vocabulary progress", async ({
  context,
  page,
}) => {
  await page.goto("/settings");
  await page.getByPlaceholder("Tên hoặc biệt danh").fill("Unsaved name");
  const second = await context.newPage();
  await second.goto("/vocabulary");
  await second.getByRole("button", { name: "Lật thẻ để xem nghĩa" }).click();
  await second.getByRole("button", { name: "Nhớ rồi", exact: false }).click();
  await page.bringToFront();
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue(
    "Unsaved name",
  );
});

test("the app still opens when the network is gone", async ({
  page,
  context,
}) => {
  // Progress already lives on the device; this proves the shell itself
  // survives a lost connection instead of showing the browser's error page.
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto("/practice");
  await expect(page.locator("main h1")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".lesson-card").first()).toBeVisible();
  // The worker is really ours, not the browser's own HTTP cache.
  expect(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
  ).toBe(true);
  // The plain "no network" page is always reachable.
  await page.goto("/offline");
  await expect(page.locator("main h1")).toContainText("Mạng đang không ổn");
  await context.setOffline(false);
});

test("every page of the app opens with the network gone, not just the last one visited", async ({
  page,
  context,
}) => {
  // Measured before this was fixed: with the network off, every address except
  // "/" showed the offline page - including a lesson. A study app that travels
  // has to survive a train tunnel, so the worker now stores each fixed page at
  // install instead of waiting for a first visit.
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The install stores the pages one at a time; give it a moment to finish.
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  const pages: [string, string][] = [
    ["/practice", "Mỗi kỹ năng"],
    ["/journey", "Đường đến B2"],
    ["/exam", "Tập bình tĩnh"],
    ["/vocabulary", "Gieo một từ"],
    ["/mistakes", "Không phải lỗi"],
    ["/progress", "Tiến bộ đôi khi"],
    ["/settings", "Góc học"],
    ["/guide", "Hiểu kỳ thi"],
  ];
  for (const [route, heading] of pages) {
    await page.goto(route);
    await expect(page.locator("main h1"), route).toContainText(heading);
  }
  await context.setOffline(false);
});

test("today's lessons are kept for the train, and they open with no network", async ({
  page,
  context,
}) => {
  // The worker cannot know which lessons today asks for: the plan comes from
  // her own data, so the app hands it the addresses once it has loaded.
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const planned = await page
    .locator(".plan-list a[href^='/practice/']")
    .first()
    .getAttribute("href");
  expect(planned, "kế hoạch hôm nay phải có ít nhất một bài").toBeTruthy();
  // Warming happens after the worker takes over; it fetches one page per plan
  // entry, so allow for that before cutting the network.
  await page.waitForTimeout(2500);
  await context.setOffline(true);
  await page.goto(planned!);
  await expect(page.locator("main h1")).not.toContainText("Mạng đang không ổn");
  await expect(page.locator(".question").first()).toBeVisible();
  await context.setOffline(false);
});
