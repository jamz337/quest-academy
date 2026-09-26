// Zone quests: the checklist a player completes in a zone before its boss will fight, and the rule for
// which zones are open. Pure data over the profile so the Hud, gates, signpost and tests all agree.
import { NPCS } from './npcs.js';
import { BOSSES, bossForZone } from './bosses.js';
import { gamesForSubject } from '../minigames.js';
import { ZONE_NAMES, buildMap, zoneAt } from './map.js';

export const ZONE_ORDER = ['math', 'words', 'code', 'bible'];
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
  const starred = zoneGames.filter((g) => (games[g.id]?.bestStars || 0) >= 1).length;
  const coins = zoneCoins(zone);
  const found = coins.filter((i) => (world.coinsCollected || []).includes(i)).length;
  const boss = bossForZone(zone);
  const quests = [
    { id: 'meet', title: `Meet the ${ZONE_NAMES[zone]} villagers`, count: talked, total: villagers.length },
    { id: 'stars', title: 'Earn a star in each game here', count: starred, total: zoneGames.length },
    { id: 'coins', title: 'Find the hidden coins', count: found, total: coins.length }
  ].map((q) => ({ ...q, done: q.count >= q.total }));
  if (boss) quests.push({ id: 'boss', title: `Defeat ${boss.name}`, count: bossDefeated(p, zone) ? 1 : 0, total: 1, done: bossDefeated(p, zone) });
  return quests;
}

/** True once every non-boss quest in the zone is complete. */
export const bossReady = (profile, zone) => zoneQuests(profile, zone).filter((q) => q.id !== 'boss').every((q) => q.done);

/** Zone whose gate `zone` opens (the previous zone in ZONE_ORDER), or null for the first zone. */
export const zoneBefore = (zone) => ZONE_ORDER[ZONE_ORDER.indexOf(zone) - 1] || null;

/** Locked-gate message: what the player still has to do to open `zone`. */
export function gateHint(profile, zone) {
  const prev = zoneBefore(zone);
  const boss = prev && bossForZone(prev);
  if (!boss) return 'This gate is locked.';
  if (bossReady(profile, prev)) return `Defeat ${boss.name} in ${ZONE_NAMES[prev]} to open ${ZONE_NAMES[zone]}`;
  const left = zoneQuests(profile, prev).filter((q) => !q.done && q.id !== 'boss');
  return `Finish the ${ZONE_NAMES[prev]} quests to wake its boss: ${left.map((q) => q.title.toLowerCase()).join(', ')}`;
}

/** The zone the player is working on: the first in order that is not cleared, else the last. */
export function activeZone(profile) {
  return ZONE_ORDER.find((z) => !bossDefeated(profile, z)) || ZONE_ORDER[ZONE_ORDER.length - 1];
}

export const allBossesDefeated = (profile) => BOSSES.every((b) => bossDefeated(profile, b.zone));
