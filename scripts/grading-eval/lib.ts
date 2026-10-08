import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** A small RFC 4180 parser: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.map((r) =>
    Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])),
  );
}

/** A fixed pseudo-random generator, so a sample is the same on every run. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Every item belongs to the tuning half or the held-out half for good, decided
 * by its id. Prompts and anchors are tuned on the first; the second is read
 * only to report a final number and is never used to change anything.
 */
export function splitOf(id: string): "tune" | "holdout" {
  return hashString(`split:${id}`) % 2 === 0 ? "tune" : "holdout";
}

export function sample<T>(items: T[], n: number, seed = 1) {
  const random = seeded(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Run `work` over `items`, at most `limit` at a time, keeping the order. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  work: (item: T, index: number) => Promise<R>,
) {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await work(items[index], index);
      }
    }),
  );
  return out;
}

export function args(argv = process.argv.slice(2)) {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) out[key] = true;
    else {
      out[key] = value;
      i++;
    }
  }
  return out;
}

export const DATA_DIR = ".data";

export function writeReport(name: string, report: unknown) {
  const dir = join(DATA_DIR, "reports");
  mkdirSync(dir, { recursive: true });
  const file = join(
    dir,
    `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}
