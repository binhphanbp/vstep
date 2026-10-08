import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { freshState, type StudyState } from "../../src/lib/learning";
import { lessons } from "../../src/lib/content";
import { NOTE_LIMITS, addNote } from "../../src/lib/notes";
import {
  lessonQuestionPlace,
  paperItemPlace,
  paperWholePlace,
} from "../../src/lib/note-anchors";

/** The imported paper the review tests are built on, read from its own file. */
const paper = JSON.parse(readFileSync("public/papers/132.json", "utf8")) as {
  id: "132";
  version: number;
  sections: {
    slots: {
      part: string;
      items: { id: string; number: number; text: string }[];
    }[];
  }[];
};
const listening = paper.sections[0].slots.flatMap((slot) =>
  slot.items.map((item) => ({ slot, item })),
);
const firstSlot = listening[0].slot;
const firstItem = listening[0].item;
const secondSlot = listening[1].slot;
const secondItem = listening[1].item;
const readingItem = paper.sections[1].slots[0].items[0];

const finishedRun = () => ({
  id: "run-seeded",
  paperId: "132",
  version: paper.version,
  startedAt: Date.parse("2026-10-07T03:00:00.000Z"),
  stage: 3,
  deadline: Date.parse("2026-10-07T03:00:01.000Z"),
  material: 0,
  answers: {},
  essays: {},
  spoken: [],
  mode: "practice",
  finishedAt: "2026-10-07T04:30:00.000Z",
});
const withRun = (): StudyState => ({
  ...freshState(),
  paperRuns: [finishedRun()] as unknown as StudyState["paperRuns"],
});
const at = (minutes: number) =>
  new Date(Date.parse("2026-10-08T01:00:00.000Z") + minutes * 60_000);

/** Writes a note the way the app does, so the seeded state is one it could have made. */
function seedNote(
  state: StudyState,
  place: ReturnType<typeof paperItemPlace>,
  body: string,
  minutes: number,
  star = false,
) {
  const outcome = addNote(
    state,
    { body, anchor: place.anchor, star },
    at(minutes),
    `seed-${minutes}`,
  );
  expect(outcome.error).toBeUndefined();
  return outcome.state;
}

/** Seeds the saved profile before the app loads, but only the first time. */
async function seed(page: Page, state: StudyState) {
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state);
}
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("may-study-v1")!));

test("a note written under a question saves itself, comes back, and can be undone", async ({
  page,
}) => {
  await seed(page, withRun());
  await page.goto("/papers/132");
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  const slot = page.locator(".paper-review details").first();
  await slot.locator("summary").first().click();
  const item = page.locator(`#item-${firstItem.id}`);
  await item.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  const box = item.getByRole("textbox", {
    name: "Ghi chú của Gùa cho câu này",
  });
  await expect(box).toBeFocused();
  // A quick suggestion adds its words; the rest is typed.
  await item.getByRole("button", { name: "Bẫy: phủ định" }).click();
  await box.press("End");
  await box.pressSequentially(" — người nói đổi ý ở câu cuối");
  await expect(item.getByRole("status")).toHaveText("Đã lưu");
  // Nothing was pressed to save it.
  let state = await saved(page);
  expect(state.notes).toHaveLength(1);
  expect(state.notes[0].body).toBe(
    "Bẫy: phủ định — người nói đổi ý ở câu cuối",
  );
  expect(state.notes[0].anchor).toMatchObject({
    source: "paper",
    sourceId: "132",
    skill: "listening",
    group: "Đề 132",
    label: `Đề 132 · Nghe · ${firstSlot.part} · Câu ${firstItem.number}`,
    itemId: firstItem.id,
  });
  await item.getByRole("button", { name: "Xong" }).click();
  await expect(item.locator(".note-card")).toContainText("người nói đổi ý");
  // It is still there after a reload, under the same question and no other.
  await page.reload();
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  await expect(page.locator(`#item-${firstItem.id} .note-card`)).toContainText(
    "người nói đổi ý",
  );
  await expect(page.locator(`#item-${secondItem.id} .note-card`)).toHaveCount(
    0,
  );
  // Deleting offers an undo, and the undo brings back the very same note.
  const card = page.locator(`#item-${firstItem.id} .note-card`);
  await card.getByRole("button", { name: "Xóa" }).click();
  await expect(card).toHaveCount(0);
  // The pressed button went with its note: focus moves to the way back.
  await expect(page.getByRole("button", { name: "Hoàn tác" })).toBeFocused();
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(card).toContainText("người nói đổi ý");
  state = await saved(page);
  expect(state.notes).toHaveLength(1);
  expect(state.notes[0].deletedAt).toBeUndefined();
});

test("typing and leaving at once does not lose the last words", async ({
  page,
}) => {
  await seed(page, withRun());
  await page.goto("/papers/132");
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  const item = page.locator(`#item-${firstItem.id}`);
  await item.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await item
    .getByRole("textbox", { name: "Ghi chú của Gùa cho câu này" })
    .fill("Chưa kịp đợi tự lưu");
  // Well inside the pause that autosave waits for.
  await page.goto("/settings");
  const state = await saved(page);
  expect(state.notes?.[0]?.body).toBe("Chưa kịp đợi tự lưu");
});

test("an empty box leaves nothing behind, and an emptied note is deleted", async ({
  page,
}) => {
  await seed(page, withRun());
  await page.goto("/papers/132");
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  const item = page.locator(`#item-${firstItem.id}`);
  await item.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await item.getByRole("button", { name: "Xong" }).click();
  expect((await saved(page)).notes ?? []).toHaveLength(0);
  // Write one, then empty it: it goes to the bin instead of staying blank.
  await item.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  const box = item.getByRole("textbox", {
    name: "Ghi chú của Gùa cho câu này",
  });
  await box.fill("sẽ bị xóa sạch");
  await expect(item.getByRole("status")).toHaveText("Đã lưu");
  await box.fill("");
  await item.getByRole("button", { name: "Xong" }).click();
  await expect(item.locator(".note-card")).toHaveCount(0);
  const notes = (await saved(page)).notes;
  expect(notes).toHaveLength(1);
  expect(notes[0].deletedAt).toBeTruthy();
});

test("a note about the whole paper, a Writing task and a retried question", async ({
  page,
}) => {
  await seed(page, withRun());
  await page.goto("/papers/132");
  const whole = page.getByRole("region", { name: "Ghi chú về cả đề" });
  await whole.getByRole("button", { name: "Ghi chú cho cả đề này" }).click();
  await whole
    .getByRole("textbox", { name: "Ghi chú của Gùa cho cả đề này" })
    .fill("Phần Đọc hết giờ quá sớm");
  await expect(whole.getByRole("status")).toHaveText("Đã lưu");
  await whole.getByRole("button", { name: "Xong" }).click();
  // The retry drill shows the notes of a question only after it is answered.
  await page
    .getByRole("button", { name: /Làm lại \d+ câu sai và bỏ trống/ })
    .click();
  const drill = page.getByRole("region", { name: "Làm lại câu sai" });
  await expect(drill.getByRole("button", { name: /^Ghi chú cho/ })).toHaveCount(
    0,
  );
  await drill.getByRole("radio").first().check();
  await drill.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await drill
    .getByRole("textbox", { name: "Ghi chú của Gùa cho câu này" })
    .fill("Làm lại vẫn sai ở đây");
  await expect(drill.getByRole("status").last()).toHaveText("Đã lưu");
  await drill.getByRole("button", { name: "Xong" }).click();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await page.getByRole("button", { name: "Dừng làm lại" }).click();
  // Both notes are in the notebook, the whole-paper one named as such.
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(2);
  await expect(page.getByText("Đề 132 · cả đề")).toBeVisible();
  await expect(
    page.getByText(
      `Đề 132 · Nghe · ${firstSlot.part} · Câu ${firstItem.number}`,
    ),
  ).toBeVisible();
});

test("the notebook finds, filters, stars, opens the place, deletes and restores", async ({
  page,
}) => {
  let state = withRun();
  state = seedNote(
    state,
    paperItemPlace(paper, 0, firstSlot, firstItem),
    "Bẫy: người nói đổi ý ở câu cuối",
    1,
  );
  state = seedNote(
    state,
    paperItemPlace(paper, 0, secondSlot, secondItem),
    "Không nghe kịp con số",
    2,
  );
  state = seedNote(
    state,
    paperItemPlace(paper, 1, paper.sections[1].slots[0], readingItem),
    "Đọc thiếu câu cuối đoạn",
    3,
  );
  const lesson = lessons.find((entry) => entry.id === "reading-cafe")!;
  state = seedNote(
    state,
    lessonQuestionPlace(lesson, lesson.questions[0]),
    "Từ mới: reluctant",
    4,
  );
  await seed(page, state);
  await page.goto("/notes");
  // The notes in the bin are cards too, but are not part of the list.
  const cards = page.locator(".note-card:not(.binned)");
  await expect(cards).toHaveCount(4);
  // Newest edit first.
  await expect(cards.first()).toContainText("reluctant");

  // Search ignores marks, as typing Vietnamese without them is common.
  await page
    .getByRole("textbox", { name: "Tìm trong ghi chú" })
    .fill("bay doi y");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("đổi ý");
  await page.getByRole("textbox", { name: "Tìm trong ghi chú" }).fill("");

  // By skill, and by paper or lesson.
  await page.getByRole("button", { name: "Đọc", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByLabel("Đề và bài").selectOption({ label: "Đề 132" });
  await expect(cards).toHaveCount(3);
  await page.getByLabel("Đề và bài").selectOption("all");

  // Starred ("Cần nhớ").
  const target = cards.filter({ hasText: "con số" });
  await target.getByRole("button", { name: "Cần nhớ" }).click();
  await expect(target.getByRole("button", { name: "Cần nhớ" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "★ Cần nhớ" }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "★ Cần nhớ" }).click();

  // Edit in place.
  const edited = cards.filter({ hasText: "reluctant" });
  await edited.getByRole("button", { name: "Sửa" }).click();
  await page
    .getByRole("textbox", { name: /Sửa ghi chú/ })
    .fill("Từ mới: reluctant = ngần ngại");
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xong" }).click();
  await expect(cards.first()).toContainText("ngần ngại");

  // Open the place it was written: the finished sitting, on that question.
  await page
    .locator(".note-card")
    .filter({ hasText: "đổi ý" })
    .getByRole("link", { name: "Mở chỗ đã ghi" })
    .click();
  await expect(page).toHaveURL(/\/papers\/132\?run=run-seeded&item=/);
  await expect(page.locator(`#item-${firstItem.id}`)).toBeVisible();
  await expect(page.locator(`#item-${firstItem.id} .note-card`)).toContainText(
    "đổi ý",
  );
  await page.goBack();

  // Delete, undo, delete again, then restore from the bin and erase for good.
  const doomed = page
    .locator(".note-card")
    .filter({ hasText: "câu cuối đoạn" });
  await doomed.getByRole("button", { name: "Xóa" }).click();
  await expect(cards).toHaveCount(3);
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(cards).toHaveCount(4);
  await doomed.getByRole("button", { name: "Xóa" }).click();
  await page.locator("details.note-bin summary").click();
  await expect(page.locator("details.note-bin")).toContainText(
    "Đã xóa gần đây (1)",
  );
  await page
    .locator("details.note-bin")
    .getByRole("button", { name: "Khôi phục" })
    .click();
  await expect(cards).toHaveCount(4);
  await expect(page.locator("details.note-bin")).toHaveCount(0);
  await doomed.getByRole("button", { name: "Xóa" }).click();
  await page.locator("details.note-bin summary").click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .locator("details.note-bin")
    .getByRole("button", { name: "Xóa hẳn" })
    .click();
  await expect(page.locator("details.note-bin")).toHaveCount(0);
  expect((await saved(page)).notes).toHaveLength(3);
});

test("printing the notebook leaves the notes and nothing else", async ({
  page,
}) => {
  let state = withRun();
  state = seedNote(
    state,
    paperItemPlace(paper, 0, firstSlot, firstItem),
    "Bẫy: người nói đổi ý ở câu cuối",
    1,
    true,
  );
  await seed(page, state);
  await page.goto("/notes");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".note-card")).toBeVisible();
  await expect(page.locator(".note-card")).toContainText("đổi ý");
  await expect(page.locator(".note-place")).toContainText("Đề 132 · Nghe");
  // What only makes sense on a screen is dropped from the sheet.
  for (const hidden of [
    page.locator(".sidebar"),
    page.locator(".topbar"),
    page.getByRole("textbox", { name: "Tìm trong ghi chú" }),
    page.getByRole("button", { name: "In danh sách này" }),
    page.locator(".note-actions button").first(),
  ])
    await expect(hidden).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await expect(
    page.getByRole("button", { name: "In danh sách này" }),
  ).toBeVisible();
});

test("a note on a lesson question shows after the answer, not before, and comes back", async ({
  page,
}) => {
  const lesson = lessons.find((entry) => entry.id === "reading-cafe")!;
  const answerAll = async () => {
    for (const [index, entry] of lesson.questions.entries()) {
      const pick =
        index === 0 ? (entry.answer + 1) % entry.options.length : entry.answer;
      await page.locator(`input[name="${entry.id}"][value="${pick}"]`).check();
      await page
        .locator(".question")
        .filter({ has: page.locator(`input[name="${entry.id}"]`) })
        .getByRole("button", { name: "Chưa chắc" })
        .click();
    }
    await page
      .getByRole("button", { name: "Xem kết quả", exact: true })
      .click();
    await expect(page.locator(".result-score")).toHaveText("4/5");
  };
  await page.goto("/practice/reading-cafe");
  // While answering there is nothing to write on: a note could spell out the answer.
  await expect(page.getByRole("button", { name: /^Ghi chú cho/ })).toHaveCount(
    0,
  );
  await answerAll();
  const first = page
    .locator(".question")
    .filter({ has: page.locator(`input[name="${lesson.questions[0].id}"]`) });
  await first.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await first
    .getByRole("textbox", { name: "Ghi chú của Gùa cho câu này" })
    .fill("Chọn nhầm vì từ đồng nghĩa");
  await expect(first.getByRole("status")).toHaveText("Đã lưu");
  await first.getByRole("button", { name: "Xong" }).click();
  const whole = page.getByRole("region", { name: "Ghi chú về cả bài" });
  await whole.getByRole("button", { name: "Ghi chú cho cả bài này" }).click();
  await whole
    .getByRole("textbox", { name: "Ghi chú của Gùa cho cả bài này" })
    .fill("Đọc kỹ tiêu đề trước");
  await expect(whole.getByRole("status")).toHaveText("Đã lưu");
  await whole.getByRole("button", { name: "Xong" }).click();
  const notes = (await saved(page)).notes;
  expect(notes).toHaveLength(2);
  expect(
    notes.map((note: { anchor: { label: string } }) => note.anchor.label),
  ).toEqual(
    expect.arrayContaining([
      `${lesson.title} · Câu 1`,
      `${lesson.title} · cả bài`,
    ]),
  );

  // Practise again: blank until the answers are in, then the note is back.
  await page.getByRole("button", { name: "Luyện lại" }).click();
  await expect(page.locator(".note-card")).toHaveCount(0);
  await answerAll();
  await expect(first.locator(".note-card")).toContainText("từ đồng nghĩa");

  // And in the mistakes notebook, once that question is checked again.
  await page.goto("/mistakes");
  await page.getByRole("button", { name: "Tất cả câu từng sai" }).click();
  const entry = page
    .locator("section.panel")
    .filter({ has: page.locator(`input[name="${lesson.questions[0].id}"]`) });
  await expect(entry.locator(".note-card")).toHaveCount(0);
  await entry
    .locator(
      `input[name="${lesson.questions[0].id}"][value="${lesson.questions[0].answer}"]`,
    )
    .check();
  await entry.getByRole("button", { name: "Kiểm tra lại" }).click();
  await expect(entry.locator(".note-card")).toContainText("từ đồng nghĩa");
});

test("a full notebook refuses one more note, says why, and still opens", async ({
  page,
}) => {
  let state = withRun();
  const place = paperItemPlace(paper, 0, firstSlot, firstItem);
  const notes = Array.from({ length: NOTE_LIMITS.count }, (_, index) => ({
    id: `fill-${index}`,
    createdAt: at(index).toISOString(),
    updatedAt: at(index).toISOString(),
    body: `ghi chú ${index}`,
    anchor: { ...place.anchor, itemId: `fill-item-${index}` },
  }));
  state = { ...state, notes };
  await seed(page, state);
  await page.goto("/papers/132");
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  const item = page.locator(`#item-${firstItem.id}`);
  await item.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await item
    .getByRole("textbox", { name: "Ghi chú của Gùa cho câu này" })
    .fill("một ghi chú quá nhiều");
  await expect(item.getByRole("alert")).toContainText("Sổ ghi chú đã đầy");
  // Nothing was written, and the profile still reads back as valid.
  expect((await saved(page)).notes).toHaveLength(NOTE_LIMITS.count);
  await page.reload();
  await expect(page.getByText("ĐỀ 132 · ĐÃ HOÀN THÀNH")).toBeVisible();
  await expect(page.getByText("Không đọc được dữ liệu thiết bị")).toHaveCount(
    0,
  );
  // The notebook shows a page of notes, not two thousand cards at once.
  await page.goto("/notes");
  await expect(page.locator(".note-card")).toHaveCount(40);
  await page.getByRole("button", { name: /^Hiện thêm/ }).click();
  await expect(page.locator(".note-card")).toHaveCount(80);
  // Settings says how much room the notes take.
  await page.goto("/settings");
  const row = page.locator(".history-row").filter({
    has: page.getByRole("heading", { name: "Ghi chú", exact: true }),
  });
  await expect(row).toContainText(`${NOTE_LIMITS.count} ghi chú`);
});

test("when the device cannot save, the box says so and does not throw the text away", async ({
  page,
}) => {
  await seed(page, withRun());
  await page.goto("/papers/132");
  await page
    .locator(".paper-review details")
    .first()
    .locator("summary")
    .first()
    .click();
  const item = page.locator(`#item-${firstItem.id}`);
  await item.getByRole("button", { name: "Ghi chú cho câu này" }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  const box = item.getByRole("textbox", {
    name: "Ghi chú của Gùa cho câu này",
  });
  await box.fill("điều quan trọng cần nhớ");
  await expect(item.getByRole("alert")).toContainText(
    "Không lưu được trên thiết bị",
  );
  await expect(item.getByRole("status")).toHaveCount(0);
  // Closing asks first, and "no" keeps the box and its words.
  page.once("dialog", (dialog) => void dialog.dismiss());
  await item.getByRole("button", { name: "Xong" }).click();
  await expect(box).toHaveValue("điều quan trọng cần nhớ");
  page.once("dialog", (dialog) => void dialog.accept());
  await item.getByRole("button", { name: "Xong" }).click();
  await expect(box).toHaveCount(0);
});

test("the notebook, the editor and a note card pass the accessibility checks", async ({
  page,
}) => {
  let state = withRun();
  state = seedNote(
    state,
    paperItemPlace(paper, 0, firstSlot, firstItem),
    "Bẫy: người nói đổi ý ở câu cuối",
    1,
    true,
  );
  state = seedNote(state, paperWholePlace(paper), "Phần Đọc hết giờ sớm", 2);
  const withBin = addNote(
    state,
    { body: "đã xóa" },
    at(3),
    "seed-binned",
  ).state;
  state = {
    ...withBin,
    notes: withBin.notes!.map((note) =>
      note.id === "seed-binned"
        ? { ...note, deletedAt: at(4).toISOString() }
        : note,
    ),
  };
  await seed(page, state);
  for (const route of ["/notes", "/papers/132"]) {
    await page.goto(route);
    await expect(page.locator("main h1").first()).toBeVisible();
    if (route === "/notes") {
      await page.locator("details.note-bin summary").click();
    } else {
      await page
        .locator(".paper-review details")
        .first()
        .locator("summary")
        .first()
        .click();
      const item = page.locator(`#item-${firstItem.id}`);
      await item.getByRole("button", { name: "Thêm ghi chú" }).click();
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
      route,
    ).toEqual([]);
  }
});
