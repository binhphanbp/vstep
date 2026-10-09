import type { GradeFailure, GradeReply } from "./server";
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

export type RequestFailure = GradeFailure | "network" | "aborted" | "bad-reply";

export class GradeRequestError extends Error {
  constructor(
    readonly kind: RequestFailure,
    readonly retryAfter?: number,
  ) {
    super(kind);
  }
}

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
): Promise<WritingGrade> {
  let response: Response;
  try {
    response = await fetch("/api/grade/writing", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-grader-passcode": passcode,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    throw new GradeRequestError(
      (error as Error).name === "AbortError" ? "aborted" : "network",
    );
  }
  let body: GradeReply | undefined;
  try {
    body = (await response.json()) as GradeReply;
  } catch {
    throw new GradeRequestError(response.ok ? "bad-reply" : "model");
  }
  if ("grade" in body && response.ok) {
    if (body.grade?.status === "graded" || body.grade?.status === "blocked")
      return body.grade;
    throw new GradeRequestError("bad-reply");
  }
  const failure = "error" in body ? body.error : "model";
  throw new GradeRequestError(
    failure,
    "retryAfter" in body ? body.retryAfter : undefined,
  );
}
