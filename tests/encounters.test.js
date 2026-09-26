import { describe, it, expect } from 'vitest';
import { buildMap, reachableFrom, isWalkable } from '../src/data/world/map.js';
import { sparkleSpots, daySeed, dayKey, rollEncounter, chestCoins, pickGift, GIFTS, GRASS, SPARKLES_PER_DAY } from '../src/data/world/encounters.js';
import { newProfile } from '../src/systems/SaveSystem.js';
import { applyResult } from '../src/systems/Progression.js';
import { mulberry32 } from '../src/systems/Rng.js';

describe('grass encounters', () => {
  const map = buildMap();

  it('places the daily sparkles on reachable grass, away from villagers and bosses', () => {
    const spots = sparkleSpots(map, daySeed('p_abc', '2026-09-26'));
    expect(spots).toHaveLength(SPARKLES_PER_DAY);
    const reach = reachableFrom(map);
    const taken = new Set([...Object.values(map.npcSpots), ...Object.values(map.bossSpots)].map((s) => `${s.tx},${s.ty}`));
    for (const s of spots) {
      expect(GRASS.has(map.data[s.ty][s.tx])).toBe(true);
      expect(isWalkable(map.data[s.ty][s.tx])).toBe(true);
      expect(reach.has(`${s.tx},${s.ty}`)).toBe(true);
      expect(taken.has(`${s.tx},${s.ty}`)).toBe(false);
    }
    expect(new Set(spots.map((s) => `${s.tx},${s.ty}`)).size).toBe(SPARKLES_PER_DAY);
  });

  it('is the same layout all day for a player and changes with the day or player', () => {
    const a = sparkleSpots(map, daySeed('p_abc', '2026-09-26'));
    expect(sparkleSpots(map, daySeed('p_abc', '2026-09-26'))).toEqual(a);
    expect(sparkleSpots(map, daySeed('p_abc', '2026-09-27'))).not.toEqual(a);
    expect(sparkleSpots(map, daySeed('p_xyz', '2026-09-26'))).not.toEqual(a);
    expect(dayKey(new Date('2026-09-26T15:00:00Z'))).toBe('2026-09-26');
  });

  it('rolls every kind of surprise and sensible prizes', () => {
    const rnd = mulberry32(5);
    const kinds = new Set();
    for (let i = 0; i < 200; i++) kinds.add(rollEncounter(rnd));
    expect([...kinds].sort()).toEqual(['chest', 'gift', 'quiz']);
    for (let i = 0; i < 50; i++) { const c = chestCoins(rnd); expect(c).toBeGreaterThanOrEqual(5); expect(c).toBeLessThanOrEqual(15); }
    for (let i = 0; i < 50; i++) expect(GIFTS).toContain(pickGift(rnd));
    for (const g of GIFTS) expect(!!(g.xp || g.coins || g.charm)).toBe(true);
  });

  it('a Golden Ticket doubles the coins of the next game only', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    p.charms.doubleCoins = true;
    const payload = { gameId: 'math-dash', subject: 'math', band: 'A' };
    const r = applyResult(p, payload, { correct: 10, total: 10, timeMs: 1 });
    expect(r.doubledCoins).toBe(true);
    expect(r.coins).toBe((10 * 2 + 15) * 2);
    expect(p.charms.doubleCoins).toBeUndefined();
    const r2 = applyResult(p, payload, { correct: 10, total: 10, timeMs: 1 });
    expect(r2.doubledCoins).toBeUndefined();
    expect(r2.coins).toBe(10 * 2 + 15);
  });
});
