// Number Dash / Balloon Pop question generator. Output: { prompt, answer, choices, skill, difficulty }
// `d` (0..1) is how hard the question should be within the grade: every kind of sum has a ladder of steps, from
// the gentlest first meeting (5 − 2) up to the hardest the grade expects (72 − 38, with borrowing).
import { numericDistractors, makeChoices, round } from '../distractors.js';

function q(prompt, answer, skill, rng, opts = {}) {
  const fmt = opts.format || ((v) => String(v));
  const d = numericDistractors(answer, rng, { min: opts.min ?? 0, candidates: opts.candidates || [] });
  return { prompt, answer: fmt(answer), choices: makeChoices(answer, d, rng, fmt), skill };
}

/** Which rung of a ladder with `rungs` steps a difficulty lands on. */
const rung = (d, rungs) => Math.max(0, Math.min(rungs - 1, Math.round(d * (rungs - 1))));
/** Scale a range's upper end with difficulty: lo at d = 0, hi at d = 1. */
const upTo = (d, lo, hi) => Math.round(lo + (hi - lo) * Math.max(0, Math.min(1, d)));

const add = (a, b, rng, extra = []) => q(`${a} + ${b}`, a + b, 'add', rng, { candidates: [a + b + 1, a + b - 1, ...extra] });
const sub = (a, b, rng, extra = []) => q(`${a} − ${b}`, a - b, 'sub', rng, { candidates: [a - b + 1, a - b - 1, ...extra] });

/**
 * Adding, easiest first: within 10; within 20; 2-digit + 1-digit, no carry; add tens; 2-digit + 2-digit, no carry;
 * with a carry. `top` is the highest rung the grade reaches.
 */
function addLadder(step, rng) {
  switch (step) {
    case 0: { const a = rng.int(1, 8), b = rng.int(1, 10 - a); return add(a, b, rng, [Math.abs(a - b)]); }
    case 1: { const a = rng.int(4, 12), b = rng.int(Math.max(1, 11 - a), 20 - a); return add(a, b, rng, [Math.abs(a - b)]); }
    case 2: { const t = rng.int(2, 8), o = rng.int(0, 7), b = rng.int(1, 9 - o); const a = t * 10 + o; return add(a, b, rng, [a + b + 10]); }
    case 3: { const a = rng.int(11, 79), b = 10 * rng.int(1, 9 - Math.floor(a / 10)); return add(a, b, rng, [a + b - 10, a + b + 10]); }
    case 4: {
      const at = rng.int(1, 7), ao = rng.int(0, 8), bt = rng.int(1, 8 - at), bo = rng.int(0, 9 - ao);
      const a = at * 10 + ao, b = bt * 10 + bo;
      return add(a, b, rng, [a + b + 10, a + b - 10]);
    }
    default: {
      const ao = rng.int(2, 9), bo = rng.int(10 - ao, 9), at = rng.int(1, 7), bt = rng.int(1, 8 - at);
      const a = at * 10 + ao, b = bt * 10 + bo;
      return add(a, b, rng, [a + b - 10, a + b + 10]);   // forgetting the carried ten is the classic slip
    }
  }
}

/**
 * Taking away, easiest first: within 10; within 20; 2-digit − 1-digit, no borrow (89 − 7); take away tens (89 − 20);
 * 2-digit − 2-digit, no borrow (89 − 17); with borrowing (72 − 38).
 */
function subLadder(step, rng) {
  switch (step) {
    case 0: { const a = rng.int(3, 10), b = rng.int(1, Math.min(5, a - 1)); return sub(a, b, rng, [a + b]); }
    case 1: { const a = rng.int(11, 20), b = rng.int(2, 9); return sub(a, b, rng, [a + b]); }
    case 2: { const t = rng.int(2, 9), o = rng.int(2, 9), b = rng.int(1, o); const a = t * 10 + o; return sub(a, b, rng, [a - b - 10, a - b + 10]); }
    case 3: { const t = rng.int(3, 9), a = t * 10 + rng.int(0, 9), b = 10 * rng.int(1, t - 1); return sub(a, b, rng, [a - b + 10, a - b - 10]); }
    case 4: {
      const at = rng.int(3, 9), ao = rng.int(1, 9), bt = rng.int(1, at - 1), bo = rng.int(1, ao);
      return sub(at * 10 + ao, bt * 10 + bo, rng, [(at - bt) * 10 + ao - bo + 10, (at - bt) * 10 + ao - bo - 10]);
    }
    default: {
      const at = rng.int(3, 9), ao = rng.int(0, 8), bt = rng.int(1, at - 1), bo = rng.int(ao + 1, 9);
      const a = at * 10 + ao, b = bt * 10 + bo;
      return sub(a, b, rng, [a - b + 10, a - b - 10]);   // not borrowing leaves the answer ten too big
    }
  }
}

function gradeA(grade, rng, d) {
  const kind = rng.pick(grade === 2 ? ['add', 'add', 'sub', 'sub'] : ['add', 'add', 'sub', 'sub', 'mult', 'mult']);
  // Grade 2 stops after "2-digit + 1-digit"; grade 3 climbs all the way to carrying and borrowing.
  const rungs = grade === 2 ? 3 : 6;
  if (kind === 'add') return addLadder(rung(d, rungs), rng);
  if (kind === 'sub') return subLadder(rung(d, rungs), rng);
  // Times tables: 2 and 10 up to 5 first, then 2, 5 and 10 all the way.
  const m = d < 0.4 ? rng.pick([2, 10]) : rng.pick([2, 5, 10]), n = rng.int(1, d < 0.4 ? 5 : 10);
  return q(`${m} × ${n}`, m * n, 'mult', rng, { candidates: [m * (n + 1), m * (n - 1), m + n] });
}

/** Three-digit adding or taking away: whole hundreds, then no carrying or borrowing, then anything. */
function bigSum(op, d, rng) {
  const step = rung(d, 3);
  if (op === '+') {
    if (step === 0) { const a = 100 * rng.int(1, 7), b = 100 * rng.int(1, 9 - a / 100); return add(a, b, rng, [a + b - 100, a + b + 100]); }
    if (step === 1) {
      const digits = () => { const x = rng.int(1, 8), y = rng.int(0, 8), z = rng.int(0, 8); return [x, y, z]; };
      const [ah, at, ao] = digits();
      const b = 100 * rng.int(1, 9 - ah) + 10 * rng.int(0, 9 - at) + rng.int(0, 9 - ao);
      const a = ah * 100 + at * 10 + ao;
      return add(a, b, rng, [a + b - 100, a + b + 100, a + b + 10]);
    }
    const a = rng.int(100, 700), b = rng.int(100, 999 - a);
    return q(`${a} + ${b}`, a + b, 'add', rng, { candidates: [a + b - 100, a + b + 100, a + b + 10] });
  }
  if (step === 0) { const a = 100 * rng.int(3, 9), b = 100 * rng.int(1, a / 100 - 1); return sub(a, b, rng, [a - b + 100, a - b - 100]); }
  if (step === 1) {
    const ah = rng.int(3, 9), at = rng.int(1, 9), ao = rng.int(1, 9);
    const b = 100 * rng.int(1, ah - 1) + 10 * rng.int(0, at) + rng.int(0, ao);
    const a = ah * 100 + at * 10 + ao;
    return sub(a, b, rng, [a - b + 100, a - b - 100, a - b + 10]);
  }
  const a = rng.int(200, 999), b = rng.int(50, a - 1);
  return q(`${a} − ${b}`, a - b, 'sub', rng, { candidates: [a - b + 100, a - b - 100, a - b + 10] });
}

function gradeB(grade, rng, d) {
  // Long multiplication and decimals wait until the tables and hundreds have warmed the child up.
  const kinds = ['times', 'times', 'div', 'add1000', 'sub1000'];
  if (d >= 0.3) kinds.push('twoByOne');
  if (grade === 5 && d >= 0.3) kinds.push('decAdd', 'decSub');
  const kind = rng.pick(kinds);
  const table = upTo(d, 5, 12);   // times tables grow from the 2-5s to the 12s
  switch (kind) {
    case 'times': { const a = rng.int(2, table), b = rng.int(2, table); return q(`${a} × ${b}`, a * b, 'mult', rng, { candidates: [a * (b + 1), (a + 1) * b, a * b + a, a + b] }); }
    case 'div': { const b = rng.int(2, table), c = rng.int(2, table); return q(`${b * c} ÷ ${b}`, c, 'div', rng, { candidates: [c + 1, c - 1, b, c + 2] }); }
    case 'twoByOne': { const a = rng.int(12, upTo(d, 19, 49)), b = rng.int(2, upTo(d, 4, 9)); return q(`${a} × ${b}`, a * b, 'mult', rng, { candidates: [a * b + b, a * b - b, a * b + 10, (a + 1) * b] }); }
    case 'add1000': return bigSum('+', d, rng);
    case 'sub1000': return bigSum('−', d, rng);
    case 'decAdd': {
      // No carrying across the point at first (1.2 + 3.4), then anything.
      let a, b;
      if (d < 0.5) { const ta = rng.int(0, 8); a = (rng.int(1, 8) * 10 + ta) / 10; b = (rng.int(1, 8) * 10 + rng.int(1, 9 - ta)) / 10; } else { a = rng.int(1, 90) / 10; b = rng.int(1, 90) / 10; }
      const s = round(a + b, 1);
      return q(`${a} + ${b}`, s, 'decimal', rng, { format: (v) => String(round(v, 1)), candidates: [round(s + 0.1, 1), round(s - 0.1, 1), round(s + 1, 1)] });
    }
    default: {
      let a, b;
      if (d < 0.5) { const ta = rng.int(2, 9); a = (rng.int(3, 9) * 10 + ta) / 10; b = (rng.int(1, Math.floor(a) - 1) * 10 + rng.int(1, ta)) / 10; } else { a = rng.int(20, 99) / 10; b = rng.int(1, Math.floor(a * 10) - 1) / 10; }
      const s = round(a - b, 1);
      return q(`${a} − ${b}`, s, 'decimal', rng, { format: (v) => String(round(v, 1)), candidates: [round(s + 0.1, 1), round(s - 0.1, 1), round(s + 1, 1)] });
    }
  }
}

function gradeC(grade, rng, d) {
  const kinds = ['negAdd', 'negSub', 'negMult', 'order', 'percent', 'eq1', 'eq2', 'square'];
  const kind = rng.pick(kinds);
  const neg = (v) => (v < 0 ? `(${v})` : `${v}`);
  const r = upTo(d, 10, 20);   // how far from zero the negative numbers reach
  switch (kind) {
    case 'negAdd': { const a = rng.int(-r, r), b = rng.int(-r, r); return q(`${neg(a)} + ${neg(b)}`, a + b, 'integers', rng, { min: -Infinity, candidates: [a - b, -(a + b), Math.abs(a) + Math.abs(b)] }); }
    case 'negSub': { const a = rng.int(-r, r), b = rng.int(-r, r); return q(`${neg(a)} − ${neg(b)}`, a - b, 'integers', rng, { min: -Infinity, candidates: [a + b, b - a, -(a - b)] }); }
    case 'negMult': { const m = upTo(d, 5, 9); const a = rng.int(-m, m) || 3, b = rng.int(-m, m) || -2; return q(`${neg(a)} × ${neg(b)}`, a * b, 'integers', rng, { min: -Infinity, candidates: [-(a * b), a * b + a, a + b] }); }
    case 'order': { const m = upTo(d, 5, 9); const a = rng.int(2, m), b = rng.int(2, m), c = rng.int(2, m); const ans = a + b * c; return q(`${a} + ${b} × ${c}`, ans, 'order-of-operations', rng, { candidates: [(a + b) * c, a * b + c, ans + 1] }); }
    case 'percent': {
      const easy = d < 0.4;
      const p = rng.pick(easy ? [10, 50] : [10, 20, 25, 50, 75]), base = rng.pick(easy ? [20, 40, 60, 80, 200] : [20, 40, 60, 80, 120, 200, 300]);
      const ans = (p * base) / 100;
      return q(`${p}% of ${base}`, ans, 'percent', rng, { candidates: [ans * 2, ans / 2, base - ans, p] });
    }
    case 'eq1': { const x = rng.int(1, upTo(d, 10, 20)), b = rng.int(1, upTo(d, 10, 20)); return q(`x + ${b} = ${x + b}\nx = ?`, x, 'equations', rng, { candidates: [x + b, x + 2 * b, b] }); }
    case 'eq2': { const x = rng.int(2, upTo(d, 6, 12)), a = rng.int(2, upTo(d, 5, 9)); return q(`${a}x = ${a * x}\nx = ?`, x, 'equations', rng, { candidates: [a * x, x + a, a] }); }
    default: { const n = rng.int(4, upTo(d, 9, 15)); return q(`${n}²`, n * n, 'squares', rng, { candidates: [n * 2, n * n + n, (n + 1) * (n + 1)] }); }
  }
}

/** One question. `d` is its difficulty 0..1 within the grade; left out, it is picked at random (duels, bosses). */
export function generateQuestion(grade, rng, d) {
  const diff = d === undefined ? rng.float() : Math.max(0, Math.min(1, d));
  const out = grade <= 3 ? gradeA(grade, rng, diff) : grade <= 5 ? gradeB(grade, rng, diff) : gradeC(grade, rng, diff);
  out.difficulty = diff;
  return out;
}

/**
 * A set of n different questions. opts.targets (see systems/Ramp.js) gives each question's difficulty, easiest first;
 * opts.isNew(skill) says whether the child has never met a skill; its first two questions stay on the bottom rungs.
 */
export function generateSet(grade, rng, n = 10, opts = {}) {
  const { targets = null, isNew = () => false } = opts;
  const met = {};
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const d = targets ? targets[out.length] : undefined;
    let item = generateQuestion(grade, rng, d);
    // A skill met for the very first time starts at the bottom, whatever the ramp has reached.
    if (targets && isNew(item.skill) && (met[item.skill] || 0) < 2) {
      const skill = item.skill, easy = Math.min(d, (met[skill] || 0) * 0.2);
      for (let t = 0; t < 20; t++) { const alt = generateQuestion(grade, rng, easy); if (alt.skill === skill) { item = alt; break; } }
    }
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    met[item.skill] = (met[item.skill] || 0) + 1;
    out.push(item);
  }
  return out;
}
