import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng.js';
import { generateRounds, generateRound } from '../src/generators/math/patterns.js';

describe('patterns generator', () => {
  for (const grade of [2, 3, 4, 5, 6, 7, 8]) {
    it(`grade ${grade}: valid rounds with 4 unique choices including the answer`, () => {
      const rng = new Rng(100 + grade);
      for (let i = 0; i < 200; i++) {
        const r = generateRound(grade, rng);
        expect(r.terms.length).toBeGreaterThanOrEqual(5);
        expect(r.missingIndex).toBeGreaterThanOrEqual(0);
        expect(r.missingIndex).toBeLessThan(r.terms.length);
        expect(r.answer).toBe(String(r.terms[r.missingIndex]));
        expect(r.choices).toHaveLength(4);
        expect(new Set(r.choices).size).toBe(4);
        expect(r.choices).toContain(r.answer);
        for (const c of r.choices) expect(c).not.toMatch(/NaN|undefined/);
        for (const t of r.terms) expect(Number.isFinite(t)).toBe(true);
        expect(r.skill).toBeTruthy();
        if (r.rule) { expect(r.skill).toBe('rule'); expect(r.missingIndex).toBe(4); expect(r.terms).toHaveLength(5); }
      }
    });
  }

  it('band A never goes negative and the missing plank is not always last', () => {
    const rng = new Rng(5);
    const positions = new Set();
    for (let i = 0; i < 200; i++) {
      const r = generateRound(rng.pick([2, 3]), rng);
      positions.add(r.missingIndex);
      for (const t of r.terms) expect(t).toBeGreaterThanOrEqual(0);
      for (const c of r.choices) expect(Number(c)).toBeGreaterThanOrEqual(0);
      expect(['skip-count', 'doubling']).toContain(r.skill);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('band C produces all its kinds', () => {
    const rng = new Rng(11);
    const skills = new Set();
    for (let i = 0; i < 100; i++) skills.add(generateRound(7, rng).skill);
    expect(skills).toEqual(new Set(['geometric', 'squares', 'sequence', 'rule']));
  });

  it('a set of 8 has distinct sequences and is reproducible', () => {
    const a = generateRounds(4, new Rng(9), 8), b = generateRounds(4, new Rng(9), 8);
    expect(a).toHaveLength(8);
    expect(a.map((r) => r.terms.join())).toEqual(b.map((r) => r.terms.join()));
    expect(new Set(a.map((r) => r.terms.join())).size).toBe(8);
  });
});
