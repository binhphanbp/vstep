import { shieldDots } from "./speech";

/**
 * Sentences of a passage and the ones Gùa has highlighted.
 *
 * A highlight is a whole sentence, not a stretch of characters. Selecting a
 * range of text with the keyboard is not possible on a plain page without
 * caret browsing, and on a phone it is a fight with the selection handles;
 * tapping a sentence works with a finger, a mouse and Tab + Enter alike.
 *
 * A highlight is saved as the sentence's number and its first words. The words
 * are how a highlight finds its sentence again if the text has changed since:
 * the number is tried first, then any sentence that begins the same way, and a
 * highlight that matches nothing, or more than one sentence, is reported as
 * lost instead of being drawn on a sentence it was never made on.
 */
export const MARK_LIMITS = {
  /** Sentences that can be highlighted in one text. */
  perText: 60,
  /** Characters of the sentence kept to find it again. */
  quote: 60,
  /** The highest sentence number a text can have. */
  sentences: 1000,
} as const;

export type Mark = { i: number; q: string };
export type Span = { start: number; end: number; text: string };

// A sentence ends at . ! ? and takes a closing quote or bracket with it, so
// `He said "Stop." Then left.` does not hand the quote to the next sentence.
const SENTENCE = /[^.!?]+[.!?]+["'”’)\]]*|[^.!?]+$/g;
const HEADING = /^#{1,6}\s+/;

/**
 * The sentences of a text, in reading order, with where each one sits in it.
 * A Markdown heading line ("# Title") is one sentence of its own, counted
 * without the hashes, as the pages print it. Titles, decimals and abbreviations
 * do not end a sentence, exactly as in the read-aloud voice.
 */
export function sentenceSpans(text: string): Span[] {
  const spans: Span[] = [];
  let lineStart = 0;
  for (const line of text.split("\n")) {
    const heading = line.match(HEADING);
    if (heading) {
      const body = line.slice(heading[0].length).trimEnd();
      if (body)
        spans.push({
          start: lineStart + heading[0].length,
          end: lineStart + heading[0].length + body.length,
          text: body,
        });
    } else {
      const shielded = shieldDots(line);
      for (const match of shielded.matchAll(SENTENCE)) {
        const raw = line.slice(match.index, match.index + match[0].length);
        const lead = raw.length - raw.trimStart().length;
        const body = raw.trim();
        if (!body) continue;
        spans.push({
          start: lineStart + match.index + lead,
          end: lineStart + match.index + lead + body.length,
          text: body,
        });
      }
    }
    lineStart += line.length + 1;
  }
  return spans;
}

/** Which sentences are highlighted now, and which highlights found nothing. */
export function resolveMarks(
  spans: readonly Span[],
  marks: readonly Mark[] | undefined,
): { marked: Set<number>; lost: Mark[] } {
  const marked = new Set<number>();
  const lost: Mark[] = [];
  for (const mark of marks ?? []) {
    if (spans[mark.i]?.text.startsWith(mark.q)) {
      marked.add(mark.i);
      continue;
    }
    const same = spans.flatMap((span, index) =>
      span.text.startsWith(mark.q) ? [index] : [],
    );
    if (same.length === 1) marked.add(same[0]);
    else lost.push(mark);
  }
  return { marked, lost };
}

/**
 * Highlights the sentence, or takes the highlight off if it already has one.
 * Refused, with the reason, when the text already holds as many as it can.
 */
export function toggleMark(
  spans: readonly Span[],
  marks: readonly Mark[] | undefined,
  index: number,
): { marks: Mark[]; error?: string } {
  const current = marks ?? [];
  const target = spans[index];
  if (!target) return { marks: [...current] };
  const { marked } = resolveMarks(spans, current);
  if (marked.has(index)) {
    return {
      marks: current.filter(
        (mark) => !resolveMarks(spans, [mark]).marked.has(index),
      ),
    };
  }
  if (current.length >= MARK_LIMITS.perText)
    return {
      marks: [...current],
      error: `Mỗi bài chỉ tô được tối đa ${MARK_LIMITS.perText} câu. Bỏ bớt một câu rồi tô lại.`,
    };
  return {
    marks: [
      ...current,
      { i: index, q: target.text.slice(0, MARK_LIMITS.quote) },
    ].sort((a, b) => a.i - b.i),
  };
}

/** A stretch of a line: plain text, or the sentence with this number. */
export type Piece = { text: string; sentence?: number };
export type Line = { heading: boolean; pieces: Piece[] };

/**
 * The text cut into lines and pieces, so a page can draw a highlight around a
 * sentence and leave every other character exactly where it was (spaces and
 * line breaks are what the page's own styling relies on).
 */
export function layoutLines(text: string, spans: readonly Span[]): Line[] {
  const lines: Line[] = [];
  let lineStart = 0;
  let next = 0;
  for (const line of text.split("\n")) {
    const lineEnd = lineStart + line.length;
    const heading = HEADING.exec(line);
    const pieces: Piece[] = [];
    let cursor = heading ? heading[0].length : 0;
    while (next < spans.length && spans[next].start <= lineEnd) {
      const span = spans[next];
      const from = span.start - lineStart;
      const to = span.end - lineStart;
      if (from > cursor) pieces.push({ text: line.slice(cursor, from) });
      pieces.push({ text: line.slice(from, to), sentence: next });
      cursor = to;
      next++;
    }
    if (cursor < line.length) pieces.push({ text: line.slice(cursor) });
    lines.push({ heading: Boolean(heading), pieces });
    lineStart = lineEnd + 1;
  }
  return lines;
}
