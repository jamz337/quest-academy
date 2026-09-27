// The one place that knows how a mini-game is started and how control returns to the caller.
import { SCENES } from '../constants.js';
import { getGame } from '../data/minigames.js';
import { getBoss } from '../data/world/bosses.js';
import { duelFor, isDuelId, DUEL_PREFIX } from '../data/world/duels.js';
import { bandFor } from '../data/grades.js';
import * as Store from './Store.js';
import { applyResult, effectiveGrade, gameGrade, mastery, nextHouseLevel } from './Progression.js';
import * as Cloud from './Cloud.js';
import { addFamilyStars, claimFamily } from './Goals.js';

export const DUEL_SCENE = 'MG_Duel';   // villager duels and boss fights share one screen
export const BOSS_SCENE = DUEL_SCENE;

/**
 * Launch a mini-game, a villager duel ('duel:<npcId>') or a boss fight (by boss id) on top of `fromScene`, which is paused (not stopped) so
 * it keeps its state. The payload's grade is the player's grade plus the grade-ups the game has earned by being
 * finished (see Progression.gameGrade); a boss plays at the grade every game of its subject has reached.
 * opts: { source: 'roam'|'challenge', context: { npcId?, zoneId?, levelId? }, seed? }
 */
export function launch(fromScene, gameId, opts = {}) {
  const game = getGame(gameId);
  const duel = !game && isDuelId(gameId) ? duelFor(gameId.slice(DUEL_PREFIX.length)) : null;
  const boss = game || duel ? null : getBoss(gameId);
  if (!game && !duel && !boss) throw new Error('Unknown game ' + gameId);
  const profile = Store.getProfile();
  const subject = (game || duel || boss).subject;
  // House level 1-3 (from the villager, or the next unpassed one): same grade throughout, a quicker pace each level.
  const level = game ? Math.max(1, Math.min(3, (opts.context && opts.context.level) || nextHouseLevel(profile, gameId))) : 0;
  // A duel asks questions at the grade the villager's own house has reached; a boss at the grade its whole subject has.
  const grade = boss ? effectiveGrade(profile, subject) : duel ? gameGrade(profile, duel.gameId) : gameGrade(profile, gameId);
  const payload = {
    gameId, sceneKey: game ? game.sceneKey : DUEL_SCENE, title: game ? game.title : (duel || boss).name, subject, level: level || undefined,
    grade, band: bandFor(grade), mastery: mastery(profile, subject).level, duel: duel || undefined, boss: boss || undefined, noReview: !!(duel || boss), timers: profile.timers !== 'off',
    source: opts.source || 'challenge', returnTo: fromScene.scene.key,
    context: opts.context || {}, seed: opts.seed
  };
  fromScene.scene.pause();
  fromScene.scene.launch(payload.sceneKey, payload);
  return payload;
}

/** Called by MinigameScene.finish(): score it, save, and show Results. */
export function complete(scene, payload, raw) {
  const profile = Store.getProfile();
  const result = applyResult(profile, payload, raw);
  if (!result.aborted) {
    // The family goal lives on the whole save: every player's stars count, and each collects the bonus once.
    const save = Store.getSave();
    if (save && result.stars) addFamilyStars(save, result.stars);
    if (save) result.familyBonus = claimFamily(save, profile);
    Store.persist(); Cloud.postResult(profile, payload, result);
  }
  scene.scene.start(SCENES.Results, { payload, result });
  return result;
}

/** Quit without saving anything and hand control back to the caller. */
export function abort(scene, payload) {
  scene.scene.stop();
  returnToCaller(scene, payload, { aborted: true, gameId: payload.gameId });
}

/** Resume the scene that launched the game and tell it what happened. */
export function returnToCaller(scene, payload, result) {
  const mgr = scene.scene;
  mgr.stop(scene.scene.key);
  if (mgr.isSleeping(SCENES.Hud)) mgr.wake(SCENES.Hud);
  const caller = mgr.get(payload.returnTo);
  if (caller) caller.events.emit('minigame:done', { payload, result });
  if (mgr.isPaused(payload.returnTo)) mgr.resume(payload.returnTo);
  else if (!mgr.isActive(payload.returnTo)) mgr.start(payload.returnTo);
}
