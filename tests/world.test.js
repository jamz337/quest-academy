import { describe, it, expect } from 'vitest';
import { buildMap, reachableFrom, isWalkable, zoneAt, TID } from '../src/data/world/map.js';
import { NPCS } from '../src/data/world/npcs.js';
import { MINIGAMES } from '../src/data/minigames.js';
import { mergeInput } from '../src/systems/InputController.js';

const key = (s) => `${s.tx},${s.ty}`;

function withGatesOpen(map, zonesOpen) {
  const data = map.data.map((r) => r.slice());
  for (const g of map.gates) if (zonesOpen.includes(g.zone)) data[g.ty][g.tx] = TID.gateOpen;
  return { ...map, data };
}

describe('world map', () => {
  const map = buildMap();

  it('has the expected size and a deterministic layout', () => {
    expect(map.width).toBe(48); expect(map.height).toBe(40);
    expect(map.data).toHaveLength(40);
    for (const row of map.data) expect(row).toHaveLength(48);
    expect(buildMap().data).toEqual(map.data);
  });

  it('spawn, NPC spots and coins are on walkable tiles', () => {
    expect(isWalkable(map.data[map.spawn.ty][map.spawn.tx])).toBe(true);
    for (const [id, s] of Object.entries(map.npcSpots)) expect(isWalkable(map.data[s.ty][s.tx]), id).toBe(true);
    for (const c of map.coins) expect(map.data[c.ty][c.tx]).toBe(TID.path);
    expect(map.coins).toHaveLength(15);
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

  it('with gates locked only the hub and Math Meadow NPCs are reachable', () => {
    const seen = reachableFrom(map);
    for (const npc of NPCS) {
      const reachable = seen.has(key(map.npcSpots[npc.id]));
      expect(reachable, npc.id).toBe(npc.zone === 'hub' || npc.zone === 'math');
    }
  });

  it('opening the words gate reaches Word Woods but not Code Cove', () => {
    const seen = reachableFrom(withGatesOpen(map, ['words']));
    for (const npc of NPCS) expect(seen.has(key(map.npcSpots[npc.id])), npc.id).toBe(npc.zone !== 'code');
  });

  it('with all gates open every NPC spot and coin is reachable', () => {
    const seen = reachableFrom(withGatesOpen(map, ['words', 'code']));
    for (const npc of NPCS) expect(seen.has(key(map.npcSpots[npc.id])), npc.id).toBe(true);
    for (const c of map.coins) expect(seen.has(key(c))).toBe(true);
  });

  it('each gate sits on the boundary of its zone', () => {
    for (const g of map.gates) {
      expect(map.data[g.ty][g.tx]).toBe(TID.gateLocked);
      const neighbours = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => zoneAt(map, g.tx + dx, g.ty + dy));
      expect(neighbours).toContain(g.zone);
    }
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
