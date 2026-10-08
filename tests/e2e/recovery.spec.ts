import { test, expect, type Page } from "@playwright/test";
import { freshState, type StudyState } from "../../src/lib/learning";
import { addNote } from "../../src/lib/notes";

/**
 * A tab that has been open since before notes existed still runs the old code.
 * Its next save writes the profile with only the fields it knows, and the notes
 * go with the rest. Such a tab cannot be run here, so what it does is written
 * out: the same profile, without the fields it cannot hold.
 */

const KEY = "may-study-v1";

function withNotes(count = 2): StudyState {
  let state = freshState();
  for (let index = 1; index <= count; index++) {
    const outcome = addNote(
      state,
      {
        body: `ghi chú số ${index}`,
        anchor: {
          source: "paper",
          sourceId: "132",
          version: 1,
          skill: "listening",
          group: "Đề 132",
          label: `Đề 132 · Nghe · Câu ${index}`,
          itemId: `132-${index}`,
        },
      },
      new Date(Date.parse("2026-10-08T01:00:00.000Z") + index * 60_000),
      `seed-${index}`,
    );
    expect(outcome.error).toBeUndefined();
    state = outcome.state;
  }
  return state;
}

async function seed(page: Page, state: StudyState) {
  await page.addInitScript(
    ({ key, initial }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(initial));
    },
    { key: KEY, initial: state },
  );
}

/** What an older build writes: the profile minus what it cannot hold, plus one real change. */
function oldTabSaves(page: Page, updatedAt?: string) {
  return page.evaluate(
    ({ key, at }) => {
      const state = JSON.parse(localStorage.getItem(key)!);
      delete state.notes;
      delete state.rev;
      state.drafts = { ...state.drafts, "quiz:made-in-the-old-tab": "1" };
      state.updatedAt = at ?? new Date(Date.now() + 5000).toISOString();
      localStorage.setItem(key, JSON.stringify(state));
    },
    { key: KEY, at: updatedAt },
  );
}
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);

/** The notes in the copy kept in IndexedDB, or null when there is no copy. */
const copyNotes = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[] | null>((resolve) => {
        const open = indexedDB.open("may-recovery-v1", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("copy");
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          const request = open.result
            .transaction("copy", "readonly")
            .objectStore("copy")
            .get("profile");
          request.onsuccess = () => {
            open.result.close();
            const value = request.result as
              { saved: { notes?: { id: string }[] } } | undefined;
            resolve(value ? (value.saved.notes ?? []).map((n) => n.id) : null);
          };
          request.onerror = () => resolve(null);
        };
      }),
  );

test("an older tab that saves cannot erase the notes while a tab of this build is open", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  const older = await page.context().newPage();
  await older.goto("/settings");
  await oldTabSaves(older);
  // This tab notices the profile came back without them, and puts them back.
  await expect.poll(async () => (await saved(page)).notes?.length).toBe(2);
  const state = await saved(page);
  expect(state.rev).toBe(2);
  // What the older tab really did is kept.
  expect(state.drafts["quiz:made-in-the-old-tab"]).toBe("1");
  await expect(page.locator(".note-card")).toHaveCount(2);
  await expect(page.locator(".toast")).toContainText("bản cũ");
  await older.close();
});

test("an older tab that saved from a stale view is put right too", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  const older = await page.context().newPage();
  await older.goto("/settings");
  // What it wrote is dated before anything this tab has: not "newer", and
  // still a profile without the notes.
  await oldTabSaves(older, "2020-01-01T00:00:00.000Z");
  await expect.poll(async () => (await saved(page)).notes?.length).toBe(2);
  expect((await saved(page)).rev).toBe(2);
  await older.close();
});

test("a deliberate change from a tab of this build is never undone by the same rule", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  const other = await page.context().newPage();
  await other.goto("/notes");
  await expect(other.locator(".note-card")).toHaveCount(2);
  // Delete both for good in the other tab: first into the bin, then out of it.
  const live = other.locator(".note-card:not(.binned)");
  await live.first().getByRole("button", { name: "Xóa" }).click();
  await expect(live).toHaveCount(1);
  await live.first().getByRole("button", { name: "Xóa" }).click();
  other.on("dialog", (dialog) => dialog.accept());
  await other.getByText("Đã xóa gần đây (2)").click();
  await other.getByRole("button", { name: "Dọn sạch mục này" }).click();
  await expect.poll(async () => (await saved(other)).notes).toEqual([]);
  // The first tab follows, and does not put them back.
  await page.waitForTimeout(800);
  expect((await saved(page)).notes).toEqual([]);
  await expect(page.locator(".note-card")).toHaveCount(0);
  await other.close();
});

test("a backup restored on purpose, with no notes in it, is not given the old notes back", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  const other = await page.context().newPage();
  await other.goto("/settings");
  other.on("dialog", (dialog) => dialog.accept());
  const restored = freshState();
  restored.profile.name = "Mai";
  restored.profile.onboarded = true;
  await other.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(restored)),
  });
  await expect(other.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue("Mai");
  await page.waitForTimeout(800);
  const state = await saved(page);
  expect(state.profile.name).toBe("Mai");
  expect(state.notes ?? []).toEqual([]);
  expect(state.rev).toBe(2);
  await other.close();
});

test("with no tab of this build open, the notes come back from the copy the next time one opens", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  // The copy is written a moment after the app settles.
  await expect.poll(() => copyNotes(page)).toEqual(["seed-1", "seed-2"]);
  // An older tab saves while no tab of this build is open: the page below is
  // of the same site but runs none of its code.
  await page.goto("/manifest.webmanifest");
  await oldTabSaves(page);
  expect((await saved(page)).notes).toBeUndefined();
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  const state = await saved(page);
  expect(state.notes.map((note: { id: string }) => note.id)).toEqual([
    "seed-1",
    "seed-2",
  ]);
  expect(state.drafts["quiz:made-in-the-old-tab"]).toBe("1");
  expect(state.rev).toBe(2);
  await expect(page.locator(".toast")).toContainText("bản dự phòng");
});

test("a profile that was wiped does not get the old notes back from the copy", async ({
  page,
}) => {
  // Written once by hand, not by a script that would write it again after the wipe.
  await page.goto("/");
  await page.evaluate(
    ({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)),
    { key: KEY, initial: withNotes() },
  );
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  await expect.poll(() => copyNotes(page)).toEqual(["seed-1", "seed-2"]);
  await page.evaluate((key) => localStorage.removeItem(key), KEY);
  await page.reload();
  await expect(page.getByText("Chưa có ghi chú nào")).toBeVisible();
  // The copy is dropped with the profile it belonged to.
  await expect.poll(() => copyNotes(page)).toBeNull();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), KEY),
  ).toBeNull();
});

test("an unreadable copy cannot make the profile unreadable", async ({
  page,
}) => {
  await seed(page, withNotes(1));
  await page.goto("/notes");
  await expect.poll(() => copyNotes(page)).toEqual(["seed-1"]);
  await page.goto("/manifest.webmanifest");
  // A copy that is not a copy of notes, and an older tab saving after it.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("may-recovery-v1", 1);
        open.onsuccess = () => {
          const tx = open.result.transaction("copy", "readwrite");
          tx.objectStore("copy").put(
            {
              savedAt: "2026-10-08T00:00:00.000Z",
              saved: { notes: [{ id: 5, body: { not: "text" } }] },
            },
            "profile",
          );
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
        };
      }),
  );
  await oldTabSaves(page);
  await page.goto("/notes");
  await expect(
    page.getByRole("heading", { name: /Những điều mình tự ghi lại/ }),
  ).toBeVisible();
  // The profile still reads; the bad copy was not applied.
  await expect(page.getByText("Không đọc được dữ liệu")).toHaveCount(0);
  const state = await saved(page);
  expect(state.notes ?? []).toEqual([]);
  expect(state.drafts["quiz:made-in-the-old-tab"]).toBe("1");
  // What could not be applied is kept, not cleared: the profile has not been
  // saved by this build since, so it may still be one an older tab emptied.
  await page.waitForTimeout(2600);
  expect(await copyNotes(page)).toEqual([5]);
});

test("a copy that cannot be read this time is left alone, and asked for again", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect.poll(() => copyNotes(page)).toEqual(["seed-1", "seed-2"]);
  await page.goto("/manifest.webmanifest");
  await oldTabSaves(page);
  // From here on, the first try at opening the copy fails, as a busy disk can
  // make it.
  await page.context().addInitScript(() => {
    const real = indexedDB.open.bind(indexedDB);
    let calls = 0;
    indexedDB.open = (...args: Parameters<IDBFactory["open"]>) => {
      if (++calls > 1) return real(...args);
      const request = {} as IDBOpenDBRequest;
      setTimeout(() => request.onerror?.(new Event("error")), 0);
      return request;
    };
  });
  await page.goto("/notes");
  await expect(
    page.getByRole("heading", { name: /Những điều mình tự ghi lại/ }),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  // Nothing could be put back yet, and nothing was thrown away.
  expect((await saved(page)).notes ?? []).toEqual([]);
  expect(await copyNotes(page)).toEqual(["seed-1", "seed-2"]);
  // It asks again a few seconds later, and this time the copy answers.
  await expect
    .poll(async () => (await saved(page)).notes?.length, { timeout: 15000 })
    .toBe(2);
  await expect(page.locator(".note-card")).toHaveCount(2);
});

test("a profile is stamped when it is opened, once it is known to be whole", async ({
  page,
}) => {
  await seed(page, withNotes());
  await page.goto("/notes");
  await expect.poll(async () => (await saved(page)).rev).toBe(2);
  const state = await saved(page);
  expect(state.notes).toHaveLength(2);
});

test("clearing a scratch page on purpose is not put back as though an older tab had dropped it", async ({
  page,
}) => {
  const state = withNotes();
  const withWork = {
    ...state,
    paperRuns: [
      {
        id: "run-1",
        paperId: "132",
        version: 1,
        startedAt: 1,
        stage: 0,
        deadline: 2,
        material: 0,
        answers: {},
        essays: {},
        spoken: [],
        scratch: { reading: "từ khóa" },
      },
    ],
  } as unknown as StudyState;
  await seed(page, withWork);
  await page.goto("/notes");
  await expect.poll(async () => (await saved(page)).rev).toBe(2);
  const other = await page.context().newPage();
  await other.goto("/manifest.webmanifest");
  // A tab that keeps what it does not know (stamp included) clears the page.
  await other.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key)!);
    delete raw.paperRuns[0].scratch;
    raw.updatedAt = new Date(Date.now() + 5000).toISOString();
    localStorage.setItem(key, JSON.stringify(raw));
  }, KEY);
  await page.waitForTimeout(800);
  expect((await saved(page)).paperRuns[0].scratch).toBeUndefined();
  await expect(page.locator(".toast")).toHaveCount(0);
  await other.close();
});
