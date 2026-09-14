import { beforeEach, describe, expect, it } from "vitest";
import {
  buildErrorReport,
  clearErrors,
  recentErrors,
  recordError,
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
});
