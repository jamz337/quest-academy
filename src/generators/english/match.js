// Word Match rounds: 3 rounds of 5 pairs, no pair reused. Each round: { pairs: [{l,r,k}], right: number[] }
// `right[j]` is the index (into pairs) of the pair whose right-hand card sits in row j.
import { PAIRS } from '../../data/english/pairBank.js';
import { bandFor } from '../../data/grades.js';

export const ROUNDS = 3;
export const PAIRS_PER_ROUND = 5;

/** `weak` (skill ids) puts pairs of those skills into the draw first, so a missed skill is revisited. */
export function generateRounds(grade, rng, bank = PAIRS[bandFor(grade)], weak = []) {
  const weakSet = new Set(weak || []);
  const n = ROUNDS * PAIRS_PER_ROUND;
  let picked = rng.sample(bank, n);
  if (weakSet.size) {
    const wanted = rng.sample(bank.filter((p) => weakSet.has(p.k)), Math.min(PAIRS_PER_ROUND, n));
    const rest = rng.shuffle(bank.filter((p) => !wanted.includes(p))).slice(0, n - wanted.length);
    picked = rng.shuffle([...wanted, ...rest]);
  }
  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    const pairs = picked.slice(r * PAIRS_PER_ROUND, (r + 1) * PAIRS_PER_ROUND).map((p) => ({ ...p }));
    const ids = pairs.map((_, i) => i);
    let right = rng.shuffle(ids);
    for (let g = 0; g < 10 && right.every((v, i) => v === i); g++) right = rng.shuffle(ids);
    if (right.every((v, i) => v === i)) right = ids.slice(1).concat(ids[0]);
    rounds.push({ pairs, right });
  }
  return rounds;
}
