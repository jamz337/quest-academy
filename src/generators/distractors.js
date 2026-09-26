// Wrong-answer generation shared by the math games. Distractors are "near misses", never duplicates.

/** Produce `count` unique wrong numeric answers near `answer`. */
export function numericDistractors(answer, rng, opts = {}) {
  const { count = 3, min = -Infinity, max = Infinity, candidates = [] } = opts;
  const out = new Set();
  const isOk = (v) => Number.isFinite(v) && v !== answer && v >= min && v <= max && !out.has(v);
  // Preferred near-miss candidates first (operand swaps, forgotten carries, etc.)
  for (const c of candidates) { if (out.size >= count) break; if (isOk(c)) out.add(c); }
  const deltas = [1, -1, 2, -2, 10, -10, 3, -3, 5, -5, 4, -4, 20, -20, 100, -100];
  let guard = 0;
  while (out.size < count && guard++ < 200) {
    const d = rng.pick(deltas) * (rng.chance(0.3) ? rng.int(1, 3) : 1);
    const v = answer + d;
    if (isOk(v)) out.add(v);
    else if (guard > 60) { const v2 = answer + rng.int(-Math.max(5, Math.abs(answer)), Math.max(5, Math.abs(answer))); if (isOk(v2)) out.add(v2); }
  }
  return [...out].slice(0, count);
}

/** Build a shuffled 4-choice array (strings) containing the answer. */
export function makeChoices(answer, distractors, rng, format = (v) => String(v)) {
  const all = [answer, ...distractors].map(format);
  return rng.shuffle(all);
}

/** Round to avoid float noise like 0.30000000000000004 */
export const round = (v, dp = 2) => Math.round(v * 10 ** dp) / 10 ** dp;
