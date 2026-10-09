import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GradeRequestError,
  requestSpeakingGrade,
  requestWritingGrade,
} from "../../src/lib/grading/client";
import { clock, progressText } from "../../src/lib/grading/progress-text";

const payload = {
  task: 1 as const,
  slotId: "s",
  prompt: "p".repeat(20),
  text: "t",
};
const grade = { status: "graded", summary: "x" };

/** A response whose body arrives in the pieces given, as a slow stream would. */
function stream(pieces: string[], status = 200) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const piece of pieces) controller.enqueue(encoder.encode(piece));
        controller.close();
      },
    }),
    { status, headers: { "content-type": "application/x-ndjson" } },
  );
}
const lines = (...events: object[]) =>
  events.map((e) => JSON.stringify(e) + "\n");
const reply = (response: Response | Error) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  );
const failure = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as GradeRequestError;
  }
  throw new Error("expected a failure");
};

afterEach(() => vi.unstubAllGlobals());

describe("reading a grading answer", () => {
  it("asks for a stream and reports each stage as it arrives", async () => {
    reply(
      stream(
        lines(
          { type: "progress", stage: "started" },
          { type: "progress", stage: "runs", done: 1, total: 3 },
          { type: "ping" },
          { type: "grade", grade },
        ),
      ),
    );
    const seen: unknown[] = [];
    const result = await requestWritingGrade(payload, "code", undefined, (p) =>
      seen.push(p),
    );
    expect(result).toEqual(grade);
    expect(seen).toEqual([
      { type: "progress", stage: "started" },
      { type: "progress", stage: "runs", done: 1, total: 3 },
    ]);
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers.accept).toContain("application/x-ndjson");
    expect(call[1].headers["x-grader-passcode"]).toBe("code");
  });

  it("joins a line that arrives in two pieces", async () => {
    const whole = lines({ type: "grade", grade }).join("");
    reply(stream([whole.slice(0, 9), whole.slice(9)]));
    expect(await requestWritingGrade(payload, "c")).toEqual(grade);
  });

  it("reads a last line that has no newline after it", async () => {
    reply(stream([JSON.stringify({ type: "grade", grade })]));
    expect(await requestWritingGrade(payload, "c")).toEqual(grade);
  });

  it("still reads a plain JSON answer", async () => {
    reply(Response.json({ grade }));
    expect(await requestWritingGrade(payload, "c")).toEqual(grade);
    reply(Response.json({ grade: { status: "blocked", reason: "too-short" } }));
    expect(await requestWritingGrade(payload, "c")).toMatchObject({
      status: "blocked",
    });
  });

  it("says the connection broke when the stream ends with no result", async () => {
    reply(stream(lines({ type: "progress", stage: "started" })));
    const error = await failure(requestWritingGrade(payload, "c"));
    expect(error).toBeInstanceOf(GradeRequestError);
    expect(error.kind).toBe("network");
    expect(error.detail).toContain("kết nối đứt");
  });

  it("passes on a failure reported inside the stream", async () => {
    reply(
      stream(
        lines(
          { type: "progress", stage: "started" },
          { type: "error", error: "model" },
        ),
      ),
    );
    expect((await failure(requestWritingGrade(payload, "c"))).kind).toBe(
      "model",
    );
  });

  it("names the HTTP status when the answer is a page, not JSON", async () => {
    reply(
      new Response("<html>timeout</html>", {
        status: 504,
        headers: { "content-type": "text/html" },
      }),
    );
    const error = await failure(requestWritingGrade(payload, "c"));
    expect(error.kind).toBe("model");
    expect(error.detail).toContain("HTTP 504");
  });

  it("keeps the refusal, how long to wait, and the status", async () => {
    reply(Response.json({ error: "rate", retryAfter: 42 }, { status: 429 }));
    const error = await failure(requestWritingGrade(payload, "c"));
    expect([error.kind, error.retryAfter, error.detail]).toEqual([
      "rate",
      42,
      "HTTP 429",
    ]);
  });

  it("tells a stop from a failure, and gives the reason for a network error", async () => {
    reply(Object.assign(new Error("aborted"), { name: "AbortError" }));
    expect((await failure(requestWritingGrade(payload, "c"))).kind).toBe(
      "aborted",
    );
    reply(new TypeError("Failed to fetch"));
    const error = await failure(requestWritingGrade(payload, "c"));
    expect(error.kind).toBe("network");
    expect(error.detail).toBe("TypeError: Failed to fetch");
  });

  it("rejects a grade with a status it does not know, in both forms", async () => {
    reply(stream(lines({ type: "grade", grade: { status: "weird" } })));
    expect((await failure(requestWritingGrade(payload, "c"))).kind).toBe(
      "bad-reply",
    );
    reply(Response.json({ grade: { status: "weird" } }));
    expect((await failure(requestWritingGrade(payload, "c"))).kind).toBe(
      "bad-reply",
    );
  });

  it("sends the recordings as a multipart form and reads the same stream", async () => {
    reply(stream(lines({ type: "grade", grade })));
    const result = await requestSpeakingGrade(
      [
        {
          id: "a",
          title: "A",
          prompt: "q",
          durationSeconds: 5,
          audio: new Blob(["xx"], { type: "audio/webm" }),
        },
      ],
      "c",
    );
    expect(result).toEqual(grade);
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].body).toBeInstanceOf(FormData);
    expect((call[1].body as FormData).get("audio0")).toBeInstanceOf(Blob);
  });
});

describe("what the screen says while it waits", () => {
  it("shows time as minutes and seconds", () => {
    expect([clock(0), clock(9), clock(65), clock(600)]).toEqual([
      "0:00",
      "0:09",
      "1:05",
      "10:00",
    ]);
  });
  it("describes each stage", () => {
    expect(progressText(null)).toMatch(/đang chờ máy chủ/);
    expect(progressText({ stage: "started" })).toMatch(/đang chờ máy chủ/);
    expect(progressText({ stage: "runs", done: 0, total: 3 })).toBe(
      "Đang chấm độc lập 3 lần cùng lúc…",
    );
    expect(progressText({ stage: "runs", done: 2, total: 3 })).toBe(
      "Đã xong 2/3 lần chấm độc lập.",
    );
    expect(progressText({ stage: "extra", done: 1, total: 2 })).toMatch(
      /chấm thêm: xong 1\/2/,
    );
    expect(progressText({ stage: "transcribe", done: 1, total: 3 })).toMatch(
      /chép lời: xong 1\/3/,
    );
  });
});
