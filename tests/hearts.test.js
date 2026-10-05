import { describe, it, expect } from 'vitest';
import { heartsOf, setHearts, healHearts, heartsFrom, HEARTS_MAX } from '../src/systems/Hearts.js';
import { getItem } from '../src/data/market/items.js';

describe('hearts the player carries', () => {
  it('start full, are kept for the day and are full again tomorrow', () => {
    const p = {};
    expect(heartsOf(p, '2026-10-05')).toBe(HEARTS_MAX);
    setHearts(p, 1, '2026-10-05');
    expect(heartsOf(p, '2026-10-05')).toBe(1);
    expect(heartsOf(p, '2026-10-06')).toBe(HEARTS_MAX);
    expect(setHearts(p, -4, '2026-10-05')).toBe(0);
    expect(setHearts(p, 9, '2026-10-05')).toBe(HEARTS_MAX);
  });

  it('a drink gives back hearts, never more than three', () => {
    const p = {};
    setHearts(p, 0, 'd');
    expect(healHearts(p, heartsFrom(getItem('snack-mango-juice')), 'd')).toBe(1);
    expect(healHearts(p, heartsFrom(getItem('snack-sorrel')), 'd')).toBe(2);   // only two were missing
    expect(heartsOf(p, 'd')).toBe(HEARTS_MAX);
    expect(healHearts(p, 1, 'd')).toBe(0);
    expect(heartsFrom(getItem('snack-hourglass'))).toBe(0);   // not a drink
    expect(heartsFrom(getItem('snack-lime'))).toBe(1);        // any drink gives at least one
  });
});
