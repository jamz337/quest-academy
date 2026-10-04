import { THEME, drawShadow } from './theme.js';

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
 * Warm paper backdrop with soft blurred colour shapes in the corners.
 * Cheap to draw (about 25 fills) because scenes redraw it on every rebuild.
 * opts: { accent, accent2, dots }
 */
export function background(scene, opts = {}) {
  const o = typeof opts === 'number' ? { accent: arguments[3] ?? THEME.primary } : opts;   // tolerate the old positional call
  const { accent = THEME.primary, accent2 = THEME.pink } = o;   // (the old `dots` option is accepted and ignored)
  const { width: w, height: h } = scene.scale;
  const g = scene.add.graphics();
  g.fillGradientStyle(THEME.bg, THEME.bg, THEME.bgBottom, THEME.bgBottom, 1);
  g.fillRect(0, 0, w, h);
  const m = Math.min(w, h);
  // Soft out-of-focus colour shapes in the corners (rings of fading alpha stand in for a blur).
  const blob = (x, y, r, color, a) => { for (let i = 6; i >= 1; i--) { g.fillStyle(color, a / 6); g.fillCircle(x, y, r * (0.45 + i * 0.11)); } };
  blob(w * 0.02, h * 0.12, m * 0.26, accent, 0.2);
  blob(w * 0.98, h * 0.16, m * 0.22, accent2, 0.2);
  blob(w * 0.04, h * 0.95, m * 0.3, THEME.gold, 0.28);
  blob(w * 0.98, h * 0.94, m * 0.3, 0x7bc47f, 0.24);
  return g;
}

/** Short rounded accent line, used under headings and at the top of cards. */
export function stripe(scene, x, y, w, color, h = 6) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1); g.fillRoundedRect(x, y, w, h, h / 2);
  return g;
}
