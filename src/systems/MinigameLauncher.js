// The one place that knows how a mini-game is started and how control returns to the caller.
import { SCENES } from '../constants.js';
import { getGame } from '../data/minigames.js';
import { getBoss } from '../data/world/bosses.js';
import { bandFor } from '../data/grades.js';
import * as Store from './Store.js';
import { applyResult, effectiveGrade, mastery } from './Progression.js';
import * as Cloud from './Cloud.js';
import { addFamilyStars, claimFamily } from './Goals.js';

export const BOSS_SCENE = 'MG_Boss';

/**
 * Launch a mini-game (or a boss fight, by boss id) on top of `fromScene`, which is paused (not stopped) so
 * it keeps its state. The payload's grade/band come from the player's mastery in the subject, so games get
 * harder as they improve; bosses play one grade above that.
 * opts: { source: 'roam'|'challenge', context: { npcId?, zoneId?, levelId? }, seed? }
 */
export function launch(fromScene, gameId, opts = {}) {
  const game = getGame(gameId), boss = game ? null : getBoss(gameId);
  if (!game && !boss) throw new Error('Unknown game ' + gameId);
  const profile = Store.getProfile();
  const subject = (game || boss).subject;
  const grade = effectiveGrade(profile, subject, boss ? 1 : 0);
  const payload = {
    gameId, sceneKey: game ? game.sceneKey : BOSS_SCENE, title: game ? game.title : boss.name, subject,
    grade, band: bandFor(grade), mastery: mastery(profile, subject).level, boss: boss || undefined, timers: profile.timers !== 'off',
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
