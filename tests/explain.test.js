// "Let's see why" after a wrong answer: the working a step per tap, then the child's own pick, then Next.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
const { explainState, moreStep, pickFix, fixedIt, EXPLAIN_LABELS } = await import('../src/ui/Explain.js');
const { GrammarGate } = await import('../src/scenes/minigames/english/GrammarGate.js');
const { NumberDash } = await import('../src/scenes/minigames/math/NumberDash.js');
const { PatternBridge } = await import('../src/scenes/minigames/math/PatternBridge.js');
const { FrogHop } = await import('../src/scenes/minigames/english/FrogHop.js');

const q = { prompt: 'What time is it_____', choices: ['!', '.', '?'], answer: '?' };
const steps = ['A question ends with a ?', 'A big feeling ends with a !', 'Most sentences end with a full stop.', 'Here it is "?".'];

describe('the explanation flow', () => {
  it('holds back the step that gives the answer away, and reveals the rest one at a time', () => {
    const it0 = explainState('k', steps, q);
    expect(it0.steps).toHaveLength(3);
    expect(it0.steps.some((s) => /here it is/i.test(s))).toBe(false);
    expect(it0.shown).toBe(1);
    moreStep(it0); moreStep(it0);
    expect(it0.shown).toBe(3); expect(it0.phase).toBe('steps');
    moreStep(it0);
    expect(it0.phase).toBe('pick');
  });

  it('the child picks the answer; a wrong pick can be tried again, two misses show it', () => {
    const a = moreStep(moreStep(moreStep(explainState('k', steps, q))));
    pickFix(a, 0);
    expect(a.solved).toBe(false);
    pickFix(a, 2);
    expect(a.phase).toBe('done'); expect(fixedIt(a)).toBe(true);
    const b = moreStep(moreStep(moreStep(explainState('k', steps, q))));
    pickFix(b, 0); pickFix(b, 1);
    expect(b.phase).toBe('done'); expect(fixedIt(b)).toBe(false);
  });

  it('also holds back maths steps that give the answer away', () => {
    const m = explainState('k', ['10 × 2 means 2 groups of 10.', 'Count in 10s: 10, 20.', 'So 10 × 2 = 20.'], { answer: 20, choices: [10, 30, 12, 20] });
    expect(m.steps).toEqual(['10 × 2 means 2 groups of 10.', 'Count in 10s: 10, 20.']);
    const b = explainState('k', ['Look at the numbers: 2, 4, ?.', 'Each number goes up by 2.', '4 + 2 = 6, so the missing one is 6.'], { answer: 6, choices: [5, 6, 7, 8] });
    expect(b.steps).toHaveLength(2);
  });

  it('without choices (or with long ones) it ends after the steps', () => {
    const c = moreStep(explainState('k', ['One step.'], { answer: 'x' }));
    expect(c.phase).toBe('done');
    expect(explainState('k', steps, { answer: 'a', choices: ['a', 'Move ▲\nTurn ▶'] }).choices).toBeNull();
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'x', grade: 3, band: 'A', title: 'T', subject: 'words', context: {}, timers: true, seed: 9, ...payload });
  s.create({});
  return s;
}

describe('each game walks it in place', () => {
  const wrong = {
    // The first miss is a second try; the explanation comes after the second.
    'Grammar Gate': (s) => { for (let k = 0; k < 2; k++) s.pick((s.round.answer + 1) % s.round.options.length); },
    // Number Dash gives a second try first: the explanation comes after the second miss.
    'Number Dash': (s) => { const x = s.state.questions[s.state.idx]; const bad = x.choices.map((c, i) => (c !== x.answer ? i : -1)).filter((i) => i >= 0); s.pick(bad[0]); s.pick(bad[1]); },
    'Pattern Bridge': (s) => { for (let k = 0; k < 2; k++) s.pick(s.round.choices.findIndex((c) => c !== s.round.answer)); },
    'Frog Hop': (s) => s.pick(s.round.choices.findIndex((c) => String(c) !== String(s.round.answer)))
  };
  for (const [name, Cls, payload] of [['Grammar Gate', GrammarGate, { gameId: 'eng-grammar' }], ['Number Dash', NumberDash, { gameId: 'math-dash', subject: 'math' }], ['Pattern Bridge', PatternBridge, { gameId: 'math-bridge', subject: 'math' }], ['Frog Hop', FrogHop, { gameId: 'eng-frog' }]]) {
    it(name, () => {
      const s = makeScene(Cls, payload);
      wrong[name](s); flushTimers(s);   // Frog Hop shows it once the frog has splashed
      const it0 = s.explainIt;
      expect(it0).toBeTruthy();
      expect(findButton(s, EXPLAIN_LABELS.next)).toBeTruthy();   // moving on is always possible
      const rebuild = vi.spyOn(s, 'rebuild');
      while (findButton(s, EXPLAIN_LABELS.more)) click(findButton(s, EXPLAIN_LABELS.more));
      expect(it0.shown).toBe(it0.steps.length);
      expect(rebuild).not.toHaveBeenCalled();   // only the panel redraws; the game's animations do not replay
      if (it0.choices) {
        click(findButton(s, EXPLAIN_LABELS.turn));
        expect(it0.phase).toBe('pick');
        const asked = { prompt: it0.key.split('|')[1], answer: it0.answer, choices: it0.choices };
        expect(s.answerRevealed(asked)).toBe(false);   // the board keeps the right answer hidden meanwhile
        // Tap the right answer in the panel (drawn last, so the last object with that label).
        const target = s.objs.filter((o) => o.active && ((o.label && o.label.text === it0.answer) || (o.word && o.word.text === it0.answer) || (o.text && typeof o.text === 'object' && o.text.text === it0.answer))).pop();
        target.emit('pointerdown'); target.emit('pointerup');
        expect(fixedIt(it0)).toBe(true);
        expect(rebuild).toHaveBeenCalledTimes(1);   // now the board shows it
        expect(s.answerRevealed(asked)).toBe(true);
      }
      const idx = s.state.idx;
      s.rebuild();                                // a rotation keeps the moment
      expect(s.explainIt).toBe(it0);
      click(findButton(s, EXPLAIN_LABELS.next));
      flushTimers(s);
      expect(s.state.idx).toBe(idx + 1);
      expect(s.explainIt).toBeNull();
    });
  }
});
