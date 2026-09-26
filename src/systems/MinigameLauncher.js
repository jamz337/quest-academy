// The one place that knows how a mini-game is started and how control returns to the caller.
import { SCENES } from '../constants.js';
import { getGame } from '../data/minigames.js';
import { bandFor } from '../data/grades.js';
import * as Store from './Store.js';
import { applyResult } from './Progression.js';
import * as Cloud from './Cloud.js';

/**
 * Launch a mini-game on top of `fromScene`, which is paused (not stopped) so it keeps its state.
 * opts: { source: 'roam'|'challenge', context: { npcId?, zoneId?, levelId? }, seed? }
 */
export function launch(fromScene, gameId, opts = {}) {
  const game = getGame(gameId);
  if (!game) throw new Error('Unknown game ' + gameId);
  const profile = Store.getProfile();
  const payload = {
    gameId, sceneKey: game.sceneKey, title: game.title, subject: game.subject,
    grade: profile.grade, band: bandFor(profile.grade),
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
  if (!result.aborted) { Store.persist(); Cloud.postResult(profile, payload, result); }
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
