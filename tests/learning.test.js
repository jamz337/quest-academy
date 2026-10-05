import { describe, it, expect } from 'vitest';
import { mathExplanation, mathSteps, patternExplanation, explainQuestion, explainSteps, skillTip } from '../src/data/explanations.js';
import { recordSkills, isWeak, weakSkills, prioritiseWeak, skillProgress, isNewSkill, markIntroduced } from '../src/systems/Practice.js';
import { dailyGoal, applyGoal, familyGoal, addFamilyStars, claimFamily, weekKey, GOAL_BONUS, FAMILY_BONUS } from '../src/systems/Goals.js';
import { tuningFor } from '../src/data/grades.js';
import { newProfile, defaultSave } from '../src/systems/SaveSystem.js';
import { applyResult, updateMastery, mastery } from '../src/systems/Progression.js';
import { orderRounds } from '../src/generators/bible/quiz.js';
import { Rng } from '../src/systems/Rng.js';

describe('explanations', () => {
  it('show the working for arithmetic', () => {
    expect(mathSteps('12 × 3', '36')).toEqual(['12 × 3 means 3 groups of 12.', 'Count in 12s: 12, 24, 36.', 'So 12 × 3 = 36.']);
    expect(mathSteps('7 + 5', '12')).toEqual(['Start at 7.', 'Count on 5 more: 8, 9, 10, 11, 12.', 'So 7 + 5 = 12.']);
    expect(mathSteps('20 − 8', '12')).toEqual(['Start at 20.', 'Count back 8: 19, 18, 17, 16, 15, 14, 13, 12.', 'So 20 − 8 = 12.', 'Check it: 12 + 8 = 20.']);
    expect(mathSteps('812 − 250', '562')).toEqual(['Take away 200 first: 812 − 200 = 612.', 'Now take away 50: 612 − 50 = 562.', 'So 812 − 250 = 562.', 'Check it: 562 + 250 = 812.']);
    // Ones only: place value, or bridging through the ten; whole tens are counted in tens.
    expect(mathSteps('88 − 6', '82')).toEqual(['Take away the ones: 8 − 6 = 2.', 'The tens stay the same, so 80 + 2 = 82.', 'So 88 − 6 = 82.', 'Check it: 82 + 6 = 88.']);
    expect(mathSteps('72 − 8', '64').slice(0, 2)).toEqual(['Go back to the ten: 72 − 2 = 70.', 'Take away the other 6: 70 − 6 = 64.']);
    expect(mathSteps('89 − 20', '69')[0]).toBe('Count back in tens: 79, 69.');
    expect(mathSteps('38 + 7', '45')).toEqual(['Make the next ten: 38 + 2 = 40.', 'Add the other 5: 40 + 5 = 45.', 'So 38 + 7 = 45.']);
    expect(mathSteps('34 + 5', '39')[0]).toBe('Add the ones: 4 + 5 = 9.');
    expect(mathSteps('47 + 38', '85')).toEqual(['Add 30 first: 47 + 30 = 77.', 'Now add 8: 77 + 8 = 85.', 'So 47 + 38 = 85.']);
    expect(mathExplanation('36 ÷ 4', '9')).toContain('4 × 9 = 36');
    expect(mathSteps('25% of 80', '20')).toEqual(['25% means a quarter.', 'A quarter of 80 is 80 ÷ 4 = 20.']);
    expect(mathExplanation('30% of 80', '24')).toContain('10% of 80 is 8');
    expect(mathSteps('x + 4 = 9\nx = ?', '5')).toEqual(['x + 4 = 9 asks: what plus 4 makes 9?', 'Take 4 away from 9: 9 − 4 = 5.', 'So x = 5.']);
    expect(mathExplanation('3x = 12\nx = ?', '4')).toContain('12 ÷ 3 = 4');
    expect(mathSteps('2 + 3 × 4', '14')[0]).toBe('Do the times first: 3 × 4 = 12.');
    expect(mathSteps('(-3) × (-2)', '6')[0]).toBe('Both signs are the same, so the answer is plus.');
    expect(mathSteps('9²', '81')).toEqual(['9² means 9 × 9.', '9 × 9 = 81.', 'So 9² = 81.']);
    expect(mathSteps('2.5 + 1.3', '3.8')[0]).toBe('Line up the decimal points.');
    expect(mathExplanation('hello', '1')).toBeNull();
    for (const [p, a] of [['812 − 250', '562'], ['6 × 7', '42'], ['36 ÷ 4', '9']]) for (const s of mathSteps(p, a)) expect(s.split(' ').length).toBeLessThanOrEqual(12);   // short enough for a child
  });

  it('describe number patterns and fall back to skill explanations elsewhere', () => {
    expect(patternExplanation({ terms: [2, 4, 6, 8], missingIndex: 2, answer: '6', skill: 'skip-count' })).toBe('Look at the numbers: 2, 4, ?, 8. Each number goes up by 2. 4 + 2 = 6, so the missing one is 6.');
    expect(patternExplanation({ terms: [1, 2, 4, 8], missingIndex: 2, answer: '4', skill: 'doubling' })).toContain('double');
    expect(explainSteps({ prompt: 'I saw ___ owl.', answer: 'an', skill: 'article' })).toEqual(['Use "an" before a vowel sound: an apple.', 'Use "a" before other sounds: a bike.', 'Here it is "an".']);
    expect(explainQuestion({ prompt: 'I saw ___ owl.', answer: 'an', skill: 'article' })).toContain('vowel sound');
    expect(explainQuestion({ prompt: 'Who built the ark?', answer: 'Noah', skill: 'stories', ref: 'Genesis 6' })).toBe('Think back to the story. The answer is Noah. \u{1F4D6} Genesis 6');
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
