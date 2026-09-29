import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng.js';
import { rampTargets, rampFor, rampOrder } from '../src/systems/Ramp.js';
import { generateSet, generateQuestion } from '../src/generators/math/arithmetic.js';

const nums = (prompt) => prompt.split(/[^\d]+/).filter(Boolean).map(Number);

describe('difficulty ramp', () => {
  it('climbs from easy to hard, starting higher at higher house levels and lowest on a first game', () => {
    for (const opts of [{ fresh: true }, { level: 1 }, { level: 2 }, { level: 3 }]) {
      const t = rampTargets(10, opts);
      expect(t).toHaveLength(10);
      for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    }
    expect(rampTargets(10, { fresh: true })[0]).toBe(0);
    expect(rampTargets(10, { level: 3 })[0]).toBeGreaterThan(rampTargets(10, { level: 1 })[0]);
    expect(rampTargets(10, { fresh: true })[9]).toBeLessThan(rampTargets(10, { level: 1 })[9]);
  });

  it('counts a game as fresh until the child has played it once', () => {
    expect(rampFor({ gameId: 'math-dash', level: 2 }, { games: {} })).toEqual({ level: 2, fresh: true });
    expect(rampFor({ gameId: 'math-dash' }, { games: { 'math-dash': { plays: 1 } } })).toEqual({ level: 1, fresh: false });
  });

  it('picks items from a pool so they climb', () => {
    const pool = [9, 1, 7, 3, 5, 2, 8, 4, 6, 0, 10, 11].map((v) => ({ v }));
    const out = rampOrder(pool, rampTargets(4, { level: 3 }), (x) => x.v);
    expect(out).toHaveLength(4);
    for (let i = 1; i < out.length; i++) expect(out[i].v).toBeGreaterThan(out[i - 1].v);
  });
});

describe('arithmetic ladders', () => {
  it('the easiest take-aways stay within 10 and the hardest need borrowing', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 200; i++) {
      const easy = generateQuestion(3, rng, 0);
      if (easy.skill === 'sub') { const [a] = nums(easy.prompt); expect(a).toBeLessThanOrEqual(10); }
      if (easy.skill === 'add') expect(Number(easy.answer)).toBeLessThanOrEqual(10);
      const hard = generateQuestion(3, rng, 1);
      if (hard.skill === 'sub') { const [a, b] = nums(hard.prompt); expect(b % 10).toBeGreaterThan(a % 10); expect(Number(hard.answer)).toBeGreaterThanOrEqual(0); }
      if (hard.skill === 'add') { const [a, b] = nums(hard.prompt); expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10); }
    }
  });

  it('every rung of every grade makes valid questions', () => {
    const rng = new Rng(11);
    for (const grade of [2, 3, 4, 5, 6, 7, 8]) for (const d of [0, 0.2, 0.4, 0.6, 0.8, 1]) for (let i = 0; i < 40; i++) {
      const q = generateQuestion(grade, rng, d);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.answer);
      for (const c of q.choices) expect(c).not.toMatch(/NaN|undefined/);
      if (grade <= 3) expect(Number(q.answer)).toBeGreaterThanOrEqual(0);
    }
  });

  it('a ramped set carries rising difficulty, and a brand-new skill starts on the bottom rungs', () => {
    const set = generateSet(3, new Rng(5), 10, { targets: rampTargets(10, { level: 3 }), isNew: (k) => k === 'sub' });
    expect(set).toHaveLength(10);
    const subs = set.filter((q) => q.skill === 'sub');
    if (subs.length) expect(subs[0].difficulty).toBe(0);
    if (subs.length > 1) expect(subs[1].difficulty).toBeLessThanOrEqual(0.2);
  });
});
