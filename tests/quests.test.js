import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/systems/SaveSystem.js';
import { mastery, effectiveGrade, gameGrade, gradeUps, houseStars, nextHouseLevel, updateMastery, unlockedZones, applyResult, MASTERY_MAX, HOUSE_LEVELS } from '../src/systems/Progression.js';
import { zoneQuests, bossReady, activeZone, bossDefeated, ZONE_ORDER } from '../src/data/world/quests.js';
import { BOSSES, bossForZone } from '../src/data/world/bosses.js';
import { NPCS } from '../src/data/world/npcs.js';
import { gamesForSubject } from '../src/data/minigames.js';
import { buildMap, reachableFrom, isWalkable, zoneAt, TID } from '../src/data/world/map.js';
import { bossQuestions, programText } from '../src/generators/boss.js';
import { tuningFor } from '../src/data/grades.js';
import { Rng } from '../src/systems/Rng.js';

const key = (s) => `${s.tx},${s.ty}`;

describe('mastery', () => {
  it('starts at zero and only moves after two strong or two weak games in a row', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(mastery(p, 'math')).toEqual({ level: 0, streak: 0 });
    expect(updateMastery(p, 'math', 3)).toEqual({ from: 0, to: 0 });
    expect(updateMastery(p, 'math', 2)).toEqual({ from: 0, to: 0 });   // a 2-star game resets the streak
    updateMastery(p, 'math', 3); updateMastery(p, 'math', 3);
    expect(updateMastery(p, 'math', 3)).toEqual({ from: 0, to: 1 });
    updateMastery(p, 'math', 0);
    expect(updateMastery(p, 'math', 1)).toEqual({ from: 1, to: 0 });
    expect(updateMastery(p, 'math', 0).to).toBe(0);
  });

  it('never changes the grade the generators see: questions stay at the chosen grade', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    for (let i = 0; i < 3 * MASTERY_MAX; i++) updateMastery(p, 'words', 3);
    expect(mastery(p, 'words').level).toBe(MASTERY_MAX);
    expect(effectiveGrade(p, 'words')).toBe(3);
    expect(gameGrade(p, 'eng-builder')).toBe(3);
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
    applyResult(p, payload, { correct: 10, total: 10, timeMs: 1000 });
    const r = applyResult(p, payload, { correct: 10, total: 10, timeMs: 1000 });   // third strong game in a row
    expect(r.masteryChange).toBe(1);
    expect(mastery(p, 'math').level).toBe(1);
    const boss = applyResult(p, { gameId: 'boss-math', subject: 'math', band: 'A', boss: bossForZone('math') }, { won: true, heartsLeft: 3, hpLeft: 0, correct: 8, total: 8, timeMs: 1 });
    expect(boss.masteryChange).toBeUndefined();
  });
});

describe('grade up on finishing a game', () => {
  const play = (p, gameId, level, correct = 10) => applyResult(p, { gameId, subject: 'math', band: 'A', level }, { correct, total: 10, timeMs: 1000 });

  it('keeps every house level at the chosen grade until all three are passed, then moves the game up one grade', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(gameGrade(p, 'math-dash')).toBe(3);
    const r1 = play(p, 'math-dash', 1);
    expect(r1.gradeUp).toBeUndefined();
    expect(gameGrade(p, 'math-dash')).toBe(3);
    play(p, 'math-dash', 2);
    expect(nextHouseLevel(p, 'math-dash')).toBe(3);
    const r3 = play(p, 'math-dash', 3);
    expect(r3.gradeUp).toEqual({ from: 3, to: 4 });
    expect(r3.houseStars).toBe(HOUSE_LEVELS);
    expect(gradeUps(p, 'math-dash')).toBe(1);
    expect(gameGrade(p, 'math-dash')).toBe(4);
    expect(gameGrade(p, 'math-pizza')).toBe(3);          // other games are untouched
    expect(houseStars(p, 'math-dash')).toBe(HOUSE_LEVELS); // the house keeps its stars
    expect(nextHouseLevel(p, 'math-dash')).toBe(1);        // and the levels start over at the new grade
  });

  it('does not move up on a failed level or past grade 8, and a subject is at the grade all its games reached', () => {
    const p = newProfile({ name: 'A', grade: 8 });
    play(p, 'math-dash', 1); play(p, 'math-dash', 2);
    expect(play(p, 'math-dash', 3, 2).gradeUp).toBeUndefined();   // 20% is not a pass
    expect(play(p, 'math-dash', 3).gradeUp).toBeUndefined();      // already at the top grade
    expect(gameGrade(p, 'math-dash')).toBe(8);
    const q = newProfile({ name: 'B', grade: 4 });
    [1, 2, 3].forEach((l) => play(q, 'math-dash', l));
    expect(gameGrade(q, 'math-dash')).toBe(5);
    expect(effectiveGrade(q, 'math')).toBe(4);   // Fraction Pizza and Pattern Bridge are still at grade 4
  });
});

describe('zone quests', () => {
  it('lists villagers, stars and coins with progress, then the boss', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const q = zoneQuests(p, 'math');
    expect(q.map((x) => x.id)).toEqual(['meet', 'stars', 'duels', 'errand', 'coins', 'boss']);
    expect(q[0].total).toBe(NPCS.filter((n) => n.zone === 'math' && n.gameId).length);
    expect(q[1].total).toBe(gamesForSubject('math').length);
    expect(q[2].total).toBe(q[0].total);   // one duel per villager with a game
    expect(q[4].total).toBeGreaterThan(0);
    expect(q.every((x) => !x.done)).toBe(true);
    expect(bossReady(p, 'math')).toBe(false);
  });

  it('the boss is ready once every villager of the land has lost a duel, whatever else is left', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const villagers = NPCS.filter((n) => n.zone === 'math' && n.gameId);
    expect(villagers.length).toBe(4);
    p.world.duels = Object.fromEntries(villagers.slice(0, 3).map((n) => [n.id, { won: true }]));
    expect(bossReady(p, 'math')).toBe(false);   // one villager still standing
    p.world.duels[villagers[3].id] = { won: true };
    expect(bossReady(p, 'math')).toBe(true);    // stars, coins and the errand are not required
    expect(zoneQuests(p, 'math').find((q) => q.id === 'stars').done).toBe(false);
    expect(bossReady(p, 'words')).toBe(false);
  });

  it('every village is open from the start; beating a boss clears its zone', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(unlockedZones(p)).toEqual(ZONE_ORDER);
    const r = applyResult(p, { gameId: 'boss-math', subject: 'math', band: 'A', boss: bossForZone('math') }, { won: true, heartsLeft: 2, hpLeft: 0, correct: 8, total: 9, timeMs: 1 });
    expect(r.stars).toBe(2);
    expect(r.passed).toBe(true);
    expect(bossDefeated(p, 'math')).toBe(true);
    expect(p.world.bosses.math.attempts).toBe(1);
    expect(p.badges).toContain('boss-1');
    expect(activeZone(p)).toBe('science');   // the next land in story order
    const lost = applyResult(p, { gameId: 'boss-words', subject: 'words', band: 'A', boss: bossForZone('words') }, { won: false, heartsLeft: 0, hpLeft: 3, correct: 5, total: 8, timeMs: 1 });
    expect(lost.stars).toBe(0);
    expect(bossDefeated(p, 'words')).toBe(false);
    expect(unlockedZones(p)).toEqual(ZONE_ORDER);
  });

  it('the Explorer badge needs a hello in every village', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    p.world.npcsTalked = ['prof-plus', 'botanist', 'owl-librarian', 'robo-mechanic', 'captain-compass', 'drummer', 'painter', 'shepherd'];
    applyResult(p, { gameId: 'math-dash', subject: 'math', band: 'A' }, { correct: 5, total: 10, timeMs: 1 });
    expect(p.badges).toContain('explorer');
  });

  it('every zone has a boss whose arena is walkable, in its zone, and reachable from spawn', () => {
    const map = buildMap();
    for (const z of ZONE_ORDER) {
      const spot = map.bossSpots[z];
      expect(spot, z).toBeTruthy();
      expect(BOSSES.find((b) => b.zone === z), z).toBeTruthy();
      expect(isWalkable(map.data[spot.ty][spot.tx])).toBe(true);
      expect(zoneAt(map, spot.tx, spot.ty)).toBe(z);
    }
    const all = reachableFrom(map);
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
