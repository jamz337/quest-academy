// Number Dash question generator. Output: { prompt, answer, choices, skill }
import { numericDistractors, makeChoices, round } from '../distractors.js';

function q(prompt, answer, skill, rng, opts = {}) {
  const fmt = opts.format || ((v) => String(v));
  const d = numericDistractors(answer, rng, { min: opts.min ?? 0, candidates: opts.candidates || [] });
  return { prompt, answer: fmt(answer), choices: makeChoices(answer, d, rng, fmt), skill };
}

function gradeA(grade, rng) {
  const kind = rng.pick(grade === 2 ? ['add', 'add', 'sub', 'sub'] : ['add', 'sub', 'add100', 'sub100', 'mult', 'mult']);
  switch (kind) {
    case 'add': { const a = rng.int(1, 12), b = rng.int(1, 20 - a); return q(`${a} + ${b}`, a + b, 'add', rng, { candidates: [a + b + 1, a + b - 1, Math.abs(a - b)] }); }
    case 'sub': { const a = rng.int(2, 20), b = rng.int(1, a); return q(`${a} − ${b}`, a - b, 'sub', rng, { candidates: [a - b + 1, a - b - 1, a + b] }); }
    case 'add100': { const a = rng.int(10, 79), b = rng.int(10, 99 - a); return q(`${a} + ${b}`, a + b, 'add', rng, { candidates: [a + b - 10, a + b + 10, a + b + 1] }); }
    case 'sub100': { const a = rng.int(20, 99), b = rng.int(5, a - 1); return q(`${a} − ${b}`, a - b, 'sub', rng, { candidates: [a - b + 10, a - b - 10, a - b + 1] }); }
    default: { const m = rng.pick([2, 5, 10]), n = rng.int(1, 10); return q(`${m} × ${n}`, m * n, 'mult', rng, { candidates: [m * (n + 1), m * (n - 1), m + n] }); }
  }
}

function gradeB(grade, rng) {
  const kinds = ['times', 'times', 'div', 'twoByOne', 'add1000', 'sub1000'];
  if (grade === 5) kinds.push('decAdd', 'decSub');
  const kind = rng.pick(kinds);
  switch (kind) {
    case 'times': { const a = rng.int(2, 12), b = rng.int(2, 12); return q(`${a} × ${b}`, a * b, 'mult', rng, { candidates: [a * (b + 1), (a + 1) * b, a * b + a, a + b] }); }
    case 'div': { const b = rng.int(2, 12), c = rng.int(2, 12); return q(`${b * c} ÷ ${b}`, c, 'div', rng, { candidates: [c + 1, c - 1, b, c + 2] }); }
    case 'twoByOne': { const a = rng.int(12, 49), b = rng.int(2, 9); return q(`${a} × ${b}`, a * b, 'mult', rng, { candidates: [a * b + b, a * b - b, a * b + 10, (a + 1) * b] }); }
    case 'add1000': { const a = rng.int(100, 700), b = rng.int(100, 999 - a); return q(`${a} + ${b}`, a + b, 'add', rng, { candidates: [a + b - 100, a + b + 100, a + b + 10] }); }
    case 'sub1000': { const a = rng.int(200, 999), b = rng.int(50, a - 1); return q(`${a} − ${b}`, a - b, 'sub', rng, { candidates: [a - b + 100, a - b - 100, a - b + 10] }); }
    case 'decAdd': { const a = rng.int(1, 90) / 10, b = rng.int(1, 90) / 10; const s = round(a + b, 1); return q(`${a} + ${b}`, s, 'decimal', rng, { format: (v) => String(round(v, 1)), candidates: [round(s + 0.1, 1), round(s - 0.1, 1), round(s + 1, 1)] }); }
    default: { const a = rng.int(20, 99) / 10, b = rng.int(1, Math.floor(a * 10) - 1) / 10; const s = round(a - b, 1); return q(`${a} − ${b}`, s, 'decimal', rng, { format: (v) => String(round(v, 1)), candidates: [round(s + 0.1, 1), round(s - 0.1, 1), round(s + 1, 1)] }); }
  }
}

function gradeC(grade, rng) {
  const kinds = ['negAdd', 'negSub', 'negMult', 'order', 'percent', 'eq1', 'eq2', 'square'];
  const kind = rng.pick(kinds);
  const neg = (v) => (v < 0 ? `(${v})` : `${v}`);
  switch (kind) {
    case 'negAdd': { const a = rng.int(-20, 20), b = rng.int(-20, 20); return q(`${neg(a)} + ${neg(b)}`, a + b, 'integers', rng, { min: -Infinity, candidates: [a - b, -(a + b), Math.abs(a) + Math.abs(b)] }); }
    case 'negSub': { const a = rng.int(-20, 20), b = rng.int(-20, 20); return q(`${neg(a)} − ${neg(b)}`, a - b, 'integers', rng, { min: -Infinity, candidates: [a + b, b - a, -(a - b)] }); }
    case 'negMult': { const a = rng.int(-9, 9) || 3, b = rng.int(-9, 9) || -2; return q(`${neg(a)} × ${neg(b)}`, a * b, 'integers', rng, { min: -Infinity, candidates: [-(a * b), a * b + a, a + b] }); }
    case 'order': { const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 9); const ans = a + b * c; return q(`${a} + ${b} × ${c}`, ans, 'order-of-operations', rng, { candidates: [(a + b) * c, a * b + c, ans + 1] }); }
    case 'percent': { const p = rng.pick([10, 20, 25, 50, 75]), base = rng.pick([20, 40, 60, 80, 120, 200, 300]); const ans = (p * base) / 100; return q(`${p}% of ${base}`, ans, 'percent', rng, { candidates: [ans * 2, ans / 2, base - ans, p] }); }
    case 'eq1': { const x = rng.int(1, 20), b = rng.int(1, 20); return q(`x + ${b} = ${x + b}\nx = ?`, x, 'equations', rng, { candidates: [x + b, x + 2 * b, b] }); }
    case 'eq2': { const x = rng.int(2, 12), a = rng.int(2, 9); return q(`${a}x = ${a * x}\nx = ?`, x, 'equations', rng, { candidates: [a * x, x + a, a] }); }
    default: { const n = rng.int(4, 15); return q(`${n}²`, n * n, 'squares', rng, { candidates: [n * 2, n * n + n, (n + 1) * (n + 1)] }); }
  }
}

export function generateQuestion(grade, rng) {
  if (grade <= 3) return gradeA(grade, rng);
  if (grade <= 5) return gradeB(grade, rng);
  return gradeC(grade, rng);
}

export function generateSet(grade, rng, n = 10) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const item = generateQuestion(grade, rng);
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    out.push(item);
  }
  return out;
}
