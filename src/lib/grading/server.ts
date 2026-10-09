import { createHash, timingSafeEqual } from "node:crypto";
import * as z from "zod/mini";
import type { Generate } from "./generate";
import { requirementsFor } from "./requirements";
import { gradeWriting, type WritingGrade } from "./writing";

/**
 * The server side of grading: who may ask, what may be sent, how often, and
 * what is said back. Kept apart from the route file so each rule can be tested
 * without a server. Nothing here writes the learner's text anywhere: errors
 * are reported by kind, never with the content.
 */

z.config({ jitless: true });

export const REQUEST_LIMITS = {
  /** One essay; Task 2 asks for 250 words, so this is several times that. */
  text: 8000,
  prompt: 4000,
  slotId: 120,
  samples: 3,
  sample: 3000,
  /** The whole request body, in bytes (JSON of the fields above, with room). */
  body: 48 * 1024,
} as const;

export const PASSCODE_HEADER = "x-grader-passcode";

const requestSchema = z.object({
  task: z.union([z.literal(1), z.literal(2)]),
  slotId: z.string().check(z.minLength(1), z.maxLength(REQUEST_LIMITS.slotId)),
  prompt: z.string().check(z.minLength(10), z.maxLength(REQUEST_LIMITS.prompt)),
  text: z.string().check(z.maxLength(REQUEST_LIMITS.text)),
  samples: z.optional(
    z
      .array(z.string().check(z.maxLength(REQUEST_LIMITS.sample)))
      .check(z.maxLength(REQUEST_LIMITS.samples)),
  ),
});

export type GradeEnv = { GEMINI_API_KEY?: string; GRADER_PASSCODE?: string };

/** The feature is on only when both the key and the passcode are set. */
export function isConfigured(env: GradeEnv) {
  return Boolean(env.GEMINI_API_KEY && env.GRADER_PASSCODE);
}

/** Compares without leaking how much of the passcode was right. */
export function passcodeMatches(
  given: string | null | undefined,
  expected: string | undefined,
) {
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Per-instance limits: a few gradings an hour and two at a time. Serverless
 * instances do not share memory, so this is a brake against a loop or a stuck
 * button, not a security boundary; the passcode and the budget alert on the
 * Google side are those.
 */
export class GradeLimiter {
  private stamps: number[] = [];
  private active = 0;
  private misses: number[] = [];
  constructor(
    private readonly perHour = 20,
    private readonly concurrent = 2,
    private readonly now: () => number = Date.now,
  ) {}
  /** Wrong passcodes: ten in a quarter of an hour lock the door for the rest of it. */
  locked(): number {
    const now = this.now();
    this.misses = this.misses.filter((at) => now - at < 900_000);
    return this.misses.length >= 10
      ? Math.ceil((900_000 - (now - this.misses[0])) / 1000)
      : 0;
  }
  miss() {
    this.misses.push(this.now());
  }
  /** Returns a release function, or the seconds to wait. */
  take(): { release: () => void } | { retryAfter: number } {
    const now = this.now();
    this.stamps = this.stamps.filter((at) => now - at < 3_600_000);
    if (this.active >= this.concurrent) return { retryAfter: 15 };
    if (this.stamps.length >= this.perHour)
      return {
        retryAfter: Math.ceil((3_600_000 - (now - this.stamps[0])) / 1000),
      };
    this.stamps.push(now);
    this.active++;
    let released = false;
    return {
      release: () => {
        if (!released) {
          released = true;
          this.active--;
        }
      },
    };
  }
}

export type GradeDeps = {
  env: GradeEnv;
  generate: () => Generate;
  limiter: GradeLimiter;
  log?: (event: string) => void;
};

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });

export type GradeFailure =
  | "not-configured"
  | "passcode"
  | "invalid"
  | "too-large"
  | "no-requirements"
  | "rate"
  | "model";

export type GradeReply =
  { grade: WritingGrade } | { error: GradeFailure; retryAfter?: number };

export async function handleGradeWriting(
  request: Request,
  deps: GradeDeps,
): Promise<Response> {
  if (!isConfigured(deps.env)) return json({ error: "not-configured" }, 503);
  const wait = deps.limiter.locked();
  if (wait)
    return json({ error: "rate", retryAfter: wait }, 429, {
      "retry-after": String(wait),
    });
  if (
    !passcodeMatches(
      request.headers.get(PASSCODE_HEADER),
      deps.env.GRADER_PASSCODE,
    )
  ) {
    deps.limiter.miss();
    return json({ error: "passcode" }, 401);
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > REQUEST_LIMITS.body) return json({ error: "too-large" }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > REQUEST_LIMITS.body)
    return json({ error: "too-large" }, 413);
  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = z.parse(requestSchema, JSON.parse(raw));
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const requirements = requirementsFor(parsed.slotId, parsed.prompt);
  if (!requirements) return json({ error: "no-requirements" }, 422);

  const slot = deps.limiter.take();
  if ("retryAfter" in slot)
    return json({ error: "rate", retryAfter: slot.retryAfter }, 429, {
      "retry-after": String(slot.retryAfter),
    });
  try {
    const grade = await gradeWriting(
      {
        task: parsed.task,
        prompt: parsed.prompt,
        requirements,
        text: parsed.text,
        samples: parsed.samples,
      },
      { generate: deps.generate() },
    );
    deps.log?.(`graded:${grade.status}`);
    return json({ grade });
  } catch (error) {
    // Say what kind of failure it was, never what was being graded.
    const status = (error as { status?: number }).status;
    deps.log?.(`model-error:${status ?? (error as Error).name}`);
    return json({ error: "model" }, 502);
  } finally {
    slot.release();
  }
}

export function handleStatus(env: GradeEnv) {
  return json({ available: isConfigured(env) });
}
