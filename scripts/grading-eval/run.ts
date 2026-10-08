/**
 * The eval harness: how closely does the grader agree with human raters?
 *
 *   npx tsx scripts/grading-eval/run.ts <mode> [options]
 *
 * Modes
 *   ellipse     Criterion scores against ELLIPSE (human analytic scores).
 *   samples     Level against examiner-leveled samples in .data/samples/*.json.
 *   stability   The same essays graded --repeat times.
 *   perturb     Edits with a known direction of effect.
 *   speech      Pronunciation and fluency against speechocean762.
 *
 * Options
 *   --model <id>    model to grade with (default: config GRADER_MODEL)
 *   --n <count>     items to use (default 40)
 *   --split <s>     tune | holdout (default holdout; read it only for a final figure)
 *   --dry           no API calls: a deterministic stand-in model, to test the plumbing
 *   --csv, --scores, --wav-dir, --repeat   data locations / repeat count
 *
 * Needs GEMINI_API_KEY (unless --dry). Never run in CI. Data lives in .data/,
 * which is not committed; reports go to .data/reports/. Cambridge corpora
 * (Write & Improve, Speak & Improve) may not be redistributed or have their
 * derived figures published without the publisher's approval, so reports stay
 * local.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GRADER_MODEL } from "../../src/lib/grading/config";
import type { Generate } from "../../src/lib/grading/generate";
import { geminiGenerate } from "../../src/lib/grading/gemini";
import { GATES, THRESHOLDS, type Gates } from "../../src/lib/grading/gates";
import {
  meanAbsoluteError,
  pearson,
  qwk,
  withinShare,
} from "../../src/lib/grading/metrics";
import { gradeSpeaking } from "../../src/lib/grading/speaking";
import {
  WRITING_CRITERIA,
  bandOf,
  roundHalf,
  type WritingCriterion,
} from "../../src/lib/grading/scores";
import { gradeWriting, type WritingGrade } from "../../src/lib/grading/writing";
import { ESSAY_TEMPLATES } from "../../src/lib/grading/requirements";
import {
  DATA_DIR,
  args,
  parseCsv,
  pool,
  sample,
  splitOf,
  writeReport,
} from "./lib";
import { PERTURBATIONS } from "./perturb";

const options = args();
const mode = process.argv[2];
const model = typeof options.model === "string" ? options.model : GRADER_MODEL;
const n = typeof options.n === "string" ? Number(options.n) : 40;
const split = options.split === "tune" ? "tune" : "holdout";
const dry = options.dry === true;

/** Every gate open: the harness has to see the marks, whatever the app would show. */
const OPEN: Gates = {
  writing: { task: true, organization: true, vocabulary: true, grammar: true },
  speaking: {
    grammar: true,
    vocabulary: true,
    pronunciation: true,
    fluency: true,
    discourse: true,
  },
  measuredOn: null,
};

/** A deterministic stand-in so the plumbing can be checked without a key. */
const standIn: Generate = async (request) => {
  const seed = [
    ...request.label,
    ...JSON.stringify(request.parts).slice(0, 400),
  ].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  if (request.label.includes("transcribe"))
    return {
      transcript:
        "this is a stand in transcript with enough words to pass the silence check",
      words: Array.from({ length: 15 }, (_, i) => ({
        word: "word",
        start: i,
        end: i + 0.6,
      })),
    };
  if (request.label.includes("analysis"))
    return { requirements: [], errors: [] };
  const names = request.label.includes("speaking")
    ? ["grammar", "vocabulary", "pronunciation", "fluency", "discourse"]
    : [...WRITING_CRITERIA];
  return {
    criteria: names.map((criterion, i) => ({
      criterion,
      score: 4 + ((seed + i * 7) % 5),
      evidence: [],
      whyNotHigher: "stand-in",
      whyNotLower: "stand-in",
      toRaise: "stand-in",
    })),
    summary: "stand-in",
  };
};

function generator(): Generate {
  if (dry) return standIn;
  if (!process.env.GEMINI_API_KEY)
    throw new Error("GEMINI_API_KEY chưa được đặt (hoặc dùng --dry).");
  return geminiGenerate();
}

function need(path: string, what: string) {
  if (!existsSync(path))
    throw new Error(`Thiếu ${what}: ${path} (xem docs/PLAN-CHAM-AI.md §7).`);
  return path;
}

const OPINION = ESSAY_TEMPLATES.find(
  (t) => t.type === "extent of agreement",
)!.requirements;

async function gradeEssay(text: string, prompt: string, generate: Generate) {
  const grade = await gradeWriting(
    { task: 2, prompt, requirements: OPINION, text },
    { generate, model, gates: OPEN },
  );
  return grade;
}

/** Our 0–10 criterion mark on ELLIPSE's 1–5 scale in half steps (a fixed linear map). */
const toEllipse = (mark: number) =>
  Math.min(5, Math.max(1, roundHalf(1 + 0.4 * mark)));
const level = (score: number) => Math.round((score - 1) * 2); // 1..5 → 0..8

function describe(name: string, ours: number[], human: number[]) {
  const mapped = ours.map(toEllipse);
  const bias =
    mapped.reduce((s, v, i) => s + (v - human[i]), 0) / mapped.length;
  return {
    criterion: name,
    n: ours.length,
    pearson: pearson(ours, human),
    qwk: qwk(mapped.map(level), human.map(level), 9),
    meanAbsoluteError: meanAbsoluteError(mapped, human),
    meanBias: bias,
    exact: withinShare(mapped, human, 0),
    withinHalf: withinShare(mapped, human, 0.5),
  };
}

async function ellipse() {
  const csv = need(
    typeof options.csv === "string"
      ? options.csv
      : join(DATA_DIR, "ellipse", "ellipse_train.csv"),
    "file CSV của ELLIPSE",
  );
  const rows = parseCsv(readFileSync(csv, "utf8")).filter(
    (r) => splitOf(r.text_id_kaggle) === split && r.full_text,
  );
  const chosen = sample(rows, n, 11);
  const generate = generator();
  const graded = await pool(chosen, 4, async (row) => ({
    row,
    grade: await gradeEssay(
      row.full_text,
      `Essay topic: ${row.prompt}`,
      generate,
    ),
  }));
  const ok = graded.filter(
    (
      g,
    ): g is {
      row: Record<string, string>;
      grade: Extract<WritingGrade, { status: "graded" }>;
    } => g.grade.status === "graded",
  );
  const pairs: [WritingCriterion, string][] = [
    ["organization", "Cohesion"],
    ["vocabulary", "Vocabulary"],
    ["grammar", "Grammar"],
  ];
  const results = pairs.map(([ours, theirs]) =>
    describe(
      `${ours} ↔ ${theirs}`,
      ok.map((g) => g.grade.criteria[ours].score),
      ok.map((g) => Number(g.row[theirs])),
    ),
  );
  const t = THRESHOLDS.writingCriterion;
  const verdicts = results.map((r) => ({
    criterion: r.criterion,
    passes: r.qwk >= t.qwk && Math.abs(r.meanBias) <= t.maxBias,
  }));
  const quoteFalse =
    ok.reduce((s, g) => s + g.grade.droppedQuotes, 0) /
    Math.max(
      1,
      ok.reduce((s, g) => s + g.grade.totalQuotes, 0),
    );
  return {
    mode: "ellipse",
    model,
    split,
    n: ok.length,
    skipped: graded.length - ok.length,
    results,
    verdicts,
    quoteFalseShare: quoteFalse,
    quotesPass: quoteFalse <= THRESHOLDS.quotes.maxFalse,
    note: "ELLIPSE is US grade 8–12 ELL writing: it checks criterion ordering, not VSTEP bands. 'task' has no ELLIPSE counterpart.",
  };
}

async function samples() {
  const dir = need(join(DATA_DIR, "samples"), "thư mục bài mẫu có bậc");
  const items = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap(
      (f) =>
        JSON.parse(readFileSync(join(dir, f), "utf8")) as {
          id: string;
          task: 1 | 2;
          prompt: string;
          text: string;
          level: "below-b1" | "b1" | "b2" | "c1";
        }[],
    )
    .filter((item) => splitOf(item.id) === split || options.all === true);
  const generate = generator();
  const order = ["below-b1", "b1", "b2", "c1"];
  const graded = await pool(items, 4, async (item) => {
    const requirements = item.prompt
      .split(/\n/)
      .filter((l) => /^\s*(?:[•*-]|\d+[.)])\s/.test(l))
      .map((l, i) => ({
        id: `r${i + 1}`,
        text: l.replace(/^\s*(?:[•*-]|\d+[.)])\s+/, ""),
      }));
    const grade = await gradeWriting(
      {
        task: item.task,
        prompt: item.prompt,
        requirements: requirements.length ? requirements : OPINION,
        text: item.text,
      },
      { generate, model, gates: OPEN },
    );
    return { item, grade };
  });
  const ok = graded.filter(
    (
      g,
    ): g is {
      item: (typeof items)[number];
      grade: Extract<WritingGrade, { status: "graded" }>;
    } => g.grade.status === "graded",
  );
  const predicted = ok.map((g) => order.indexOf(bandOf(g.grade.rawTaskScore)));
  const human = ok.map((g) => order.indexOf(g.item.level));
  const t = THRESHOLDS.writingLevel;
  const result = {
    n: ok.length,
    qwk: qwk(predicted, human, 4),
    exact: withinShare(predicted, human, 0),
    withinOne: withinShare(predicted, human, 1),
  };
  return {
    mode: "samples",
    model,
    split: options.all === true ? "all" : split,
    result,
    passes:
      result.qwk >= t.qwk &&
      result.exact >= t.exact &&
      result.withinOne >= t.withinOne,
    items: ok.map((g) => ({
      id: g.item.id,
      human: g.item.level,
      ours: bandOf(g.grade.rawTaskScore),
      score: g.grade.rawTaskScore,
    })),
  };
}

async function stability() {
  const csv = need(
    typeof options.csv === "string"
      ? options.csv
      : join(DATA_DIR, "ellipse", "ellipse_train.csv"),
    "file CSV của ELLIPSE",
  );
  const repeat =
    typeof options.repeat === "string" ? Number(options.repeat) : 10;
  const rows = sample(
    parseCsv(readFileSync(csv, "utf8")).filter(
      (r) => splitOf(r.text_id_kaggle) === split && r.full_text,
    ),
    n,
    21,
  );
  const generate = generator();
  const spreads = await pool(rows, 2, async (row) => {
    const scores: number[] = [];
    for (let i = 0; i < repeat; i++) {
      const grade = await gradeEssay(
        row.full_text,
        `Essay topic: ${row.prompt}`,
        generate,
      );
      if (grade.status === "graded") scores.push(grade.rawTaskScore);
    }
    return scores.length ? Math.max(...scores) - Math.min(...scores) : NaN;
  });
  const valid = spreads.filter((s) => !Number.isNaN(s));
  const share =
    valid.filter((s) => s <= THRESHOLDS.stability.maxMove).length /
    Math.max(1, valid.length);
  return {
    mode: "stability",
    model,
    n: valid.length,
    repeat,
    shareWithinHalf: share,
    worstSpread: Math.max(...valid),
    passes: share >= THRESHOLDS.stability.share,
  };
}

async function perturb() {
  const csv = need(
    typeof options.csv === "string"
      ? options.csv
      : join(DATA_DIR, "ellipse", "ellipse_train.csv"),
    "file CSV của ELLIPSE",
  );
  const rows = sample(
    parseCsv(readFileSync(csv, "utf8")).filter(
      (r) => splitOf(r.text_id_kaggle) === split && Number(r.num_words) >= 150,
    ),
    n,
    31,
  );
  const generate = generator();
  const out = [];
  for (const p of PERTURBATIONS) {
    const pairs = await pool(rows, 3, async (row) => {
      const before = await gradeEssay(
        row.full_text,
        `Essay topic: ${row.prompt}`,
        generate,
      );
      const after = await gradeEssay(
        p.apply(row.full_text, 5),
        `Essay topic: ${row.prompt}`,
        generate,
      );
      return before.status === "graded" && after.status === "graded"
        ? { before, after }
        : null;
    });
    const ok = pairs.filter((x): x is NonNullable<typeof x> => x !== null);
    const keys = p.hurts.includes("all")
      ? [...WRITING_CRITERIA]
      : (p.hurts as WritingCriterion[]);
    const notHigher = ok.filter((x) =>
      keys.every(
        (k) => x.after.criteria[k].score <= x.before.criteria[k].score,
      ),
    ).length;
    out.push({
      perturbation: p.id,
      hurts: p.hurts,
      n: ok.length,
      shareNotHigher: notHigher / Math.max(1, ok.length),
      meanChange: Object.fromEntries(
        WRITING_CRITERIA.map((k) => [
          k,
          ok.reduce(
            (s, x) =>
              s + (x.after.criteria[k].score - x.before.criteria[k].score),
            0,
          ) / Math.max(1, ok.length),
        ]),
      ),
    });
  }
  return { mode: "perturb", model, split, results: out };
}

/** Duration of a 16-bit PCM WAV, from its header. */
function wavSeconds(buffer: Buffer) {
  const rate = buffer.readUInt32LE(24);
  const channels = buffer.readUInt16LE(22);
  const bits = buffer.readUInt16LE(34);
  return (buffer.length - 44) / (rate * channels * (bits / 8));
}

async function speech() {
  const scores = JSON.parse(
    readFileSync(
      need(
        typeof options.scores === "string"
          ? options.scores
          : join(DATA_DIR, "speechocean762", "scores.json"),
        "scores.json của speechocean762",
      ),
      "utf8",
    ),
  ) as Record<
    string,
    { accuracy: number[]; fluency: number[]; prosodic: number[] }
  >;
  const wavDir = need(
    typeof options["wav-dir"] === "string"
      ? options["wav-dir"]
      : join(DATA_DIR, "speechocean762", "WAVE"),
    "thư mục WAV",
  );
  const ids = sample(
    Object.keys(scores).filter(
      (id) =>
        (splitOf(id) === split && existsSync(join(wavDir, `${id}.WAV`))) ||
        existsSync(join(wavDir, `${id}.wav`)),
    ),
    n,
    41,
  );
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const generate = generator();
  const graded = await pool(ids, 3, async (id) => {
    const file = [join(wavDir, `${id}.WAV`), join(wavDir, `${id}.wav`)].find(
      existsSync,
    )!;
    const buffer = readFileSync(file);
    const grade = await gradeSpeaking(
      [
        {
          id,
          title: "Read aloud",
          prompt: "The speaker was asked to read a short sentence aloud.",
          audio: { mimeType: "audio/wav", base64: buffer.toString("base64") },
          durationSeconds: wavSeconds(buffer),
        },
      ],
      { generate, model, transcribeModel: model, gates: OPEN },
    );
    return { id, grade };
  });
  const ok = graded.filter(
    (
      g,
    ): g is {
      id: string;
      grade: Extract<
        Awaited<ReturnType<typeof gradeSpeaking>>,
        { status: "graded" }
      >;
    } => g.grade.status === "graded",
  );
  const pron = pearson(
    ok.map((g) => g.grade.criteria.pronunciation.score),
    ok.map((g) => mean(scores[g.id].accuracy)),
  );
  const flu = pearson(
    ok.map((g) => g.grade.criteria.fluency.score),
    ok.map((g) => mean(scores[g.id].fluency)),
  );
  const t = THRESHOLDS.speechCriterion.pearson;
  return {
    mode: "speech",
    model,
    split,
    n: ok.length,
    pronunciation: { pearson: pron, passes: pron >= t },
    fluency: { pearson: flu, passes: flu >= t },
    note: "speechocean762 is read-aloud by Mandarin-L1 speakers: it checks that pronunciation and fluency marks follow human ones, not VSTEP bands.",
  };
}

const modes: Record<string, () => Promise<unknown>> = {
  ellipse,
  samples,
  stability,
  perturb,
  speech,
};

async function main() {
  const run = modes[mode];
  if (!run) {
    console.error(
      `Chế độ: ${Object.keys(modes).join(" | ")}  (xem phần đầu file này)`,
    );
    process.exit(2);
  }
  const report = (await run()) as Record<string, unknown>;
  report.dry = dry;
  report.at = new Date().toISOString();
  report.gatesAtRun = GATES.measuredOn;
  const file = writeReport(`${mode}-${model}${dry ? "-dry" : ""}`, report);
  console.log(JSON.stringify(report, null, 2));
  console.error(`\nBáo cáo: ${file}`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
