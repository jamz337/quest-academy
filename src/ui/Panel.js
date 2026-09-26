import { THEME, drawShadow } from './theme.js';
import { mulberry32 } from '../systems/Rng.js';

/** Rounded surface with a soft shadow. Returns the Graphics object (origin at its top-left x,y). */
export function panel(scene, x, y, w, h, opts = {}) {
  const { color = THEME.surface, alpha = 1, radius = THEME.radius.lg, stroke = null, strokeWidth = 2, shadow = 'md' } = opts;
  const g = scene.add.graphics();
  const r = Math.min(radius, Math.min(w, h) / 2);
  if (alpha >= 0.9) drawShadow(g, x, y, w, h, r, shadow);
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  if (stroke !== null) {
    g.lineStyle(strokeWidth, stroke, 1);
    g.strokeRoundedRect(x + strokeWidth / 2, y + strokeWidth / 2, w - strokeWidth, h - strokeWidth, Math.max(2, r - strokeWidth / 2));
  }
  return g;
}

/** Full-screen translucent layer that swallows input beneath overlays. */
export function dimmer(scene, alpha = 0.35, color = THEME.ink) {
  const { width: w, height: h } = scene.scale;
  return scene.add.rectangle(0, 0, w, h, color, alpha).setOrigin(0).setInteractive();
}

/**
 * Light playful backdrop: cream gradient, two large soft colour blobs and a sprinkle of dots.
 * Cheap to draw (about 40 fills) because scenes redraw it on every rebuild.
 * opts: { accent, accent2, dots }
 */
export function background(scene, opts = {}) {
  const o = typeof opts === 'number' ? { accent: arguments[3] ?? THEME.primary } : opts;   // tolerate the old positional call
  const { accent = THEME.primary, accent2 = THEME.pink, dots = true } = o;
  const { width: w, height: h } = scene.scale;
  const g = scene.add.graphics();
  g.fillGradientStyle(THEME.bg, THEME.bg, THEME.bgBottom, THEME.bgBottom, 1);
  g.fillRect(0, 0, w, h);
  const big = Math.max(w, h);
  g.fillStyle(accent, 0.10); g.fillCircle(w * 0.12, h * 0.08, big * 0.40);
  g.fillStyle(accent2, 0.08); g.fillCircle(w * 0.92, h * 0.90, big * 0.36);
  g.fillStyle(THEME.gold, 0.07); g.fillCircle(w * 0.88, h * 0.16, big * 0.14);
  if (dots) {
    const rnd = mulberry32(3);
    g.fillStyle(THEME.ink, 0.045);
    for (let i = 0; i < 34; i++) g.fillCircle(rnd() * w, rnd() * h, 1.5 + rnd() * 1.5);
  }
  return g;
}

/** Short rounded accent line, used under headings and at the top of cards. */
export function stripe(scene, x, y, w, color, h = 6) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1); g.fillRoundedRect(x, y, w, h, h / 2);
  return g;
}
