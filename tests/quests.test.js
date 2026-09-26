import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/systems/SaveSystem.js';
import { mastery, effectiveGrade, updateMastery, unlockedZones, applyResult, MASTERY_MAX } from '../src/systems/Progression.js';
import { zoneQuests, bossReady, gateHint, activeZone, bossDefeated, ZONE_ORDER } from '../src/data/world/quests.js';
import { BOSSES, bossForZone } from '../src/data/world/bosses.js';
import { NPCS } from '../src/data/world/npcs.js';
import { gamesForSubject } from '../src/data/minigames.js';
import { buildMap, reachableFrom, isWalkable, zoneAt, TID } from '../src/data/world/map.js';
import { bossQuestions, programText } from '../src/generators/boss.js';
import { tuningFor } from '../src/data/grades.js';
import { Rng } from '../src/systems/Rng.js';

const key = (s) => `${s.tx},${s.ty}`;
const withGatesOpen = (map, zones) => {
  const data = map.data.map((r) => r.slice());
  for (const g of map.gates) if (zones.includes(g.zone)) data[g.ty][g.tx] = TID.gateOpen;
  return { ...map, data };
};

describe('mastery', () => {
  it('starts at zero and only moves after two strong or two weak games in a row', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(mastery(p, 'math')).toEqual({ level: 0, streak: 0 });
    expect(updateMastery(p, 'math', 3)).toEqual({ from: 0, to: 0 });
    expect(updateMastery(p, 'math', 2)).toEqual({ from: 0, to: 0 });   // a 2-star game resets the streak
    updateMastery(p, 'math', 3);
    expect(updateMastery(p, 'math', 3)).toEqual({ from: 0, to: 1 });
    updateMastery(p, 'math', 0);
    expect(updateMastery(p, 'math', 1)).toEqual({ from: 1, to: 0 });
    expect(updateMastery(p, 'math', 0).to).toBe(0);
  });

  it('raises the grade the generators see, within 2..8', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    for (let i = 0; i < 2 * MASTERY_MAX; i++) updateMastery(p, 'words', 3);
    expect(mastery(p, 'words').level).toBe(MASTERY_MAX);
    expect(effectiveGrade(p, 'words')).toBe(3 + MASTERY_MAX);
    expect(effectiveGrade(p, 'math')).toBe(3);
    expect(effectiveGrade({ grade: 8, mastery: { math: { level: 3 } } }, 'math', 1)).toBe(8);
    expect(effectiveGrade({ grade: 2 }, 'math')).toBe(2);
  });

  it('tightens timers per mastery level', () => {
    expect(tuningFor({ band: 'A', mastery: 0 }).questionTimeMs).toBe(20000);
    expect(tuningFor({ band: 'A', mastery: 2 }).questionTimeMs).toBe(15200);
    expect(tuningFor({ band: 'C', mastery: 3 }).parTimeMs).toBe(48000);
  });

  it('is updated by applyResult for games but not for boss fights', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const payload = { gameId: 'math-dash', subject: 'math', band: 'A' };
    applyResult(p, payload, { correct: 10, total: 10, timeMs: 1000 });
    const r = applyResult(p, payload, { correct: 10, total: 10, timeMs: 1000 });
    expect(r.masteryChange).toBe(1);
    expect(mastery(p, 'math').level).toBe(1);
    const boss = applyResult(p, { gameId: 'boss-math', subject: 'math', band: 'A', boss: bossForZone('math') }, { won: true, heartsLeft: 3, hpLeft: 0, correct: 8, total: 8, timeMs: 1 });
    expect(boss.masteryChange).toBeUndefined();
  });
});

describe('zone quests', () => {
  it('lists villagers, stars and coins with progress, then the boss', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const q = zoneQuests(p, 'math');
    expect(q.map((x) => x.id)).toEqual(['meet', 'stars', 'coins', 'boss']);
    expect(q[0].total).toBe(NPCS.filter((n) => n.zone === 'math' && n.gameId).length);
    expect(q[1].total).toBe(gamesForSubject('math').length);
    expect(q[2].total).toBeGreaterThan(0);
    expect(q.every((x) => !x.done)).toBe(true);
    expect(bossReady(p, 'math')).toBe(false);
  });

  it('the boss is ready once every other quest is done', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const map = buildMap();
    p.world.npcsTalked = NPCS.filter((n) => n.zone === 'math').map((n) => n.id);
    for (const g of gamesForSubject('math')) p.games[g.id] = { bestStars: 1 };
    p.world.coinsCollected = map.coins.map((c, i) => (zoneAt(map, c.tx, c.ty) === 'math' ? i : -1)).filter((i) => i >= 0);
    expect(bossReady(p, 'math')).toBe(true);
    expect(bossReady(p, 'words')).toBe(false);
    expect(gateHint(p, 'words')).toContain('Count Chaos');
    expect(gateHint(newProfile({ name: 'B' }), 'words')).toContain('quests');
  });

  it('beating a boss opens the next zone and keeps old star unlocks', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(unlockedZones(p)).toEqual(['math']);
    const r = applyResult(p, { gameId: 'boss-math', subject: 'math', band: 'A', boss: bossForZone('math') }, { won: true, heartsLeft: 2, hpLeft: 0, correct: 8, total: 9, timeMs: 1 });
    expect(r.stars).toBe(2);
    expect(r.passed).toBe(true);
    expect(r.newUnlocks).toEqual(['words']);
    expect(bossDefeated(p, 'math')).toBe(true);
    expect(p.world.bosses.math.attempts).toBe(1);
    expect(p.badges).toContain('boss-1');
    expect(unlockedZones(p)).toEqual(['math', 'words']);
    expect(activeZone(p)).toBe('words');
    const lost = applyResult(p, { gameId: 'boss-words', subject: 'words', band: 'A', boss: bossForZone('words') }, { won: false, heartsLeft: 0, hpLeft: 3, correct: 5, total: 8, timeMs: 1 });
    expect(lost.stars).toBe(0);
    expect(unlockedZones(p)).toEqual(['math', 'words']);
    const legacy = newProfile({ name: 'L' });
    legacy.world.unlockedZones = ['math', 'words', 'code'];
    expect(unlockedZones(legacy)).toEqual(['math', 'words', 'code']);
  });

  it('every zone has a boss whose arena is walkable, in its zone, and reachable once the gate is open', () => {
    const map = buildMap();
    for (const z of ZONE_ORDER) {
      const spot = map.bossSpots[z];
      expect(spot, z).toBeTruthy();
      expect(BOSSES.find((b) => b.zone === z), z).toBeTruthy();
      expect(isWalkable(map.data[spot.ty][spot.tx])).toBe(true);
      expect(zoneAt(map, spot.tx, spot.ty)).toBe(z);
    }
    const locked = reachableFrom(map);
    expect(locked.has(key(map.bossSpots.math))).toBe(true);
    expect(locked.has(key(map.bossSpots.words))).toBe(false);
    const all = reachableFrom(withGatesOpen(map, ['words', 'code', 'bible']));
    for (const z of ZONE_ORDER) expect(all.has(key(map.bossSpots[z])), z).toBe(true);
    for (const c of map.coins) expect(all.has(key(c))).toBe(true);
  });
});

describe('boss questions', () => {
  it('are valid multiple choice for every subject and grade', () => {
    for (const subject of ['math', 'words', 'code', 'bible']) for (const grade of [2, 3, 5, 6, 8]) {
      const qs = bossQuestions(subject, grade, new Rng(grade * 7 + subject.length), 12);
      expect(qs.length, `${subject} ${grade}`).toBe(12);
      for (const q of qs) {
        expect(q.choices.length).toBeGreaterThanOrEqual(3);   // grammar rounds offer three options
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(typeof q.prompt).toBe('string');
        expect(q.skill).toBeTruthy();
      }
    }
  });

  it('prints programs as readable lines', () => {
    expect(programText([{ op: 'fwd' }, { op: 'repeat', n: 2, body: [{ op: 'left' }] }])).toBe('Move ▲\nRepeat 2:\n  Turn ◀');
  });
});
