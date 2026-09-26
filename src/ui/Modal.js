import { THEME } from './theme.js';
import { uiScale, viewport } from '../systems/Layout.js';
import { panel, dimmer } from './Panel.js';
import { T, text } from './TextStyles.js';
import { enter } from './motion.js';

/**
 * Centred card for dialogs and forms: optional dim layer, large radius, big soft shadow, accent handle and title.
 * opts: w, h (already scaled by the caller), title, accent, dim, dimAlpha, depth, y (top override).
 * Returns { x, y, w, h, panel, title, contentTop }.
 */
export function modal(scene, opts = {}) {
  const { w, h, title = null, accent = null, dim = true, dimAlpha = 0.35, depth = null, y: yTop } = opts;
  const s = uiScale(scene);
  const { w: W, h: H } = viewport(scene);
  const pw = Math.min(W - 24, w);
  const ph = yTop !== undefined ? Math.min(H - yTop - 12, h) : Math.min(H - 24, h);
  const x = (W - pw) / 2, y = yTop !== undefined ? yTop : (H - ph) / 2;
  if (dim) { const d = dimmer(scene, dimAlpha); if (depth !== null) d.setDepth(depth); }
  const p = panel(scene, x, y, pw, ph, { shadow: 'lg', radius: THEME.radius.xl });
  if (depth !== null) p.setDepth(depth + 1);
  if (accent !== null) { p.fillStyle(accent, 1); p.fillRoundedRect(x + pw / 2 - 24 * s, y + 12 * s, 48 * s, 5 * s, 2.5 * s); }
  let titleText = null, contentTop = y + 28 * s;
  if (title) {
    titleText = text(scene, x + pw / 2, y + 40 * s, title, T.heading(scene));
    if (depth !== null) titleText.setDepth(depth + 2);
    contentTop = y + 68 * s;
  }
  enter(scene, [p, titleText], { from: 'up', distance: 14, stagger: 0 });
  return { x, y, w: pw, h: ph, panel: p, title: titleText, contentTop, depth };
}
