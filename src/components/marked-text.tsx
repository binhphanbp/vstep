"use client";
import { Fragment, useMemo, useState } from "react";
import { Highlighter } from "lucide-react";
import {
  layoutLines,
  resolveMarks,
  sentenceSpans,
  type Mark,
} from "@/lib/marks";

/**
 * A text with the sentences Gùa has highlighted drawn in place.
 *
 * Highlighting a sentence is one tap, a click, or Tab and Enter: with the mode
 * on, every sentence is a button that is pressed or not. With it off the page
 * reads as before and a highlighted sentence is an ordinary <mark>, which
 * screen readers and high-contrast modes already know how to present.
 */
export function MarkedLines({
  text,
  marks,
  active,
  onToggle,
}: {
  text: string;
  marks: readonly Mark[] | undefined;
  active: boolean;
  onToggle: (sentence: number) => void;
}) {
  const spans = useMemo(() => sentenceSpans(text), [text]);
  const lines = useMemo(() => layoutLines(text, spans), [text, spans]);
  const marked = useMemo(
    () => resolveMarks(spans, marks).marked,
    [spans, marks],
  );
  return (
    <>
      {lines.map((line, lineIndex) => {
        const content = line.pieces.map((piece, pieceIndex) => {
          const index = piece.sentence;
          if (index === undefined)
            return <Fragment key={pieceIndex}>{piece.text}</Fragment>;
          const on = marked.has(index);
          if (active)
            return (
              <span
                key={pieceIndex}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                className={`hl-pick ${on ? "on" : ""}`}
                onClick={() => onToggle(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggle(index);
                  }
                }}
              >
                {piece.text}
              </span>
            );
          return on ? (
            <mark key={pieceIndex} className="hl">
              {piece.text}
            </mark>
          ) : (
            <Fragment key={pieceIndex}>{piece.text}</Fragment>
          );
        });
        return line.heading ? (
          <strong className="paper-heading" key={lineIndex}>
            {content}
          </strong>
        ) : (
          <Fragment key={lineIndex}>
            {content}
            {lineIndex < lines.length - 1 ? "\n" : ""}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * The text with its own switch and a line saying what the switch does. Used
 * wherever a passage, a transcript or a task is shown, in the place's own
 * wrapper so its styling and its reading-region role stay as they were.
 */
export function MarkablePassage({
  text,
  marks,
  onToggle,
  className,
  region,
}: {
  text: string;
  marks: readonly Mark[] | undefined;
  /** Returns why the highlight was not kept, if it was not. */
  onToggle: (sentence: number) => string | undefined;
  /** The wrapper's class: `paper-text` or `passage`. */
  className: string;
  /** Makes the wrapper a focusable reading region with this name. */
  region?: string;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const { lost, marked } = useMemo(
    () => resolveMarks(sentenceSpans(text), marks),
    [text, marks],
  );
  return (
    <div className="markable">
      <div className="mark-bar no-print">
        <button
          type="button"
          className={`mark-toggle ${active ? "on" : ""}`}
          aria-pressed={active}
          onClick={() => setActive(!active)}
        >
          <Highlighter size={14} />
          Tô câu
        </button>
        <span className="help-copy" role="status">
          {active
            ? "Bấm vào một câu để tô; bấm lần nữa để bỏ tô."
            : marked.size
              ? `${marked.size} câu đã tô.`
              : ""}
          {lost.length
            ? ` ${lost.length} câu đã tô không còn tìm thấy vì bài đã đổi.`
            : ""}
        </span>
        {error && (
          <span className="note-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <div
        className={className}
        lang="en"
        {...(region
          ? { tabIndex: 0, role: "region", "aria-label": region }
          : {})}
      >
        <MarkedLines
          text={text}
          marks={marks}
          active={active}
          onToggle={(sentence) => setError(onToggle(sentence) ?? "")}
        />
      </div>
    </div>
  );
}
