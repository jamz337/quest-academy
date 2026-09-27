import { describe, it, expect } from 'vitest';
import { newExplored, ensureExplored, isExplored, reveal, exploredStats, REVEAL_RADIUS } from '../src/data/world/explore.js';
import { W, H } from '../src/data/world/map.js';
import { newProfile, migrate, defaultSave } from '../src/systems/SaveSystem.js';

describe('explored map', () => {
  it('starts dark, reveals a disc around the player, and reports changes only once', () => {
    const e = newExplored();
    expect(exploredStats(e)).toEqual({ tiles: 0, share: 0 });
    expect(reveal(e, 10, 10)).toBe(true);
    expect(isExplored(e, 10, 10)).toBe(true);
    expect(isExplored(e, 10 + REVEAL_RADIUS, 10)).toBe(true);
    expect(isExplored(e, 10 + REVEAL_RADIUS + 1, 10)).toBe(false);
    expect(isExplored(e, 10 + REVEAL_RADIUS, 10 + REVEAL_RADIUS)).toBe(false);   // a disc, not a square
    expect(reveal(e, 10, 10)).toBe(false);
    const n = exploredStats(e).tiles;
    expect(n).toBeGreaterThan(40); expect(n).toBeLessThan(90);
  });

  it('handles both halves of a row and the map edges', () => {
    const e = newExplored();
    reveal(e, W - 1, H - 1, 2);
    expect(isExplored(e, W - 1, H - 1)).toBe(true);
    expect(isExplored(e, W - 3, H - 1)).toBe(true);
    expect(isExplored(e, W, H - 1)).toBe(false);
    expect(isExplored(e, 27, 5)).toBe(false);
    reveal(e, 28, 5, 1);
    expect(isExplored(e, 27, 5)).toBe(true); expect(isExplored(e, 28, 5)).toBe(true); expect(isExplored(e, 29, 5)).toBe(true);
    expect(isExplored(null, 1, 1)).toBe(false);
  });

  it('is created on demand on a profile and survives a save round-trip', () => {
    const p = newProfile({ name: 'A' });
    const e = ensureExplored(p);
    reveal(e, 24, 22);
    const save = defaultSave(); save.profiles[p.id] = p;
    const back = migrate(JSON.parse(JSON.stringify(save)));
    expect(isExplored(back.profiles[p.id].world.explored, 24, 22)).toBe(true);
    p.world.explored = ['bad'];
    expect(ensureExplored(p)).toHaveLength(H);
    expect(JSON.stringify(newExplored()).length).toBeLessThan(400);
  });
});
