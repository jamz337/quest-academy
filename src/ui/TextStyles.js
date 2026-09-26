import { hex, C } from '../constants.js';
import { uiScale } from '../systems/Layout.js';

/** One font stack for every piece of text (Fredoka is bundled in public/fonts and declared in index.html). */
export const FONT = '"Fredoka", "Baloo 2", "Nunito", system-ui, "Segoe UI", Roboto, Arial, sans-serif';
export const WEIGHT = { normal: '500', bold: '600', heavy: '700' };

function style(scene, size, color = C.white, extra = {}) {
  const s = uiScale(scene);
  return { fontFamily: FONT, fontSize: Math.round(size * s) + 'px', color: hex(color), fontStyle: WEIGHT.bold, align: 'center', ...extra };
}

const TITLE_SHADOW = { offsetX: 0, offsetY: 5, color: 'rgba(0,0,0,0.45)', blur: 0, stroke: true, fill: true };

export const T = {
  title: (scene, color) => style(scene, 36, color ?? C.yellow, { fontStyle: WEIGHT.heavy, stroke: hex(C.navy), strokeThickness: 7, shadow: TITLE_SHADOW }),
  heading: (scene, color) => style(scene, 24, color),
  body: (scene, color) => style(scene, 18, color, { fontStyle: WEIGHT.normal }),
  bodyBold: (scene, color) => style(scene, 18, color),
  small: (scene, color) => style(scene, 14, color, { fontStyle: WEIGHT.normal }),
  number: (scene, color) => style(scene, 30, color),
  big: (scene, color) => style(scene, 44, color, { fontStyle: WEIGHT.heavy })
};

/** Shorthand: add centred text. */
export function text(scene, x, y, str, st) {
  return scene.add.text(x, y, str, st).setOrigin(0.5);
}
