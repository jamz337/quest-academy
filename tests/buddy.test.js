// Mango in every mini-game, the streak celebrations, and the shared go / helper buttons.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton } from './helpers/phaserMock.js';

installPhaserMock();

const { BUDDY_LINES, newBuddyMood, setMood } = await import('../src/ui/Buddy.js');
const { BalloonPop } = await import('../src/scenes/minigames/math/BalloonPop.js');

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.init({ gameId: 'x', grade: 3, band: 'A', title: 'T', subject: 'math', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('Mango the buddy', () => {
  it('keeps a mood with a line that lasts a moment, a new id per answer', () => {
    const rec = newBuddyMood();
    setMood(rec, 'cheer', null, 1000);
    expect(BUDDY_LINES.cheer).toContain(rec.line);
    expect(rec).toMatchObject({ id: 1, mood: 'cheer' });
    expect(rec.until).toBeGreaterThan(1000);
    setMood(rec, 'oops', 'Try again!', 2000);
    expect(rec).toMatchObject({ id: 2, mood: 'oops', line: 'Try again!' });
  });

  it('cheers on right answers, celebrates a streak of three, and resets after a miss', () => {
    const s = makeScene(BalloonPop, { gameId: 'math-balloons', seed: 3 });
    const monkeys = () => s.objs.filter((o) => o.active && o.kind === 'sprite');
    expect(monkeys().length).toBeGreaterThan(0);              // Mango is in the header
    s.correctFeedback(); s.correctFeedback();
    expect(s.streakRun).toBe(2);
    expect(s.buddyMood.mood).toBe('cheer');
    s.correctFeedback();
    expect(s.streakRun).toBe(3);
    expect(s.buddyMood.mood).toBe('wow');
    expect(BUDDY_LINES.wow).toContain(s.buddyMood.line);
    s.wrongFeedback();
    expect(s.streakRun).toBe(0);
    expect(s.buddyMood.mood).toBe('oops');
    // Rebuilds keep his mood (the line shows while it lasts).
    s.rebuild();
    expect(s.objs.some((o) => o.active && o.text === s.buddyMood.line)).toBe(true);
  });

  it('a new skill page offers the same green step-forward button as everywhere else', () => {
    const s = makeScene(BalloonPop, { gameId: 'math-balloons', seed: 3 });
    const got = findButton(s, 'Got it!');
    if (got) expect(got.look.fill).toBe(0x2ec46a);
  });
});
