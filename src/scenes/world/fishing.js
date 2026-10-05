// Fishing from the shore: press the action button facing water to cast. The HUD runs the wait-and-pull
// challenge; the world pays out the catch. Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { TID } from '../../data/world/map.js';
import { dayKey, FISH_MAX_PER_DAY } from '../../data/world/encounters.js';
import { VERSES } from '../../data/bible/bank.js';

/** Is the tile the player stands on beside water (the cove's sea, the village pond, Math Meadow's river)? */
export function besideWater(w, tx, ty) {
  return [[0, 1], [0, -1], [-1, 0], [1, 0]].some(([dx, dy]) => w.map.data[ty + dy] && w.map.data[ty + dy][tx + dx] === TID.water);
}

/**
 * A little fishing rod bobbing over the player's head wherever a line can be cast, so children find out that the
 * action button fishes there. Called from the world's tick with the player's tile.
 */
export function fishCueTick(w, tx, ty) {
  if (!w.fishCue) {
    w.fishCue = w.add.text(0, 0, '🎣', { fontSize: '9px' }).setOrigin(0.5).setDepth(20).setResolution(6).setVisible(false);
    const follow = () => { const c = w.fishCue; if (c && c.active && c.visible && w.player) c.setPosition(w.player.x, w.player.y - 24 + Math.sin(w.time.now / 260) * 1.5); };
    w.events.on('update', follow);
    w.events.once('shutdown', () => { w.events.off('update', follow); w.fishCue = null; });
  }
  const hud = w.hud();
  const show = besideWater(w, tx, ty) && !w.nearNpc && !(hud && hud.blocking);
  if (show && !w.fishCue.visible) w.fishCue.setPosition(w.player.x, w.player.y - 24);
  w.fishCue.setVisible(show);
}

/** Action pressed with nobody near: if the player faces water, cast a line. */
export function tryFishing(w) {
  const tx = Math.floor(w.player.x / TILE), ty = Math.floor(w.player.y / TILE);
  const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[w.facing] || [0, 1];
  const cand = [[tx + dir[0], ty + dir[1]], [tx, ty + 1], [tx, ty - 1], [tx - 1, ty], [tx + 1, ty]];
  const spot = cand.find(([x, y]) => w.map.data[y] && w.map.data[y][x] === TID.water);
  if (!spot) return;
  const hud = w.hud();
  if (!hud || hud.blocking) return;
  const p = Store.getProfile();
  const day = dayKey();
  const rec = p.world.fishing && p.world.fishing.day === day ? p.world.fishing : { day, caught: 0 };
  if (rec.caught >= FISH_MAX_PER_DAY) { Sfx.pop(); w.say('The fish are resting for today. Come back tomorrow!', { accent: THEME.ink3 }); return; }
  w.stopPlayer();
  w.savePosition();
  hud.showFishing({ onCatch: (loot) => landFish(w, loot) });
}

/** A successful pull: pay the loot and, for a bottle, return the message inside. */
export function landFish(w, loot) {
  const day = dayKey();
  Store.updateProfile((p) => {
    if (!p.world.fishing || p.world.fishing.day !== day) p.world.fishing = { day, caught: 0 };
    p.world.fishing.caught += 1;
    p.coins += loot.coins || 0;
  });
  const hud = w.hud();
  if (hud) { hud.setCoins(Store.getProfile().coins); if (loot.coins) hud.awardCoins(loot.coins); }
  if (!loot.message) return null;
  const band = ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
  const v = VERSES[band][Math.floor(Math.random() * VERSES[band].length)];
  return `“${v.t.replace('___', v.a)}” — ${v.ref}`;
}
