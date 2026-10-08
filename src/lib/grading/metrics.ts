/**
 * Agreement between the grader and human raters. These are the figures the
 * eval harness reports and the gates are set from.
 */

export function pearson(a: number[], b: number[]) {
  if (a.length !== b.length || a.length < 2) return NaN;
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da === 0 || db === 0 ? NaN : num / Math.sqrt(da * db);
}

/** Quadratic weighted kappa over integer categories 0..(levels-1). */
export function qwk(a: number[], b: number[], levels: number) {
  if (a.length !== b.length || a.length === 0) return NaN;
  const n = a.length;
  const observed = Array.from({ length: levels }, () =>
    new Array<number>(levels).fill(0),
  );
  const histA = new Array<number>(levels).fill(0);
  const histB = new Array<number>(levels).fill(0);
  for (let i = 0; i < n; i++) {
    const x = Math.round(a[i]);
    const y = Math.round(b[i]);
    if (x < 0 || y < 0 || x >= levels || y >= levels)
      throw new RangeError("giá trị ngoài số mức của QWK");
    observed[x][y]++;
    histA[x]++;
    histB[y]++;
  }
  let num = 0;
  let den = 0;
  for (let i = 0; i < levels; i++)
    for (let j = 0; j < levels; j++) {
      const weight = (i - j) ** 2 / (levels - 1) ** 2;
      num += weight * observed[i][j];
      den += (weight * histA[i] * histB[j]) / n;
    }
  return den === 0 ? NaN : 1 - num / den;
}

export function meanAbsoluteError(a: number[], b: number[]) {
  return a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
}

/** Share of pairs that differ by at most `tolerance`. */
export function withinShare(a: number[], b: number[], tolerance: number) {
  return (
    a.filter((v, i) => Math.abs(v - b[i]) <= tolerance + 1e-9).length / a.length
  );
}
