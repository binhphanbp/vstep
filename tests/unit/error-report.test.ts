import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildErrorReport,
  clearErrors,
  errorReportText,
  recentErrors,
  recordError,
  sendErrorReport,
} from "../../src/lib/error-log";
import { freshState } from "../../src/lib/learning";

describe("the bug report file", () => {
  beforeEach(() => clearErrors());
  it("keeps only the last ten errors and drops empty ones", () => {
    for (let index = 0; index < 14; index++)
      recordError(`lỗi ${index}`, "window:1");
    recordError("   ", "window:1");
    const errors = recentErrors();
    expect(errors).toHaveLength(10);
    expect(errors[0].message).toBe("lỗi 4");
    expect(errors.at(-1)?.message).toBe("lỗi 13");
  });
  it("carries counts and settings but nothing she wrote", () => {
    const state = freshState();
    state.drafts = { "quiz:writing-email": "Dear Alex, I am writing to you" };
    state.attempts = [
      {
        id: "a",
        lessonId: "writing-email",
        skill: "writing",
        date: "2026-09-08T10:00:00.000Z",
        answers: {},
        correct: 0,
        total: 0,
        seconds: 300,
        text: "Bài viết thật của Gùa",
      },
    ];
    recordError("Boom", "window:12");
    const report = buildErrorReport(state, "");
    const serialised = JSON.stringify(report);
    expect(report.counts.attempts).toBe(1);
    expect(report.counts.drafts).toBe(1);
    expect(report.errors).toHaveLength(1);
    // The two things that must never leave the device in a bug report.
    expect(serialised).not.toContain("Bài viết thật");
    expect(serialised).not.toContain("Dear Alex");
  });
  it("reports damaged storage so the report explains an empty state", () => {
    expect(buildErrorReport(freshState(), "Hỏng").storageError).toBe("Hỏng");
    expect(buildErrorReport(freshState(), "").storageError).toBeNull();
  });
  it("writes the same facts as text that can be pasted into a chat", () => {
    const state = freshState();
    state.drafts = { "quiz:writing-email": "Dear Alex, I am writing to you" };
    state.savedWords = { deadline: { addedAt: "2026-09-08" } };
    recordError("Boom", "window:12");
    const text = errorReportText(buildErrorReport(state, "Hỏng"));
    expect(text).toContain("Mây — báo lỗi");
    expect(text).toContain("1 bài nháp");
    expect(text).toContain("1 từ đã lưu");
    expect(text).toContain("Lưu trữ: Hỏng");
    expect(text).toContain("Boom");
    // The text travels through a chat app, so it obeys the same rule as the file.
    expect(text).not.toContain("Dear Alex");
  });
  it("says so plainly when nothing went wrong", () => {
    const text = errorReportText(buildErrorReport(freshState(), ""));
    expect(text).toContain("Lưu trữ: không báo lỗi");
    expect(text).toContain("không có lỗi nào được ghi lại");
  });
});

describe("handing the report to the device", () => {
  const original = globalThis.navigator;
  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: original,
      configurable: true,
    });
  });
  function stub(value: unknown) {
    Object.defineProperty(globalThis, "navigator", {
      value,
      configurable: true,
    });
  }
  it("prefers the share sheet a phone offers", async () => {
    const shared: unknown[] = [];
    stub({ share: (data: unknown) => (shared.push(data), Promise.resolve()) });
    await expect(sendErrorReport("xin chào")).resolves.toBe("share");
    expect(shared).toHaveLength(1);
  });
  it("falls back to the clipboard when sharing is refused", async () => {
    const copied: string[] = [];
    stub({
      share: () => Promise.reject(new Error("cancelled")),
      clipboard: {
        writeText: (text: string) => (copied.push(text), Promise.resolve()),
      },
    });
    await expect(sendErrorReport("xin chào")).resolves.toBe("copy");
    expect(copied).toEqual(["xin chào"]);
  });
  it("admits it could do neither so the file stays the answer", async () => {
    stub({});
    await expect(sendErrorReport("xin chào")).resolves.toBe("none");
  });
});
