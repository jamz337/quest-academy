// The older quiz games with their new scenery, run headless: a few right and wrong answers each must draw without throwing.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();

const { NumberDash } = await import('../src/scenes/minigames/math/NumberDash.js');
const { GrammarGate } = await import('../src/scenes/minigames/english/GrammarGate.js');
const { WordBuilder } = await import('../src/scenes/minigames/english/WordBuilder.js');
const { WordMatch } = await import('../src/scenes/minigames/english/WordMatch.js');
const { BibleQuiz } = await import('../src/scenes/minigames/bible/BibleQuiz.js');
const { FractionPizza } = await import('../src/scenes/minigames/math/FractionPizza.js');
const Scenery = await import('../src/ui/Scenery.js');

function makeScene(Cls, payload, size) {
  const s = new Cls();
  fakeSystems(s, size);
  s.finish = vi.fn();
  s.init({ gameId: 'x', grade: 3, band: 'A', title: 'T', subject: 'math', context: {}, timers: true, ...payload });
  s.create({});
  for (const l of ['Skip', 'Got it!']) if (findButton(s, l)) click(findButton(s, l));
  return s;
}

describe('scenery helpers', () => {
  it('draw every strip at any size and progress', () => {
    const s = fakeSystems({ ui: 1 });
    const r = { x: 0, y: 0, w: 360, h: 80 };
    const track = Scenery.raceTrack(s, r, { progress: 3, total: 10, spriteKey: 'char0' });
    expect(track.runner).toBeTruthy(); expect(track.xFor(10)).toBeGreaterThan(track.xFor(0));
    const gate = Scenery.castleGate(s, r, { open: 0.5 });
    expect(gate.yFor(1)).toBeLessThan(gate.yFor(0));
    expect(Scenery.bookshelf(s, r, { words: ['cat', 'dog'], slots: 8 }).books).toHaveLength(2);
    expect(Scenery.sheepFold(s, r, { inFold: 7, total: 10 }).sheep).toHaveLength(7);
    expect(Scenery.lampRow(s, r, { lit: 4, total: 10 }).flames).toHaveLength(4);
    expect(Scenery.trail(s, r, { count: 16, theme: 'bible' }).stamps).toHaveLength(16);
    expect(Scenery.trail(s, { x: 0, y: 0, w: 120, h: 30 }, { count: 0 }).stamps).toHaveLength(0);
  });
});

/** Close a New Skill page if one is showing (it stays until the child finishes or skips it). */
const skip = (s) => { for (const l of ['Skip', 'Got it!']) if (findButton(s, l)) click(findButton(s, l)); };

describe('older games with scenery (headless)', () => {
  it('Number Dash moves the runner and survives a wrong answer', () => {
    const s = makeScene(NumberDash, { gameId: 'math-dash' });
    const q = () => s.state.questions[s.state.idx];
    s.pick(q().choices.indexOf(q().answer)); flushTimers(s); skip(s);
    expect(s.state.correct).toBe(1); expect(s.state.idx).toBe(1);
    // The first miss earns a second try (the pad clears); the second miss shows why.
    s.state.typed = '999'; s.submit();
    expect(s.state.right).toBe(null); expect(s.state.again).toBe(true); expect(s.state.typed).toBe('');
    s.state.typed = '998'; s.submit();
    expect(s.state.right).toBe(false);
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(2);
    // A rescue on the second try moves the runner on, and two rescues are worth one right answer.
    const wrongI = q().choices.findIndex((c) => c !== q().answer);
    s.pick(wrongI);
    expect(s.state.struck).toEqual([wrongI]); expect(s.state.locked).toBe(false);
    s.pick(q().choices.indexOf(q().answer));
    expect(s.state.saved).toBe(1); expect(s.state.correct).toBe(1);
  });

  it('Grammar Gate lowers the portcullis a notch for each right word, and not for a wrong one', () => {
    const s = makeScene(GrammarGate, { gameId: 'eng-grammar', subject: 'words' });
    const gotIt = () => { for (const l of ['Skip', 'Got it!']) if (findButton(s, l)) click(findButton(s, l)); };   // a new skill's intro comes before the gate
    const y0 = s.gate.bars.y;
    s.pick(s.round.answer); flushTimers(s); gotIt();
    const y1 = s.gate.bars.y;
    expect(y1).toBeGreaterThan(y0);
    expect(s.state.marks).toEqual([true]);
    s.pick((s.round.answer + 1) % s.round.options.length);
    click(findButton(s, 'Next ▶')); gotIt();
    expect(s.gate.bars.y).toBeCloseTo(y1);
    expect(s.state.marks).toEqual([true, false]);
    expect(s.gate.yFor(1)).toBeGreaterThan(s.gate.yFor(0.5));
  });

  it('Grammar Gate raises the gate on right answers', () => {
    const s = makeScene(GrammarGate, { gameId: 'eng-grammar', subject: 'words' });
    const r = () => s.round;
    s.pick(r().answer); flushTimers(s); skip(s);
    expect(s.state.correct).toBe(1);
    s.pick((r().answer + 1) % 3);
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(2);
  });

  it('Word Builder puts each built word on the shelf', () => {
    const s = makeScene(WordBuilder, { gameId: 'eng-builder', subject: 'words' });
    const r = s.round;
    r.word.split('').forEach((ch) => { const used = new Set(s.state.slots); const ti = r.scrambled.findIndex((l, i) => l === ch && !used.has(i)); s.tapTile(ti); });
    expect(s.state.solved).toEqual([r.word]);
    flushTimers(s);
    expect(s.state.idx).toBe(1);
  });

  it('Word Match and Who Am I? join matched pairs and count mistakes', () => {
    for (const payload of [{ gameId: 'eng-match', subject: 'words' }, { gameId: 'bible-match', subject: 'bible' }]) {
      const s = makeScene(WordMatch, payload);
      s.tap('L', 0); s.tap('R', 0);
      expect(s.state.done).toHaveLength(1);
      s.tap('L', 1); s.tap('R', 2);
      expect(s.state.mistakes['0-1']).toBe(1);
      flushTimers(s);
      expect(s.state.busy).toBe(false);
    }
  });

  it('Who Am I? shows village cards: picked, red for a wrong pair, done once matched, with a streak', () => {
    const s = makeScene(WordMatch, { gameId: 'bible-match', subject: 'bible' });
    const cards = () => s.objs.filter((o) => o.word && o.active);
    const stateOf = (text) => cards().find((o) => o.word.text === text).state;
    const r = s.round;
    expect(cards()).toHaveLength(10);
    s.tap('L', 1);
    expect(stateOf(r.pairs[1].l)).toBe('picked');
    s.tap('R', 2);
    expect(stateOf(r.pairs[1].l)).toBe('wrong');
    expect(s.state.streak).toBe(0);
    flushTimers(s);
    s.tap('L', 0); s.tap('R', 0);
    expect(stateOf(r.pairs[0].l)).toBe('done'); expect(stateOf(r.pairs[0].r)).toBe('done');
    expect(s.state.streak).toBe(1);
  });

  it('Word Match hangs the words as paper lanterns: gold when picked, red for a wrong pair, done once matched', () => {
    const s = makeScene(WordMatch, { gameId: 'eng-match', subject: 'words' });
    const lanterns = () => s.objs.filter((o) => o.word && o.active);
    const stateOf = (text) => lanterns().find((o) => o.word.text === text).state;
    const r = s.round;
    expect(lanterns()).toHaveLength(10);
    s.tap('L', 1);
    expect(stateOf(r.pairs[1].l)).toBe('picked');
    s.tap('R', 2);
    expect(stateOf(r.pairs[1].l)).toBe('wrong'); expect(stateOf(r.pairs[2].r)).toBe('wrong');
    flushTimers(s);
    s.tap('L', 0); s.tap('R', 0);
    expect(stateOf(r.pairs[0].l)).toBe('done'); expect(stateOf(r.pairs[0].r)).toBe('done');
    expect(s.state.lastMatch).toBe(0);
  });

  it('Bible Quiz and Verse Builder light a village window per right answer', () => {
    for (const payload of [{ gameId: 'bible-quiz', subject: 'bible' }, { gameId: 'bible-verse', subject: 'bible' }]) {
      const s = makeScene(BibleQuiz, payload);
      const q = () => s.state.questions[s.state.idx];
      if (q().kind === 'order') { s.state.idx = 1; s.rebuild(); }
      s.pick(q().choices.indexOf(q().answer)); flushTimers(s);
      expect(s.state.correct).toBe(1);
      const wrong = q().kind === 'order' ? null : q().choices.findIndex((c) => c !== q().answer);
      if (wrong !== null) { s.pick(wrong); expect(findButton(s, 'Next ▶')).toBeTruthy(); }
    }
  });

  it('Bible Quiz story order: drag cards into place or tap two to swap, then check', () => {
    const s = makeScene(BibleQuiz, { gameId: 'bible-quiz', subject: 'bible' });
    const idx = s.state.questions.findIndex((q) => q.kind === 'order');
    expect(idx).toBeGreaterThanOrEqual(0);
    s.state.idx = idx; s.rebuild();
    const q = s.state.questions[idx];
    expect(s.state.arrangement).toEqual(q.shuffled.map((_, i) => i));
    // Tap two cards to swap them, then put everything in the right order by dragging.
    s.tapOrder(0); expect(s.state.swapPick).toBe(0);
    s.tapOrder(1); expect(s.state.swapPick).toBe(null);
    const placed = () => s.state.arrangement.map((si) => q.shuffled[si]);
    q.steps.forEach((step, pos) => { const from = placed().indexOf(step); if (from !== pos) s.moveOrder(from, pos); });
    expect(placed()).toEqual(q.steps);
    click(findButton(s, 'Check the order ✓'));
    expect(s.state.right).toBe(true);
    flushTimers(s);
    expect(s.state.idx).toBe(idx + 1);
    expect(s.state.arrangement).toBe(null);
  });

  it('Fraction Pizza converts taps from canvas to CSS pixels before finding the slice', () => {
    const s = makeScene(FractionPizza, { gameId: 'math-pizza', grade: 2, band: 'A' });
    // The mock camera has no getWorldPoint, so pointerPos divides by the pixel ratio (1 under node): a tap at the
    // pizza centre-right lands inside the pizza and toggles a slice.
    const zone = s.objs.find((o) => o.kind === 'zone');
    expect(zone).toBeTruthy();
    const cx = zone.x, cy = zone.y;
    zone.emit('pointerup', { x: cx + 10, y: cy - 10 });
    expect(s.state.shaded.filter(Boolean)).toHaveLength(1);
  });
});
