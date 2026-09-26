import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng.js';
import { generateSet, generateQuestion } from '../src/generators/math/arithmetic.js';

describe('arithmetic generator', () => {
  for (const grade of [2, 3, 4, 5, 6, 7, 8]) {
    it(`grade ${grade}: 4 unique choices containing the answer, no NaN`, () => {
      const rng = new Rng(42 + grade);
      for (let i = 0; i < 200; i++) {
        const q = generateQuestion(grade, rng);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
        for (const c of q.choices) expect(c).not.toMatch(/NaN|undefined/);
        expect(q.skill).toBeTruthy();
      }
    });
  }

  it('band A answers are never negative', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion(rng.pick([2, 3]), rng);
      expect(Number(q.answer)).toBeGreaterThanOrEqual(0);
      for (const c of q.choices) expect(Number(c)).toBeGreaterThanOrEqual(0);
    }
  });

  it('a set has no repeated prompts and is reproducible from a seed', () => {
    const a = generateSet(4, new Rng(99), 10);
    const b = generateSet(4, new Rng(99), 10);
    expect(a.map((q) => q.prompt)).toEqual(b.map((q) => q.prompt));
    expect(new Set(a.map((q) => q.prompt)).size).toBe(10);
  });
});
