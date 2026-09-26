// Pattern Bridge round generator. Output: { terms, missingIndex, answer, choices, skill, rule }
import { numericDistractors, makeChoices } from '../distractors.js';

function build(terms, skill, rng, opts = {}) {
  const mi = opts.missingIndex ?? rng.int(1, terms.length - 1);
  const ans = terms[mi];
  const step = opts.step ?? (Math.abs(terms[1] - terms[0]) || 1);
  const cands = [terms[mi - 1], terms[mi + 1], ans + step, ans - step, ...(opts.candidates || []), ans + 1, ans - 1]
    .filter((v) => v !== undefined);
  const d = numericDistractors(ans, rng, { min: opts.min ?? 0, candidates: cands });
  return { terms, missingIndex: mi, answer: String(ans), choices: makeChoices(ans, d, rng), skill, rule: opts.rule ?? null };
}

const linear = (start, step, len = 6) => Array.from({ length: len }, (_, i) => start + i * step);

function bandA(grade, rng) {
  const kinds = grade <= 2 ? ['skip'] : ['skip', 'skip', 'countdown', 'doubling'];
  switch (rng.pick(kinds)) {
    case 'countdown': { const step = rng.pick([2, 5, 10]); return build(linear(step * rng.int(8, 12), -step), 'skip-count', rng, { step }); }
    case 'doubling': { const s = rng.pick([1, 2, 3, 5]); const t = [s]; while (t.length < 6) t.push(t[t.length - 1] * 2); return build(t, 'doubling', rng, { step: t[1] }); }
    default: { const step = rng.pick(grade <= 2 ? [2, 5, 10] : [2, 3, 4, 5, 10]); return build(linear(step * rng.int(1, 4), step), 'skip-count', rng, { step }); }
  }
}

function bandB(rng) {
  switch (rng.pick(['step', 'times', 'squares', 'alt'])) {
    case 'times': { const k = rng.int(2, 12); return build(linear(k, k), 'mult', rng, { step: k }); }
    case 'squares': { const s = rng.int(1, 5); const t = linear(s, 1).map((n) => n * n); return build(t, 'squares', rng, { candidates: [t[0] * 2, (s + 6) ** 2] }); }
    case 'alt': {
      const a = rng.int(3, 9), b = rng.int(1, a - 1); const t = [rng.int(5, 20)];
      for (let i = 1; i < 6; i++) t.push(t[i - 1] + (i % 2 ? a : -b));
      return build(t, 'sequence', rng, { step: a, candidates: [t[0] + a * 2, t[0] + a + b] });
    }
    default: { const step = rng.int(6, 9); return build(linear(rng.int(0, 20), step), 'sequence', rng, { step }); }
  }
}

function bandC(rng) {
  switch (rng.pick(['geo', 'sq1', 'neg', 'rule'])) {
    case 'geo': { const r = rng.pick([2, 3]); const t = [rng.int(1, 5)]; while (t.length < 6) t.push(t[t.length - 1] * r); return build(t, 'geometric', rng, { step: t[1] - t[0], candidates: [t[5] + t[0]] }); }
    case 'sq1': { const s = rng.int(1, 5); const t = linear(s, 1).map((n) => n * n + 1); return build(t, 'squares', rng, { candidates: [(s + 2) ** 2, (s + 6) ** 2 + 1] }); }
    case 'neg': { const step = -rng.int(3, 9); return build(linear(rng.int(10, 30), step), 'sequence', rng, { step: -step, min: -Infinity }); }
    default: {
      const form = rng.pick(['an+b', 'an-b', 'n2+b', 'an']);
      const a = rng.int(2, 5), b = rng.int(1, 9);
      const f = { 'an+b': (n) => a * n + b, 'an-b': (n) => a * n - b, 'n2+b': (n) => n * n + b, an: (n) => a * n }[form];
      const label = { 'an+b': `${a}n + ${b}`, 'an-b': `${a}n − ${b}`, 'n2+b': `n² + ${b}`, an: `${a}n` }[form];
      const t = [1, 2, 3, 4, 5].map(f);
      return build(t, 'rule', rng, { missingIndex: 4, step: t[1] - t[0], min: -Infinity, rule: `Rule: ${label}. Find term 5`, candidates: [f(6), f(4), a * 5, a + b * 5] });
    }
  }
}

export function generateRound(grade, rng) {
  const g = Number(grade) || 3;
  if (g <= 3) return bandA(g, rng);
  if (g <= 5) return bandB(rng);
  return bandC(rng);
}

export function generateRounds(grade, rng, n = 8) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const r = generateRound(grade, rng);
    const key = r.terms.join(',');
    if (seen.has(key)) continue;
    seen.add(key); out.push(r);
  }
  return out;
}
