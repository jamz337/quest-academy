// Difficulty ramp: every game starts easy and climbs a little with each question, so a child meeting an idea for
// the first time gets a gentle way in. Difficulty is a number from 0 (easiest this grade offers) to 1 (hardest).

/** Where the climb starts and ends: a first-ever game stays low, and each house level starts a little higher. */
const SPANS = { fresh: [0, 0.55], 1: [0, 0.7], 2: [0.15, 0.85], 3: [0.3, 1] };

/**
 * How hard each of n questions should be, easiest first. `level` is the house level (1-3); `fresh` means the child
 * has never played this game before (or is meeting its skill for the first time).
 */
export function rampTargets(n, { level = 1, fresh = false } = {}) {
  const [from, to] = fresh ? SPANS.fresh : SPANS[Math.max(1, Math.min(3, level | 0 || 1))];
  return Array.from({ length: n }, (_, i) => (n <= 1 ? from : from + ((to - from) * i) / (n - 1)));
}

/** The ramp for a mini-game launch: its house level, and whether this is the child's first go at it. */
export function rampFor(payload, profile) {
  return { level: payload?.level || 1, fresh: !(profile?.games?.[payload?.gameId]?.plays > 0) };
}

/**
 * Pick n items from a candidate pool so they climb from easy to hard. `score(item)` is any number where bigger means
 * harder; items are ranked by it, and for each target the unused item whose rank is nearest is taken. The pool should
 * be a few times bigger than n so every step of the climb has something close.
 */
export function rampOrder(pool, targets, score) {
  if (!pool.length) return [];
  const ranked = pool.map((item, i) => ({ item, s: Number(score(item)) || 0, i })).sort((a, b) => a.s - b.s || a.i - b.i);
  // Equal scores share a rank, so a tie never counts as "harder".
  const last = ranked.length - 1;
  ranked.forEach((r, j) => { r.rank = last ? j / last : 0; });
  for (let j = 0, k; j < ranked.length; j = k) {
    for (k = j; k < ranked.length && ranked[k].s === ranked[j].s; k++);
    const mid = (ranked[j].rank + ranked[k - 1].rank) / 2;
    for (let m = j; m < k; m++) ranked[m].rank = mid;
  }
  const used = new Set();
  const out = [];
  for (const t of targets) {
    let best = null;
    for (const r of ranked) if (!used.has(r) && (!best || Math.abs(r.rank - t) < Math.abs(best.rank - t))) best = r;
    if (!best) break;
    used.add(best);
    out.push(best.item);
  }
  return out;
}

/** Keep a list's order easiest first by the difficulty each item carries (stable for equal difficulty). */
export const byDifficulty = (list) => list.map((q, i) => ({ q, i })).sort((a, b) => (a.q.difficulty ?? 0) - (b.q.difficulty ?? 0) || a.i - b.i).map((x) => x.q);
