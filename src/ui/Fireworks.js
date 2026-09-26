import { THEME } from './theme.js';

const COLOURS = [0xffc531, 0xff6fae, 0x3d8bff, 0x2ec46a, 0xff8f3f, 0x8b5cf6];

/** A few bursts of coloured stars around (x, y). opts: { bursts, spread, depth, texture } */
export function fireworks(scene, x, y, opts = {}) {
  const { bursts = 3, spread = 140, depth = 950, texture = 'star' } = opts;
  if (!scene.add || !scene.add.particles || !scene.textures || !scene.textures.exists(texture)) return;
  for (let i = 0; i < bursts; i++) {
    scene.time.delayedCall(i * 280, () => {
      if (!scene.sys || !scene.sys.isActive()) return;
      const px = x + (Math.random() - 0.5) * spread * 2, py = y + (Math.random() - 0.5) * spread;
      const em = scene.add.particles(px, py, texture, {
        speed: { min: 90, max: 280 }, angle: { min: 0, max: 360 }, scale: { start: 0.32, end: 0 }, alpha: { start: 1, end: 0 },
        lifespan: 950, gravityY: 260, rotate: { min: 0, max: 360 }, tint: COLOURS, emitting: false
      }).setDepth(depth);
      em.explode(20, 0, 0);
      scene.time.delayedCall(1300, () => { if (em.active) em.destroy(); });
    });
  }
}

/**
 * A star that appears at (x, y), swells with a glow, then sails to (tx, ty) and settles at `size` px.
 * Calls onArrive() when it lands. Used when a house earns a new star.
 */
export function starPop(scene, x, y, tx, ty, size, onArrive, depth = 40) {
  const glow = scene.add.circle(x, y, 4, THEME.gold, 0.35).setDepth(depth - 1);
  const star = scene.add.image(x, y, 'star').setDisplaySize(6, 6).setDepth(depth);
  scene.tweens.add({ targets: glow, radius: 26, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => glow.destroy() });
  scene.tweens.add({
    targets: star, displayWidth: size * 2.2, displayHeight: size * 2.2, angle: 360, duration: 550, ease: 'Back.easeOut',
    onComplete: () => scene.tweens.add({
      targets: star, x: tx, y: ty, displayWidth: size, displayHeight: size, duration: 750, ease: 'Cubic.easeInOut',
      onComplete: () => { star.destroy(); if (onArrive) onArrive(); }
    })
  });
}
