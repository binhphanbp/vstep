/**
 * The last few errors, kept on the device so a bug report can carry facts.
 *
 * A one-person app does not need a monitoring service, but "it broke and I do
 * not know what it said" is not something the learner should have to relay.
 * Errors are held in memory and mirrored into sessionStorage so a reload does
 * not lose them, capped at ten so nothing grows without bound. Only the
 * message, where it came from and when: never her writing, her recordings or
 * anything typed into a field.
 */
import type { StudyState } from "./learning";
export type LoggedError = {
  at: string;
  message: string;
  source: string;
};
const LIMIT = 10;
const KEY = "may-errors-v1";
let recent: LoggedError[] = [];
function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(recent));
  } catch {
    // A full or blocked session storage must never break the page itself.
  }
}
export function recordError(message: string, source: string) {
  const text = String(message ?? "").slice(0, 300);
  if (!text.trim()) return;
  recent = [
    ...recent,
    {
      at: new Date().toISOString(),
      message: text,
      source: source.slice(0, 80),
    },
  ].slice(-LIMIT);
  persist();
}
export function recentErrors(): LoggedError[] {
  if (recent.length) return recent;
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed))
      recent = parsed
        .filter(
          (item): item is LoggedError =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as LoggedError).message === "string",
        )
        .slice(-LIMIT);
  } catch {
    recent = [];
  }
  return recent;
}
export function clearErrors() {
  recent = [];
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do: the in-memory list is already empty.
  }
}
/** Installed once by the shell; safe to call again. */
export function watchErrors() {
  if (typeof window === "undefined") return;
  const flagged = window as Window & { __mayErrorsWatched?: boolean };
  if (flagged.__mayErrorsWatched) return;
  flagged.__mayErrorsWatched = true;
  window.addEventListener("error", (event) =>
    recordError(
      event.message,
      `${event.filename ?? "window"}:${event.lineno ?? 0}`,
    ),
  );
  window.addEventListener("unhandledrejection", (event) =>
    recordError(String(event.reason), "promise"),
  );
}
/**
 * What a bug report may contain: enough to reproduce, nothing she wrote.
 * Counts and settings, never the text of an essay, a draft or a recording.
 */
export function buildErrorReport(state: StudyState, storageError: string) {
  return {
    at: new Date().toISOString(),
    app: "may-vstep",
    page: typeof location === "undefined" ? "" : location.pathname,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    language: typeof navigator === "undefined" ? "" : navigator.language,
    screen:
      typeof window === "undefined"
        ? ""
        : `${window.innerWidth}x${window.innerHeight}`,
    storageError: storageError || null,
    profile: {
      target: state.profile.target,
      level: state.profile.level,
      dailyMinutes: state.profile.dailyMinutes,
      focus: state.profile.focus,
      onboarded: state.profile.onboarded,
      hasExamDate: Boolean(state.profile.examDate),
    },
    counts: {
      attempts: state.attempts.length,
      reviews: Object.keys(state.reviews).length,
      mistakeReviews: Object.keys(state.mistakeReviews).length,
      drafts: Object.keys(state.drafts).length,
      savedWords: Object.keys(state.savedWords ?? {}).length,
      examOpen: Boolean(state.exam),
    },
    errors: recentErrors(),
  };
}

export type ErrorReport = ReturnType<typeof buildErrorReport>;

function shortTime(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The same facts as the JSON file, written so they can be pasted into a chat.
 *
 * On a phone a downloaded JSON is several taps away from actually reaching the
 * person who can fix the problem, and the file picker in a messaging app does
 * not always find it. Plain text can be shared or pasted in one tap, and it
 * carries exactly what `buildErrorReport` allows: never her writing, her
 * recordings or anything typed into a field.
 */
export function errorReportText(report: ErrorReport) {
  const lines = [
    `Mây — báo lỗi ${shortTime(report.at)}`,
    `Trang: ${report.page || "(không rõ)"}`,
    `Máy: ${report.userAgent || "(không rõ)"}`,
    `Màn hình: ${report.screen || "(không rõ)"} — ngôn ngữ ${report.language || "(không rõ)"}`,
    `Dữ liệu: ${report.counts.attempts} lượt học, ${report.counts.reviews} bài ôn, ${report.counts.mistakeReviews} câu sai đang ôn, ${report.counts.drafts} bài nháp, ${report.counts.savedWords} từ đã lưu${report.counts.examOpen ? ", đang mở một đề" : ""}`,
    `Lưu trữ: ${report.storageError ? report.storageError : "không báo lỗi"}`,
  ];
  if (report.errors.length) {
    lines.push(`Lỗi gần nhất (${report.errors.length}):`);
    report.errors.forEach((item, index) =>
      lines.push(
        `${index + 1}. ${shortTime(item.at)} — ${item.message} [${item.source}]`,
      ),
    );
  } else {
    lines.push("Lỗi gần nhất: không có lỗi nào được ghi lại.");
  }
  lines.push(
    "(Bản mô tả này không chứa bài viết, bản ghi âm hay nội dung đã gõ.)",
  );
  return lines.join("\n");
}

export type ReportDelivery = "share" | "copy" | "none";

/**
 * Hands the report to whatever the device offers, best first.
 *
 * A phone has a share sheet, so the report can go straight into a chat; a
 * laptop usually has only the clipboard. Either way the text never leaves the
 * device on its own: the learner chooses where it goes.
 */
export async function sendErrorReport(text: string): Promise<ReportDelivery> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function")
    try {
      await navigator.share({ title: "Mây — báo lỗi", text });
      return "share";
    } catch {
      // Cancelled or refused by the browser: the clipboard still works.
    }
  if (typeof navigator !== "undefined" && navigator.clipboard)
    try {
      await navigator.clipboard.writeText(text);
      return "copy";
    } catch {
      // Clipboard permission denied: the JSON download is still there.
    }
  return "none";
}
