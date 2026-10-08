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
    state.notes = [
      {
        id: "n1",
        createdAt: "2026-09-08T10:00:00.000Z",
        updatedAt: "2026-09-08T10:00:00.000Z",
        body: "Bẫy: người nói đổi ý ở câu cuối",
        anchor: {
          source: "paper",
          sourceId: "133",
          version: 1,
          group: "Đề 133",
          label: "Đề 133 · Nghe · Part 2 · Câu 12",
          excerpt: "What time does the shuttle leave?",
        },
      },
      {
        id: "n2",
        createdAt: "2026-09-08T10:00:00.000Z",
        updatedAt: "2026-09-08T10:00:00.000Z",
        deletedAt: "2026-09-09T10:00:00.000Z",
        body: "Ghi chú đã xóa",
      },
    ];
    recordError("Boom", "window:12");
    const report = buildErrorReport(state, "");
    const serialised = JSON.stringify(report);
    expect(report.counts.attempts).toBe(1);
    expect(report.counts.drafts).toBe(1);
    // Notes are counted without the ones in the bin, and never quoted.
    expect(report.counts.notes).toBe(1);
    expect(report.errors).toHaveLength(1);
    // The things that must never leave the device in a bug report.
    expect(serialised).not.toContain("Bài viết thật");
    expect(serialised).not.toContain("Dear Alex");
    expect(serialised).not.toContain("người nói đổi ý");
    expect(serialised).not.toContain("shuttle");
    expect(serialised).not.toContain("Ghi chú đã xóa");
    expect(errorReportText(report)).toContain("1 ghi chú");
    expect(errorReportText(report)).not.toContain("người nói đổi ý");
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
  it("does not count a draft that was cleared when its session was filed", () => {
    // Filing a session writes "" over its draft but leaves the key, so counting
    // keys told the learner's helper about drafts she did not have.
    const state = freshState();
    state.drafts = {
      "quiz:writing-email": "",
      "quiz:reading-cafe": "   ",
      "writing-email": "Dear Alex, a real draft",
    };
    expect(buildErrorReport(state, "").counts.drafts).toBe(1);
  });
});
