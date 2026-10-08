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
