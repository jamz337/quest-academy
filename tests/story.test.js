import { describe, it, expect } from 'vitest';
import { newProfile, migrate } from '../src/systems/SaveSystem.js';
import { CHAPTERS, MISSION_ORDER, chapterMissions, storyState, mentorLines, guideLines, signpostLine, newlyDone, markAnnounced, startStory, claimFinale, bellPieces, chapterGuideOk, ensureStory, clueFor, finishTutorial, tutorialDone, FINALE_COINS, MENTOR_ID } from '../src/data/world/story.js';
import { zoneQuests, bossReady, ZONE_ORDER, ZONE_GUIDE } from '../src/data/world/quests.js';
import { NPCS } from '../src/data/world/npcs.js';
import { ERRANDS, errandFor } from '../src/data/world/errands.js';
import { BADGES } from '../src/data/badges.js';
import { gamesForSubject } from '../src/data/minigames.js';
import { buildMap, zoneAt, isWalkable, reachableFrom } from '../src/data/world/map.js';

/** A profile that has finished a chapter's missions (not the boss). */
function finishChapter(p, zone, map) {
  p.world.npcsTalked = [...new Set([...(p.world.npcsTalked || []), ...NPCS.filter((n) => n.zone === zone).map((n) => n.id)])];
  for (const g of gamesForSubject(zone)) p.games[g.id] = { bestStars: 1, levels: { 1: 1, 2: 1, 3: 1 } };
  p.world.errands ||= {}; p.world.errands[errandFor(ZONE_GUIDE[zone]).id] = 'done';
  p.world.coinsCollected = [...new Set([...(p.world.coinsCollected || []), ...map.coins.map((c, i) => (zoneAt(map, c.tx, c.ty) === zone ? i : -1)).filter((i) => i >= 0)])];
}

describe('The Academy Bell', () => {
  const map = buildMap();

  it('has a chapter per land in order, each guided by a villager of that land who has an errand, with a full set of lines', () => {
    expect(CHAPTERS.map((c) => c.zone)).toEqual(ZONE_ORDER);
    expect(new Set(CHAPTERS.map((c) => c.piece)).size).toBe(4);
    for (const c of CHAPTERS) {
      expect(chapterGuideOk(c), c.zone).toBe(true);
      expect(ZONE_GUIDE[c.zone]).toBe(c.guide);
      expect(c.intro.length).toBeGreaterThanOrEqual(2);
      for (const k of ['guide', 'meet', 'stars', 'errand', 'coins', 'ready', 'piece']) expect(c.lines[k], `${c.zone} ${k}`).toBeTruthy();
    }
    const pearl = NPCS.find((n) => n.id === MENTOR_ID);
    expect(pearl).toMatchObject({ zone: 'hub', story: 'mentor', gameId: null, sprite: 'npc17' });
    const spot = map.npcSpots.hope;
    expect(spot && isWalkable(map.data[spot.ty][spot.tx])).toBe(true);
    expect(zoneAt(map, spot.tx, spot.ty)).toBe('hub');
    expect(reachableFrom(map).has(`${spot.tx},${spot.ty}`)).toBe(true);
    expect(map.bellSpot && isWalkable(map.data[map.bellSpot.ty][map.bellSpot.tx])).toBe(true);
  });

  it('the guide\'s errand is one of the zone quests, so the castle only opens once it is run', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(zoneQuests(p, 'math').map((q) => q.id)).toEqual(['meet', 'stars', 'errand', 'coins', 'boss']);
    expect(zoneQuests(p, 'math').find((q) => q.id === 'errand').title).toContain('Professor Plus');
    finishChapter(p, 'math', map);
    p.world.errands.abacus = 'carrying';
    expect(bossReady(p, 'math')).toBe(false);
    p.world.errands.abacus = 'done';
    expect(bossReady(p, 'math')).toBe(true);
  });

  it('missions unlock in story order and the journal state follows the chapters to the finale', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(p.story).toEqual({ started: false, announced: [], finale: false });
    expect(migrate({ version: 1, profiles: { x: { id: 'x', name: 'Old' } } }).profiles.x.story).toEqual({ started: false, announced: [], finale: false });
    // The tale: five lines for older players, four short ones for grades 2 and 3.
    const older = newProfile({ name: 'O', grade: 5 }), young = newProfile({ name: 'Y', grade: 2 });
    expect(mentorLines(older)).toHaveLength(5);
    expect(mentorLines(young)).toHaveLength(4); expect(mentorLines(young)[0]).toContain('Headmistress Hope');
    expect(mentorLines(young).join(' ').length).toBeLessThan(mentorLines(older).join(' ').length);
    expect(mentorLines(p)).toEqual(mentorLines(young));   // grade 3 hears the short telling too
    expect(tutorialDone(p)).toBe(false); finishTutorial(p); expect(tutorialDone(p)).toBe(true); expect(p.story.tutorial).toBe(true);
    let m = chapterMissions(p, 'math');
    expect(m.map((x) => x.id)).toEqual(MISSION_ORDER);
    expect(m.map((x) => x.available)).toEqual([true, false, false, false, false, false]);
    expect(m[0].title).toBe('Talk to Professor Plus');
    let st = storyState(p);
    expect(st).toMatchObject({ started: false, pieces: 0, chapter: 1, zone: 'math', ready: false, complete: false });
    expect(st.next.id).toBe('guide');
    expect(signpostLine(p)).toContain('Headmistress Hope');
    expect(mentorLines(p).length).toBeGreaterThanOrEqual(4);
    expect(clueFor(p)).toBeNull();   // no clues before the tale
    startStory(p);
    expect(storyState(p).started).toBe(true);
    expect(clueFor(p)).toContain('Professor Plus is waiting in Math Meadow');
    expect(signpostLine(p)).toContain('talk to professor plus');
    p.world.npcsTalked = ['prof-plus'];
    expect(clueFor(p)).toMatch(/villagers in Math Meadow still want to say hello/);
    m = chapterMissions(p, 'math');
    expect(m[0].done).toBe(true); expect(m[1].available).toBe(true); expect(m[2].available).toBe(false);
    expect(guideLines(newProfile({ name: 'B' }), 'prof-plus')).toEqual(CHAPTERS[0].intro);
    expect(guideLines(p, 'prof-plus')).toEqual([]);
    expect(guideLines(p, 'chef-fraction')).toEqual([]);
    // Finish the chapter: Mango has something to say for each step, once.
    finishChapter(p, 'math', map);
    const fresh = newlyDone(p);
    expect(fresh.map((f) => f.id)).toEqual(['guide', 'meet', 'stars', 'errand', 'coins', 'ready']);
    expect(fresh.find((f) => f.id === 'ready').line).toBe(CHAPTERS[0].lines.ready);
    fresh.forEach((f) => markAnnounced(p, f.key));
    expect(newlyDone(p)).toEqual([]);
    st = storyState(p);
    expect(st.ready).toBe(true); expect(st.next.id).toBe('boss');
    expect(clueFor(p)).toBe(CHAPTERS[0].lines.ready);
    expect(mentorLines(p)[1]).toBe(CHAPTERS[0].lines.ready);
    expect(signpostLine(p)).toContain(CHAPTERS[0].lines.ready);
    // The boss falls: a piece comes home and the story moves to Word Woods.
    p.world.bosses.math = { defeated: true, attempts: 1 };
    expect(bellPieces(p)).toEqual(['crown']);
    expect(newlyDone(p).map((f) => f.id)).toEqual(['piece']);
    markAnnounced(p, 'math:piece');
    st = storyState(p);
    expect(st).toMatchObject({ pieces: 1, chapter: 2, zone: 'words' });
    expect(chapterMissions(p, 'words')[0].title).toBe('Talk to Owl Librarian');
    expect(claimFinale(p)).toBe(false);
    for (const z of ['words', 'code', 'bible']) { finishChapter(p, z, map); p.world.bosses[z] = { defeated: true, attempts: 1 }; }
    st = storyState(p);
    expect(st).toMatchObject({ pieces: 4, complete: true, next: null, finale: false });
    expect(mentorLines(p)[0]).toContain('every piece');
    const coins = p.coins;
    expect(claimFinale(p)).toBe(true);
    expect(p.coins).toBe(coins + FINALE_COINS);
    expect(claimFinale(p)).toBe(false);
    expect(BADGES.find((b) => b.id === 'bell-ringer').test(p)).toBe(true);
    expect(signpostLine(p)).toContain('whole again');
    expect(clueFor(p)).toBeNull();
    ensureStory({});
    expect(ERRANDS.length).toBeGreaterThan(0);
  });
});
