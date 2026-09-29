// The interactive New Skill page: steps revealed a tap at a time, a practice question, then Got it! starts the game.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
const { introState, revealStep, startTry, pickAnswer, canFinish, gotItRight, tipFor, INTRO_LABELS } = await import('../src/ui/SkillIntro.js');
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
      while (findButton(s, INTRO_LABELS.next)) click(findButton(s, INTRO_LABELS.next));
      expect(it0.shown).toBe(it0.steps.length);
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
