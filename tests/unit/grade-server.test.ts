import { describe, expect, it } from "vitest";
import type { Generate } from "../../src/lib/grading/generate";
import {
  GradeLimiter,
  PASSCODE_HEADER,
  REQUEST_LIMITS,
  handleGradeWriting,
  handleStatus,
  isConfigured,
  passcodeMatches,
  type GradeDeps,
} from "../../src/lib/grading/server";

const env = { GEMINI_API_KEY: "k", GRADER_PASSCODE: "open sesame" };
const prompt =
  "You have received an email from Jo.\n\nWrite an email replying to Jo. In your email, you should:\n• suggest how Jo can prepare\n• respond to practising together\n• give advice about food";
const text =
  "Dear Jo, thanks for your email and I am sure you can make the team. You should practise every day and I could train with you on Saturday morning. Also you should eat lots of vegetables, fruit and rice to have energy before each long practice. Best wishes, Gua";
const body = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ task: 1, slotId: "132-writing-1", prompt, text, ...extra });

function fakeGenerate(calls: string[] = []): Generate {
  return async (request) => {
    calls.push(request.label);
    return request.label.startsWith("writing-analysis")
      ? { requirements: [], errors: [] }
      : {
          criteria: ["task", "organization", "vocabulary", "grammar"].map(
            (criterion) => ({
              criterion,
              score: 6,
              evidence: [],
              whyNotHigher: "a",
              whyNotLower: "b",
              toRaise: "c",
            }),
          ),
          summary: "s",
        };
  };
}
function deps(over: Partial<GradeDeps> = {}, calls: string[] = []): GradeDeps {
  return {
    env,
    generate: () => fakeGenerate(calls),
    limiter: new GradeLimiter(),
    ...over,
  };
}
const post = (
  payload: string,
  passcode: string | null = "open sesame",
  extra: Record<string, string> = {},
) =>
  new Request("http://localhost/api/grade/writing", {
    method: "POST",
    headers: { ...(passcode ? { [PASSCODE_HEADER]: passcode } : {}), ...extra },
    body: payload,
  });

describe("who may ask", () => {
  it("is on only when both the key and the passcode are set", () => {
    expect(isConfigured(env)).toBe(true);
    expect(isConfigured({ GEMINI_API_KEY: "k" })).toBe(false);
    expect(isConfigured({ GRADER_PASSCODE: "p" })).toBe(false);
    expect(isConfigured({ GEMINI_API_KEY: "", GRADER_PASSCODE: "p" })).toBe(
      false,
    );
  });
  it("compares passcodes exactly, of any length, and never accepts an empty one", () => {
    expect(passcodeMatches("open sesame", "open sesame")).toBe(true);
    expect(passcodeMatches("open sesamE", "open sesame")).toBe(false);
    expect(passcodeMatches("open", "open sesame")).toBe(false);
    expect(passcodeMatches("open sesame and more", "open sesame")).toBe(false);
    expect(passcodeMatches("", "")).toBe(false);
    expect(passcodeMatches(null, "x")).toBe(false);
    expect(passcodeMatches("x", undefined)).toBe(false);
  });
  it("answers 503 when not configured, 401 for a missing or wrong passcode, and never calls the model", async () => {
    const calls: string[] = [];
    const answer = async (request: Request, over: Partial<GradeDeps> = {}) =>
      handleGradeWriting(request, deps(over, calls));
    expect((await answer(post(body()), { env: {} })).status).toBe(503);
    expect((await answer(post(body(), null))).status).toBe(401);
    const wrong = await answer(post(body(), "nope"));
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: "passcode" });
    expect(calls).toEqual([]);
  });
  it("reports whether the feature is on, and nothing else", async () => {
    expect(await handleStatus(env).json()).toEqual({ available: true });
    expect(await handleStatus({}).json()).toEqual({ available: false });
  });
});

describe("what may be sent", () => {
  it("rejects malformed, oversized and out-of-range requests before the model", async () => {
    const calls: string[] = [];
    const answer = (payload: string, headers: Record<string, string> = {}) =>
      handleGradeWriting(
        post(payload, "open sesame", headers),
        deps({}, calls),
      );
    expect((await answer("not json")).status).toBe(400);
    expect((await answer(body({ task: 3 }))).status).toBe(400);
    expect((await answer(body({ text: 5 }))).status).toBe(400);
    expect((await answer(body({ slotId: "" }))).status).toBe(400);
    expect(
      (await answer(body({ text: "x".repeat(REQUEST_LIMITS.text + 1) })))
        .status,
    ).toBe(400);
    expect((await answer(body({ samples: ["a", "b", "c", "d"] }))).status).toBe(
      400,
    );
    expect((await answer(body({ text: "x".repeat(60_000) }))).status).toBe(413);
    expect((await answer(body(), { "content-length": "999999" })).status).toBe(
      413,
    );
    expect(calls).toEqual([]);
  });
  it("will not grade a task that has no approved list of required points", async () => {
    const calls: string[] = [];
    const reply = await handleGradeWriting(
      post(
        body({
          slotId: "132-writing-2",
          prompt:
            "Some people believe that homework is useful. To what extent do you agree or disagree?",
        }),
      ),
      deps({}, calls),
    );
    expect(reply.status).toBe(422);
    expect(await reply.json()).toEqual({ error: "no-requirements" });
    expect(calls).toEqual([]);
  });
});

describe("grading", () => {
  it("returns the grade, with the model called only after the checks pass", async () => {
    const calls: string[] = [];
    const reply = await handleGradeWriting(post(body()), deps({}, calls));
    expect(reply.status).toBe(200);
    expect(reply.headers.get("cache-control")).toBe("no-store");
    const { grade } = await reply.json();
    expect(grade.status).toBe("graded");
    expect(grade.criteria.task.showScore).toBe(false); // the real gates are closed
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });
  it("returns a block, not an error, for work that should not be graded", async () => {
    const calls: string[] = [];
    const reply = await handleGradeWriting(
      post(body({ text: "Hello Jo." })),
      deps({}, calls),
    );
    expect(reply.status).toBe(200);
    expect((await reply.json()).grade).toMatchObject({
      status: "blocked",
      reason: "too-short",
    });
    expect(calls).toEqual([]);
  });
  it("says only what kind of failure it was, never the text, and frees the slot", async () => {
    const logged: string[] = [];
    const limiter = new GradeLimiter(20, 1);
    const failing: Generate = async () => {
      throw Object.assign(new Error("secret essay text in message"), {
        status: 429,
      });
    };
    const reply = await handleGradeWriting(
      post(body()),
      deps({ generate: () => failing, limiter, log: (e) => logged.push(e) }),
    );
    expect(reply.status).toBe(502);
    expect(await reply.json()).toEqual({ error: "model" });
    expect(logged).toEqual(["model-error:429"]);
    expect(JSON.stringify(logged)).not.toContain("secret");
    // The slot was released, so the next request is not refused as busy.
    expect("release" in limiter.take()).toBe(true);
  });
});

describe("the brake", () => {
  it("locks out after ten wrong passcodes, even for the right one, then lets it in again", async () => {
    let now = 0;
    const limiter = new GradeLimiter(20, 2, () => now);
    for (let i = 0; i < 10; i++)
      expect(
        (await handleGradeWriting(post(body(), "wrong"), deps({ limiter })))
          .status,
      ).toBe(401);
    const locked = await handleGradeWriting(post(body()), deps({ limiter }));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBe(900);
    now = 901_000;
    expect(
      (await handleGradeWriting(post(body()), deps({ limiter }))).status,
    ).toBe(200);
  });
  it("allows a few at a time and a number an hour, and says how long to wait", () => {
    let now = 0;
    const limiter = new GradeLimiter(3, 2, () => now);
    const a = limiter.take();
    const b = limiter.take();
    expect("release" in a && "release" in b).toBe(true);
    expect(limiter.take()).toEqual({ retryAfter: 15 }); // two at once is the most
    if ("release" in a) a.release();
    if ("release" in a) a.release(); // releasing twice frees only one slot
    const c = limiter.take();
    expect("release" in c).toBe(true);
    if ("release" in b) b.release();
    if ("release" in c) c.release();
    now = 10 * 60_000;
    const d = limiter.take();
    expect(d).toEqual({ retryAfter: 3000 }); // three used; the first leaves the hour in 50 minutes
    now = 61 * 60_000;
    expect("release" in limiter.take()).toBe(true);
  });
  it("answers 429 with Retry-After when busy", async () => {
    const limiter = new GradeLimiter(20, 1);
    limiter.take(); // someone else holds the only slot
    const reply = await handleGradeWriting(post(body()), deps({ limiter }));
    expect(reply.status).toBe(429);
    expect(reply.headers.get("retry-after")).toBe("15");
    expect(await reply.json()).toEqual({ error: "rate", retryAfter: 15 });
  });
});
