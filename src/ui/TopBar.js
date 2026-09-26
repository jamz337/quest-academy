import { THEME } from './theme.js';
import { uiScale, safeArea } from '../systems/Layout.js';
import { T, text } from './TextStyles.js';
import { iconButton } from './Button.js';

/**
 * Transparent header row: round back button, centred title, optional right-hand content and subtitle.
 * Respects the top safe-area inset. Returns { h, bottom, cy, title, back, right }.
 * opts: title, onBack, backLabel, right(x, y) -> object, subtitle, accent.
 */
export function topBar(scene, opts = {}) {
  const { title = '', onBack = null, backLabel = '←', right = null, subtitle = null, accent = null } = opts;
  const s = uiScale(scene);
  const w = scene.scale.width;
  const inset = safeArea().top;
  const h = 56 * s + inset, cy = inset + 28 * s + 2;
  const back = onBack ? iconButton(scene, 12 + 22 * s, cy, 44 * s, backLabel, { onClick: onBack }) : null;
  const titleText = text(scene, w / 2, cy, title, T.heading(scene, accent ?? THEME.ink));
  const rightObj = right ? right(w - 12, cy) : null;
  let bottom = h;
  if (subtitle) { text(scene, w / 2, h + 6 * s, subtitle, T.small(scene, THEME.ink2)); bottom = h + 18 * s; }
  return { h, bottom, cy, title: titleText, back, right: rightObj };
}
