import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/systems/SaveSystem.js';
import { applyResult } from '../src/systems/Progression.js';
import { dueReviews, recordReview, reviewCount, reviewable, REVIEW_DAYS, REVIEW_XP } from '../src/systems/Review.js';
import { weakSkills } from '../src/systems/Practice.js';
import { QUIZ, VERSES, PAIRS as BPAIRS, ORDER } from '../src/data/bible/bank.js';
import { SENTENCES } from '../src/data/english/sentenceBank.js';
import { WORDS } from '../src/data/english/wordBank.js';
import { PAIRS } from '../src/data/english/pairBank.js';
import { generateRounds as matchRounds } from '../src/generators/english/match.js';
import { Rng } from '../src/systems/Rng.js';

const DAY = 86400000;
const miss = (over = {}) => ({ prompt: '6 × 7', answer: '42', skill: 'mult', choices: ['42', '36', '48', '13'], gameId: 'math-dash', at: 1000, ...over });

describe('spaced review', () => {
  it('a missed question with choices is due a day later, in its own subject only', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A' }, { correct: 8, total: 10, timeMs: 1, missedSkills: ['mult'], missedQuestions: [miss(), { prompt: 'open', answer: 'x', skill: 'add' }] });
    const at = p.recentMisses[0].at;
    expect(reviewable(p.recentMisses[0])).toBe(true);
    expect(reviewable(p.recentMisses[1])).toBe(false);
    expect(dueReviews(p, 'math', at + DAY - 1)).toEqual([]);
    expect(dueReviews(p, 'math', at + DAY).map((m) => m.prompt)).toEqual(['6 × 7']);
    expect(dueReviews(p, 'words', at + DAY)).toEqual([]);
    expect(reviewCount(p, at + DAY)).toBe(1);
  });

  it('spaces successes out and drops the question once it is learned; a miss starts over', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    p.recentMisses = [miss()];
    let now = 1000 + DAY;
    expect(recordReview(p, miss(), true, now)).toEqual({ learned: false });
    expect(p.recentMisses[0].stage).toBe(1);
    expect(p.recentMisses[0].nextAt).toBe(now + REVIEW_DAYS[1] * DAY);
    expect(dueReviews(p, 'math', now + DAY)).toEqual([]);
    now = p.recentMisses[0].nextAt;
    expect(recordReview(p, miss(), false, now).learned).toBe(false);
    expect(p.recentMisses[0].stage).toBe(0);
    expect(p.recentMisses[0].nextAt).toBe(now + DAY);
    expect(weakSkills(p)).toEqual(['mult']);
    for (let i = 0; i < REVIEW_DAYS.length; i++) { now = p.recentMisses[0]?.nextAt || now; var r = recordReview(p, miss(), true, now); }
    expect(r.learned).toBe(true);
    expect(p.recentMisses).toHaveLength(0);
    expect(recordReview(p, miss(), true, now).learned).toBe(false);   // gone already: harmless
  });

  it('pays review XP through applyResult', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const r = applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A' }, { correct: 10, total: 10, timeMs: 1, reviewed: { right: 2, total: 3 } });
    expect(r.reviewXp).toBe(2 * REVIEW_XP);
    expect(r.xp).toBe(10 * 10 + 3 * 15 + 2 * REVIEW_XP);
  });
});

describe('question banks', () => {
  it('are big enough that a week of play does not repeat, and every item is well formed', () => {
    for (const band of ['A', 'B', 'C']) {
      expect(QUIZ[band].length).toBeGreaterThanOrEqual(40);
      expect(VERSES[band].length).toBeGreaterThanOrEqual(20);
      expect(BPAIRS[band].length).toBeGreaterThanOrEqual(25);
      expect(ORDER[band].length).toBeGreaterThanOrEqual(8);
      expect(SENTENCES[band].length).toBeGreaterThanOrEqual(60);
      expect(WORDS[band].length).toBeGreaterThanOrEqual(65);
      expect(PAIRS[band].length).toBeGreaterThanOrEqual(55);
      expect(new Set(QUIZ[band].map((q) => q.q)).size).toBe(QUIZ[band].length);
      expect(new Set(SENTENCES[band].map((s) => s.s)).size).toBe(SENTENCES[band].length);
      expect(new Set(WORDS[band].map((w) => w.w)).size).toBe(WORDS[band].length);
      for (const s of SENTENCES[band]) { expect(s.s).toContain('___'); expect(new Set(s.o).size).toBe(s.o.length); expect(s.o[s.a]).toBeTruthy(); expect(s.k).toBeTruthy(); }
      for (const w of WORDS[band]) { expect(w.w).toMatch(/^[a-z]+$/); expect(w.h.length).toBeGreaterThan(5); }
      // A match round must never show the same word twice, so every word is unique across the band.
      const all = PAIRS[band].flatMap((p) => [p.l, p.r]);
      expect(new Set(all).size).toBe(all.length);
      for (const p of BPAIRS[band]) expect(p.k).toBeTruthy();
      for (const o of ORDER[band]) expect(o.steps).toHaveLength(4);
    }
  });

  it('match rounds draw a weak skill first when asked', () => {
    const rounds = matchRounds(5, new Rng(3), PAIRS.B, ['antonym']);
    expect(rounds.flatMap((r) => r.pairs).every((p) => p.k === 'antonym')).toBe(true);
    const mixed = [...PAIRS.A.slice(0, 20), ...PAIRS.B.slice(0, 20)];
    const r2 = matchRounds(3, new Rng(4), mixed, ['antonym']);
    expect(r2.flatMap((r) => r.pairs).filter((p) => p.k === 'antonym').length).toBeGreaterThanOrEqual(5);
    expect(new Set(r2.flatMap((r) => r.pairs).map((p) => p.l + '|' + p.r)).size).toBe(15);
  });
});

describe('a game warms up with its own questions', () => {
  it('leaves out misses from other games of the same subject when a game is named', async () => {
    const { dueReviews: due } = await import('../src/systems/Review.js');
    const old = Date.now() - 3 * 86400000;
    const miss = (gameId, prompt) => ({ gameId, prompt, answer: '4', choices: ['3', '4'], at: old });
    const p = { recentMisses: [miss('math-dash', '2 + 2'), miss('math-pizza', 'Which is 1/2?'), miss('math-dash', '1 + 3')] };
    expect(due(p, 'math')).toHaveLength(3);
    expect(due(p, 'math', Date.now(), 3, 'math-pizza').map((m) => m.prompt)).toEqual(['Which is 1/2?']);
    expect(due(p, 'math', Date.now(), 3, 'math-bridge')).toEqual([]);
  });
});
