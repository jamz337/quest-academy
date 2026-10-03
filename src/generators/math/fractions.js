// Fraction Pizza round generator. Every round carries everything the scene needs; the scene does no maths.
// kinds: shade | equivalent | compare | add | convert
import { round } from '../distractors.js';
import { gradeOf } from '../../data/grades.js';

export const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const lcm = (a, b) => (a * b) / gcd(a, b);
export const frac = (n, d) => `${n}/${d}`;
export const simplify = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };

/** 4 shuffled choices: the answer plus 3 unique distractors (candidates first, then a random fallback). */
function choicesFor(answerStr, candidates, fallback, rng, isBad = () => false) {
  const out = [];
  const seen = new Set([answerStr]);
  const tryAdd = (s) => { if (s && !seen.has(s) && !isBad(s) && !/NaN|undefined|Infinity/.test(s)) { seen.add(s); out.push(s); } };
  for (const c of candidates) { if (out.length >= 3) break; tryAdd(c); }
  let guard = 0;
  while (out.length < 3 && guard++ < 200) tryAdd(fallback());
  return rng.shuffle([answerStr, ...out]);
}

const fracVal = (s) => { const [n, d] = s.split('/').map(Number); return n / d; };
const validFrac = (s) => { const [n, d] = s.split('/').map(Number); return n >= 1 && d >= 2 && n <= d; };

function shadeRound(grade, rng) {
  const den = rng.pick(grade <= 2 ? [2, 4] : [2, 3, 4, 6, 8]);
  const num = rng.int(1, den - 1);
  return { kind: 'shade', num, den, slices: den, answer: frac(num, den), prompt: `Shade ${frac(num, den)} of the pizza`, skill: 'fractions' };
}

function equivalentRound(rng) {
  let p, q;
  do { q = rng.pick([2, 3, 4, 5, 6]); p = rng.int(1, q - 1); } while (gcd(p, q) !== 1);
  const k = rng.int(2, Math.max(2, Math.min(3, Math.floor(12 / q))));
  const shown = frac(k * p, k * q), answer = frac(p, q);
  const val = p / q;
  const bad = (s) => !validFrac(s) || Math.abs(fracVal(s) - val) < 1e-9;
  const cands = [frac(p, q + 1), frac(p + 1, q), frac(p, k * q), frac(k * p, q), frac(q - p, q), frac(p + 1, q + 1)];
  const choices = choicesFor(answer, cands, () => { const d = rng.int(2, 12); return frac(rng.int(1, d), d); }, rng, bad);
  return { kind: 'equivalent', num: k * p, den: k * q, slices: k * q, answer, choices, prompt: `Which fraction equals ${shown}?`, skill: 'equivalent' };
}

function compareRound(rng) {
  let a, b;
  do {
    const d1 = rng.int(2, 10), d2 = rng.int(2, 10);
    a = { num: rng.int(1, d1 - 1), den: d1 }; b = { num: rng.int(1, d2 - 1), den: d2 };
  } while (Math.abs(a.num / a.den - b.num / b.den) < 1e-9);
  const answer = a.num / a.den > b.num / b.den ? 0 : 1;
  return { kind: 'compare', pizzas: [a, b], labels: [frac(a.num, a.den), frac(b.num, b.den)], answer, prompt: 'Tap the bigger fraction', skill: 'compare' };
}

function addRound(rng) {
  let b, d, L, a, c, num;
  do {
    b = rng.int(2, 12); d = rng.int(2, 12); L = lcm(b, d);
    a = rng.int(1, b - 1); c = rng.int(1, d - 1);
    num = (a * L) / b + (c * L) / d;
  } while (L > 12 || num > L);
  return { kind: 'add', a, b, c, d, num, den: L, slices: L, answer: frac(num, L),
    prompt: `Shade ${frac(a, b)} + ${frac(c, d)}`, hint: `This pizza has ${L} slices`, skill: 'fraction-add' };
}

function convertRound(rng) {
  const den = rng.pick([2, 4, 5, 10, 20, 25, 50]);
  const num = rng.int(1, den - 1);
  const v = num / den;
  const percent = rng.chance(0.5);
  let answer, cands, fallback;
  if (percent) {
    const p = round(v * 100, 1);
    answer = `${p}%`;
    cands = [100 - p, p / 10, p + 10, p - 10, num, den].map((x) => `${round(x, 1)}%`);
    fallback = () => `${rng.int(1, 99)}%`;
  } else {
    answer = String(round(v, 2));
    cands = [1 - v, v / 10, v + 0.1, v - 0.1, num / 10, v * 10].map((x) => String(round(x, 2)));
    fallback = () => String(round(rng.int(1, 99) / 100, 2));
  }
  const bad = (s) => { const n = parseFloat(s); return !(n > 0) || n > 100 || (!percent && n >= 1); };
  const choices = choicesFor(answer, cands, fallback, rng, bad);
  return { kind: 'convert', num, den, slices: den, answer, choices,
    prompt: `${frac(num, den)} as a ${percent ? 'percent' : 'decimal'} is...`, skill: 'convert' };
}

export function generateRounds(grade, rng, n = 8) {
  const g = gradeOf(grade);
  const out = [];
  const bOffset = rng.int(0, 1);
  for (let i = 0; i < n; i++) {
    if (g <= 3) out.push(shadeRound(g, rng));
    else if (g <= 5) out.push((i + bOffset) % 2 === 0 ? equivalentRound(rng) : compareRound(rng));
    else out.push(i % 3 === 2 ? convertRound(rng) : addRound(rng));
  }
  return out;
}

/** How hard a round is, for ordering a game easy to hard: bigger pizzas (denominators) are harder to picture. */
export const roundDifficulty = (r) => r.den ?? Math.max(...(r.pizzas || []).map((p) => p.den), 0);
