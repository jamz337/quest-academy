import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
const { GATEWAYS, landStars, nextGame, routeField, stepsFrom } = await import('../src/scenes/world/guide.js');
const { buildMap, TID, isWalkable, zoneAt } = await import('../src/data/world/map.js');
const { MINIGAMES } = await import('../src/data/minigames.js');

const map = buildMap();
const fresh = () => ({ games: {}, world: {}, coding: {} });

describe('the gateways out of the hub', () => {
  it('each stands on the road, with its land just beyond it', () => {
    expect(GATEWAYS.map((g) => g.zone).sort()).toEqual(['bible', 'code', 'math', 'words']);
    for (const g of GATEWAYS) {
      expect([TID.path, TID.gateOpen], g.zone).toContain(map.data[g.ty][g.tx]);
      let inLand = false;
      for (let i = 1; i <= 4; i++) if (zoneAt(map, g.tx + g.dx * i, g.ty + g.dy * i) === g.zone) inLand = true;
      expect(inLand, g.zone).toBe(true);
    }
  });

  it('counts the stars of a land', () => {
    const p = fresh();
    expect(landStars(p, 'math')).toEqual({ stars: 0, total: 12 });
    p.games['math-dash'] = { bestStars: 2, plays: 1, levels: { 1: 2, 2: 1 } };   // two of the house's three levels passed
    expect(landStars(p, 'math').stars).toBe(2);
  });
});

describe('the next-step trail', () => {
  it('suggests the goal game first, then any game short of stars', () => {
    const p = fresh();
    p.goal = { day: 'x', gameId: 'eng-frog', stars: 1, done: false };
    expect(nextGame(p, map).id).toBe('eng-frog');
    p.goal.done = true;
    expect(MINIGAMES.map((g) => g.id)).toContain(nextGame(p, map).id);
  });

  it('finds a walkable way from the spawn to every game house, keeping to the roads', () => {
    for (const game of MINIGAMES) {
      const target = map.npcSpots[game.npc];
      const field = routeField(map, target);
      expect(field[map.spawn.ty * map.width + map.spawn.tx], game.id).toBeGreaterThan(0);
      let { tx, ty } = map.spawn, guard = 0, roads = 0, total = 0;
      while ((tx !== target.tx || ty !== target.ty) && guard++ < 400) {
        const [s] = stepsFrom(field, map, tx, ty, 1);
        expect(s, game.id).toBeTruthy();
        expect(Math.abs(s.tx - tx) + Math.abs(s.ty - ty)).toBe(1);
        expect(isWalkable(map.data[s.ty][s.tx])).toBe(true);
        tx = s.tx; ty = s.ty; total += 1;
        if (map.data[ty][tx] === TID.path || map.data[ty][tx] === TID.gateOpen) roads += 1;
      }
      expect(tx === target.tx && ty === target.ty, game.id).toBe(true);
      expect(roads / total, game.id).toBeGreaterThan(0.8);
    }
  });

  it('gives no steps once you are there', () => {
    const target = map.npcSpots['prof-plus'];
    expect(stepsFrom(routeField(map, target), map, target.tx, target.ty)).toEqual([]);
  });
});

describe('lamps along the roads', () => {
  it('each land has a good row of them, beside its roads and never in the way', async () => {
    const { lampSpots } = await import('../src/scenes/world/lamps.js');
    const all = new Set();
    for (const g of GATEWAYS) {
      const spots = lampSpots(map, g.zone);
      expect(spots.length, g.zone).toBeGreaterThanOrEqual(8);
      expect(spots.length).toBeLessThanOrEqual(12);
      for (const s of spots) {
        const k = `${s.tx},${s.ty}`;
        expect(all.has(k)).toBe(false); all.add(k);
        expect(zoneAt(map, s.tx, s.ty)).toBe(g.zone);
        expect(isWalkable(map.data[s.ty][s.tx])).toBe(true);
        expect(map.data[s.ty][s.tx]).not.toBe(TID.path);
        expect(Object.values(map.npcSpots).some((n) => n.tx === s.tx && n.ty === s.ty)).toBe(false);
      }
    }
  });
});
