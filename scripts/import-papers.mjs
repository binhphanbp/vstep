/**
 * Import the five locally collected papers into a small, versioned format.
 * Run with: node scripts/import-papers.mjs /path/to/vstep/data
 * The source directory is intentionally external to this repository.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

const source = resolve(process.argv[2] ?? "../vstep/data");
const target = resolve("public/papers");
const audioTarget = join(target, "audio");
const copiedAudio = new Set();
const sources = [
  ...[132, 133, 134, 135].map((number) => ({
    id: String(number),
    file: `de-thi-thu-vstep-${number}.json`,
  })),
  {
    id: "review-1309",
    file: "de-thi-thu-vstep-review-bo-sung-1309-bamboo-history.json",
  },
];

function localAudio(url) {
  if (!url || typeof url !== "string") return undefined;
  const name = basename(new URL(url).pathname);
  if (!/^[\w.-]+\.mp3$/i.test(name)) throw Error(`Unsafe audio name: ${name}`);
  const file = join(source, "audios", name);
  if (!existsSync(file)) throw Error(`Missing audio: ${file}`);
  copiedAudio.add(name);
  return `/papers/audio/${name}`;
}

function sample(sample) {
  const urls = [sample.audioUrl, ...Object.values(sample.topicAudio ?? {})]
    .filter((value) => typeof value === "string" && value)
    .map(localAudio);
  return {
    band: sample.band ?? sample.level ?? "",
    title: sample.title ?? "Bài mẫu",
    text: sample.transcript ?? sample.text ?? "",
    translation: sample.vi ?? "",
    audio: urls,
  };
}

const manifest = [];
const papers = [];
for (const { id: paperId, file } of sources) {
  const raw = readFileSync(join(source, "exams", file));
  const input = JSON.parse(raw);
  const seen = new Set();
  const sections = input.exam.sections.map((section) => ({
    skill: section.skill,
    minutes: section.durationMinutes,
    slots: section.slots.map((entry, index) => {
      const question = entry.question;
      const id = `${paperId}-${section.skill}-${index + 1}`;
      const payload = question.payload ?? {};
      const items = (question.items ?? []).map((item) => {
        const itemId = `${paperId}-${item.id}`;
        if (seen.has(itemId)) throw Error(`Duplicate item ${itemId}`);
        seen.add(itemId);
        const options = item.options.map((option) => ({
          text: option.en,
          translation: option.vi ?? "",
        }));
        const answer = item.correctOption
          ? "ABCD".indexOf(item.correctOption)
          : -1;
        if (options.length !== 4 || options.some((option) => !option.text))
          throw Error(`${id}: invalid options`);
        if (answer >= 0) {
          const marked = item.options.findIndex((option) => option.correct);
          if (marked !== answer) throw Error(`${id}: contradictory answer`);
        }
        return {
          id: itemId,
          number: item.num,
          text: item.stemEn,
          translation: item.stemVi ?? "",
          options,
          answer: answer >= 0 ? answer : null,
          explanation: item.explanation ?? "",
          evidence: item.locator ?? "",
          notes: "ABCD".split("").map((letter) =>
            typeof item.whyJson === "object" && item.whyJson
              ? (item.whyJson[letter] ?? "")
              : "",
          ),
        };
      });
      const cues = [
        ...(payload.recordUnits ?? []).flatMap((unit) => [
          unit.label,
          ...(unit.questions ?? []),
        ]),
        ...(payload.cueCard?.options ?? []),
        ...(payload.followUps ?? []),
      ].filter((value) => typeof value === "string" && value);
      return {
        id,
        part: entry.partLabel,
        title: question.title ?? entry.partLabel,
        code: question.code,
        audio: localAudio(question.audioUrl),
        passage: question.passageEn ?? "",
        passageTranslation: question.passageVi ?? "",
        transcript: question.transcriptEn ?? "",
        transcriptTranslation: question.transcriptVi ?? "",
        prompt: question.promptEn ?? "",
        promptTranslation: question.promptVi ?? "",
        cues,
        wordMin:
          section.skill === "writing"
            ? question.part === 1
              ? 120
              : 250
            : undefined,
        items,
        samples: (payload.sampleAnswers ?? []).map(sample),
      };
    }),
  }));
  const shape = sections.map((section) => [
    section.skill,
    section.slots.length,
    section.slots.reduce((total, slot) => total + slot.items.length, 0),
  ]);
  if (
    JSON.stringify(shape) !==
    JSON.stringify([
      ["listening", 14, 35],
      ["reading", 4, 40],
      ["writing", 2, 0],
      ["speaking", 3, 0],
    ])
  )
    throw Error(`Paper ${paperId}: unexpected section structure`);
  const items = sections.flatMap((section) =>
    section.slots.flatMap((slot) => slot.items),
  );
  const graded = items.every((item) => item.answer !== null);
  if (!graded)
    throw Error(`Paper ${paperId}: unexpected answer-key completeness`);
  const paper = {
    id: paperId,
    version: 1,
    source: "Bộ đề của chủ dự án, dùng cho học cá nhân",
    sourceHash: createHash("sha256").update(raw).digest("hex"),
    title: input.exam.title,
    graded,
    sections,
  };
  papers.push(paper);
  manifest.push({ id: paper.id, title: paper.title, graded, version: 1 });
  console.log(`${paperId}: 75 questions, ${graded ? "graded" : "ungraded"}`);
}
// Validate every paper and referenced audio before replacing generated files.
mkdirSync(audioTarget, { recursive: true });
for (const paper of papers)
  writeFileSync(join(target, `${paper.id}.json`), JSON.stringify(paper));
for (const name of copiedAudio)
  copyFileSync(join(source, "audios", name), join(audioTarget, name));
writeFileSync(join(target, "manifest.json"), JSON.stringify(manifest));
console.log(`${copiedAudio.size} local audio files copied`);
