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
    const content = dialogue ? dialogue[2] : line;
    return (content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
      .map((sentence) => ({ text: sentence.trim(), speaker }))
      .filter((part) => part.text);
  });
}
