import { describe, it, expect } from 'vitest';
import { load, save, newProfile, migrate, defaultSave, levelFromXp } from '../src/systems/SaveSystem.js';
import { applyResult, starsFromAccuracy, unlockedZones } from '../src/systems/Progression.js';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

describe('save system', () => {
  it('round-trips through storage and falls back to backup', () => {
    const st = memStorage();
    const d = defaultSave();
    const p = newProfile({ name: 'Maya', grade: 4 });
    d.profiles[p.id] = p; d.activeProfileId = p.id;
    expect(save(d, st)).toBe(true);
    st.setItem('qa.save', '{corrupt');
    const back = load(st);
    expect(back.profiles[p.id].name).toBe('Maya');
  });

  it('migrates old data and fills missing fields', () => {
    const old = { version: 0, profiles: { x: { id: 'x', name: 'Old', grade: 2, coins: 0, xp: 0 } } };
    const m = migrate(old);
    expect(m.version).toBe(3);
    expect(m.profiles.x.world.unlockedZones).toEqual(['math', 'science', 'words', 'code', 'history', 'music', 'studio', 'bible']);
    expect(m.profiles.x.world.duels).toEqual({});
    expect(m.profiles.x.inventory.snacks).toEqual({});
    expect(m.settings.sound).toBe(true);
  });

  it('level curve', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(399)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
  });
});

describe('progression', () => {
  it('stars from accuracy', () => {
    expect(starsFromAccuracy(10, 10)).toBe(3);
    expect(starsFromAccuracy(7, 10)).toBe(2);
    expect(starsFromAccuracy(5, 10)).toBe(1);
    expect(starsFromAccuracy(4, 10)).toBe(0);
  });

  it('applies a quiz result, awards coins/xp and tracks the best; stars alone no longer open zones', () => {
    const p = newProfile({ name: 'T', grade: 3 });
    const payload = { gameId: 'math-dash', band: 'A' };
    const r = applyResult(p, payload, { correct: 9, total: 10, timeMs: 50000, parTimeMs: 90000 });
    expect(r.stars).toBe(3);
    expect(r.coins).toBe(9 * 2 + 15);
    expect(r.xp).toBe(90 + 45 + 20);
    expect(p.games['math-dash'].bestStars).toBe(3);
    expect(r.newBadges).toContain('first-win');
    expect(unlockedZones(p)).toEqual(['math', 'science', 'words', 'code', 'history', 'music', 'studio', 'bible']);   // every village is open; bosses are gated by quests
    // Worse replay does not lower the best
    applyResult(p, payload, { correct: 2, total: 10, timeMs: 50000 });
    expect(p.games['math-dash'].bestStars).toBe(3);
    expect(p.games['math-dash'].plays).toBe(2);
  });

  it('coding results use provided stars and record the level', () => {
    const p = newProfile({ name: 'T', grade: 6 });
    const r = applyResult(p, { gameId: 'code-maze', band: 'C' }, { stars: 2, levelId: 'C-01', solved: true, blocksUsed: 7, par: 6, timeMs: 1000 });
    expect(r.coins).toBe(20); expect(r.xp).toBe(80);
    expect(p.coding.levels['C-01']).toEqual({ stars: 2, bestBlocks: 7 });
  });
});

describe('the Science Springs migration (save version 2)', () => {
  it('moves saved positions and explored rows down to match the taller map', () => {
    const old = { version: 1, profiles: { x: { id: 'x', name: 'Old', grade: 2, coins: 0, xp: 0, world: { x: 100, y: 200, explored: Array.from({ length: 40 }, () => [1, 2]), npcsTalked: [], coinsCollected: [] } } } };
    const m = migrate(JSON.parse(JSON.stringify(old)));
    expect(m.version).toBe(3);
    expect(m.profiles.x.world.y).toBe(200 + 14 * 32);
    expect(m.profiles.x.world.x).toBe(100);
    expect(m.profiles.x.world.explored).toHaveLength(64);
    expect(m.profiles.x.world.explored[0]).toEqual([0, 0]);
    expect(m.profiles.x.world.explored[14]).toEqual([1, 2]);
    expect(migrate(JSON.parse(JSON.stringify(m))).profiles.x.world.y).toBe(200 + 14 * 32);   // never applied twice
  });
});

describe('the History Harbor migration (save version 3)', () => {
  it('adds the harbour rows under an explored grid of the old height, and leaves positions alone', () => {
    const old = { version: 2, profiles: { x: { id: 'x', name: 'Old', grade: 2, coins: 0, xp: 0, world: { x: 100, y: 200, explored: Array.from({ length: 54 }, () => [3, 4]), npcsTalked: [], coinsCollected: [] } } } };
    const m = migrate(JSON.parse(JSON.stringify(old)));
    expect(m.version).toBe(3);
    expect(m.profiles.x.world.y).toBe(200);
    expect(m.profiles.x.world.explored).toHaveLength(64);
    expect(m.profiles.x.world.explored[53]).toEqual([3, 4]);
    expect(m.profiles.x.world.explored[63]).toEqual([0, 0]);
  });
});
