import type { GradeFailure } from "./server";
import type { GradeProgress } from "./generate";
import type { SpeakingGrade } from "./speaking";
import type { WritingGrade } from "./writing";

/**
 * The browser's side of grading: what this device has agreed to, the passcode
 * it holds, and the call to the server. The passcode and the agreement stay on
 * this device only (never in the study profile), so they are not in backups or
 * cloud snapshots.
 */
const CONSENT_KEY = "may.ai.consent";
const PASSCODE_KEY = "may.ai.passcode";
const EVENT = "may-ai-settings";

export type AiSettings = { consent: boolean; passcode: string };

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

let cached: AiSettings = { consent: false, passcode: "" };
let cachedFrom = "";

export function getAiSettings(): AiSettings {
  const from = `${read(CONSENT_KEY)}|${read(PASSCODE_KEY)}`;
  if (from !== cachedFrom) {
    cachedFrom = from;
    cached = {
      consent: read(CONSENT_KEY) === "yes",
      passcode: read(PASSCODE_KEY),
    };
  }
  return cached;
}
export const getServerAiSettings = (): AiSettings => ({
  consent: false,
  passcode: "",
});

export function saveAiSettings(next: Partial<AiSettings>) {
  try {
    if (next.consent !== undefined) {
      if (next.consent) localStorage.setItem(CONSENT_KEY, "yes");
      else localStorage.removeItem(CONSENT_KEY);
    }
    if (next.passcode !== undefined) {
      if (next.passcode) localStorage.setItem(PASSCODE_KEY, next.passcode);
      else localStorage.removeItem(PASSCODE_KEY);
    }
  } catch {
    // Storage is unavailable (private window): the choice lasts until reload.
    cached = { ...cached, ...next };
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAiSettings(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Is grading switched on at the server? Asked once per page load. */
let availability: Promise<boolean> | undefined;
export function gradingAvailable(): Promise<boolean> {
  availability ??= fetch("/api/grade/status", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { available: false }))
    .then((body: { available?: unknown }) => body.available === true)
    .catch(() => false);
  return availability;
}
/** For tests and for the Settings page after the passcode changes. */
export function forgetAvailability() {
  availability = undefined;
}

export type RequestFailure =
  | GradeFailure
  | "network"
  | "aborted"
  | "bad-reply"
  /** Something went wrong on this device after the answer came back. */
  | "client";

export class GradeRequestError extends Error {
  constructor(
    readonly kind: RequestFailure,
    readonly retryAfter?: number,
    /** A short technical note for the error box (an HTTP status, an error name): never content. */
    readonly detail?: string,
  ) {
    super(kind);
  }
}

export const describeError = (error: unknown) =>
  error instanceof Error
    ? `${error.name}: ${error.message}`.slice(0, 200)
    : String(error).slice(0, 200);

/**
 * Reads the answer to a grading request: either one JSON body, or a stream of
 * JSON lines (`progress`, `ping`, then `grade` or `error`). Returns the grade
 * or throws what went wrong, naming the HTTP status or how the stream ended.
 */
async function readReply<G extends { status: string }>(
  response: Response,
  onProgress?: (progress: GradeProgress | { stage: "started" }) => void,
): Promise<G> {
  const kind = response.headers.get("content-type") ?? "";
  if (!kind.includes("application/x-ndjson")) {
    let body: {
      grade?: G;
      error?: GradeFailure;
      retryAfter?: number;
      detail?: string;
    };
    try {
      body = await response.json();
    } catch {
      throw new GradeRequestError(
        response.ok ? "bad-reply" : "model",
        undefined,
        `HTTP ${response.status}, không phải JSON`,
      );
    }
    if (body.grade && response.ok) {
      if (body.grade.status === "graded" || body.grade.status === "blocked")
        return body.grade;
      throw new GradeRequestError("bad-reply", undefined, "trạng thái lạ");
    }
    throw new GradeRequestError(
      body.error ?? "model",
      body.retryAfter,
      [`HTTP ${response.status}`, body.detail].filter(Boolean).join(" · "),
    );
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw new GradeRequestError("network", undefined, "không có luồng trả về");
  const decoder = new TextDecoder();
  let buffer = "";
  /** Reads one line; returns the grade when it is the last event. */
  const take = (raw: string): G | undefined => {
    const line = raw.trim();
    if (!line) return undefined;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      throw new GradeRequestError(
        "bad-reply",
        undefined,
        "dòng không đọc được",
      );
    }
    if (event.type === "progress") onProgress?.(event as never);
    else if (event.type === "grade") {
      const grade = event.grade as G | undefined;
      if (grade?.status === "graded" || grade?.status === "blocked")
        return grade;
      throw new GradeRequestError("bad-reply", undefined, "trạng thái lạ");
    } else if (event.type === "error")
      throw new GradeRequestError(
        (event.error as GradeFailure) ?? "model",
        undefined,
        ["lỗi báo từ máy chủ trong lúc chấm", event.detail]
          .filter(Boolean)
          .join(" · "),
      );
    return undefined;
  };
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const found = take(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (found) return found;
      }
    }
    // A last line the server did not end with a newline still counts.
    const found = take(buffer + decoder.decode());
    if (found) return found;
  } catch (error) {
    if (error instanceof GradeRequestError) throw error;
    throw new GradeRequestError(
      (error as Error).name === "AbortError" ? "aborted" : "network",
      undefined,
      describeError(error),
    );
  }
  throw new GradeRequestError(
    "network",
    undefined,
    "kết nối đứt trước khi có kết quả",
  );
}

export type ProgressListener = (
  progress: GradeProgress | { stage: "started" },
) => void;

export type WritingRequest = {
  task: 1 | 2;
  slotId: string;
  prompt: string;
  text: string;
  samples?: string[];
};

export async function requestWritingGrade(
  payload: WritingRequest,
  passcode: string,
  signal?: AbortSignal,
  onProgress?: ProgressListener,
): Promise<WritingGrade> {
  let response: Response;
  try {
    response = await fetch("/api/grade/writing", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/x-ndjson, application/json",
        "x-grader-passcode": passcode,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    throw new GradeRequestError(
      (error as Error).name === "AbortError" ? "aborted" : "network",
      undefined,
      describeError(error),
    );
  }
  return readReply<WritingGrade>(response, onProgress);
}

export type SpeakingPartRequest = {
  id: string;
  title: string;
  prompt: string;
  durationSeconds: number;
  audio: Blob;
};

/** Sends the recordings of one Speaking test as a multipart form (binary, not base64). */
export async function requestSpeakingGrade(
  parts: SpeakingPartRequest[],
  passcode: string,
  signal?: AbortSignal,
  onProgress?: ProgressListener,
): Promise<SpeakingGrade> {
  const form = new FormData();
  form.set(
    "meta",
    JSON.stringify({
      parts: parts.map(({ id, title, prompt, durationSeconds }) => ({
        id,
        title,
        prompt,
        durationSeconds,
      })),
    }),
  );
  parts.forEach((part, i) => form.set(`audio${i}`, part.audio, `part${i}`));
  let response: Response;
  try {
    response = await fetch("/api/grade/speaking", {
      method: "POST",
      headers: {
        accept: "application/x-ndjson, application/json",
        "x-grader-passcode": passcode,
      },
      body: form,
      signal,
    });
  } catch (error) {
    throw new GradeRequestError(
      (error as Error).name === "AbortError" ? "aborted" : "network",
      undefined,
      describeError(error),
    );
  }
  return readReply<SpeakingGrade>(response, onProgress);
}
