"use client";
import { useMemo, useState } from "react";
import { PenLine } from "lucide-react";
import { resolveMarks, sentenceSpans, type Mark } from "@/lib/marks";
import { addNote } from "@/lib/notes";
import type { NotePlace } from "@/lib/note-anchors";
import { WORK_LIMITS } from "@/lib/work";
import { NoteAdder, applyNote } from "./note-box";
import { useStudy } from "./study-provider";

/**
 * A page for keywords, numbers and outlines while working: the paper Gùa would
 * have used. It belongs to the sitting it is written in, and a part of a
 * sitting has a page of its own. It is saved with every keystroke, like the
 * essays beside it, so there is nothing to lose when the page is left.
 */
export function ScratchPad({
  value,
  onChange,
  label,
  placeholder,
  defaultOpen,
}: {
  value: string;
  /** Returns why the text was not kept, if it was not. */
  onChange: (value: string) => string | undefined;
  /** What the box is called to a screen reader. */
  label: string;
  placeholder: string;
  /** Open from the start; by default only when there is something on it. */
  defaultOpen?: boolean;
}) {
  const [error, setError] = useState("");
  // Open or shut is the learner's choice once she has made one. Until then a
  // page with something on it is open. It must not follow the text alone: an
  // input method that corrects with Backspace (Unikey, EVKey) empties the box
  // for an instant in the middle of a word, and so does select-all and delete;
  // a page that folds away then takes the focus, and the next letters, with it.
  // Only a click on the heading is a choice (a keyboard press on it is a click
  // too): the page opening itself because text arrived is not.
  const [chosen, setChosen] = useState<boolean | null>(null);
  // The same page reused for another part of the sitting starts over.
  const [forLabel, setForLabel] = useState(label);
  if (forLabel !== label) {
    setForLabel(label);
    setChosen(null);
  }
  return (
    <details className="scratch" open={chosen ?? defaultOpen ?? Boolean(value)}>
      <summary
        onClick={(event) => {
          // The page is opened and shut by the state above, not by the
          // browser: left alone, the browser would flip it again after this.
          event.preventDefault();
          setChosen(!event.currentTarget.parentElement?.hasAttribute("open"));
        }}
      >
        <PenLine size={14} />
        Nháp
        <small> · để luyện, không tính điểm hay số từ</small>
      </summary>
      <textarea
        aria-label={label}
        value={value}
        rows={4}
        maxLength={WORK_LIMITS.scratch}
        spellCheck={false}
        placeholder={placeholder}
        // Being in the box is as good as having opened it: a page that opened
        // itself because it had text, and is then emptied, must stay.
        onFocus={() => setChosen((was) => was ?? true)}
        onChange={(event) => setError(onChange(event.target.value) ?? "")}
      />
      {error ? (
        <p className="note-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="help-copy">Tự lưu cùng lượt này.</p>
      )}
    </details>
  );
}

/** What was on the page, read back after the sitting, with a way to keep it. */
export function ScratchReview({
  text,
  place,
}: {
  text: string | undefined;
  place: NotePlace;
}) {
  const { update, toast } = useStudy();
  const [kept, setKept] = useState(false);
  if (!text) return null;
  return (
    <details className="scratch scratch-review">
      <summary>
        <PenLine size={14} />
        Nháp của bạn ở phần này
      </summary>
      <p className="note-body">{text}</p>
      <button
        type="button"
        className="note-add"
        disabled={kept}
        onClick={() => {
          const outcome = applyNote(update, (state) =>
            addNote(state, {
              body: text,
              anchor: {
                ...place.anchor,
                label: `${place.anchor.label} · nháp`,
              },
            }),
          );
          if (outcome?.error) toast(outcome.error);
          else {
            setKept(true);
            toast("Đã lưu nháp thành ghi chú. Xem trong Sổ ghi chú.");
          }
        }}
      >
        {kept ? "Đã lưu thành ghi chú" : "Lưu thành ghi chú"}
      </button>
    </details>
  );
}

/**
 * The sentences highlighted in a text, each with a way to write about it. A
 * note written here belongs to the same place as the other notes of the part
 * and carries the sentence it is about.
 */
export function HighlightNotes({
  text,
  marks,
  place,
}: {
  text: string;
  marks: readonly Mark[] | undefined;
  place: NotePlace;
}) {
  const spans = useMemo(() => sentenceSpans(text), [text]);
  const marked = useMemo(
    () => [...resolveMarks(spans, marks).marked].sort((a, b) => a - b),
    [spans, marks],
  );
  if (!marked.length) return null;
  return (
    <details className="highlight-notes">
      <summary>Câu đã tô ({marked.length})</summary>
      <ul>
        {marked.map((index) => (
          <li key={index}>
            <q lang="en">{spans[index].text}</q>
            <NoteAdder
              anchor={{ ...place.anchor, quote: spans[index].text }}
              label="Ghi chú về câu đã tô"
              button="Ghi chú về câu này"
            />
          </li>
        ))}
      </ul>
    </details>
  );
}
