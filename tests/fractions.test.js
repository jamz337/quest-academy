import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng.js';
import { generateRounds, gcd, lcm } from '../src/generators/math/fractions.js';

const val = (s) => { const [n, d] = s.split('/').map(Number); return n / d; };

describe('fractions generator', () => {
  it('helpers', () => { expect(gcd(12, 8)).toBe(4); expect(lcm(4, 6)).toBe(12); });

  it('band A: only shade rounds with grade-appropriate denominators', () => {
    for (const grade of [2, 3]) {
      const rounds = generateRounds(grade, new Rng(grade), 8);
      expect(rounds).toHaveLength(8);
      for (const r of rounds) {
        expect(r.kind).toBe('shade');
        expect(grade === 2 ? [2, 4] : [2, 3, 4, 6, 8]).toContain(r.den);
        expect(r.num).toBeGreaterThanOrEqual(1); expect(r.num).toBeLessThan(r.den);
        expect(r.slices).toBe(r.den); expect(r.skill).toBe('fractions');
      }
    }
  });

  it('band B: mix of equivalent and compare, choices unique with a valid answer', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rounds = generateRounds(seed % 2 ? 4 : 5, new Rng(seed), 8);
      const kinds = new Set(rounds.map((r) => r.kind));
      expect(kinds).toEqual(new Set(['equivalent', 'compare']));
      for (const r of rounds) {
        if (r.kind === 'equivalent') {
          expect(r.choices).toHaveLength(4);
          expect(new Set(r.choices).size).toBe(4);
          expect(r.choices).toContain(r.answer);
          expect(val(r.answer)).toBeCloseTo(r.num / r.den, 9);
          expect(gcd(...r.answer.split('/').map(Number))).toBe(1);
          for (const c of r.choices) if (c !== r.answer) expect(Math.abs(val(c) - val(r.answer))).toBeGreaterThan(1e-9);
          expect(r.den).toBeLessThanOrEqual(12);
        } else {
          const [a, b] = r.pizzas;
          expect(a.den).toBeLessThanOrEqual(10); expect(b.den).toBeLessThanOrEqual(10);
          const bigger = a.num / a.den > b.num / b.den ? 0 : 1;
          expect(r.answer).toBe(bigger);
          expect(r.labels[0]).toBe(`${a.num}/${a.den}`);
        }
      }
    }
  });

  it('band C: add rounds use the LCD and sum <= 1; every third round converts', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rounds = generateRounds(6 + (seed % 3), new Rng(seed * 7), 8);
      rounds.forEach((r, i) => {
        if (i % 3 === 2) {
          expect(r.kind).toBe('convert');
          expect(r.choices).toHaveLength(4);
          expect(new Set(r.choices).size).toBe(4);
          expect(r.choices).toContain(r.answer);
          const v = r.num / r.den;
          const expected = r.answer.endsWith('%') ? Math.round(v * 1000) / 10 + '%' : String(Math.round(v * 100) / 100);
          expect(r.answer).toBe(expected);
          for (const c of r.choices) expect(c).not.toMatch(/NaN|undefined/);
        } else {
          expect(r.kind).toBe('add');
          expect(r.den).toBe(lcm(r.b, r.d));
          expect(r.den).toBeLessThanOrEqual(12);
          expect(r.num).toBe((r.a * r.den) / r.b + (r.c * r.den) / r.d);
          expect(r.num).toBeLessThanOrEqual(r.den);
          expect(r.slices).toBe(r.den);
        }
      });
    }
  });

  it('is reproducible from a seed', () => {
    expect(generateRounds(5, new Rng(3), 8)).toEqual(generateRounds(5, new Rng(3), 8));
  });
});
