import { describe, expect, it, vi } from "vitest";
import type { Generate } from "../../src/lib/grading/generate";
import {
  GradeLimiter,
  HEARTBEAT_MS,
  PASSCODE_HEADER,
  REQUEST_LIMITS,
  AUDIO_LIMITS,
  handleGradeSpeaking as handleSpeaking,
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
    expect(await reply.json()).toEqual({
      error: "model",
      detail: "Gemini trả về HTTP 429",
    });
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

describe("grading a Speaking performance", () => {
  const meta = (over: object = {}) =>
    JSON.stringify({
      parts: [
        {
          id: "p1",
          title: "Part 1",
          prompt: "Where are you from?",
          durationSeconds: 40,
        },
      ],
      ...over,
    });
  const audio = (size = 4000, type = "audio/webm;codecs=opus") =>
    new File([new Uint8Array(size)], "a.webm", { type });
  function form(parts: { meta?: string; files?: (File | null)[] } = {}) {
    const data = new FormData();
    data.set("meta", parts.meta ?? meta());
    (parts.files ?? [audio()]).forEach((file, i) => {
      if (file) data.set(`audio${i}`, file);
    });
    return data;
  }
  const send = (
    data: FormData,
    over: Partial<GradeDeps> = {},
    passcode: string | null = "open sesame",
    calls: string[] = [],
  ) =>
    handleSpeaking(
      new Request("http://localhost/api/grade/speaking", {
        method: "POST",
        headers: passcode ? { [PASSCODE_HEADER]: passcode } : {},
        body: data,
      }),
      deps({ generate: () => speakingGenerate(calls), ...over }, calls),
    );

  it("uses the same door as writing: not configured, wrong passcode, lockout", async () => {
    expect((await send(form(), { env: {} })).status).toBe(503);
    expect((await send(form(), {}, "nope")).status).toBe(401);
    expect((await send(form(), {}, null)).status).toBe(401);
    const limiter = new GradeLimiter(20, 2);
    for (let i = 0; i < 10; i++) await send(form(), { limiter }, "nope");
    expect((await send(form(), { limiter })).status).toBe(429);
  });

  it("grades what was sent: transcribes once, scores three times, strips the codec suffix", async () => {
    const calls: string[] = [];
    const reply = await send(form(), {}, "open sesame", calls);
    expect(reply.status).toBe(200);
    const { grade } = await reply.json();
    expect(grade.status).toBe("graded");
    expect(grade.criteria.fluency.showScore).toBe(false); // the real gates are closed
    expect(
      calls.filter((c) => c.startsWith("speaking-transcribe")),
    ).toHaveLength(1);
    expect(calls.filter((c) => c.startsWith("speaking-score"))).toHaveLength(3);
  });

  it("rejects bad requests before the model: no meta, bad meta, missing file, wrong type, tiny file, too big", async () => {
    const calls: string[] = [];
    const bad = async (data: FormData) =>
      (await send(data, {}, "open sesame", calls)).status;
    expect(await bad(form({ meta: "not json" }))).toBe(400);
    expect(await bad(form({ meta: meta({ parts: [] }) }))).toBe(400);
    expect(
      await bad(
        form({
          meta: meta({
            parts: [
              { id: "p", title: "t", prompt: "q", durationSeconds: 5000 },
            ],
          }),
        }),
      ),
    ).toBe(400);
    expect(await bad(form({ files: [null] }))).toBe(400);
    expect(await bad(form({ files: [audio(4000, "video/mp4")] }))).toBe(415);
    expect(await bad(form({ files: [audio(100)] }))).toBe(400);
    expect(await bad(form({ files: [audio(AUDIO_LIMITS.bytes + 1)] }))).toBe(
      413,
    );
    const data = new FormData();
    expect(await bad(data)).toBe(400);
    expect(calls).toEqual([]);
  });

  it("counts all the audio together against one limit", async () => {
    const two = meta({
      parts: [
        { id: "a", title: "A", prompt: "q", durationSeconds: 60 },
        { id: "b", title: "B", prompt: "q", durationSeconds: 60 },
      ],
    });
    const half = Math.floor(AUDIO_LIMITS.bytes / 2) + 10;
    const reply = await send(
      form({ meta: two, files: [audio(half), audio(half)] }),
    );
    expect(reply.status).toBe(413);
  });

  it("returns a block, not an error, for a silent recording", async () => {
    const reply = await send(form(), {
      generate: () => speakingGenerate([], true),
    });
    expect((await reply.json()).grade).toMatchObject({
      status: "blocked",
      reason: "silent",
    });
  });

  it("says only what kind of failure it was", async () => {
    const logged: string[] = [];
    const failing: Generate = async () => {
      throw Object.assign(new Error("secret speech"), { status: 503 });
    };
    const reply = await send(form(), {
      generate: () => failing,
      log: (e) => logged.push(e),
    });
    expect(reply.status).toBe(502);
    expect(logged).toEqual(["model-error:503"]);
  });
});

function speakingGenerate(calls: string[] = [], silent = false): Generate {
  const sentence =
    "I am from Hue and it is a quiet city with many old buildings and a lovely river";
  return async (request) => {
    calls.push(request.label);
    if (request.label.startsWith("speaking-transcribe"))
      return silent
        ? { transcript: "", words: [] }
        : {
            transcript: sentence,
            words: sentence
              .split(" ")
              .map((word, i) => ({ word, start: i * 1.5, end: i * 1.5 + 0.6 })),
          };
    return {
      criteria: [
        "grammar",
        "vocabulary",
        "pronunciation",
        "fluency",
        "discourse",
      ].map((criterion) => ({
        criterion,
        score: 6,
        evidence: [],
        whyNotHigher: "a",
        whyNotLower: "b",
        toRaise: "c",
      })),
      summary: "s",
    };
  };
}

async function lines(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}
const streaming = (payload: string) =>
  new Request("http://localhost/api/grade/writing", {
    method: "POST",
    headers: {
      [PASSCODE_HEADER]: "open sesame",
      accept: "application/x-ndjson",
    },
    body: payload,
  });

describe("progress while grading", () => {
  it("streams what has been done, then the grade, as lines of JSON", async () => {
    const reply = await handleGradeWriting(streaming(body()), deps());
    expect(reply.status).toBe(200);
    expect(reply.headers.get("content-type")).toContain("application/x-ndjson");
    expect(reply.headers.get("cache-control")).toBe("no-store");
    const events = await lines(reply);
    expect(events[0]).toEqual({ type: "progress", stage: "started" });
    const runs = events.filter(
      (e) => e.type === "progress" && e.stage === "runs",
    );
    expect(runs.map((e) => e.done)).toEqual([0, 1, 2, 3]);
    expect(runs.every((e) => e.total === 3)).toBe(true);
    const last = events[events.length - 1] as {
      type: string;
      grade: { status: string };
    };
    expect(last.type).toBe("grade");
    expect(last.grade.status).toBe("graded");
  });

  it("answers a plain request with one JSON body, as before", async () => {
    const reply = await handleGradeWriting(post(body()), deps());
    expect(reply.headers.get("content-type")).toContain("application/json");
    expect((await reply.json()).grade.status).toBe("graded");
  });

  it("says in the stream that it failed, with only the kind of failure", async () => {
    const logged: string[] = [];
    const failing: Generate = async () => {
      throw Object.assign(new Error("secret essay"), { status: 429 });
    };
    const reply = await handleGradeWriting(
      streaming(body()),
      deps({ generate: () => failing, log: (e) => logged.push(e) }),
    );
    const events = await lines(reply);
    expect(events[events.length - 1]).toEqual({
      type: "error",
      error: "model",
      detail: "Gemini trả về HTTP 429",
    });
    expect(JSON.stringify(events)).not.toContain("secret");
    expect(logged).toEqual(["model-error:429"]);
  });

  it("keeps a quiet connection alive with a ping, and frees its slot at the end", async () => {
    vi.useFakeTimers();
    try {
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => (release = resolve));
      const slow: Generate = async (request) => {
        await gate;
        return fakeGenerate()(request);
      };
      const limiter = new GradeLimiter(20, 1);
      const reply = await handleGradeWriting(
        streaming(body()),
        deps({ generate: () => slow, limiter }),
      );
      const reader = reply.body!.getReader();
      const decoder = new TextDecoder();
      const first = decoder.decode((await reader.read()).value);
      expect(first).toContain('"stage":"started"');
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2 + 10);
      let seen = "";
      // The pings are already queued: read until both are seen.
      while ((seen.match(/"type":"ping"/g) ?? []).length < 2) {
        const chunk = await reader.read();
        if (chunk.done) break;
        seen += decoder.decode(chunk.value);
      }
      expect((seen.match(/"type":"ping"/g) ?? []).length).toBe(2);
      // The one slot is still held while it works…
      expect("retryAfter" in limiter.take()).toBe(true);
      release();
      let rest = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        rest += decoder.decode(chunk.value);
      }
      expect(rest).toContain('"type":"grade"');
      // …and free again once it is over.
      expect("release" in limiter.take()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
