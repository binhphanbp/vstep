import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  freshState,
  paperRunSchema,
  stateSchema,
  type StudyState,
} from "../../src/lib/learning";

/**
 * A build never knows what a newer build will add. Zod's plain object drops
 * every key it was not told about, so a tab still running the older build
 * read the profile, dropped the new field and wrote the profile back without
 * it: the newer build's data vanished the next time the older tab saved. The
 * schema now lets unknown keys through, at the top and inside the three
 * records a later release gives new fields (attempt, paper sitting, exam).
 */
const stamp = "2026-10-08T05:00:00.000Z";
const run = {
  id: "run-1",
  paperId: "133",
  version: 1,
  startedAt: 1,
  stage: 0,
  deadline: 2,
  material: 0,
  answers: {},
  essays: {},
  spoken: [],
};
const attempt = {
  id: "a1",
  lessonId: "x",
  skill: "reading",
  date: stamp,
  answers: {},
  correct: 0,
  total: 0,
  seconds: 0,
};
const exam = {
  id: "e1",
  startedAt: 1,
  stage: 0,
  deadline: 2,
  answers: {},
  writing: "",
  finished: false,
};

it("keeps keys it does not know at the top of the profile", () => {
  const stored = {
    ...freshState(),
    futureList: [{ id: "n1", body: "from a newer build" }],
    futureObject: { a: 1 },
  };
  const parsed = stateSchema.parse(JSON.parse(JSON.stringify(stored)));
  expect(parsed).toHaveProperty("futureList");
  expect(parsed).toHaveProperty("futureObject");
  expect(JSON.parse(JSON.stringify(parsed)).futureList).toEqual(
    stored.futureList,
  );
});

it("keeps keys it does not know inside an attempt, a sitting and an exam", () => {
  const stored = {
    ...freshState(),
    attempts: [{ ...attempt, futureText: "keywords" }],
    paperRuns: [{ ...run, futureMap: { "0": "numbers" }, futureList: [1] }],
    exam: { ...exam, futureText: "outline" },
  };
  const parsed = stateSchema.parse(JSON.parse(JSON.stringify(stored)));
  const again = JSON.parse(JSON.stringify(parsed));
  expect(again.attempts[0].futureText).toBe("keywords");
  expect(again.paperRuns[0].futureMap).toEqual({ "0": "numbers" });
  expect(again.paperRuns[0].futureList).toEqual([1]);
  expect(again.exam.futureText).toBe("outline");
  expect(paperRunSchema.parse(run).id).toBe("run-1");
});

it("still enforces every key it does know", () => {
  const broken = { ...freshState(), attempts: [{ ...attempt, seconds: -5 }] };
  expect(stateSchema.safeParse(broken).success).toBe(false);
  const wrongRun = { ...freshState(), paperRuns: [{ ...run, stage: 9 }] };
  expect(stateSchema.safeParse(wrongRun).success).toBe(false);
  expect(
    stateSchema.safeParse({ ...freshState(), updatedAt: "yesterday" }).success,
  ).toBe(false);
});

it("types a parsed profile without an index signature", () => {
  // A loose schema infers `[key: string]: unknown`, which would let a typo
  // such as `state.attemptz` compile. StudyState must stay exact.
  const state: StudyState = freshState();
  // @ts-expect-error unknown keys are not part of the profile's type
  void state.attemptz;
});

let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

it("a tab on an older build writes back what a newer build saved", async () => {
  const newer = {
    ...freshState(),
    futureList: [{ id: "n1", body: "kept" }],
    paperRuns: [{ ...run, futureMap: { "0": "keep me" } }],
  };
  values.set("may-study-v1", JSON.stringify(newer));
  const store = await import("../../src/lib/study-store");
  const stop = store.subscribe(() => {});
  store.updateStudy((state) => ({
    ...state,
    profile: { ...state.profile, name: "Mai" },
  }));
  const saved = JSON.parse(values.get("may-study-v1")!);
  expect(saved.profile.name).toBe("Mai");
  expect(saved.futureList).toEqual([{ id: "n1", body: "kept" }]);
  expect(saved.paperRuns[0].futureMap).toEqual({ "0": "keep me" });
  // And what it uploads to the cloud or puts in a backup carries them too.
  const backup = stateSchema.parse(store.currentBackupState());
  expect(JSON.parse(JSON.stringify(backup)).futureList).toHaveLength(1);
  stop();
});

it("restoring a backup from a newer build keeps its extra fields", async () => {
  const store = await import("../../src/lib/study-store");
  const stop = store.subscribe(() => {});
  store.replaceStudy({
    ...freshState(),
    futureList: [{ id: "n1", body: "from the backup" }],
  });
  expect(JSON.parse(values.get("may-study-v1")!).futureList).toEqual([
    { id: "n1", body: "from the backup" },
  ]);
  stop();
});
