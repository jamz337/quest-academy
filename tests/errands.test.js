import { describe, it, expect } from 'vitest';
import { ERRANDS, errandFor, unlockErrand, acceptErrand, pickUpErrand, deliverErrand, activeErrand, errandLine, errandsDone, ERRAND_REWARD } from '../src/data/world/errands.js';
import { NPCS } from '../src/data/world/npcs.js';
import { buildMap, reachableFrom, isWalkable, zoneAt } from '../src/data/world/map.js';
import { newProfile } from '../src/systems/SaveSystem.js';
import { applyResult, houseStars, nextHouseLevel } from '../src/systems/Progression.js';

describe('errands', () => {
  const map = buildMap();

  it('every villager has one errand whose item lies in another zone, on a reachable tile', () => {
    const reach = reachableFrom(map);
    for (const npc of NPCS.filter((n) => n.gameId)) {
      const e = errandFor(npc.id);
      expect(e, npc.id).toBeTruthy();
      expect(e.zone).not.toBe(npc.zone);
      expect(zoneAt(map, e.tx, e.ty), e.id).toBe(e.zone);
      expect(isWalkable(map.data[e.ty][e.tx]), e.id).toBe(true);
      expect(reach.has(`${e.tx},${e.ty}`), e.id).toBe(true);
    }
    expect(new Set(ERRANDS.map((e) => e.id)).size).toBe(ERRANDS.length);
  });

  it('runs locked → available → active → carrying → done, one at a time, with a reward at the end', () => {
    const p = newProfile({ name: 'A' });
    expect(acceptErrand(p, 'abacus')).toBe(false);
    expect(unlockErrand(p, 'prof-plus').id).toBe('abacus');
    expect(unlockErrand(p, 'prof-plus')).toBeNull();
    unlockErrand(p, 'scribe');
    expect(acceptErrand(p, 'abacus')).toBe(true);
    expect(acceptErrand(p, 'ink')).toBe(false);             // one errand at a time
    expect(errandLine(p)).toContain('Find the abacus in Word Woods');
    expect(deliverErrand(p, 'abacus')).toBeNull();           // not carrying yet
    expect(pickUpErrand(p, 'abacus')).toBe(true);
    expect(errandLine(p)).toContain('Carry the abacus to Professor Plus');
    const coins = p.coins;
    expect(deliverErrand(p, 'abacus')).toEqual(ERRAND_REWARD);
    expect(p.coins).toBe(coins + ERRAND_REWARD.coins);
    expect(activeErrand(p)).toBeNull();
    expect(errandsDone(p)).toBe(1);
    expect(acceptErrand(p, 'ink')).toBe(true);
  });

  it('house levels: a pass lights a star, level 1 unlocks the errand, next level advances', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(nextHouseLevel(p, 'math-dash')).toBe(1);
    const r = applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A', level: 1 }, { correct: 8, total: 10, timeMs: 1 });
    expect(r).toMatchObject({ level: 1, levelPassed: true, newHouseStar: true, houseStars: 1 });
    expect(r.errandUnlocked && r.errandUnlocked.id).toBe('abacus');
    expect(nextHouseLevel(p, 'math-dash')).toBe(2);
    const again = applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A', level: 1 }, { correct: 10, total: 10, timeMs: 1 });
    expect(again.newHouseStar).toBe(false);
    applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A', level: 2 }, { correct: 3, total: 10, timeMs: 1 });
    expect(houseStars(p, 'math-dash')).toBe(1);            // a fail lights nothing
    expect(nextHouseLevel(p, 'math-dash')).toBe(2);
    applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A', level: 2 }, { correct: 8, total: 10, timeMs: 1 });
    applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A', level: 3 }, { correct: 8, total: 10, timeMs: 1 });
    expect(houseStars(p, 'math-dash')).toBe(3);
    expect(nextHouseLevel(p, 'math-dash')).toBe(1);   // finished: the game moved up a grade and its levels start over
    expect(p.badges).toContain('house-3');
  });
});
