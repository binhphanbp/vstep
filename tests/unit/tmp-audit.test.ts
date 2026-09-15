import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { lessons } from "../../src/lib/content";
it("audit", () => {
  const out: string[] = [];
  const known = new Set<string>();
  for (const lesson of lessons) {
    if (lesson.skill !== "reading" && lesson.skill !== "listening") continue;
    const sentences = lesson.text
      .replace(/\n/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 40 && s.length < 190);
    const picks: string[] = [];
    for (const sentence of sentences) {
      for (const raw of sentence.split(/[^A-Za-z'-]+/)) {
        const word = raw.toLowerCase();
        if (word.length < 7 || known.has(word)) continue;
        known.add(word);
        picks.push(`${word} :: ${sentence}`);
      }
    }
    out.push(`## ${lesson.id} (${lesson.topic})`, ...picks.slice(0, 14));
  }
  writeFileSync("/tmp/claude-0/words.txt", out.join("\n"));
});
