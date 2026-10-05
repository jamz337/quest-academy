// Musical counting on Math Meadow's Number Trail. Every stepping stone plays its note and says its number as
// the player steps on it. Counting in order (1 up to 10, or 10 back down to 1) keeps the stones lit; reaching the
// end plays the whole tune, and pays a few coins the first time each day. Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { speak, canSpeak } from '../../systems/Speech.js';
import { dayKey } from '../../data/world/encounters.js';
import { reward } from './encounters.js';

export const TRAIL_COINS = 10;
const GOLD = 0xffc531;

/** A fresh count: nothing lit, no direction yet. */
export const newCount = () => ({ dir: 0, last: 0, lit: [] });

/**
 * Step onto stone `n` of `max`. Returns the new count and what happened: 'start' (1 or `max` begins a count),
 * 'next' (the right stone), 'done' (the last stone of a count), 'same' (still on it) or 'lost' (out of order: the
 * count starts again, or from this stone when it is an end stone).
 */
export function stepOn(count, n, max = 10) {
  if (n === count.last) return { count, event: 'same' };
  if (count.dir && n === count.last + count.dir) {
    const next = { dir: count.dir, last: n, lit: [...count.lit, n] };
    return n === (count.dir > 0 ? max : 1) ? { count: next, event: 'done' } : { count: next, event: 'next' };
  }
  if (n === 1 || n === max) return { count: { dir: n === 1 ? 1 : -1, last: n, lit: [n] }, event: 'start' };
  return { count: newCount(), event: 'lost' };
}

/** A gold glow under each stone's number, hidden until the stone is lit. */
export function createTrail(w) {
  w.trailCount = newCount();
  w.trailTile = null;
  w.trailGlow = {};
  for (const s of w.map.trail || []) {
    w.trailGlow[s.n] = w.add.ellipse((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE - 0.5, 18.5, 15.5, GOLD, 1).setDepth(1.4).setAlpha(0);
  }
}

function showLit(w, lit) {
  for (const [n, glow] of Object.entries(w.trailGlow || {})) {
    if (!glow.active) continue;
    const on = lit.includes(Number(n));
    if (on !== glow.alpha > 0.5) w.tweens.add({ targets: glow, alpha: on ? 1 : 0, duration: on ? 120 : 500 });
  }
}

/** A ring that spreads from the stone just stepped on. */
function ripple(w, s, colour = GOLD) {
  const r = w.add.ellipse((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, 20, 17).setStrokeStyle(2, colour, 1).setDepth(1.6);
  w.tweens.add({ targets: r, scale: 2.4, alpha: 0, duration: 520, ease: 'Cubic.Out', onComplete: () => r.destroy() });
}

/** Called from the world's tick with the player's tile. */
export function trailTick(w, tx, ty) {
  const tile = `${tx},${ty}`;
  if (tile === w.trailTile) return;
  w.trailTile = tile;
  const stones = w.map.trail || [];
  const s = stones.find((st) => st.tx === tx && st.ty === ty);
  if (!s || !w.trailGlow) return;
  const hud = w.hud();
  if (hud && hud.blocking) return;
  const { count, event } = stepOn(w.trailCount || newCount(), s.n, stones.length);
  w.trailCount = count;
  Sfx.note(s.n);
  if (canSpeak()) speak(String(s.n), { rate: 1 });
  ripple(w, s, event === 'lost' ? 0xffffff : GOLD);
  showLit(w, event === 'lost' ? [] : count.lit);
  if (event !== 'done') return;
  // The whole trail, counted in order: the tune, and coins the first time today.
  const down = count.dir < 0;
  w.time.delayedCall(450, () => Sfx.scale(down));
  stones.forEach((st, i) => w.time.delayedCall(450 + (down ? stones.length - 1 - i : i) * 110, () => ripple(w, st)));
  const day = dayKey();
  let paid = false;
  Store.updateProfile((p) => {
    p.world ||= {};
    if (!p.world.trail || p.world.trail.day !== day) { p.world.trail = { day }; paid = true; }
  });
  if (paid) reward(w, { coins: TRAIL_COINS });
  const line = down ? 'You counted back from 10 to 1!' : 'You counted from 1 to 10!';
  w.say(paid ? `🎵 ${line}  +${TRAIL_COINS} coins` : `🎵 ${line}`, { icon: 'star' });
  w.time.delayedCall(2600, () => { if (w.trailCount === count) { w.trailCount = newCount(); showLit(w, []); } });
}
