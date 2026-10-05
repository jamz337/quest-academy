import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
const { stepOn, newCount } = await import('../src/scenes/world/trail.js');
const { buildMap, TRAIL_STONES } = await import('../src/data/world/map.js');
const { TID } = await import('../src/data/world/map.js');

const walk = (ns) => ns.reduce((acc, n) => { const r = stepOn(acc.count, n); return { count: r.count, events: [...acc.events, r.event] }; }, { count: newCount(), events: [] });

describe('musical counting on the Number Trail', () => {
  it('counts up from 1 to 10 and finishes on the last stone', () => {
    const r = walk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.events).toEqual(['start', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'done']);
    expect(r.count.lit).toHaveLength(10);
  });

  it('counts back down from 10 to 1 too', () => {
    const r = walk([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(r.events[0]).toBe('start');
    expect(r.events[9]).toBe('done');
  });

  it('a stone out of order starts the count again, and standing still changes nothing', () => {
    expect(walk([1, 2, 2]).events).toEqual(['start', 'next', 'same']);
    const lost = walk([1, 2, 4]);
    expect(lost.events[2]).toBe('lost');
    expect(lost.count.lit).toEqual([]);
    expect(walk([5]).events).toEqual(['lost']);              // joining in the middle lights nothing
    expect(walk([1, 2, 1]).events[2]).toBe('start');         // going back to 1 begins afresh
  });

  it('every stone sits on the path, in walking order', () => {
    const map = buildMap();
    expect(TRAIL_STONES.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const s of map.trail) expect(map.data[s.ty][s.tx], `stone ${s.n}`).toBe(TID.path);
  });
});
