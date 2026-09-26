import { describe, it, expect } from 'vitest';
import { QUIZ, VERSES, PAIRS } from '../src/data/bible/bank.js';
import { generateRounds, bibleQuestion } from '../src/generators/bible/quiz.js';
import { generateRounds as matchRounds, ROUNDS, PAIRS_PER_ROUND } from '../src/generators/english/match.js';
import { Rng } from '../src/systems/Rng.js';

describe('Bible Village', () => {
  it('banks are big enough for a full game in every band', () => {
    for (const band of ['A', 'B', 'C']) {
      expect(QUIZ[band].length).toBeGreaterThanOrEqual(10);
      expect(VERSES[band].length).toBeGreaterThanOrEqual(10);
      expect(PAIRS[band].length).toBeGreaterThanOrEqual(ROUNDS * PAIRS_PER_ROUND);
      for (const v of VERSES[band]) expect(v.t).toContain('___');
      for (const q of [...QUIZ[band]]) expect(new Set([q.a, ...q.o]).size).toBe(4);
    }
  });

  it('quiz and verse rounds are valid multiple choice with a reference', () => {
    for (const grade of [2, 4, 7]) for (const kind of ['quiz', 'verse']) {
      const rounds = generateRounds(grade, new Rng(grade), 10, kind);
      expect(rounds).toHaveLength(10);
      expect(new Set(rounds.map((r) => r.prompt)).size).toBe(10);
      for (const r of rounds) {
        expect(r.choices).toHaveLength(4);
        expect(r.choices).toContain(r.answer);
        expect(r.ref).toBeTruthy();
        if (kind === 'verse') expect(r.prompt).toContain('_____');
      }
    }
  });

  it('Who Am I? rounds come from the Bible pair bank', () => {
    const rounds = matchRounds(3, new Rng(1), PAIRS.A);
    expect(rounds).toHaveLength(ROUNDS);
    for (const r of rounds) for (const p of r.pairs) expect(PAIRS.A.some((b) => b.l === p.l && b.r === p.r)).toBe(true);
  });

  it('boss questions mix every kind', () => {
    const kinds = new Set();
    const rng = new Rng(9);
    for (let i = 0; i < 60; i++) {
      const q = bibleQuestion(5, rng);
      expect(q.choices).toContain(q.answer);
      kinds.add(q.prompt.startsWith('Who ') && !q.ref ? 'who' : q.prompt.startsWith('Fill in') ? 'verse' : 'quiz');
    }
    expect([...kinds].sort()).toEqual(['quiz', 'verse', 'who']);
  });
});
