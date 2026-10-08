"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Star, StickyNote, Trash2 } from "lucide-react";
import type { Note, NoteAnchor } from "@/lib/learning";
import {
  NOTE_LIMITS,
  NOTE_SUGGESTIONS,
  addNote,
  allNotes,
  editNote,
  notesAt,
  restoreNote,
  trashNote,
  type NoteConflict,
  type NoteOutcome,
  type NoteTarget,
} from "@/lib/notes";
import type { NotePlace } from "@/lib/note-anchors";
import { getSnapshot } from "@/lib/study-store";
import { applyChange } from "./apply-change";
import { useStudy } from "./study-provider";
import { useDebouncedSave } from "./use-debounced-save";

/** Runs a change to the notes and hands back what happened (see `applyChange`). */
export const applyNote = applyChange<NoteOutcome>;

/** The box a note is written in. It saves itself; nothing has to be pressed. */
export function NoteEditor({
  note,
  anchor,
  label,
  onClose,
  onCreated,
}: {
  /** Set when an existing note is being changed. */
  note?: Note;
  /** Where a new note is written. */
  anchor?: NoteAnchor;
  label: string;
  onClose: () => void;
  /**
   * Called when this box has written a note it did not have before: its first
   * save, or a new one after the note it was on turned out to be gone.
   */
  onCreated?: (id: string) => void;
}) {
  const { state, update, toast } = useStudy();
  const [text, setText] = useState(note?.body ?? "");
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [conflict, setConflict] = useState<NoteConflict | null>(null);
  // The note this box writes: the one it was given, or the one its first save made.
  const noteId = useRef(note?.id);
  const lastSaved = useRef(note?.body ?? "");
  // What is in the box, for the code that runs when something else changes.
  const typed = useRef(text);
  // The last attempt to save did not reach the device.
  const failed = useRef(false);
  // The note is not what this box started from, and the writer has not chosen yet.
  const waiting = useRef<NoteConflict | null>(null);
  const alive = useRef(true);
  // Where the note belongs, kept for when it has to be written again.
  const place = useRef(anchor ?? note?.anchor);
  // What was typed has already been kept as a note of its own.
  const rescued = useRef(false);
  const closer = useRef(onClose);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    closer.current = onClose;
  });
  const raise = useCallback((found: NoteConflict) => {
    waiting.current = found;
    failed.current = true;
    setConflict(found);
    setStatus(null);
  }, []);
  const settle = useCallback((body: string) => {
    lastSaved.current = body;
    waiting.current = null;
    failed.current = false;
    rescued.current = false;
    setConflict(null);
  }, []);
  // The box is going away with two texts and no choice made. Nobody can be
  // asked, and losing what was typed is worse than one note too many: it is
  // kept as a note of its own, next to the other.
  const rescue = useCallback(
    (kind: NoteConflict["kind"]) => {
      const body = typed.current.trim();
      if (!body || rescued.current) return;
      rescued.current = true;
      const kept = applyNote(update, (current) =>
        addNote(current, { body, anchor: place.current }),
      );
      toast(
        kept?.error ??
          (kind === "gone"
            ? "Ghi chú này không còn trong sổ (đã bị xóa ở một tab khác, hoặc sổ vừa được thay bằng bản sao lưu); phần bạn đang viết được giữ thành ghi chú mới."
            : "Ghi chú này vừa được sửa ở một tab khác; bản bạn viết được giữ thành ghi chú mới."),
      );
    },
    [update, toast],
  );
  useEffect(() => {
    const leave = (event: PageTransitionEvent) => {
      if (!event.persisted && waiting.current) rescue(waiting.current.kind);
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [rescue]);
  // Declared before the saver, so that on the way out this runs first and the
  // saver can tell it is the last word the box will ever get. A box that goes
  // away with a question unanswered keeps what was typed; one that was closed
  // on purpose, discarding it, has already said so (`discard`).
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (waiting.current) rescue(waiting.current.kind);
    };
  }, [rescue]);
  // Closing, and meaning it: what was typed is not kept.
  const discard = useCallback(() => {
    rescued.current = true;
    closer.current();
  }, []);

  const save = useCallback(
    (value: string) => {
      const body = value.trim();
      if (!body || body === lastSaved.current) return;
      if (waiting.current) {
        if (!alive.current) rescue(waiting.current.kind);
        return;
      }
      const id = noteId.current;
      const outcome = applyNote(update, (current) =>
        id
          ? editNote(current, id, { body, ifBody: lastSaved.current })
          : addNote(current, { body, anchor }),
      );
      if (!outcome) return;
      if (outcome.conflict) {
        if (alive.current) raise(outcome.conflict);
        else rescue(outcome.conflict.kind);
        return;
      }
      if (outcome.error) {
        failed.current = true;
        setStatus({ error: true, text: outcome.error });
        return;
      }
      if (outcome.note && !noteId.current) onCreated?.(outcome.note.id);
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
    [update, anchor, onCreated, raise, rescue],
  );
  const { schedule, flush } = useDebouncedSave(save);

  useEffect(() => {
    area.current?.focus();
  }, []);

  // The same note can be open in another tab. When that tab saves, this box
  // follows it if nothing was typed here, and asks if something was: the last
  // tab to save must not win without anyone having seen the other text.
  useEffect(() => {
    const id = noteId.current;
    if (!id) return;
    const current = allNotes(getSnapshot().state).find(
      (entry) => entry.id === id,
    );
    // An emptied box has nothing to protect: a blank text is never saved.
    const typedNow = typed.current.trim();
    const dirty = typedNow !== "" && typedNow !== lastSaved.current;
    if (current?.anchor) place.current = current.anchor;
    if (!current || current.deletedAt) {
      if (!dirty) closer.current();
      else if (waiting.current?.kind !== "gone") raise({ kind: "gone" });
      return;
    }
    if (current.body === lastSaved.current) return;
    if (!dirty) {
      lastSaved.current = current.body;
      typed.current = current.body;
      setText(current.body);
      setStatus(null);
      return;
    }
    const known = waiting.current;
    if (known?.kind !== "changed" || known.theirs !== current.body)
      raise({ kind: "changed", theirs: current.body });
  }, [state.notes, raise]);

  function change(value: string) {
    typed.current = value;
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
    if (waiting.current) {
      // Two texts and no choice made: closing now would drop one of them.
      if (
        typed.current.trim() &&
        !window.confirm(
          "Ghi chú này đang có hai bản khác nhau và bạn chưa chọn. Đóng và bỏ bản vừa viết?",
        )
      )
        return;
      discard();
      return;
    }
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
      update((current) => trashNote(current, id));
    }
    onClose();
  }

  // The ways out of a disagreement between this box and another tab.
  function keepMine() {
    const id = noteId.current;
    const body = typed.current.trim();
    if (!id || !body) return;
    const outcome = applyNote(update, (current) =>
      editNote(current, id, { body }),
    );
    if (outcome?.error) toast(outcome.error);
    else {
      settle(body);
      setStatus({ error: false, text: "Đã lưu" });
    }
  }
  function useTheirs() {
    if (waiting.current?.kind !== "changed") return;
    const theirs = waiting.current.theirs;
    typed.current = theirs;
    setText(theirs);
    setStatus(null);
    settle(theirs);
  }
  function keepBoth() {
    const id = noteId.current;
    const body = typed.current.trim();
    if (waiting.current?.kind !== "changed" || !id || !body) return;
    const theirs = waiting.current.theirs;
    const outcome = applyNote(update, (current) =>
      addNote(current, { body, anchor: place.current }),
    );
    if (outcome?.error) {
      toast(outcome.error);
      return;
    }
    typed.current = theirs;
    setText(theirs);
    setStatus(null);
    settle(theirs);
    toast("Đã giữ cả hai: bản của bạn nằm thành một ghi chú mới ở cùng chỗ.");
  }
  function writeAgain() {
    const body = typed.current.trim();
    if (!body) return;
    const outcome = applyNote(update, (current) =>
      addNote(current, { body, anchor: place.current }),
    );
    if (outcome?.error || !outcome?.note) {
      toast(outcome?.error ?? "Không lưu được ghi chú.");
      return;
    }
    noteId.current = outcome.note.id;
    onCreated?.(outcome.note.id);
    settle(body);
    setStatus({ error: false, text: "Đã lưu thành ghi chú mới" });
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
      {conflict?.kind === "changed" && (
        <div className="note-conflict" role="alert">
          <p>
            <strong>Ghi chú này vừa được sửa ở một tab khác.</strong> Bản bên
            kia:
          </p>
          <blockquote className="note-body">{conflict.theirs}</blockquote>
          <p className="help-copy">
            “Giữ cả hai” để bản bên kia ở lại trong ghi chú này, còn bản của bạn
            thành một ghi chú mới ngay bên cạnh.
          </p>
          <div className="note-conflict-actions">
            <button type="button" className="note-action" onClick={keepBoth}>
              Giữ cả hai
            </button>
            <button type="button" className="note-action" onClick={keepMine}>
              Giữ bản của tôi
            </button>
            <button type="button" className="note-action" onClick={useTheirs}>
              Dùng bản bên kia
            </button>
          </div>
        </div>
      )}
      {conflict?.kind === "gone" && (
        <div className="note-conflict" role="alert">
          <p>
            <strong>Ghi chú này không còn trong sổ</strong> (đã bị xóa ở một tab
            khác, hoặc sổ vừa được thay bằng bản sao lưu). Bản bạn đang viết vẫn
            còn ở đây.
          </p>
          <div className="note-conflict-actions">
            <button type="button" className="note-action" onClick={writeAgain}>
              Lưu bản của tôi thành ghi chú mới
            </button>
            <button type="button" className="note-action" onClick={discard}>
              Bỏ bản của tôi
            </button>
          </div>
        </div>
      )}
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
            (conflict
              ? "Chưa lưu: chọn một cách ở trên."
              : text.length > NOTE_LIMITS.body * 0.9
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
      {note.anchor?.quote && (
        <blockquote className="note-quote" lang="en">
          {note.anchor.quote}
        </blockquote>
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

/** The button that opens a box for a new note, and the box. */
export function NoteAdder({
  anchor,
  label,
  button,
  onComposing,
}: {
  anchor: NoteAnchor;
  /** What the box is called to a screen reader. */
  label: string;
  /** What the button says. */
  button: string;
  /**
   * Tells the list which note is being written in the box, so it is not drawn
   * a second time as a card above its own box; null when the box closes.
   */
  onComposing?: (id: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  if (adding)
    return (
      <NoteEditor
        anchor={anchor}
        label={label}
        onCreated={(id) => onComposing?.(id)}
        onClose={() => {
          setAdding(false);
          onComposing?.(null);
          window.setTimeout(() => addButton.current?.focus(), 0);
        }}
      />
    );
  return (
    <div>
      <button
        ref={addButton}
        type="button"
        className="note-add"
        onClick={() => setAdding(true)}
      >
        <StickyNote size={14} />
        {button}
      </button>
    </div>
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
  const [editing, setEditing] = useState<string | null>(null);
  const [composing, setComposing] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);
  const clearUndo = useCallback(() => setDeleted(null), []);
  const label = `Ghi chú của ${state.profile.name} cho ${noun}`;
  return (
    <section className="question-notes" aria-label={label}>
      {notes
        .filter((note) => note.id !== composing)
        .map((note) =>
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
      <NoteAdder
        anchor={place.anchor}
        label={label}
        button={notes.length ? "Thêm ghi chú" : `Ghi chú cho ${noun}`}
        onComposing={setComposing}
      />
    </section>
  );
}
