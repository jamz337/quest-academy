// Drinking a drink from the market (mango juice, coconut water…) refills the player's hearts. The drink is lifted
// to their mouth, tipped back with a few gulps, and the hearts it gives fly up to the heart counter. It happens
// when the market closes after buying one, or when the player taps the hearts while carrying one.
// Works in any walking scene that has `player`, `hud()`, `say(msg, opts)` and the 'sparkle' texture (world, house).
import { getItem } from '../../data/market/items.js';
import { IDLE_FRAMES } from '../../ui/LpcCharacter.js';
import { Sfx } from '../../systems/Audio.js';
import * as Store from '../../systems/Store.js';
import { snacksOf, useSnack, snackCount } from '../../systems/Market.js';
import { heartsOf, healHearts, heartsFrom, HEARTS_MAX } from '../../systems/Hearts.js';

/** The drinks among the ids bought on this market visit (in the order bought). */
export const drinksIn = (ids) => (ids || []).map(getItem).filter((it) => it && it.drink);

/**
 * The drink to reach for from the bag: the smallest one that fills the missing hearts (so a big drink is not
 * wasted on one heart), or the biggest there is when none is enough. Null when the bag has no drink.
 */
export function drinkInBag(profile) {
  const drinks = snacksOf(profile).map((s) => s.item).filter((it) => it.drink).sort((a, b) => heartsFrom(a) - heartsFrom(b));
  const missing = HEARTS_MAX - heartsOf(profile);
  return drinks.find((it) => heartsFrom(it) >= missing) || drinks[drinks.length - 1] || null;
}

/** After the market: drink what was just bought, if the player is short of hearts (otherwise it stays in the bag). */
export function drinkUp(scene, data) {
  const p = Store.getProfile();
  const bought = drinksIn(data && data.bought).filter((it) => snackCount(p, it.id) > 0);
  const item = bought[bought.length - 1];
  if (!item) return false;
  if (heartsOf(p) >= HEARTS_MAX) {
    scene.time.delayedCall(500, () => { if (typeof scene.say === 'function') scene.say(`${item.icon} Your hearts are full. The ${item.name.toLowerCase()} is in your bag for later.`, {}); });
    return false;
  }
  return drinkNow(scene, item, 450);
}

/** Tapping the hearts: drink one from the bag, or say where to get one. */
export function drinkFromBag(scene) {
  const p = Store.getProfile();
  if (!p || scene.drinking) return false;
  if (heartsOf(p) >= HEARTS_MAX) { if (scene.say) scene.say('♥ Your hearts are full!', {}); return false; }
  const item = drinkInBag(p);
  if (!item) { if (scene.say) scene.say('♥ Out of drinks. Auntie Vee sells them at the market by the fountain!', {}); return false; }
  return drinkNow(scene, item, 0);
}

/** Play the drinking scene for `item`, use one up and refill the hearts it gives. */
export function drinkNow(scene, item, delay = 0) {
  const player = scene.player;
  if (!item || !player || !player.active || !scene.tweens || scene.drinking) return false;
  scene.drinking = true;
  scene.time.delayedCall(delay, () => {
    if (!player.active) { scene.drinking = false; return; }
    if (player.anims) player.anims.stop();
    player.setFrame(IDLE_FRAMES.down);
    // The drink starts in their hand, rises to their mouth and tips back.
    const o = { dx: 9, dy: 7, angle: 0, alpha: 0 };
    const cup = scene.add.text(player.x, player.y, item.icon, { fontSize: '9px' }).setOrigin(0.5).setDepth(player.depth + 1).setResolution(6);
    const follow = () => { if (cup.active && player.active) cup.setPosition(player.x + o.dx, player.y + o.dy).setAngle(o.angle).setAlpha(o.alpha); };
    scene.events.on('update', follow);
    const done = () => { scene.events.off('update', follow); if (cup.active) cup.destroy(); scene.drinking = false; };
    scene.events.once('shutdown', done);
    scene.tweens.chain({
      targets: o,
      tweens: [
        { alpha: 1, duration: 160 },
        { dx: 5, dy: -1, duration: 320, ease: 'Sine.Out' },
        { angle: -55, dy: -3, duration: 260, ease: 'Sine.InOut', onStart: () => Sfx.gulp() },
        { dy: -2, duration: 620 },                                   // gulp, gulp, gulp
        { angle: 0, dx: 9, dy: 6, duration: 260, ease: 'Sine.In' },
        { alpha: 0, duration: 200 }
      ],
      onComplete: () => {
        done();
        if (!player.active) return;
        // The drink is used up and its hearts come back.
        let gained = 0;
        Store.updateProfile((p) => { if (useSnack(p, item.id)) gained = healHearts(p, heartsFrom(item)); });
        Sfx.pop();
        for (let i = 0; i < 6; i++) {   // a refreshed sparkle
          const a = (i / 6) * Math.PI * 2;
          const s = scene.add.image(player.x, player.y - 6, 'sparkle').setDisplaySize(7, 7).setDepth(player.depth + 1);
          scene.tweens.add({ targets: s, x: player.x + Math.cos(a) * 18, y: player.y - 8 + Math.sin(a) * 14, alpha: 0, angle: 180, duration: 650, ease: 'Cubic.Out', onComplete: () => s.destroy() });
        }
        const hud = typeof scene.hud === 'function' ? scene.hud() : null;
        if (hud && hud.awardHearts) hud.awardHearts(gained);
        if (typeof scene.say === 'function') scene.say(gained ? `${item.icon} Ahh! ${'♥'.repeat(gained)} ${gained === 1 ? 'A heart is' : `${gained} hearts are`} back.` : `${item.icon} Ahh! That hit the spot.`, {});
      }
    });
  });
  return true;
}
