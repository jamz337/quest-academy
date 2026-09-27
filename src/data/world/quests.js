// Zone quests: the checklist a player completes in a zone before its boss will fight, and the rule for
// which zones are open. Pure data over the profile so the Hud, gates, signpost and tests all agree.
import { NPCS } from './npcs.js';
import { BOSSES, bossForZone } from './bosses.js';
import { gamesForSubject } from '../minigames.js';
import { houseStars, HOUSE_LEVELS } from '../../systems/Progression.js';
import { activeErrand, errandLine, errandFor, errandState } from './errands.js';
import { duelsWon, duelVillagers } from './duels.js';
import { ZONE_NAMES, buildMap, zoneAt } from './map.js';

export const ZONE_ORDER = ['math', 'words', 'code', 'bible'];
/** The villager who guides each chapter of the Academy Bell story (see story.js); their errand is a quest. */
export const ZONE_GUIDE = { math: 'prof-plus', words: 'owl-librarian', code: 'robo-mechanic', bible: 'shepherd' };
const SUBJECT_OF_ZONE = { math: 'math', words: 'words', code: 'code', bible: 'bible' };

let coinIndexByZone = null;
/** Indices into map.coins per zone, computed once (the map is deterministic). */
function zoneCoins(zone) {
  if (!coinIndexByZone) {
    const map = buildMap();
    coinIndexByZone = {};
    map.coins.forEach((c, i) => { const z = zoneAt(map, c.tx, c.ty); if (z) (coinIndexByZone[z] ||= []).push(i); });
  }
  return coinIndexByZone[zone] || [];
}

export const bossDefeated = (profile, zone) => !!profile?.world?.bosses?.[zone]?.defeated;

/**
 * The quests of a zone: [{ id, title, done, count, total }]. The boss quest is last and only counts as
 * available once every other quest is done.
 */
export function zoneQuests(profile, zone) {
  const p = profile || {};
  const world = p.world || {};
  const games = p.games || {};
  const villagers = NPCS.filter((n) => n.zone === zone && n.gameId);
  const talked = villagers.filter((n) => (world.npcsTalked || []).includes(n.id)).length;
  const zoneGames = gamesForSubject(SUBJECT_OF_ZONE[zone]);
  const finished = zoneGames.filter((g) => houseStars(p, g.id) >= HOUSE_LEVELS).length;
  const coins = zoneCoins(zone);
  const found = coins.filter((i) => (world.coinsCollected || []).includes(i)).length;
  const boss = bossForZone(zone);
  const guide = NPCS.find((n) => n.id === ZONE_GUIDE[zone]), errand = guide ? errandFor(guide.id) : null;
  const quests = [
    { id: 'meet', title: `Meet the ${ZONE_NAMES[zone]} villagers`, count: talked, total: villagers.length },
    { id: 'stars', title: `Pass all ${HOUSE_LEVELS} levels at each house`, count: finished, total: zoneGames.length },
    { id: 'duels', title: 'Win a duel with each villager', count: duelsWon(p, zone), total: duelVillagers(zone).length },
    ...(errand ? [{ id: 'errand', title: `Run ${guide.name}'s errand: fetch the ${errand.item}`, count: errandState(p, errand.id) === 'done' ? 1 : 0, total: 1 }] : []),
    { id: 'coins', title: 'Find the hidden coins', count: found, total: coins.length }
  ].map((q) => ({ ...q, done: q.count >= q.total }));
  if (boss) quests.push({ id: 'boss', title: `Defeat ${boss.name}`, count: bossDefeated(p, zone) ? 1 : 0, total: 1, done: bossDefeated(p, zone) });
  return quests;
}

/** True once every non-boss quest in the zone is complete. */
export const bossReady = (profile, zone) => zoneQuests(profile, zone).filter((q) => q.id !== 'boss').every((q) => q.done);

/** The zone the player is working on: the first in order that is not cleared, else the last. */
export function activeZone(profile) {
  return ZONE_ORDER.find((z) => !bossDefeated(profile, z)) || ZONE_ORDER[ZONE_ORDER.length - 1];
}

export const allBossesDefeated = (profile) => BOSSES.every((b) => bossDefeated(profile, b.zone));
