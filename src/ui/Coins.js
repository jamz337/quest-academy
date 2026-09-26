import { Sfx } from '../systems/Audio.js';

/**
 * Coins that fly from `from` to `to` one after another. Up to 10 coin sprites stand for `amount` coins;
 * onLand(value) is called as each lands with the coins it represents, onDone() after the last.
 */
export function flyCoins(scene, from, to, amount, { onLand = null, onDone = null, depth = 700 } = {}) {
  const count = Math.max(1, Math.min(10, amount | 0));
  const per = Math.floor(amount / count), extra = amount - per * count;
  let landed = 0;
  for (let i = 0; i < count; i++) {
    const c = scene.add.image(from.x + (Math.random() - 0.5) * 40, from.y + (Math.random() - 0.5) * 24, 'coin').setDisplaySize(26, 26).setDepth(depth).setAlpha(0);
    scene.tweens.add({ targets: c, alpha: 1, displayWidth: 30, displayHeight: 30, duration: 160, delay: i * 70 });
    scene.tweens.add({
      targets: c, x: to.x, y: to.y, displayWidth: 18, displayHeight: 18, duration: 520, delay: 180 + i * 70, ease: 'Cubic.easeIn',
      onComplete: () => {
        c.destroy();
        landed += 1;
        if (landed === count) Sfx.coin(); else Sfx.click();
        if (onLand) onLand(per + (i < extra ? 1 : 0));
        if (landed === count && onDone) onDone();
      }
    });
  }
}
