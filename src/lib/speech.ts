/**
 * A full stop that does not end a sentence. Splitting at every one of them cut
 * "Dr. Hart" in two and read "3.5" as "3" and "5", and "Nghe lại câu này" then
 * replayed half a sentence.
 */
export const KEPT_DOT = "\u0001";
export function shieldDots(line: string) {
  return (
    line
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Jr|Sr)\./g, `$1${KEPT_DOT}`)
      .replace(/(\d)\.(?=\d)/g, `$1${KEPT_DOT}`)
      .replace(/\b(e\.g|i\.e)\./gi, (match) => match.replaceAll(".", KEPT_DOT))
      // "9 a.m." keeps its inner dot always, and its last one only when the next
      // word carries on the sentence ("a.m. today") rather than begins another.
      .replace(/\b([aApP])\.(?=[mM]\.)/g, `$1${KEPT_DOT}`)
      .replace(
        new RegExp(`\\b([aApP]${KEPT_DOT}[mM])\\.(?=\\s+[a-z])`, "g"),
        `$1${KEPT_DOT}`,
      )
  );
}
/**
 * The most a single utterance is asked to say. Chrome's network voices (the
 * "Google UK English" ones) stop an utterance after about fifteen seconds and
 * send no `end` event, so a long sentence at the slowest speed could leave the
 * player "playing" in silence. A hundred and forty characters is about twelve
 * seconds at 0.8×.
 */
export const UTTERANCE_LIMIT = 140;
const CLAUSE_BREAK = /[,;:]\s|\s[-–—]\s/g;
/**
 * One sentence as the pieces it is spoken in: whole when it is short enough,
 * otherwise cut at the comma, semicolon, colon or dash nearest its middle (a
 * space when it has none), again for any piece still too long. Punctuation
 * stays with the words before it, so the voice still pauses there. The player
 * counts sentences, not pieces: "câu 3/12" does not change.
 */
export function speechPieces(
  sentence: string,
  limit = UTTERANCE_LIMIT,
): string[] {
  const text = sentence.trim();
  if (text.length <= limit) return text ? [text] : [];
  const middle = text.length / 2;
  let cut = -1;
  let nearest = Infinity;
  for (const found of text.matchAll(CLAUSE_BREAK)) {
    // Just after the punctuation or the dash, before the space that follows.
    const at = found.index + found[0].length - 1;
    const distance = Math.abs(at - middle);
    if (at >= 20 && text.length - at >= 20 && distance < nearest) {
      nearest = distance;
      cut = at;
    }
  }
  if (cut < 0) {
    for (let at = text.indexOf(" "); at >= 0; at = text.indexOf(" ", at + 1)) {
      const distance = Math.abs(at - middle);
      if (distance < nearest) {
        nearest = distance;
        cut = at;
      }
    }
  }
  // One long word and no break to cut at: say it as it is.
  if (cut < 0) return [text];
  return [
    ...speechPieces(text.slice(0, cut), limit),
    ...speechPieces(text.slice(cut), limit),
  ];
}
/** Keep dialogue turns distinct without reading speaker labels aloud. */
export function speechChunks(text: string) {
  const speakers: string[] = [];
  return text.split(/\n+/).flatMap((line) => {
    const dialogue = line.match(/^([A-Z][a-z]+):\s*(.*)$/);
    let speaker = 0;
    if (dialogue) {
      if (!speakers.includes(dialogue[1])) speakers.push(dialogue[1]);
      speaker = speakers.indexOf(dialogue[1]);
    }
    const content = shieldDots(dialogue ? dialogue[2] : line);
    return (content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
      .map((sentence) => ({
        text: sentence.trim().replaceAll(KEPT_DOT, "."),
        speaker,
      }))
      .filter((part) => part.text);
  });
}
