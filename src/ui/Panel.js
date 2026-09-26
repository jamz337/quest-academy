import { C } from '../constants.js';
import { mulberry32 } from '../systems/Rng.js';

/** Rounded rectangle panel with a drop shadow and a soft top sheen. Returns the Graphics object (origin at its top-left x,y). */
export function panel(scene, x, y, w, h, opts = {}) {
  const { color = C.panel, alpha = 1, radius = 16, stroke = null, strokeWidth = 3, shadow = alpha >= 0.9 } = opts;
  const g = scene.add.graphics();
  if (shadow) { g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x, y + 5, w, h, radius); }
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  if (h >= 60) { g.fillStyle(0xffffff, 0.05); g.fillRoundedRect(x + 3, y + 3, w - 6, Math.min(h * 0.3, 60), Math.max(4, radius - 3)); }
  if (stroke !== null) { g.lineStyle(strokeWidth, stroke, 1); g.strokeRoundedRect(x, y, w, h, radius); }
  return g;
}

/** Full-screen dim layer that swallows input beneath overlays. */
export function dimmer(scene, alpha = 0.6) {
  const { width: w, height: h } = scene.scale;
  const r = scene.add.rectangle(0, 0, w, h, 0x000000, alpha).setOrigin(0).setInteractive();
  return r;
}

function sparkle(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y - s); g.lineTo(x + s * 0.22, y - s * 0.22); g.lineTo(x + s, y); g.lineTo(x + s * 0.22, y + s * 0.22);
  g.lineTo(x, y + s); g.lineTo(x - s * 0.22, y + s * 0.22); g.lineTo(x - s, y); g.lineTo(x - s * 0.22, y - s * 0.22);
  g.closePath(); g.fillPath();
}

/** Night-sky menu backdrop: gradient, soft coloured glows, specks, sparkles and dark hills along the bottom. */
export function background(scene, top = C.navy, bottom = C.panelDark, accent = null) {
  const { width: w, height: h } = scene.scale;
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, w, h);
  const big = Math.max(w, h);
  const glows = [[0.12, 0.18, 0.32, accent ?? C.blue], [0.88, 0.72, 0.36, accent ?? C.purple], [0.68, 0.1, 0.2, C.pink]];
  for (const [fx, fy, fr, col] of glows) {
    for (let i = 4; i >= 1; i--) { g.fillStyle(col, 0.035); g.fillCircle(fx * w, fy * h, fr * big * i / 4); }
  }
  const rnd = mulberry32(3);
  for (let i = 0; i < 46; i++) { g.fillStyle(0xffffff, 0.07 + rnd() * 0.16); g.fillCircle(rnd() * w, rnd() * h, 1 + rnd() * 2); }
  for (let i = 0; i < 9; i++) { g.fillStyle(0xffffff, 0.18 + rnd() * 0.2); sparkle(g, rnd() * w, rnd() * h * 0.8, 4 + rnd() * 6); }
  g.fillStyle(0x000000, 0.16);
  g.fillEllipse(w * 0.22, h + 40, w * 0.95, 170);
  g.fillEllipse(w * 0.82, h + 55, w * 1.0, 200);
  return g;
}
