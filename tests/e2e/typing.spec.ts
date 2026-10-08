import { test, expect, type Page } from "@playwright/test";
import { lessons } from "../../src/lib/content";

/**
 * Gùa types Vietnamese with an input method, not with a plain keyboard. Two
 * families of them exist and a box has to survive both:
 *
 * - those that compose in place (the built-in Telex on macOS and Windows): the
 *   word stays underlined and changes with every key until it is committed;
 * - those that correct after the fact (Unikey, EVKey): they send Backspace and
 *   then the accented letter, so a box can be emptied for an instant in the
 *   middle of a word.
 *
 * Neither can be run here for real. They are imitated as closely as a browser
 * lets a test do it: the first through the same protocol call the browser's own
 * input-method plumbing uses, the second with the very key events.
 */

const cafe = lessons.find((lesson) => lesson.id === "reading-cafe")!;
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("may-study-v1")!));

/**
 * Counts the composition events the page really received, so that a test of an
 * input method cannot pass by typing plain text without ever composing.
 */
async function watchComposition(page: Page) {
  await page.evaluate(() => {
    const seen = { start: 0, update: 0, end: 0 };
    (window as unknown as { __ime: typeof seen }).__ime = seen;
    for (const name of ["start", "update", "end"] as const)
      document.addEventListener(
        `composition${name}`,
        () => void seen[name]++,
        true,
      );
  });
}
const composition = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __ime: { start: number; update: number } }).__ime,
  );

/** Types a word the way a composing input method does, then commits it. */
async function compose(page: Page, steps: string[], commit: string) {
  const client = await page.context().newCDPSession(page);
  for (const text of steps)
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  await client.send("Input.insertText", { text: commit });
  await client.detach();
}

test("a scratch page opened by hand stays open while it is emptied and written again", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await page.locator("summary", { hasText: "Nháp" }).click();
  const details = page.locator("details.scratch");
  const pad = page.getByRole("textbox", { name: "Nháp khi đọc" });
  await pad.click();
  await page.keyboard.type("keyword");
  await expect(pad).toHaveValue("keyword");
  // Emptying the page is an ordinary thing to do, and it must not fold the
  // page away under the cursor.
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await expect(pad).toHaveValue("");
  await expect(details).toHaveJSProperty("open", true);
  await expect(pad).toBeFocused();
  await page.keyboard.type("again");
  await expect(pad).toHaveValue("again");
});

test("a scratch page that opened itself because it had text stays open when it is emptied", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await page.locator("summary", { hasText: "Nháp" }).click();
  const pad = page.getByRole("textbox", { name: "Nháp khi đọc" });
  await pad.fill("giữ lại một chút");
  // Come back to the lesson: nobody clicks anything, the page opens by itself.
  await page.reload();
  await expect(pad).toHaveValue("giữ lại một chút");
  await pad.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await expect(pad).toHaveValue("");
  await expect(page.locator("details.scratch")).toHaveJSProperty("open", true);
  await page.keyboard.insertText("ê");
  await expect(pad).toHaveValue("ê");
});

test("closing a scratch page by hand is respected, and a click opens it again", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  const details = page.locator("details.scratch");
  const heading = page.locator("summary", { hasText: "Nháp" });
  await expect(details).toHaveJSProperty("open", false);
  await heading.click();
  await expect(details).toHaveJSProperty("open", true);
  await page.getByRole("textbox", { name: "Nháp khi đọc" }).fill("một dòng");
  await heading.click();
  await expect(details).toHaveJSProperty("open", false);
  // Still shut while the text is there, because she shut it.
  await page.waitForTimeout(300);
  await expect(details).toHaveJSProperty("open", false);
  await heading.click();
  await expect(details).toHaveJSProperty("open", true);
});

test("an input method that corrects with Backspace can start a scratch page", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await page.locator("summary", { hasText: "Nháp" }).click();
  const pad = page.getByRole("textbox", { name: "Nháp khi đọc" });
  await pad.click();
  // Telex "ee" → "ê" at the first letter of the page, the way Unikey sends it:
  // the letter, a Backspace that empties the box, then the accented letter.
  await page.keyboard.type("e");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("ê");
  await page.keyboard.type("m");
  await expect(pad).toHaveValue("êm");
  await expect(pad).toBeFocused();
  await expect(page.locator("details.scratch")).toHaveJSProperty("open", true);
  const store = await saved(page);
  expect(JSON.parse(store.drafts["work:reading-cafe"]).scratch.main).toBe("êm");
});

test("a word composed in place lands once, in the scratch page", async ({
  page,
}) => {
  await page.goto("/practice/reading-cafe");
  await page.locator("summary", { hasText: "Nháp" }).click();
  const pad = page.getByRole("textbox", { name: "Nháp khi đọc" });
  await pad.click();
  await watchComposition(page);
  await compose(page, ["t", "ti", "tiê", "tiế", "tiếng"], "tiếng");
  await page.keyboard.type(" ");
  await compose(page, ["V", "Vi", "Việ", "Việt"], "Việt");
  await expect(pad).toHaveValue("tiếng Việt");
  expect((await composition(page)).update).toBeGreaterThanOrEqual(8);
  const store = await saved(page);
  expect(JSON.parse(store.drafts["work:reading-cafe"]).scratch.main).toBe(
    "tiếng Việt",
  );
});

/** Answers the lesson, so that the notes under each question are there. */
async function openNoteBox(page: Page) {
  await page.goto("/practice/reading-cafe");
  for (const entry of cafe.questions) {
    await page
      .locator(`input[name="${entry.id}"][value="${entry.answer}"]`)
      .check();
    await page
      .locator(".question")
      .filter({ has: page.locator(`input[name="${entry.id}"]`) })
      .getByRole("button", { name: "Chưa chắc" })
      .click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  const first = page.locator(".question").first();
  await first.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  return {
    first,
    box: first.getByRole("textbox", { name: "Ghi chú của Gùa cho câu này" }),
  };
}

test("a note written with a composing input method is kept whole, even when the pause outlasts the autosave", async ({
  page,
}) => {
  const { first, box } = await openNoteBox(page);
  await box.click();
  await watchComposition(page);
  await compose(page, ["b", "bẫ", "bẫy"], "bẫy");
  await page.keyboard.type(": ");
  // The word is still being composed when the autosave fires (0,9 s); the box
  // must neither lose the underlined letters nor type them twice afterwards.
  const client = await page.context().newCDPSession(page);
  for (const text of ["p", "ph", "phủ"])
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  await expect(first.getByRole("status")).toHaveText("Đã lưu", {
    timeout: 5000,
  });
  for (const text of ["phủ ", "phủ đ", "phủ đị", "phủ định"])
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  await client.send("Input.insertText", { text: "phủ định" });
  await client.detach();
  await expect(box).toHaveValue("bẫy: phủ định");
  expect((await composition(page)).update).toBeGreaterThanOrEqual(8);
  await expect(first.getByRole("status")).toHaveText("Đã lưu", {
    timeout: 5000,
  });
  const notes = (await saved(page)).notes;
  expect(notes).toHaveLength(1);
  expect(notes[0].body).toBe("bẫy: phủ định");
});

test("a note started with a Backspace correction is not lost or deleted on the way", async ({
  page,
}) => {
  const { first, box } = await openNoteBox(page);
  // "ôn": Telex "oo" → "ô" at the very first letter, sent as o, Backspace, ô.
  await box.click();
  await page.keyboard.type("o");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("ô");
  await page.keyboard.type("n tập");
  await expect(box).toHaveValue("ôn tập");
  await expect(first.getByRole("status")).toHaveText("Đã lưu", {
    timeout: 5000,
  });
  expect(
    (await saved(page)).notes.map((n: { body: string }) => n.body),
  ).toEqual(["ôn tập"]);
});

test("the notebook finds a word typed with the marks in either form", async ({
  page,
}) => {
  const { first, box } = await openNoteBox(page);
  await box.fill("Bẫy: từ đồng nghĩa ở đoạn hai");
  await expect(first.getByRole("status")).toHaveText("Đã lưu");
  await page.goto("/notes");
  const search = page.getByRole("textbox", { name: "Tìm trong ghi chú" });
  // Typed as one code point per letter (most input methods)…
  await search.fill("đồng nghĩa".normalize("NFC"));
  await expect(page.locator(".note-card")).toHaveCount(1);
  // …or as a letter followed by its marks (some Mac layouts), or with no marks.
  await search.fill("đồng nghĩa".normalize("NFD"));
  await expect(page.locator(".note-card")).toHaveCount(1);
  await search.fill("dong nghia");
  await expect(page.locator(".note-card")).toHaveCount(1);
  await search.fill("nghĩa đồng");
  await expect(page.locator(".note-card")).toHaveCount(1);
});
