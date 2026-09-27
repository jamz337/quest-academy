// Duels: any villager with a game can be challenged to a question duel (see scenes/minigames/DuelScene.js).
// Pure data over the profile so the world, quests, story and tests agree on who has been beaten.
import { NPCS, getNpc } from './npcs.js';
import { getGame } from '../minigames.js';

/** Tuning for villager duels. Bosses keep their own hp/hearts/timer from bosses.js. */
export const DUEL = { npcHp: 5, playerHp: 3, mangoHp: 2, logicUses: 3, timeFactor: 1.5, playerProp: '🧭' };

export const DUEL_PREFIX = 'duel:';
export const isDuelId = (id) => typeof id === 'string' && id.startsWith(DUEL_PREFIX);
export const duelId = (npcId) => DUEL_PREFIX + npcId;

/**
 * Launch descriptor for a duel with a villager, or null when they cannot duel (no game, or the market).
 * { npcId, name, subject, gameId, sprite, prop, voice, pitch, rate, hp, win, lose, challenge }
 */
export function duelFor(npcId) {
  const npc = getNpc(npcId);
  if (!npc || !npc.gameId || npc.market) return null;
  const game = getGame(npc.gameId);
  if (!game) return null;
  const d = npc.duel || {};
  return {
    npcId: npc.id, name: npc.name, subject: game.subject, gameId: game.id, sprite: npc.sprite, prop: d.prop || '❓',
    voice: npc.voice, pitch: npc.pitch, rate: npc.rate, hp: DUEL.npcHp,
    challenge: d.challenge || 'Or challenge me to a duel, if you dare!',
    win: d.win || `${npc.name} bows: you win the duel!`,
    lose: d.lose || `${npc.name} wins this round. Try again!`
  };
}

export const duelRecord = (profile, npcId) => profile?.world?.duels?.[npcId] || null;
export const duelWon = (profile, npcId) => !!duelRecord(profile, npcId)?.won;
/** The villagers of a zone who can be duelled. */
export const duelVillagers = (zone) => NPCS.filter((n) => n.zone === zone && n.gameId && !n.market);
export const duelsWon = (profile, zone) => duelVillagers(zone).filter((n) => duelWon(profile, n.id)).length;
