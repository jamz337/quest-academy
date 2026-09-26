import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng.js';
import { WORDS } from '../src/data/english/wordBank.js';
import { SENTENCES } from '../src/data/english/sentenceBank.js';
import { PAIRS } from '../src/data/english/pairBank.js';
import { generateRounds as wordRounds, scramble } from '../src/generators/english/words.js';
import { generateRounds as grammarRounds, fillBlank } from '../src/generators/english/grammar.js';
import { generateRounds as matchRounds } from '../src/generators/english/match.js';

const BAND_OF_GRADE = { 2: 'A', 3: 'A', 4: 'B', 5: 'B', 6: 'C', 7: 'C', 8: 'C' };

describe('word bank + builder', () => {
  it('banks are large enough, lowercase, right lengths and unique', () => {
    const len = { A: [3, 5], B: [5, 7], C: [7, 11] };
    for (const band of ['A', 'B', 'C']) {
      expect(WORDS[band].length).toBeGreaterThanOrEqual(40);
      expect(new Set(WORDS[band].map((x) => x.w)).size).toBe(WORDS[band].length);
      for (const { w, h } of WORDS[band]) {
        expect(w).toMatch(/^[a-z]+$/);
        expect(w.length).toBeGreaterThanOrEqual(len[band][0]);
        expect(w.length).toBeLessThanOrEqual(len[band][1]);
        expect(h.length).toBeGreaterThan(3);
      }
    }
  });

  it('rounds: 8 distinct words from the grade band, scrambled differs from the word', () => {
    for (const grade of [2, 3, 4, 5, 6, 7, 8]) {
      for (let seed = 0; seed < 20; seed++) {
        const rounds = wordRounds(grade, new Rng(seed), 8);
        expect(rounds).toHaveLength(8);
        expect(new Set(rounds.map((r) => r.word)).size).toBe(8);
        const bankWords = WORDS[BAND_OF_GRADE[grade]].map((x) => x.w);
        for (const r of rounds) {
          expect(bankWords).toContain(r.word);
          expect(r.scrambled.join('')).not.toBe(r.word);
          expect(r.scrambled.slice().sort().join('')).toBe(r.word.split('').sort().join(''));
          expect(r.hint).toBeTruthy();
        }
      }
    }
  });

  it('scramble handles near-degenerate words', () => {
    const rng = new Rng(1);
    for (const w of ['aab', 'bee', 'egg', 'ab']) expect(scramble(w, rng).join('')).not.toBe(w);
  });
});

describe('sentence bank + grammar', () => {
  it('banks are valid', () => {
    const skills = { A: ['verb', 'article', 'pronoun', 'plural'], B: ['homophone', 'tense', 'adjective', 'adverb'], C: ['agreement', 'vocab', 'punctuation', 'homophone'] };
    for (const band of ['A', 'B', 'C']) {
      expect(SENTENCES[band].length).toBeGreaterThanOrEqual(30);
      expect(new Set(SENTENCES[band].map((x) => x.s)).size).toBe(SENTENCES[band].length);
      for (const item of SENTENCES[band]) {
        expect(item.s).toMatch(/___/);
        expect(item.o).toHaveLength(3);
        expect(new Set(item.o).size).toBe(3);
        expect(item.a).toBeGreaterThanOrEqual(0); expect(item.a).toBeLessThan(3);
        expect(skills[band]).toContain(item.k);
      }
      for (const k of skills[band]) expect(SENTENCES[band].some((x) => x.k === k)).toBe(true);
    }
  });

  it('rounds: 10 distinct sentences, options shuffled with the answer remapped', () => {
    for (const grade of [2, 4, 6, 8]) {
      for (let seed = 0; seed < 20; seed++) {
        const rounds = grammarRounds(grade, new Rng(seed), 10);
        expect(rounds).toHaveLength(10);
        expect(new Set(rounds.map((r) => r.sentence)).size).toBe(10);
        for (const r of rounds) {
          const src = SENTENCES[BAND_OF_GRADE[grade]].find((x) => x.s === r.sentence);
          expect(src).toBeTruthy();
          expect(r.options[r.answer]).toBe(src.o[src.a]);
          expect(r.options.slice().sort()).toEqual(src.o.slice().sort());
          expect(r.skill).toBe(src.k);
        }
      }
    }
    expect(fillBlank('The dog ___ here.')).toBe('The dog ____ here.');
    expect(fillBlank('The dog ___ here.', 'runs')).toBe('The dog runs here.');
  });
});

describe('pair bank + match', () => {
  it('banks are valid and definitions are short', () => {
    for (const band of ['A', 'B', 'C']) {
      expect(PAIRS[band].length).toBeGreaterThanOrEqual(30);
      const all = PAIRS[band].flatMap((p) => [p.l, p.r]);
      expect(new Set(all).size).toBe(all.length);
      for (const p of PAIRS[band]) expect(p.k).toBe({ A: 'synonym', B: 'antonym', C: 'definition' }[band]);
    }
    for (const p of PAIRS.C) expect(p.r.split(/\s+/).length).toBeLessThanOrEqual(5);
  });

  it('3 rounds of 5 pairs, no pair reused, right column shuffled', () => {
    for (const grade of [2, 3, 4, 5, 6, 7, 8]) {
      for (let seed = 0; seed < 20; seed++) {
        const rounds = matchRounds(grade, new Rng(seed));
        expect(rounds).toHaveLength(3);
        const seen = new Set();
        for (const r of rounds) {
          expect(r.pairs).toHaveLength(5);
          expect(r.right.slice().sort()).toEqual([0, 1, 2, 3, 4]);
          expect(r.right.every((v, i) => v === i)).toBe(false);
          for (const p of r.pairs) {
            expect(seen.has(p.l)).toBe(false); seen.add(p.l);
            expect(p.k).toBe({ A: 'synonym', B: 'antonym', C: 'definition' }[BAND_OF_GRADE[grade]]);
          }
        }
      }
    }
  });
});
