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

describe('critters', () => {
  it('each critter has a sprite key, a cry and a coin value, and the bunny is faster than the sheep', async () => {
    const { CRITTERS, CRITTER_MAX_PER_DAY } = await import('../src/data/world/encounters.js');
    expect(CRITTERS.map((c) => c.key)).toEqual(['sheep', 'bunny']);
    for (const c of CRITTERS) { expect(c.cry).toBeTruthy(); expect(c.coins).toBeGreaterThan(0); expect(c.fleeSpeed).toBeGreaterThan(c.wanderSpeed); }
    const [sheep, bunny] = CRITTERS;
    expect(bunny.fleeSpeed).toBeGreaterThan(sheep.fleeSpeed);
    expect(bunny.coins).toBeGreaterThan(sheep.coins);
    expect(CRITTER_MAX_PER_DAY).toBeGreaterThan(0);
  });
});

describe('fishing and the player\'s house', () => {
  it('fishing loot is weighted and always valid', async () => {
    const { FISH_LOOT, rollFish, FISH_MAX_PER_DAY, FISH_BITE_MS } = await import('../src/data/world/encounters.js');
    const rnd = mulberry32(3);
    const seen = new Set();
    for (let i = 0; i < 300; i++) { const l = rollFish(rnd); expect(FISH_LOOT).toContain(l); seen.add(l.id); }
    expect(seen.size).toBe(FISH_LOOT.length);
    expect(FISH_LOOT.find((l) => l.message)).toBeTruthy();
    expect(FISH_MAX_PER_DAY).toBeGreaterThan(0);
    expect(FISH_BITE_MS).toBeGreaterThan(300);
  });

  it('the player\'s house has a walkable, reachable door and a sign stands beside Sam', () => {
    const map = buildMap();
    const reach = reachableFrom(map);
    expect(isWalkable(map.data[map.home.door.ty][map.home.door.tx])).toBe(true);
    expect(reach.has(`${map.home.door.tx},${map.home.door.ty}`)).toBe(true);
    expect(map.buildings.find((b) => b.style === 'home')).toBeTruthy();
    expect(Math.abs(map.signSpot.tx - map.npcSpots.signpost.tx) + Math.abs(map.signSpot.ty - map.npcSpots.signpost.ty)).toBe(1);
  });
});
