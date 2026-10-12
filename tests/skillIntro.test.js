// The interactive New Skill page: steps revealed a tap at a time, a practice question, then Got it! starts the game.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
const { introState, revealStep, startTry, pickAnswer, canFinish, gotItRight, tipFor, INTRO_LABELS, makeMistake, spotTap, spotFix, useHint, starsFor, hintsFor, unsolved, lessonTap, lessonPick, lessonPlan, lessonAsking, lessonChoices } = await import('../src/ui/SkillIntro.js');
const { lessonFor } = await import('../src/data/lessons.js');
const { GrammarGate } = await import('../src/scenes/minigames/english/GrammarGate.js');
const { NumberDash } = await import('../src/scenes/minigames/math/NumberDash.js');
const { PatternBridge } = await import('../src/scenes/minigames/math/PatternBridge.js');

const example = { problem: 'We saw six ducks.', steps: ['Most plurals add -s.', 'Some change.', 'Here it is "ducks".'], practice: { prompt: 'Two ___ ran.', choices: ['dog', 'dogs', 'doges'], answer: 'dogs', solved: 'Two dogs ran.' } };

describe('the New Skill page flow', () => {
  it('reveals the steps one at a time, then offers a try', () => {
    const it0 = introState('plural', example);
    expect(it0.phase).toBe('watch'); expect(it0.shown).toBe(1);
    revealStep(it0); revealStep(it0); revealStep(it0);
    expect(it0.shown).toBe(3);
    startTry(it0);
    expect(it0.phase).toBe('try'); expect(canFinish(it0)).toBe(false);
  });

  it('a right answer finishes it; two wrong answers show the answer so a child is never stuck', () => {
    const a = startTry(introState('plural', example));
    pickAnswer(a, 0);
    expect(a.solved).toBe(false); expect(a.picks).toEqual([0]);
    pickAnswer(a, 0);   // the same wrong answer again does nothing
    expect(a.picks).toEqual([0]);
    pickAnswer(a, 1);
    expect(a.solved).toBe(true); expect(gotItRight(a)).toBe(true); expect(canFinish(a)).toBe(true);
    const b = startTry(introState('plural', example));
    pickAnswer(b, 0); pickAnswer(b, 2);
    expect(b.solved).toBe(true); expect(gotItRight(b)).toBe(false);
  });

  it('the tip is a rule, or the finished example when every step has its own numbers', () => {
    expect(tipFor(introState('plural', example))).toBe('Tip: Most plurals add -s.');
    expect(tipFor(introState('skip', { problem: '8, 12, [16], 20', steps: ['Look at the numbers: 8, 12, ?, 20.', 'Each one adds 4.', 'So it is 16.'] }))).toBe('Remember: 8, 12, 16, 20');
    expect(tipFor(introState('mult', { problem: '10 × 4 = 40', steps: ['10 × 4 means 4 groups of 10.', 'Count in 10s: 10, 20, 30, 40.'] }))).toBe('Remember: 10 × 4 = 40');
  });

  it('without a practice question it is ready to play after the steps', () => {
    const c = startTry(introState('x', { problem: 'p', steps: ['a'] }));
    expect(c.phase).toBe('ready'); expect(canFinish(c)).toBe(true);
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => true;          // every skill is new for this player
  s.markIntroduced = vi.fn();
  s.init({ gameId: 'x', grade: 3, band: 'A', title: 'T', subject: 'math', context: {}, timers: true, seed: 5, ...payload });
  s.create({});
  return s;
}

describe('each game shows the page in its own look and walks it', () => {
  for (const [name, Cls, payload] of [['Grammar Gate', GrammarGate, { gameId: 'eng-grammar', subject: 'words' }], ['Number Dash', NumberDash, { gameId: 'math-dash' }], ['Pattern Bridge', PatternBridge, { gameId: 'math-bridge' }]]) {
    it(name, () => {
      const s = makeScene(Cls, payload);
      const it0 = s.state.intro;
      expect(it0).toBeTruthy();
      expect(it0.practice).toBeTruthy();
      expect(findButton(s, INTRO_LABELS.skip)).toBeTruthy();
      expect(findButton(s, INTRO_LABELS.done)).toBeFalsy();   // no playing before trying
      if (it0.phase === 'spot') {
        // Grade 3 and up: find the step that went wrong, then pick what it should say.
        expect(findButton(s, INTRO_LABELS.turn)).toBeFalsy();
        click(findButton(s, `step ${it0.mistake.index + 1}`));
        expect(it0.mistake.found).toBe(true);
        click(findButton(s, it0.mistake.right));
        expect(it0.mistake.fixed).toBe(true);
      } else {
        while (findButton(s, INTRO_LABELS.next)) click(findButton(s, INTRO_LABELS.next));
        expect(it0.shown).toBe(it0.steps.length);
      }
      click(findButton(s, INTRO_LABELS.turn));
      expect(it0.phase).toBe('try');
      s.rebuild();   // a rotation keeps the moment
      expect(s.state.intro).toBe(it0);
      pickAnswer(it0, it0.practice.choices.indexOf(it0.practice.answer)); s.rebuild();
      click(findButton(s, INTRO_LABELS.done));
      expect(s.state.intro).toBeNull();
      expect(s.markIntroduced).toHaveBeenCalledWith(it0.skill);
      flushTimers(s);
    });
  }
});

describe('spot the mistake, the hint ladder and the hands-on lessons', () => {
  const worked = { problem: '47 + 38 = 85', steps: ['Add the ones: 7 + 8 = 15.', 'Write 5 and carry the 1 ten.', 'Add the tens: 4 + 3 + 1 = 8.', 'So the answer is 85.'], practice: { prompt: '26 + 37 = ?', choices: ['53', '63', '73', '64'], answer: '63', steps: ['Add the ones: 6 + 7 = 13.', 'Write 3 and carry the 1 ten.', 'So the answer is 63.'] } };

  it('Grade 3 and up spot a changed number in the last numbered step, and pick the right version back', () => {
    const m = makeMistake(worked.steps);
    expect(m.index).toBe(3); expect(m.right).toBe('So the answer is 85.'); expect(m.wrong).not.toBe(m.right); expect(m.wrong).toMatch(/^So the answer is \d+\.$/);
    expect(m.fixes).toHaveLength(3); expect(new Set(m.fixes).size).toBe(3); expect(m.fixes).toContain(m.right);
    expect(makeMistake(['Most plurals add -s.', 'Some change.'])).toBeNull();
    expect(unsolved('47 + 38 = 85')).toBe('47 + 38 = ?'); expect(unsolved('How many? → 5')).toBe('How many?  →  ?');
    const young = introState('add', worked, { grade: 2 });
    expect(young.phase).toBe('watch');
    const it0 = introState('add', worked, { grade: 4 });
    expect(it0.phase).toBe('spot');
    spotTap(it0, 0);
    expect(it0.mistake.okSteps).toEqual([0]); expect(it0.mistake.found).toBe(false);
    spotFix(it0, 0);   // nothing to fix before it is found
    expect(it0.mistake.fixed).toBe(false);
    spotTap(it0, 3);
    expect(it0.mistake.found).toBe(true);
    const wrong = it0.mistake.fixes.findIndex((x) => x !== it0.mistake.right);
    spotFix(it0, wrong);
    expect(it0.mistake.fixed).toBe(false); expect(it0.mistake.badFixes).toEqual([wrong]);
    spotFix(it0, it0.mistake.fixes.indexOf(it0.mistake.right));
    expect(it0.mistake.fixed).toBe(true);
    startTry(it0);
    expect(it0.phase).toBe('try');
  });

  it('the ladder gives the rule, then working that never says the answer, then crosses out a wrong answer; stars drop with each hint', () => {
    const it0 = startTry(introState('add', worked, { grade: 2 }));
    const h = it0.practice.hints;
    expect(h).toHaveLength(3);
    expect(h[1]).not.toContain('63'); expect(h[1]).toContain('6 + 7 = 13');
    expect(starsFor(it0)).toBe(3);
    useHint(it0); useHint(it0);
    expect(it0.hintsUsed).toBe(2); expect(it0.crossed).toBeNull(); expect(starsFor(it0)).toBe(1);
    pickAnswer(it0, 0);
    useHint(it0);
    expect(it0.hintsUsed).toBe(3);
    expect(it0.crossed).not.toBe(0); expect(it0.practice.choices[it0.crossed]).not.toBe('63');   // never the answer, never one already tried
    const before = it0.picks.length;
    pickAnswer(it0, it0.crossed);
    expect(it0.picks.length).toBe(before);   // a crossed-out answer cannot be picked
    useHint(it0);
    expect(it0.hintsUsed).toBe(3);
    expect(starsFor(it0)).toBe(1);
    expect(hintsFor(introState('plural', example))[0]).toBe('Most plurals add -s.');
    expect(hintsFor(startTry(introState('sub', { problem: '8 − 5 = 3', steps: ['Start at 8.', 'Count back 5.'], practice: { prompt: '7 − 2 = ?', choices: ['5', '6'], answer: '5' } })))[0]).toBe('Remember: 8 − 5 = 3');
  });

  it('lessons come from the youngest maths: count, add and take away with small numbers, in the question\'s own picture', () => {
    expect(lessonFor({ skill: 'counting', answer: '4', text: 'How many mangoes?', pics: ['🥭🥭🥭🥭'] }, 0)).toEqual({ kind: 'count', n: 4, pic: '🥭' });
    expect(lessonFor({ skill: 'add-pictures', text: '3 fish and 2 more. How many now?', pics: ['🐟', '🐟', '🐟', '➕', '🐟', '🐟'] }, 0)).toEqual({ kind: 'add', a: 3, b: 2, pic: '🐟' });
    expect(lessonFor({ skill: 'sub', prompt: '9 − 4', pics: [] }, 2)).toEqual({ kind: 'sub', a: 9, b: 4, pic: '🍎' });
    expect(lessonFor({ skill: 'add', prompt: '45 + 7' }, 2)).toBeNull();   // too many to tap
    expect(lessonFor({ skill: 'add', prompt: '3 + 2' }, 3)).toBeNull();    // Grade 3 reads the working
    expect(lessonFor({ skill: 'spelling', text: 'x' }, 0)).toBeNull();
  });

  it('a lesson is done by doing: tap 3, tap 2 more, then answer how many; taking away eats them', () => {
    const add = introState('add-pictures', { problem: 'p', steps: ['a'], lesson: { kind: 'add', a: 3, b: 2, pic: '🍎' }, practice: example.practice }, { grade: 0 });
    expect(add.phase).toBe('do');
    const L = add.lesson;
    expect(lessonPlan(L).pool).toBe(7);
    lessonTap(add, 0); lessonTap(add, 0); lessonTap(add, 1); lessonTap(add, 2);
    expect(L.lit).toEqual([0, 1, 2]); expect(L.step).toBe(1);
    lessonTap(add, 3); lessonTap(add, 4);
    expect(L.step).toBe(2); expect(lessonAsking(L)).toBe(true);
    lessonTap(add, 5);
    expect(L.lit).toHaveLength(5);   // no more tapping once it is asking
    expect(lessonChoices(L)).toContain(5); expect(new Set(lessonChoices(L)).size).toBe(lessonChoices(L).length);
    lessonPick(add, 4);
    expect(L.done).toBe(false);
    lessonPick(add, 5);
    expect(L.done).toBe(true);
    startTry(add);
    expect(add.phase).toBe('try');

    const sub = introState('take-away', { problem: 'p', steps: ['a'], lesson: { kind: 'sub', a: 5, b: 2, pic: '🍌' } }, { grade: 0 });
    lessonTap(sub, 4); lessonTap(sub, 4); lessonTap(sub, 1);
    expect(sub.lesson.eaten).toEqual([4, 1]); expect(lessonAsking(sub.lesson)).toBe(true);
    lessonPick(sub, 3);
    expect(sub.lesson.done).toBe(true);
    startTry(sub);
    expect(sub.phase).toBe('ready');   // no practice question: straight to playing

    const count = introState('counting', { problem: 'p', steps: ['a'], lesson: { kind: 'count', n: 3, pic: '⭐' } });
    [0, 1, 2].forEach((i) => lessonTap(count, i));
    expect(lessonAsking(count.lesson)).toBe(true);
  });

  it('a game shows its own villager as the guide, and Pre-K counting opens on a lesson', async () => {
    const { CountIt } = await import('../src/scenes/minigames/math/CountIt.js');
    const { getGame } = await import('../src/data/minigames.js');
    const { getNpc } = await import('../src/data/world/npcs.js');
    const s = makeScene(NumberDash, { gameId: 'math-dash' });
    const npc = getNpc(getGame('math-dash').npc);
    expect(s.state.intro.guide).toEqual({ name: npc.name, sprite: npc.sprite, voice: npc.voice, pitch: npc.pitch });
    // A young player's first round of a counting or picture-sum skill is a lesson to do.
    let found = false;
    for (let seed = 1; seed <= 12 && !found; seed++) {
      const c = makeScene(CountIt, { gameId: 'math-count', grade: -1, band: 'E', early: true, timers: false, seed });
      if (c.state.intro && c.state.intro.lesson) {
        found = true;
        const L = c.state.intro.lesson;
        expect(c.state.intro.phase).toBe('do');
        expect(findButton(c, 'item 1')).toBeTruthy();
        click(findButton(c, 'item 1'));
        expect(L.lit.length + L.eaten.length).toBe(1);
      }
    }
    expect(found).toBe(true);
  });
});
