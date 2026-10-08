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
    has: page.getByRole("heading", { name: "Ghi chú, nháp và câu tô" }),
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

test("the notebook asks for a backup once enough notes are not in any copy, and one click makes it", async ({
  page,
}) => {
  let state = withRun();
  const place = paperItemPlace(paper, 0, firstSlot, firstItem);
  for (let index = 0; index < 12; index++)
    state = seedNote(
      state,
      { ...place, anchor: { ...place.anchor, itemId: `item-${index}` } },
      `ghi chú số ${index}`,
      index,
    );
  await seed(page, state);
  await page.goto("/notes");
  const banner = page
    .getByRole("status")
    .filter({ hasText: "chưa nằm trong bản sao lưu nào" });
  await expect(banner).toContainText("12 ghi chú mới");
  await expect(banner).toContainText("chưa có bản nào");
  const audit = await new AxeBuilder({ page })
    .include(".backup-nudge")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  // One click makes the copy, right there, and the banner goes.
  const download = page.waitForEvent("download");
  await banner.getByRole("button", { name: "Tải bản sao lưu ngay" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^may-backup-.*\.json$/);
  await expect(banner).toHaveCount(0);
  await expect(page.locator(".toast")).toContainText("Đã tải bản sao lưu");
  // The file really holds the notes.
  const copy = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(copy.notes).toHaveLength(12);
  await page.reload();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "chưa nằm trong bản sao lưu nào" }),
  ).toHaveCount(0);
  // Ten more notes, and it asks again, naming the copy it is counting from.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("may-study-v1")!);
    const first = raw.notes[0];
    for (let index = 0; index < 10; index++)
      raw.notes.push({
        ...first,
        id: `later-${index}`,
        body: `thêm ${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    raw.updatedAt = new Date(Date.now() + 1000).toISOString();
    localStorage.setItem("may-study-v1", JSON.stringify(raw));
  });
  await page.reload();
  const again = page
    .getByRole("status")
    .filter({ hasText: "chưa nằm trong bản sao lưu nào" });
  await expect(again).toContainText("10 ghi chú mới");
  await expect(again).toContainText("bản gần nhất:");
  // The home page says it too, since the notebook is not where she lives.
  await page.goto("/");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "chưa nằm trong bản sao lưu nào" }),
  ).toContainText("10 ghi chú mới");
});

test("a few notes that have gone a long time without a copy are mentioned too", async ({
  page,
}) => {
  const place = paperItemPlace(paper, 0, firstSlot, firstItem);
  let state = withRun();
  for (let index = 0; index < 2; index++) {
    const outcome = addNote(
      state,
      {
        body: `ghi chú cũ ${index}`,
        anchor: { ...place.anchor, itemId: `old-${index}` },
      },
      new Date(Date.now() - (20 - index) * 86_400_000),
      `old-${index}`,
    );
    state = outcome.state;
  }
  await seed(page, state);
  await page.goto("/notes");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "chưa nằm trong bản sao lưu nào" }),
  ).toContainText("ghi chú đầu tiên đã 20 ngày tuổi");
});

test("nobody with an empty notebook is asked about a backup", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Một ngày mới/ }),
  ).toBeVisible();
  await expect(page.locator(".backup-nudge")).toHaveCount(0);
  await page.goto("/notes");
  await expect(page.getByText("Chưa có ghi chú nào")).toBeVisible();
  await expect(page.locator(".backup-nudge")).toHaveCount(0);
});

/** A second tab on the same profile: the same browser, so the same storage. */
async function secondTab(page: Page) {
  const other = await page.context().newPage();
  await other.goto("/notes");
  return other;
}
const cardOf = (page: Page) => page.locator(".note-card:not(.binned)");
async function startEditing(page: Page, body: string) {
  await cardOf(page)
    .filter({ hasText: body })
    .getByRole("button", { name: "Sửa" })
    .click();
  return page.getByRole("textbox", { name: /^Sửa ghi chú/ });
}

test("the same note open in two tabs: a tab that has typed nothing follows the other", async ({
  page,
}) => {
  await seed(
    page,
    seedNote(
      withRun(),
      paperItemPlace(paper, 0, firstSlot, firstItem),
      "bản đầu",
      1,
    ),
  );
  await page.goto("/notes");
  const other = await secondTab(page);
  const here = await startEditing(page, "bản đầu");
  const there = await startEditing(other, "bản đầu");
  await there.fill("bản sửa ở tab kia");
  await expect(
    other.getByRole("status").filter({ hasText: "Đã lưu" }),
  ).toBeVisible();
  // This tab typed nothing, so it simply shows what the other one saved.
  await expect(here).toHaveValue("bản sửa ở tab kia");
  await expect(page.locator(".note-conflict")).toHaveCount(0);
  await other.close();
});

test("two tabs that both typed ask which text to keep, and never pick one by being last", async ({
  page,
}) => {
  await seed(
    page,
    seedNote(
      withRun(),
      paperItemPlace(paper, 0, firstSlot, firstItem),
      "bản đầu",
      1,
    ),
  );
  await page.goto("/notes");
  const other = await secondTab(page);
  const here = await startEditing(page, "bản đầu");
  const there = await startEditing(other, "bản đầu");
  // The other tab starts writing; before its text is saved, this tab saves its own.
  await there.fill("bản của tab kia");
  await here.fill("bản của tab này");
  await here.blur();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu" }),
  ).toBeVisible();
  // The other tab is the one about to overwrite, so it is the one that asks.
  const asking = other.locator(".note-conflict");
  await expect(asking).toContainText("vừa được sửa ở một tab khác");
  await expect(asking.locator("blockquote")).toHaveText("bản của tab này");
  const audit = await new AxeBuilder({ page: other })
    .include(".note-editor")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  // Its autosave does not run over the text it was shown.
  await other.waitForTimeout(1300);
  expect((await saved(page)).notes[0].body).toBe("bản của tab này");
  // Closing without choosing asks first, and the box stays when she says no.
  other.once("dialog", (dialog) => dialog.dismiss());
  await other.getByRole("button", { name: "Xong" }).click();
  await expect(there).toBeVisible();
  // Keep both: the text found stays here, her own becomes a note of its own.
  await other.getByRole("button", { name: "Giữ cả hai" }).click();
  await expect(other.locator(".note-conflict")).toHaveCount(0);
  await expect(there).toHaveValue("bản của tab này");
  const notes = (await saved(page)).notes as {
    body: string;
    anchor: { label: string };
  }[];
  expect(notes.map((note) => note.body).sort()).toEqual([
    "bản của tab kia",
    "bản của tab này",
  ]);
  expect(new Set(notes.map((note) => note.anchor.label)).size).toBe(1);
  await other.close();
});

test("a writer who has seen both texts can keep their own, or take the other", async ({
  page,
}) => {
  await seed(
    page,
    seedNote(
      withRun(),
      paperItemPlace(paper, 0, firstSlot, firstItem),
      "bản đầu",
      1,
    ),
  );
  await page.goto("/notes");
  const other = await secondTab(page);
  const here = await startEditing(page, "bản đầu");
  const there = await startEditing(other, "bản đầu");
  const savedHere = page.getByRole("status").filter({ hasText: "Đã lưu" });
  await there.fill("bản của tab kia");
  await here.fill("bản của tab này");
  await here.blur();
  await expect(savedHere).toBeVisible();
  await expect(other.locator(".note-conflict")).toBeVisible();
  await other.getByRole("button", { name: "Giữ bản của tôi" }).click();
  await expect(other.locator(".note-conflict")).toHaveCount(0);
  expect(
    (await saved(page)).notes.map((note: { body: string }) => note.body),
  ).toEqual(["bản của tab kia"]);
  // This tab had saved and typed nothing since, so it follows.
  await expect(here).toHaveValue("bản của tab kia");

  // And the other way round: she takes the text from the other tab.
  await there.fill("lại sửa ở tab kia");
  await here.fill("bản mới của tab này");
  await here.blur();
  await expect(other.locator(".note-conflict")).toBeVisible();
  await other.getByRole("button", { name: "Dùng bản bên kia" }).click();
  await expect(there).toHaveValue("bản mới của tab này");
  await other.waitForTimeout(1300);
  expect(
    (await saved(page)).notes.map((note: { body: string }) => note.body),
  ).toEqual(["bản mới của tab này"]);
  await other.close();
});

test("a note deleted in another tab does not swallow what is being written here", async ({
  page,
}) => {
  await seed(
    page,
    seedNote(
      withRun(),
      paperItemPlace(paper, 0, firstSlot, firstItem),
      "bản đầu",
      1,
    ),
  );
  await page.goto("/notes");
  const other = await secondTab(page);
  const here = await startEditing(page, "bản đầu");
  await here.fill("viết dở khi tab kia xóa");
  await cardOf(other)
    .filter({ hasText: "bản đầu" })
    .getByRole("button", { name: "Xóa" })
    .click();
  // The notebook drops a deleted note's box with the note. What was typed in
  // it is not dropped: it is kept as a note of its own, and she is told.
  await expect(page.locator(".toast")).toContainText("không còn trong sổ");
  await expect(
    cardOf(page).filter({ hasText: "viết dở khi tab kia xóa" }),
  ).toHaveCount(1);
  const notes = (await saved(page)).notes as {
    body: string;
    deletedAt?: string;
  }[];
  expect(
    notes.filter((note) => !note.deletedAt).map((note) => note.body),
  ).toEqual(["viết dở khi tab kia xóa"]);
  expect(notes.filter((note) => note.deletedAt)).toHaveLength(1);
  await other.close();
});

test("a box that stays open on a deleted note asks what to do with the text", async ({
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
  const box = item.getByRole("textbox", {
    name: "Ghi chú của Gùa cho câu này",
  });
  await box.fill("bản đầu");
  await expect(item.getByRole("status")).toHaveText("Đã lưu");
  // Another tab deletes the note this box has just written.
  const other = await secondTab(page);
  // She is in the middle of adding more words when the note is deleted.
  await box.fill("bản đầu, viết thêm");
  await cardOf(other)
    .filter({ hasText: "bản đầu" })
    .getByRole("button", { name: "Xóa" })
    .click();
  await expect(item.locator(".note-conflict")).toContainText(
    "không còn trong sổ",
  );
  await item
    .getByRole("button", { name: "Lưu bản của tôi thành ghi chú mới" })
    .click();
  await expect(item.locator(".note-conflict")).toHaveCount(0);
  const notes = (await saved(page)).notes as {
    body: string;
    deletedAt?: string;
  }[];
  expect(
    notes.filter((note) => !note.deletedAt).map((note) => note.body),
  ).toEqual(["bản đầu, viết thêm"]);
  expect(notes.filter((note) => note.deletedAt)).toHaveLength(1);
  await other.close();
});

/** Two tabs on one note; the second has text waiting and has been asked to choose. */
async function askedToChoose(page: Page) {
  await seed(
    page,
    seedNote(
      withRun(),
      paperItemPlace(paper, 0, firstSlot, firstItem),
      "bản đầu",
      1,
    ),
  );
  await page.goto("/notes");
  const other = await secondTab(page);
  const here = await startEditing(page, "bản đầu");
  const there = await startEditing(other, "bản đầu");
  await there.fill("bản của tab kia");
  await here.fill("bản của tab này");
  await here.blur();
  await expect(other.locator(".note-conflict")).toBeVisible();
  // Typing goes on in the box that has been asked, with no answer given.
  await there.fill("bản của tab kia, viết thêm");
  return other;
}
const liveBodies = async (page: Page) =>
  ((await saved(page)).notes as { body: string; deletedAt?: string }[])
    .filter((note) => !note.deletedAt)
    .map((note) => note.body)
    .sort();

test("a question nobody answered does not lose the text when the page is left", async ({
  page,
}) => {
  const other = await askedToChoose(page);
  // Moving on inside the app takes the box away.
  await other.getByRole("link", { name: "Cài đặt" }).first().click();
  await expect(other).toHaveURL(/\/settings/);
  await expect(other.locator(".toast")).toContainText("giữ thành ghi chú mới");
  expect(await liveBodies(page)).toEqual([
    "bản của tab kia, viết thêm",
    "bản của tab này",
  ]);
  await other.close();
});

test("a question nobody answered does not lose the text when the tab is reloaded or closed", async ({
  page,
}) => {
  const other = await askedToChoose(page);
  await other.reload();
  expect(await liveBodies(page)).toEqual([
    "bản của tab kia, viết thêm",
    "bản của tab này",
  ]);
  await other.close();
});

test("closing a question on purpose, discarding the text, does not keep it behind her back", async ({
  page,
}) => {
  const other = await askedToChoose(page);
  other.once("dialog", (dialog) => dialog.accept());
  await other.getByRole("button", { name: "Xong" }).click();
  await expect(other.locator(".note-editor")).toHaveCount(0);
  await other.reload();
  expect(await liveBodies(page)).toEqual(["bản của tab này"]);
  await other.close();
});

test("a box on a deleted note can be given up without keeping the text", async ({
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
  const box = item.getByRole("textbox", {
    name: "Ghi chú của Gùa cho câu này",
  });
  await box.fill("bản đầu");
  await expect(item.getByRole("status")).toHaveText("Đã lưu");
  const other = await secondTab(page);
  await box.fill("bản đầu, viết thêm");
  await cardOf(other)
    .filter({ hasText: "bản đầu" })
    .getByRole("button", { name: "Xóa" })
    .click();
  await expect(item.locator(".note-conflict")).toContainText(
    "không còn trong sổ",
  );
  await item.getByRole("button", { name: "Bỏ bản của tôi" }).click();
  await expect(item.locator(".note-editor")).toHaveCount(0);
  await page.reload();
  expect(await liveBodies(page)).toEqual([]);
  await other.close();
});

test("a tab with nothing typed closes its box when the note is deleted elsewhere", async ({
  page,
}) => {
  await seed(
    page,
    seedNote(
      withRun(),
      paperItemPlace(paper, 0, firstSlot, firstItem),
      "bản đầu",
      1,
    ),
  );
  await page.goto("/notes");
  const other = await secondTab(page);
  await startEditing(page, "bản đầu");
  await cardOf(other)
    .filter({ hasText: "bản đầu" })
    .getByRole("button", { name: "Xóa" })
    .click();
  await expect(page.locator(".note-editor")).toHaveCount(0);
  await other.close();
});
