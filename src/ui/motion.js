import { THEME } from './theme.js';

/**
 * Animate objects into place on a scene's first build of a "round" (see BaseScene.animateEnter). Otherwise a no-op,
 * so rebuilds caused by resizes or answer highlights do not replay the animation. Objects always end in their final state.
 * opts: from ('up'|'down'|'pop'|'fade'), distance, delay, stagger, duration.
 */
export function enter(scene, targets, opts = {}) {
  const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
  if (!list.length || !scene.animateEnter || !scene.tweens) return;
  const { from = 'up', distance = 18, delay = 0, stagger = THEME.motion.stagger, duration = THEME.motion.enter } = opts;
  list.forEach((t, i) => {
    const cfg = { targets: t, duration, delay: delay + i * stagger, ease: from === 'pop' ? 'Back.Out' : 'Cubic.Out' };
    if (from === 'pop') {
      const sx = t.scaleX ?? 1, sy = t.scaleY ?? 1;
      t.setScale(sx * 0.85, sy * 0.85); cfg.scaleX = sx; cfg.scaleY = sy;
    } else if (from === 'up' || from === 'down') {
      const y0 = t.y; t.y = y0 + (from === 'up' ? distance : -distance); cfg.y = y0;
    }
    const a = t.alpha ?? 1;
    t.setAlpha(0); cfg.alpha = a;
    scene.tweens.add(cfg);
  });
}

/** Horizontal wiggle for a wrong answer. */
export function shake(scene, target, dx = 8) {
  if (!target || !scene.tweens) return;
  const x0 = target.x;
  scene.tweens.add({ targets: target, x: x0 + dx, duration: 45, yoyo: true, repeat: 3, ease: 'Sine.InOut', onComplete: () => { if (target.active !== false) target.x = x0; } });
}

/** Quick attention pulse. */
export function pulse(scene, target, scale = 1.06) {
  if (!target || !scene.tweens) return;
  const sx = target.scaleX ?? 1, sy = target.scaleY ?? 1;
  scene.tweens.add({ targets: target, scaleX: sx * scale, scaleY: sy * scale, duration: 120, yoyo: true, ease: 'Sine.InOut' });
}
