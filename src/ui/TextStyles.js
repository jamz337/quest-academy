import { THEME, hex } from './theme.js';
import { uiScale } from '../systems/Layout.js';

/** One font stack for every piece of text (Outfit is bundled in public/fonts and declared in index.html; Fredoka is the fallback). */
export const FONT = '"Outfit", "Fredoka", "Nunito", system-ui, "Segoe UI", Roboto, Arial, sans-serif';
export const WEIGHT = { normal: '500', bold: '600', heavy: '700', display: '800' };

function style(scene, size, color = THEME.ink, extra = {}) {
  const s = uiScale(scene);
  return { fontFamily: FONT, fontSize: Math.round(size * s) + 'px', color: hex(color), fontStyle: WEIGHT.bold, align: 'center', ...extra };
}

/** Text presets. Sizes are design pixels and scale with uiScale(). Colours default to ink on light surfaces. */
export const T = {
  display: (scene, color) => style(scene, 40, color, { fontStyle: WEIGHT.display }),
  title: (scene, color) => style(scene, 30, color, { fontStyle: WEIGHT.display }),
  heading: (scene, color) => style(scene, 22, color),
  body: (scene, color) => style(scene, 17, color, { fontStyle: WEIGHT.normal }),
  bodyBold: (scene, color) => style(scene, 17, color),
  small: (scene, color) => style(scene, 14, color, { fontStyle: WEIGHT.normal }),   // 14: the smallest instruction a young reader should get
  caption: (scene, color) => style(scene, 13, color ?? THEME.ink2),
  number: (scene, color) => style(scene, 28, color, { fontStyle: WEIGHT.heavy }),
  big: (scene, color) => style(scene, 44, color, { fontStyle: WEIGHT.heavy }),
  /** Any size in design pixels, for the few places that need a custom size. */
  at: (scene, size, color, extra) => style(scene, size, color, extra)
};

/** Shorthand: add centred text. */
export function text(scene, x, y, str, st) {
  return scene.add.text(x, y, str, st).setOrigin(0.5);
}
