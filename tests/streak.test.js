import { describe, it, expect } from 'vitest';
import { claimStreak, currentStreak, streakCoins } from '../src/systems/Streak.js';
import { newProfile } from '../src/systems/SaveSystem.js';

describe('daily streak', () => {
  it('pays more for each consecutive day, capped at a week', () => {
    expect([1, 2, 3, 7, 8, 30].map(streakCoins)).toEqual([10, 15, 20, 40, 40, 40]);
  });

  it('claims once per day and grows on consecutive days', () => {
    const p = newProfile({ name: 'A' });
    expect(claimStreak(p, '2026-09-26')).toEqual({ claimed: true, count: 1, coins: 10 });
    expect(claimStreak(p, '2026-09-26')).toEqual({ claimed: false, count: 1, coins: 0 });
    expect(p.coins).toBe(10);
    expect(claimStreak(p, '2026-09-27')).toEqual({ claimed: true, count: 2, coins: 15 });
    expect(claimStreak(p, '2026-09-28').count).toBe(3);
    expect(p.coins).toBe(45);
    expect(currentStreak(p, '2026-09-28')).toBe(3);
    expect(currentStreak(p, '2026-09-29')).toBe(3);   // still unbroken until the day after
    expect(currentStreak(p, '2026-09-30')).toBe(0);
  });

  it('a missed day starts over', () => {
    const p = newProfile({ name: 'A' });
    claimStreak(p, '2026-09-26'); claimStreak(p, '2026-09-27');
    expect(claimStreak(p, '2026-09-29')).toEqual({ claimed: true, count: 1, coins: 10 });
    expect(currentStreak(newProfile({ name: 'B' }))).toBe(0);
  });

  it('handles month boundaries', () => {
    const p = newProfile({ name: 'A' });
    claimStreak(p, '2026-09-30');
    expect(claimStreak(p, '2026-10-01').count).toBe(2);
  });
});
