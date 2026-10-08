"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Star, StickyNote, Trash2 } from "lucide-react";
import type { Note, NoteAnchor, StudyState } from "@/lib/learning";
import {
  NOTE_LIMITS,
  NOTE_SUGGESTIONS,
  addNote,
  editNote,
  notesAt,
  restoreNote,
  trashNote,
  type NoteOutcome,
  type NoteTarget,
} from "@/lib/notes";
import type { NotePlace } from "@/lib/note-anchors";
import { getSnapshot } from "@/lib/study-store";
import { useStudy } from "./study-provider";
import { useDebouncedSave } from "./use-debounced-save";

/**
 * Runs a change to the notes against the freshest saved profile and hands back
 * what happened. The store calls the function at once, so the outcome (a refused
 * note, with the reason) is there to show before the next line runs.
 */
export function applyNote(
  update: (fn: (state: StudyState) => StudyState) => void,
  make: (state: StudyState) => NoteOutcome,
): NoteOutcome | undefined {
  let outcome = undefined as NoteOutcome | undefined;
  update((state) => {
    outcome = make(state);
    return outcome.state;
  });
  return outcome;
}

/** The box a note is written in. It saves itself; nothing has to be pressed. */
export function NoteEditor({
  note,
  anchor,
  label,
  onClose,
}: {
  /** Set when an existing note is being changed. */
  note?: Note;
  /** Where a new note is written. */
  anchor?: NoteAnchor;
  label: string;
  onClose: () => void;
}) {
  const { update } = useStudy();
  const [text, setText] = useState(note?.body ?? "");
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const noteId = useRef(note?.id);
  const lastSaved = useRef(note?.body ?? "");
  // The last attempt to save did not reach the device.
  const failed = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const save = useCallback(
    (value: string) => {
      const body = value.trim();
      if (!body || body === lastSaved.current) return;
      const outcome = applyNote(update, (state) =>
        noteId.current
          ? editNote(state, noteId.current, { body })
          : addNote(state, { body, anchor }),
      );
      if (!outcome) return;
      if (outcome.error) {
        failed.current = true;
        setStatus({ error: true, text: outcome.error });
        return;
      }
      if (outcome.note) noteId.current = outcome.note.id;
      lastSaved.current = body;
      // The note is in the app but the device refused it: say so, because
      // "Đã lưu" here would be a lie the next reload exposes.
      const storageError = getSnapshot().storageError;
      failed.current = Boolean(storageError);
      setStatus(
        storageError
          ? { error: true, text: storageError }
          : { error: false, text: "Đã lưu" },
      );
    },
    [update, anchor],
  );
  const { schedule, flush } = useDebouncedSave(save);

  useEffect(() => {
    area.current?.focus();
  }, []);

  function change(value: string) {
    setText(value);
    setStatus(null);
    schedule(value);
  }
  function suggest(suggestion: string) {
    const next = text.trim()
      ? `${text.replace(/\s+$/, "")}\n${suggestion}`
      : suggestion;
    change(next.slice(0, NOTE_LIMITS.body));
    window.setTimeout(() => {
      const element = area.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    }, 0);
  }
  function finish() {
    flush();
    if (
      failed.current &&
      text.trim() &&
      !window.confirm(
        "Ghi chú này chưa được lưu. Đóng và bỏ nội dung vừa viết?",
      )
    )
      return;
    // An existing note emptied out is deleted rather than kept blank.
    if (!text.trim() && noteId.current) {
      const id = noteId.current;
      update((state) => trashNote(state, id));
    }
    onClose();
  }
  return (
    <div className="note-editor">
      <textarea
        ref={area}
        aria-label={label}
        value={text}
        rows={3}
        maxLength={NOTE_LIMITS.body}
        spellCheck={false}
        placeholder="Viết bằng lời của mình: vì sao sai, bẫy gặp phải, từ mới…"
        onChange={(event) => change(event.target.value)}
        onBlur={flush}
      />
      <div className="note-suggestions" role="group" aria-label="Gợi ý nhanh">
        {NOTE_SUGGESTIONS.map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            className="note-chip"
            onClick={() => suggest(suggestion)}
          >
            {suggestion.trim().replace(/:$/, "")}
          </button>
        ))}
      </div>
      <div className="note-editor-foot">
        <span
          className={status?.error ? "note-error" : "help-copy"}
          role={status?.error ? "alert" : "status"}
        >
          {status?.text ??
            (text.length > NOTE_LIMITS.body * 0.9
              ? `${text.length}/${NOTE_LIMITS.body} ký tự`
              : "Tự lưu khi dừng gõ.")}
        </span>
        <button
          type="button"
          className="button secondary small"
          onClick={finish}
        >
          Xong
        </button>
      </div>
    </div>
  );
}

export function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

/** A saved note, with the three things that can be done to it. */
export function NoteCard({
  note,
  showPlace,
  onEdit,
  onDelete,
  footer,
}: {
  note: Note;
  /** Name the question the note belongs to (the notebook does, a question does not). */
  showPlace?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  footer?: React.ReactNode;
}) {
  const { update, toast } = useStudy();
  function toggleStar() {
    const outcome = applyNote(update, (state) =>
      editNote(state, note.id, { star: !note.star }),
    );
    if (outcome?.error) toast(outcome.error);
  }
  return (
    <article className="note-card">
      {showPlace && note.anchor && (
        <header className="note-place">
          <strong>{note.anchor.label}</strong>
          {note.anchor.excerpt && <span lang="en">{note.anchor.excerpt}</span>}
        </header>
      )}
      <p className="note-body">{note.body}</p>
      <div className="note-actions">
        <button
          type="button"
          className={`note-action ${note.star ? "on" : ""}`}
          aria-pressed={Boolean(note.star)}
          onClick={toggleStar}
        >
          <Star size={14} fill={note.star ? "currentColor" : "none"} />
          Cần nhớ
        </button>
        <button type="button" className="note-action" onClick={onEdit}>
          <Pencil size={14} />
          Sửa
        </button>
        <button type="button" className="note-action" onClick={onDelete}>
          <Trash2 size={14} />
          Xóa
        </button>
        <span className="note-date">{formatNoteDate(note.updatedAt)}</span>
        {footer}
      </div>
    </article>
  );
}

/**
 * "Hoàn tác" for the note just deleted. It lives a few seconds; after that the
 * note is still in the bin of the notebook for thirty days.
 */
export function UndoDelete({ id, onDone }: { id: string; onDone: () => void }) {
  const { update, toast } = useStudy();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(onDone, 12000);
    return () => window.clearTimeout(timer);
  }, [id, onDone]);
  // The button that was pressed is gone with its note; keyboard focus goes to
  // the way back instead of to the top of the page.
  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, [id]);
  return (
    <p className="note-undo" role="status">
      Đã xóa một ghi chú.{" "}
      <button
        ref={button}
        type="button"
        className="text-link"
        onClick={() => {
          const outcome = applyNote(update, (state) => restoreNote(state, id));
          if (outcome?.error) toast(outcome.error);
          onDone();
        }}
      >
        Hoàn tác
      </button>
    </p>
  );
}

/**
 * Everything Gùa wrote about one question (or one whole paper or lesson), and
 * the way to add more. Shown only after the answer is known, so a note that
 * spells out the reasoning cannot give the answer away on the next attempt.
 */
export function QuestionNotes({
  place,
  noun = "câu này",
}: {
  place: NotePlace;
  noun?: string;
}) {
  const { state, update } = useStudy();
  const target: NoteTarget = place.target;
  const notes = notesAt(state, target);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const clearUndo = useCallback(() => setDeleted(null), []);
  const label = `Ghi chú của ${state.profile.name} cho ${noun}`;
  return (
    <section className="question-notes" aria-label={label}>
      {notes.map((note) =>
        editing === note.id ? (
          <NoteEditor
            key={note.id}
            note={note}
            label={label}
            onClose={() => setEditing(null)}
          />
        ) : (
          <NoteCard
            key={note.id}
            note={note}
            onEdit={() => setEditing(note.id)}
            onDelete={() => {
              update((s) => trashNote(s, note.id));
              setDeleted(note.id);
            }}
          />
        ),
      )}
      {deleted && <UndoDelete id={deleted} onDone={clearUndo} />}
      {adding ? (
        <NoteEditor
          anchor={place.anchor}
          label={label}
          onClose={() => {
            setAdding(false);
            window.setTimeout(() => addButton.current?.focus(), 0);
          }}
        />
      ) : (
        <div>
          <button
            ref={addButton}
            type="button"
            className="note-add"
            onClick={() => setAdding(true)}
          >
            <StickyNote size={14} />
            {notes.length ? "Thêm ghi chú" : `Ghi chú cho ${noun}`}
          </button>
        </div>
      )}
    </section>
  );
}
