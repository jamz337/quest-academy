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
    expect(m.version).toBe(1);
    expect(m.profiles.x.world.unlockedZones).toEqual(['math']);
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

  it('applies a quiz result, awards coins/xp, tracks best and unlocks zones', () => {
    const p = newProfile({ name: 'T', grade: 3 });
    const payload = { gameId: 'math-dash', band: 'A' };
    const r = applyResult(p, payload, { correct: 9, total: 10, timeMs: 50000, parTimeMs: 90000 });
    expect(r.stars).toBe(3);
    expect(r.coins).toBe(9 * 2 + 15);
    expect(r.xp).toBe(90 + 45 + 20);
    expect(p.games['math-dash'].bestStars).toBe(3);
    expect(r.newBadges).toContain('first-win');
    expect(unlockedZones(p)).toEqual(['math', 'words']);
    expect(r.newUnlocks).toEqual(['words']);
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
