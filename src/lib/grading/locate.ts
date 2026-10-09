/**
 * Where a quoted error sits in the learner's own text, so it can be marked in
 * place. The quote was already checked to be in the text after folding spacing,
 * curly quotes and dashes (verify.ts), so the search tolerates the same.
 */
const APOSTROPHES = "'’‘‚‛′`´";
const DOUBLE = '"“”„‟″';
const DASHES = "-‐‑‒–—―";

const escapeChar = (char: string) =>
  char.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const klass = (chars: string) => `[${chars.replace(/[\]\\^-]/g, "\\$&")}]`;

function patternFor(quote: string) {
  let out = "";
  let space = false;
  for (const char of quote.trim()) {
    if (/\s/u.test(char)) {
      space = true;
      continue;
    }
    if (space && out) out += "\\s+";
    space = false;
    if (APOSTROPHES.includes(char)) out += klass(APOSTROPHES);
    else if (DOUBLE.includes(char)) out += klass(DOUBLE);
    else if (DASHES.includes(char)) out += klass(DASHES);
    else out += escapeChar(char);
  }
  return out;
}

export type Span = { start: number; end: number; index: number };

/** First place `quote` occurs in `text`, ignoring case, spacing, quote and dash style. */
export function locateQuote(text: string, quote: string) {
  const pattern = patternFor(quote);
  if (pattern.length === 0) return null;
  const match = new RegExp(pattern, "iu").exec(text);
  return match
    ? { start: match.index, end: match.index + match[0].length }
    : null;
}

/**
 * Spans for a list of quotes, sorted, with a quote that overlaps one already
 * placed left out (two errors sharing words: the first listed wins). `index`
 * is the quote's position in the list, so a mark can point at its explanation.
 */
export function errorSpans(text: string, quotes: string[]): Span[] {
  const found: Span[] = [];
  quotes.forEach((quote, index) => {
    const place = locateQuote(text, quote);
    if (!place) return;
    if (found.some((s) => place.start < s.end && s.start < place.end)) return;
    found.push({ ...place, index });
  });
  return found.sort((a, b) => a.start - b.start);
}

export type Piece = { text: string; error?: number };

/** The text cut into plain pieces and marked pieces, in order, losing nothing. */
export function markedPieces(text: string, spans: Span[]): Piece[] {
  const pieces: Piece[] = [];
  let at = 0;
  for (const span of spans) {
    if (span.start > at) pieces.push({ text: text.slice(at, span.start) });
    pieces.push({ text: text.slice(span.start, span.end), error: span.index });
    at = span.end;
  }
  if (at < text.length) pieces.push({ text: text.slice(at) });
  return pieces;
}
