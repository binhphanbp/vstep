"use client";
import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Printer, RotateCcw, StickyNote, Trash2 } from "lucide-react";
import { lessons, type Skill } from "@/lib/content";
import { attemptLesson, searchFold, type Note } from "@/lib/learning";
import {
  NOTE_LIMITS,
  binnedFrom,
  emptyBin,
  eraseNote,
  liveFrom,
  noteBytes,
  restoreNote,
  trashNote,
} from "@/lib/notes";
import { paperCatalog } from "@/lib/papers";
import { formatBytes } from "@/lib/study-store";
import type { StudyState } from "@/lib/learning";
import { BackupNudge } from "./backup-nudge";
import {
  NoteCard,
  NoteEditor,
  UndoDelete,
  applyNote,
  formatNoteDate,
} from "./note-box";
import { useStudy } from "./study-provider";

const PAGE = 40;
const SKILL_NAMES: Record<Skill, string> = {
  listening: "Nghe",
  reading: "Đọc",
  writing: "Viết",
  speaking: "Nói",
};

/**
 * Where "open the place I wrote this" goes, or nothing when that place is gone.
 * A paper opens on its latest finished sitting: the address of the paper alone
 * would drop her into a sitting that is still running, where notes are hidden.
 */
function placeLink(state: StudyState, note: Note) {
  const anchor = note.anchor;
  if (!anchor) return null;
  if (anchor.source === "lesson")
    return lessons.some((lesson) => lesson.id === anchor.sourceId)
      ? { href: `/practice/${anchor.sourceId}`, text: "Mở bài học" }
      : null;
  if (!paperCatalog.some((paper) => paper.id === anchor.sourceId)) return null;
  const finished = (state.paperRuns ?? [])
    .filter((run) => run.paperId === anchor.sourceId && run.finishedAt)
    .at(-1);
  if (!finished) return { href: `/papers/${anchor.sourceId}`, text: "Mở đề" };
  const item = anchor.itemId
    ? `&item=${encodeURIComponent(anchor.itemId)}`
    : "";
  return {
    href: `/papers/${anchor.sourceId}?run=${finished.id}${item}`,
    text: "Mở chỗ đã ghi",
  };
}

type Sort = "recent" | "place";

/** The text a search looks in: the note and the words that name its place. */
const searchable = (note: Note) =>
  searchFold(
    `${note.body} ${note.anchor?.label ?? ""} ${note.anchor?.excerpt ?? ""}`,
  );

export function NotesPage() {
  const { state, update, ready, toast } = useStudy();
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<"all" | Skill>("all");
  const [group, setGroup] = useState("all");
  const [starred, setStarred] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);
  const clearUndo = useCallback(() => setDeleted(null), []);

  // Everything below that depends only on the book is worked out once per
  // change of the book, not once per key typed in the search box: a full book
  // is two thousand notes, and folding, sorting and measuring all of them on
  // every letter is what made typing there stutter on a slow machine.
  const live = useMemo(() => liveFrom(state.notes), [state.notes]);
  const bin = useMemo(() => binnedFrom(state.notes), [state.notes]);
  const bytes = useMemo(() => noteBytes(state.notes ?? []), [state.notes]);
  const folded = useMemo(
    () => new Map(live.map((note) => [note.id, searchable(note)])),
    [live],
  );
  const groups = useMemo(
    () =>
      [
        ...new Map(
          live
            .filter((note) => note.anchor)
            .map((note) => [
              `${note.anchor!.source}:${note.anchor!.sourceId}`,
              note.anchor!.group,
            ]),
        ),
      ].sort((a, b) => a[1].localeCompare(b[1], "vi", { numeric: true })),
    [live],
  );
  // The letters typed show at once; the list catches up when it can.
  const asked = useDeferredValue(query);
  // Every word typed has to be in the note, in any order and with or without marks.
  const needle = searchFold(asked);
  const matches = useMemo(() => {
    const words = needle.split(" ").filter(Boolean);
    return live
      .filter(
        (note) =>
          (skill === "all" || note.anchor?.skill === skill) &&
          (group === "all" ||
            `${note.anchor?.source}:${note.anchor?.sourceId}` === group) &&
          (!starred || note.star) &&
          words.every((word) => folded.get(note.id)!.includes(word)),
      )
      .sort((a, b) =>
        sort === "recent"
          ? Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
          : (a.anchor?.group ?? "").localeCompare(b.anchor?.group ?? "", "vi", {
              numeric: true,
            }) ||
            (a.anchor?.label ?? "").localeCompare(b.anchor?.label ?? "", "vi", {
              numeric: true,
            }) ||
            Date.parse(a.createdAt) - Date.parse(b.createdAt),
      );
  }, [live, folded, skill, group, starred, needle, sort]);
  const words = needle.split(" ").filter(Boolean);

  if (!ready) return <div className="loading-state">Đang mở sổ ghi chú…</div>;

  const feedback = state.attempts
    .filter((attempt) => attempt.feedback?.trim())
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const filtered =
    skill !== "all" || group !== "all" || starred || words.length > 0;

  return (
    <div className="page notes-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <StickyNote size={15} />
            SỔ GHI CHÚ
          </div>
          <h1>Những điều mình tự ghi lại.</h1>
          <p className="no-print">
            Ghi bằng lời của mình sau khi nộp bài: vì sao sai, bẫy gặp phải, từ
            mới. Ghi chú nằm trên máy này và đi theo bản sao lưu.
          </p>
        </div>
        <span className="pill no-print">
          {live.length} ghi chú · {formatBytes(bytes)} /{" "}
          {formatBytes(NOTE_LIMITS.bytes)}
        </span>
      </div>

      <BackupNudge />
      {live.length === 0 ? (
        <div className="empty-state">
          <StickyNote size={32} />
          <h2>Chưa có ghi chú nào</h2>
          <p>
            Sau khi nộp bài, bấm “Ghi chú cho câu này” ở câu bạn muốn nhớ. Ghi
            chú hiện lại mỗi lần bạn chữa câu đó, và được gom về đây.
          </p>
          <Link className="button primary" href="/papers">
            Về kho đề
          </Link>
        </div>
      ) : (
        <>
          <div className="filters no-print">
            {(
              ["all", "listening", "reading", "writing", "speaking"] as const
            ).map((value) => (
              <button
                type="button"
                key={value}
                className={`filter ${skill === value ? "active" : ""}`}
                aria-pressed={skill === value}
                onClick={() => {
                  setSkill(value);
                  setShown(PAGE);
                }}
              >
                {value === "all" ? "Tất cả" : SKILL_NAMES[value]}
              </button>
            ))}
            <button
              type="button"
              className={`filter ${starred ? "active" : ""}`}
              aria-pressed={starred}
              onClick={() => {
                setStarred(!starred);
                setShown(PAGE);
              }}
            >
              ★ Cần nhớ
            </button>
            <input
              className="search-input"
              aria-label="Tìm trong ghi chú"
              placeholder="Tìm trong ghi chú…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE);
              }}
            />
          </div>
          <div className="filters no-print">
            <div className="note-select">
              <label htmlFor="note-group">Đề và bài</label>
              <select
                id="note-group"
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value);
                  setShown(PAGE);
                }}
              >
                <option value="all">Tất cả đề và bài</option>
                {groups.map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="note-select">
              <label htmlFor="note-sort">Sắp xếp</label>
              <select
                id="note-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
              >
                <option value="recent">Mới sửa trước</option>
                <option value="place">Theo đề và bài</option>
              </select>
            </div>
            <button
              type="button"
              className="button secondary small"
              onClick={() => window.print()}
              disabled={!matches.length}
            >
              <Printer size={14} />
              In danh sách này
            </button>
          </div>
          {deleted && <UndoDelete id={deleted} onDone={clearUndo} />}
          <p className="help-copy" role="status">
            {filtered
              ? `${matches.length}/${live.length} ghi chú phù hợp.`
              : `${live.length} ghi chú.`}
          </p>
          {matches.length === 0 ? (
            <div className="empty-state">
              <h2>Không có ghi chú phù hợp</h2>
              <p>Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc.</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setQuery("");
                  setSkill("all");
                  setGroup("all");
                  setStarred(false);
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="note-list">
              {matches.slice(0, shown).map((note) => {
                const link = placeLink(state, note);
                return editing === note.id ? (
                  <div className="note-card editing" key={note.id}>
                    <p className="note-place">
                      <strong>{note.anchor?.label ?? "Ghi chú"}</strong>
                    </p>
                    <NoteEditor
                      note={note}
                      label={`Sửa ghi chú: ${note.anchor?.label ?? ""}`}
                      onClose={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <NoteCard
                    key={note.id}
                    note={note}
                    showPlace
                    onEdit={() => setEditing(note.id)}
                    onDelete={() => {
                      update((s) => trashNote(s, note.id));
                      setDeleted(note.id);
                    }}
                    footer={
                      link && (
                        <Link className="text-link no-print" href={link.href}>
                          {link.text}
                        </Link>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
          {matches.length > shown && (
            <div className="button-row no-print">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShown(shown + PAGE)}
              >
                Hiện thêm {Math.min(PAGE, matches.length - shown)} ghi chú
              </button>
            </div>
          )}
        </>
      )}

      {bin.length > 0 && (
        <details className="panel note-bin no-print">
          <summary>
            Đã xóa gần đây ({bin.length}) · khôi phục được trong{" "}
            {NOTE_LIMITS.trashDays} ngày
          </summary>
          <div className="note-list">
            {bin.map((note) => (
              <article className="note-card binned" key={note.id}>
                <header className="note-place">
                  <strong>{note.anchor?.label ?? "Ghi chú"}</strong>
                  <span>Xóa ngày {formatNoteDate(note.deletedAt!)}</span>
                </header>
                <p className="note-body">{note.body}</p>
                <div className="note-actions">
                  <button
                    type="button"
                    className="note-action"
                    onClick={() => {
                      const outcome = applyNote(update, (s) =>
                        restoreNote(s, note.id),
                      );
                      if (outcome?.error) toast(outcome.error);
                    }}
                  >
                    <RotateCcw size={14} />
                    Khôi phục
                  </button>
                  <button
                    type="button"
                    className="note-action"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Xóa hẳn ghi chú này? Việc này không thể hoàn tác.",
                        )
                      )
                        update((s) => eraseNote(s, note.id));
                    }}
                  >
                    <Trash2 size={14} />
                    Xóa hẳn
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                if (
                  window.confirm(
                    `Xóa hẳn ${bin.length} ghi chú đã xóa? Việc này không thể hoàn tác.`,
                  )
                )
                  update((s) => emptyBin(s));
              }}
            >
              <Trash2 size={14} />
              Dọn sạch mục này
            </button>
          </div>
        </details>
      )}

      {feedback.length > 0 && (
        <details className="panel note-feedback no-print">
          <summary>
            Nhận xét của giáo viên đã ghi lại ({feedback.length})
          </summary>
          <p className="help-copy">
            Chỉ để đọc ở đây; chép nhận xét mới ở “Gói gửi giáo viên”.
          </p>
          <div className="note-list">
            {feedback.map((attempt) => (
              <article className="note-card" key={attempt.id}>
                <header className="note-place">
                  <strong>
                    {attemptLesson(state, attempt)?.title ?? attempt.lessonId}
                  </strong>
                  <span>{formatNoteDate(attempt.date)}</span>
                </header>
                <p className="note-body">{attempt.feedback}</p>
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
