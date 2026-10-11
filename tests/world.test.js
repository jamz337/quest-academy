import { describe, it, expect } from 'vitest';
import { duelFor, duelVillagers, duelsWon, DUEL } from '../src/data/world/duels.js';
import { buildMap, reachableFrom, isWalkable, zoneAt, TID } from '../src/data/world/map.js';
import { NPCS } from '../src/data/world/npcs.js';
import { MINIGAMES } from '../src/data/minigames.js';
import { mergeInput } from '../src/systems/InputController.js';

const key = (s) => `${s.tx},${s.ty}`;


describe('world map', () => {
  const map = buildMap();

  it('has the expected size and a deterministic layout', () => {
    expect(map.width).toBe(56); expect(map.height).toBe(64);
    expect(map.data).toHaveLength(64);
    for (const row of map.data) expect(row).toHaveLength(56);
    expect(buildMap().data).toEqual(map.data);
  });

  it('spawn, NPC spots and coins are on walkable tiles', () => {
    expect(isWalkable(map.data[map.spawn.ty][map.spawn.tx])).toBe(true);
    for (const [id, s] of Object.entries(map.npcSpots)) expect(isWalkable(map.data[s.ty][s.tx]), id).toBe(true);
    for (const c of map.coins) expect(map.data[c.ty][c.tx]).toBe(TID.path);
    expect(map.coins).toHaveLength(30);
  });

  it('every NPC in npcs.js has a spot in the zone it belongs to', () => {
    for (const npc of NPCS) {
      const s = map.npcSpots[npc.id];
      expect(s, npc.id).toBeTruthy();
      expect(zoneAt(map, s.tx, s.ty)).toBe(npc.zone);
      if (npc.gameId) expect(MINIGAMES.find((g) => g.id === npc.gameId)?.npc).toBe(npc.id);
    }
    for (const g of MINIGAMES) expect(NPCS.find((n) => n.id === g.npc)?.gameId).toBe(g.id);
  });

  it('every village is open: all NPC spots, boss arenas and coins are reachable from spawn', () => {
    const seen = reachableFrom(map);
    for (const npc of NPCS) expect(seen.has(key(map.npcSpots[npc.id])), npc.id).toBe(true);
    for (const [zone, spot] of Object.entries(map.bossSpots)) expect(seen.has(key(spot)), zone).toBe(true);
    for (const c of map.coins) expect(seen.has(key(c))).toBe(true);
  });

  it('closing the archways would seal each village off (so the tree walls are intact)', () => {
    const data = map.data.map((r) => r.slice());
    for (const g of map.gates) data[g.ty][g.tx] = TID.gateLocked;
    const seen = reachableFrom({ ...map, data });
    for (const npc of NPCS) expect(seen.has(key(map.npcSpots[npc.id])), npc.id).toBe(npc.zone === 'hub' || npc.zone === 'math');
  });

  it('each gate sits on the boundary of its zone', () => {
    for (const g of map.gates) {
      expect(map.data[g.ty][g.tx]).toBe(TID.gateOpen);
      const neighbours = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => zoneAt(map, g.tx + dx, g.ty + dy));
      expect(neighbours).toContain(g.zone);
    }
  });
});

describe('duels', () => {
  it('every villager with a game has a duel prop and lines, and the market and story folk do not duel', async () => {
    const { NPCS } = await import('../src/data/world/npcs.js');
    for (const n of NPCS.filter((x) => x.gameId)) {
      expect(n.duel && n.duel.prop, n.id).toBeTruthy();
      const d = duelFor(n.id);
      expect(d.subject, n.id).toBeTruthy(); expect(d.hp).toBe(DUEL.npcHp); expect(d.win).toContain(n.name.split(' ')[0]);
    }
    expect(duelFor('signpost')).toBeNull(); expect(duelFor('vendor')).toBeNull(); expect(duelFor('nobody')).toBeNull();
    expect(duelVillagers('math').length).toBeGreaterThan(2);
    expect(duelsWon({ world: { duels: { 'prof-plus': { won: true }, 'chef-fraction': { won: false } } } }, 'math')).toBe(1);
  });
});

describe('mergeInput', () => {
  const none = { left: false, right: false, up: false, down: false };
  it('keyboard maps to unit vectors', () => {
    expect(mergeInput({ ...none, right: true }, null, false)).toEqual({ dx: 1, dy: 0, actionJustPressed: false });
    expect(mergeInput({ ...none, up: true }, null, true)).toEqual({ dx: 0, dy: -1, actionJustPressed: true });
  });
  it('keyboard diagonals snap to the preferred axis', () => {
    expect(mergeInput({ ...none, right: true, down: true }, null, false, 'x')).toEqual({ dx: 1, dy: 0, actionJustPressed: false });
    expect(mergeInput({ ...none, right: true, down: true }, null, false, 'y')).toEqual({ dx: 0, dy: 1, actionJustPressed: false });
  });
  it('joystick snaps to the dominant axis and keeps magnitude', () => {
    const r = mergeInput(none, { x: 0.3, y: -0.8 }, false);
    expect(r.dx).toBe(0); expect(r.dy).toBeCloseTo(-0.85, 2);
    const r2 = mergeInput(none, { x: -0.5, y: 0.1 }, false);
    expect(r2.dy).toBe(0); expect(r2.dx).toBeCloseTo(-0.51, 2);
    expect(mergeInput(none, { x: 0, y: 0 }, false)).toEqual({ dx: 0, dy: 0, actionJustPressed: false });
  });
  it('keyboard wins over the joystick', () => {
    expect(mergeInput({ ...none, left: true }, { x: 1, y: 0 }, false).dx).toBe(-1);
  });
});

describe('the painted terrain layers', async () => {
  const { terrainLayers } = await import('../src/data/world/terrainLayout.js');
  const { TERRAIN_ROWS, TERRAIN_COLS } = await import('../src/systems/Terrain.js');
  const map = buildMap();
  const L = terrainLayers(map);
  it('puts a road piece wherever a road square touches, water likewise, and the right ground under everything', () => {
    expect(L.road).toHaveLength(map.height + 1); expect(L.road[0]).toHaveLength(map.width + 1);
    const max = TERRAIN_ROWS * TERRAIN_COLS;
    for (const grid of [L.road, L.water]) for (const row of grid) for (const t of row) { expect(t).toBeLessThan(max); if (t >= 0) expect(t % TERRAIN_COLS).toBeGreaterThan(0); }
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const id = map.data[y][x];
      if (id === TID.path) for (const [i, j] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) expect(L.road[j][i]).toBeGreaterThanOrEqual(0);
      if (id === TID.water) expect(L.water[y][x]).toBeGreaterThanOrEqual(0);
      expect([TID.path, TID.water, TID.tree]).not.toContain(L.base[y][x]);
    }
  });
});
