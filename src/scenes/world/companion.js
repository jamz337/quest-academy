// Mango the green monkey: not a follower but a visitor. He scampers in when a mission of the Academy Bell is
// completed, cheers, and leaves again; and every few minutes he drops by with a clue for the next step.
// Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { COMPANION, newlyDone, markAnnounced, storyState, clueFor } from '../../data/world/story.js';

const STAY_MS = 3400;             // how long Mango stays after speaking
const CLUE_EVERY_MS = [110000, 170000];   // a clue every two to three minutes of exploring
const HOP = 28;                   // px beside the player where he lands

export function createCompanion(w) {
  w.mango = null;
  w.mangoQueue = [];
  w.nextClueAt = Date.now() + CLUE_EVERY_MS[0] + Math.random() * (CLUE_EVERY_MS[1] - CLUE_EVERY_MS[0]);
  w.clueTimer = w.time.addEvent({ delay: 5000, loop: true, callback: () => maybeClue(w) });
}

/** The first visit, right after the tale: a wave and the way to the first land. */
export function showCompanion(w) { mangoVisit(w, 'Let us go! Math Meadow is to the west.', { accent: THEME.success }); }

/** Kept for the world's update loop: Mango stays where he landed, nothing to do per frame. */
export function updateCompanion() {}

/** Mango's lines go on the Hud, so they are readable at any zoom. */
export function companionSay(w, line, opts = {}) {
  w.say(`🐒 ${COMPANION.name}: ${line}`, { accent: THEME.success, duration: 3200, ...opts });
}

/** Queue a visit: Mango hops in beside the player, says the line, waits, and hops away. */
export function mangoVisit(w, line, opts = {}) {
  w.mangoQueue.push({ line, opts });
  if (!w.mango) nextVisit(w);
}

function nextVisit(w) {
  const v = w.mangoQueue.shift();
  if (!v || !w.player || !w.textures.exists(COMPANION.key)) return;
  const side = w.player.x > w.map.width * TILE / 2 ? -1 : 1;   // arrive from the roomier side
  const from = { x: w.player.x + side * 110, y: w.player.y + 6 }, to = { x: w.player.x + side * HOP, y: w.player.y + 6 };
  const c = w.add.sprite(from.x, from.y, COMPANION.key, 0).setDepth(9).setAlpha(0).setFlipX(side > 0);
  w.mango = c;
  c.anims.play(`${COMPANION.key}-walk`, true);
  w.tweens.add({ targets: c, alpha: 1, duration: 200 });
  w.tweens.add({ targets: c, x: to.x, duration: 650, ease: 'Sine.Out' });
  w.tweens.add({ targets: c, y: to.y - 14, duration: 160, yoyo: true, repeat: 3, ease: 'Sine.Out' });   // four little hops
  w.time.delayedCall(680, () => {
    if (!c.active) return;
    c.setFlipX(side < 0);   // turn to face the player
    if (v.opts.sound === 'unlock') Sfx.unlock(); else Sfx.pop();
    companionSay(w, v.line, v.opts);
  });
  w.time.delayedCall(680 + STAY_MS, () => {
    if (!c.active) { w.mango = null; nextVisit(w); return; }
    c.setFlipX(side > 0);
    w.tweens.add({ targets: c, x: from.x, alpha: 0, duration: 600, ease: 'Sine.In', onComplete: () => { if (c.active) c.destroy(); w.mango = null; nextVisit(w); } });
    w.tweens.add({ targets: c, y: to.y - 12, duration: 150, yoyo: true, repeat: 3, ease: 'Sine.Out' });
  });
}

/**
 * Announce every mission that has just been completed (called about once a second from the world's tick):
 * one visit per mission, in order. Returns how many were queued.
 */
export function announceStory(w) {
  const p = Store.getProfile();
  if (!p || !p.story || !p.story.started) return 0;
  const hud = w.hud();
  if (hud && hud.blocking) return 0;   // wait until the dialog or panel is closed
  const fresh = newlyDone(p);
  if (!fresh.length) return 0;
  Store.updateProfile((q) => fresh.forEach((f) => markAnnounced(q, f.key)));
  fresh.slice(0, 3).forEach((f) => mangoVisit(w, f.line, f.id === 'piece' || f.id === 'ready' ? { accent: THEME.warning, icon: 'star', sound: 'unlock' } : {}));
  w.nextClueAt = Date.now() + CLUE_EVERY_MS[0];   // no clue right after a cheer
  return fresh.length;
}

/** Every few minutes, if the story is on and nothing else is happening, Mango drops by with a clue. */
export function maybeClue(w) {
  const p = Store.getProfile();
  if (!p || !p.story || !p.story.started || w.mango || Date.now() < w.nextClueAt) return;
  const hud = w.hud();
  if (hud && hud.blocking) return;
  const clue = clueFor(p);
  if (!clue) return;
  w.nextClueAt = Date.now() + CLUE_EVERY_MS[0] + Math.random() * (CLUE_EVERY_MS[1] - CLUE_EVERY_MS[0]);
  mangoVisit(w, clue, { accent: THEME.brand });
}

export function destroyCompanion(w) {
  try { if (w.clueTimer) w.clueTimer.remove(false); } catch { /* clock gone */ }
  w.clueTimer = null; w.mango = null; w.mangoQueue = [];
}

export { storyState };
