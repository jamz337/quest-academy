import { describe, it, expect } from 'vitest';
import { mathExplanation, patternExplanation, explainQuestion, skillTip } from '../src/data/explanations.js';
import { recordSkills, isWeak, weakSkills, prioritiseWeak, skillProgress, isNewSkill, markIntroduced } from '../src/systems/Practice.js';
import { dailyGoal, applyGoal, familyGoal, addFamilyStars, claimFamily, weekKey, GOAL_BONUS, FAMILY_BONUS } from '../src/systems/Goals.js';
import { tuningFor } from '../src/data/grades.js';
import { newProfile, defaultSave } from '../src/systems/SaveSystem.js';
import { applyResult, updateMastery, mastery } from '../src/systems/Progression.js';
import { orderRounds } from '../src/generators/bible/quiz.js';
import { Rng } from '../src/systems/Rng.js';

describe('explanations', () => {
  it('show the working for arithmetic', () => {
    expect(mathExplanation('12 × 3', '36')).toContain('3 groups of 12: 12, 24, 36');
    expect(mathExplanation('7 + 5', '12')).toBe('Start at 7 and count on 5: 7 + 5 = 12.');
    expect(mathExplanation('20 − 8', '12')).toContain('Check: 12 + 8 = 20');
    expect(mathExplanation('36 ÷ 4', '9')).toContain('4 × 9 = 36');
    expect(mathExplanation('25% of 80', '20')).toContain('10% of 80 is 8');
    expect(mathExplanation('x + 4 = 9\nx = ?', '5')).toBe('Undo the + 4: x = 9 − 4 = 5.');
    expect(mathExplanation('3x = 12\nx = ?', '4')).toBe('Undo the × 3: x = 12 ÷ 3 = 4.');
    expect(mathExplanation('2 + 3 × 4', '14')).toContain('Multiply before you add');
    expect(mathExplanation('(-3) × (-2)', '6')).toContain('Two signs the same');
    expect(mathExplanation('9²', '81')).toBe('9² means 9 × 9 = 81.');
    expect(mathExplanation('hello', '1')).toBeNull();
  });

  it('describe number patterns and fall back to skill explanations elsewhere', () => {
    expect(patternExplanation({ terms: [2, 4, 6, 8], missingIndex: 2, answer: '6', skill: 'skip-count' })).toBe('Each number goes up by 2: 2, 4, 6, 8. The missing one is 6.');
    expect(patternExplanation({ terms: [1, 2, 4, 8], missingIndex: 2, answer: '4', skill: 'doubling' })).toContain('double');
    expect(explainQuestion({ prompt: 'I saw ___ owl.', answer: 'an', skill: 'article' })).toContain('vowel sound');
    expect(explainQuestion({ prompt: 'Who built the ark?', answer: 'Noah', skill: 'stories', ref: 'Genesis 6' })).toBe('Think back to the story. The answer is Noah. You can read it in Genesis 6.');
    expect(explainQuestion({ prompt: '6 × 7', answer: '42', skill: 'mult' }, 'math')).toContain('groups of 6');
    expect(explainQuestion({ prompt: 'x', answer: 'y', skill: 'nope' })).toBe('The answer is y.');
    expect(skillTip('mult')).toContain('Skip-count');
    expect(skillTip('unknown-skill')).toContain('Practise');
  });
});

describe('skill memory and spaced practice', () => {
  it('records seen and missed skills and marks a skill weak until three later successes', () => {
    const p = newProfile({ name: 'A' });
    recordSkills(p, { seen: ['add', 'mult'], missed: ['mult'] }, 1000);
    expect(p.skills.add).toMatchObject({ seen: 1, correct: 1, missed: 0 });
    expect(isWeak(p.skills.mult)).toBe(true);
    expect(weakSkills(p)).toEqual(['mult']);
    for (let i = 0; i < 3; i++) recordSkills(p, { seen: ['mult'] }, 2000 + i);
    expect(isWeak(p.skills.mult)).toBe(false);
    expect(weakSkills(p)).toEqual([]);
  });

  it('puts weak-skill questions first, drawing replacements from the extra pool', () => {
    const qs = [{ prompt: 'a', skill: 'add' }, { prompt: 'b', skill: 'add' }, { prompt: 'c', skill: 'sub' }, { prompt: 'd', skill: 'add' }];
    const more = () => [{ prompt: 'm1', skill: 'mult' }, { prompt: 'm2', skill: 'mult' }, { prompt: 'x', skill: 'add' }];
    const out = prioritiseWeak(qs, more, ['mult'], 2);
    expect(out).toHaveLength(4);
    expect(out.slice(0, 2).map((q) => q.skill)).toEqual(['mult', 'mult']);
    expect(prioritiseWeak(qs, more, [], 2)).toEqual(qs);
  });

  it('tracks new skills and progress dots', () => {
    const p = newProfile({ name: 'A' });
    expect(isNewSkill(p, 'add')).toBe(true);
    markIntroduced(p, 'add');
    expect(isNewSkill(p, 'add')).toBe(false);
    recordSkills(p, { seen: ['add', 'sub'], missed: ['sub'] });
    const rows = skillProgress(p);
    expect(rows[0]).toMatchObject({ id: 'sub', weak: true, dots: 1 });
    expect(rows.find((r) => r.id === 'add').dots).toBe(5);
  });

  it('flows through applyResult, including the missed questions a parent can see', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A' }, { correct: 8, total: 10, timeMs: 1, seenSkills: ['add', 'mult'], missedSkills: ['mult'], missedQuestions: [{ prompt: '6 × 7', answer: '42', skill: 'mult' }] });
    expect(weakSkills(p)).toEqual(['mult']);
    expect(p.recentMisses[0]).toMatchObject({ prompt: '6 × 7', answer: '42', gameId: 'math-dash' });
  });
});

describe('goals', () => {
  it('sets a daily goal on the weakest game and pays out once when met', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    p.games['math-dash'] = { bestStars: 3, plays: 2 };
    const g = dailyGoal(p, '2026-09-26');
    expect(g.gameId).not.toBe('math-dash');
    expect(g.stars).toBe(1);
    expect(dailyGoal(p, '2026-09-26')).toBe(g);
    expect(applyGoal(p, { gameId: g.gameId, stars: 0 }, '2026-09-26')).toBeNull();
    const coins = p.coins;
    expect(applyGoal(p, { gameId: g.gameId, stars: 2 }, '2026-09-26')).toEqual({ done: true, coins: GOAL_BONUS });
    expect(p.coins).toBe(coins + GOAL_BONUS);
    expect(applyGoal(p, { gameId: g.gameId, stars: 3 }, '2026-09-26')).toBeNull();
  });

  it('the family goal counts everyone’s stars for the week and pays each player once', () => {
    const save = defaultSave();
    const a = newProfile({ name: 'A' }), b = newProfile({ name: 'B' });
    const wk = weekKey(new Date('2026-09-26T12:00:00Z'));
    expect(wk).toBe('2026-09-21');
    addFamilyStars(save, 20, wk);
    expect(claimFamily(save, a, wk)).toBe(0);
    addFamilyStars(save, 12, wk);
    expect(claimFamily(save, a, wk)).toBe(FAMILY_BONUS);
    expect(claimFamily(save, a, wk)).toBe(0);
    expect(claimFamily(save, b, wk)).toBe(FAMILY_BONUS);
    expect(familyGoal(save, '2026-09-28').stars).toBe(0);   // a new week starts fresh
  });
});

describe('difficulty pacing', () => {
  it('needs three strong games in a row to step up and honours timers off', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    updateMastery(p, 'math', 3); updateMastery(p, 'math', 3);
    expect(mastery(p, 'math').level).toBe(0);
    updateMastery(p, 'math', 3);
    expect(mastery(p, 'math').level).toBe(1);
    expect(tuningFor({ band: 'A', timers: false }).questionTimeMs).toBe(Infinity);
    expect(tuningFor({ band: 'A', timers: true }).questionTimeMs).toBe(20000);
  });
});

describe('story ordering', () => {
  it('shuffles the events and keeps the right order to check against', () => {
    for (const grade of [2, 5, 8]) {
      const rounds = orderRounds(grade, new Rng(grade), 2);
      expect(rounds).toHaveLength(2);
      for (const r of rounds) {
        expect(r.kind).toBe('order');
        expect([...r.shuffled].sort()).toEqual([...r.steps].sort());
        expect(r.shuffled).not.toEqual(r.steps);
        expect(r.explain).toContain('1. ');
      }
    }
  });
});
