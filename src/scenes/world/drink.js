// After the market: the player drinks what they just bought (mango juice, coconut water…). The drink is lifted
// to their mouth, tipped back with a few gulps, and leaves a little sparkle. It follows the player if they walk off.
// Works in any walking scene that has `player`, `say(msg, opts)` and the 'sparkle' texture (the world, the house).
import { getItem } from '../../data/market/items.js';
import { IDLE_FRAMES } from '../../ui/LpcCharacter.js';
import { Sfx } from '../../systems/Audio.js';

const LINES = ['Ahh! That hit the spot.', 'Mmm, so cool and sweet!', 'Glug glug… lovely!', 'Just what I needed!'];

/** The drinks among the ids bought on this market visit (in the order bought). */
export const drinksIn = (ids) => (ids || []).map(getItem).filter((it) => it && it.drink);

/** Play the drinking scene for the last drink bought. `data` is the 'market:done' payload ({ bought: [ids] }). */
export function drinkUp(scene, data) {
  const drinks = drinksIn(data && data.bought);
  const item = drinks[drinks.length - 1], player = scene.player;
  if (!item || !player || !player.active || !scene.tweens) return false;
  scene.time.delayedCall(450, () => {   // once the market has faded away
    if (!player.active) return;
    if (player.anims) player.anims.stop();
    player.setFrame(IDLE_FRAMES.down);
    // The drink starts in their hand, rises to their mouth and tips back.
    const o = { dx: 9, dy: 7, angle: 0, alpha: 0 };
    const cup = scene.add.text(player.x, player.y, item.icon, { fontSize: '9px' }).setOrigin(0.5).setDepth(player.depth + 1).setResolution(6);
    const follow = () => { if (cup.active && player.active) cup.setPosition(player.x + o.dx, player.y + o.dy).setAngle(o.angle).setAlpha(o.alpha); };
    scene.events.on('update', follow);
    const done = () => { scene.events.off('update', follow); if (cup.active) cup.destroy(); };
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
        Sfx.pop();
        for (let i = 0; i < 6; i++) {   // a refreshed sparkle
          const a = (i / 6) * Math.PI * 2;
          const s = scene.add.image(player.x, player.y - 6, 'sparkle').setDisplaySize(7, 7).setDepth(player.depth + 1);
          scene.tweens.add({ targets: s, x: player.x + Math.cos(a) * 18, y: player.y - 8 + Math.sin(a) * 14, alpha: 0, angle: 180, duration: 650, ease: 'Cubic.Out', onComplete: () => s.destroy() });
        }
        if (typeof scene.say === 'function') scene.say(`${item.icon} ${LINES[Math.floor(Math.random() * LINES.length)]}`, {});
      }
    });
  });
  return true;
}
