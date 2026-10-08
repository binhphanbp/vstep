/**
 * The model must quote the learner's own words for every error and every piece
 * of evidence. A quote that is not in the text is the model inventing, so it is
 * dropped before anything is scored or shown.
 */

/** Fold what does not change the meaning of a quote: spacing, curly quotes, dashes, case. */
export function foldQuote(text: string) {
  return text
    .normalize("NFC")
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** A quote this short matches almost any text, so it proves nothing. */
export const MIN_QUOTE_CHARS = 3;

export function quoteInText(quote: string, text: string) {
  const needle = foldQuote(quote);
  if (needle.length < MIN_QUOTE_CHARS) return false;
  return foldQuote(text).includes(needle);
}

export type Verified<T> = { kept: T[]; dropped: number };

/** Keep the items whose `quote` is found in `text`; count the rest. */
export function verifyQuotes<T extends { quote: string }>(
  items: T[],
  text: string,
): Verified<T> {
  const kept = items.filter((item) => quoteInText(item.quote, text));
  return { kept, dropped: items.length - kept.length };
}
