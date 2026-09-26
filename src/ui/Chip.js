import { THEME, hex, textOn, drawShadow } from './theme.js';
import { uiScale } from '../systems/Layout.js';
import { FONT, WEIGHT } from './TextStyles.js';

/**
 * Pill with optional icon and text, sized to its content. originX 0 = grows to the right of x, 1 = to the left, 0.5 = centred.
 * opts: text, icon, color, textColor, fontSize, originX, height, shadow, stroke. Returns a Container with `.text` and `.setText()`.
 */
export function chip(scene, x, y, opts = {}) {
  const { text: str = '', icon = null, color = THEME.surface, textColor, fontSize = 14, originX = 0, height, shadow = 'sm', stroke = null } = opts;
  const s = uiScale(scene);
  const h = height ?? 32 * s, pad = 12 * s, iconSize = 20 * s, gap = 6 * s;
  const c = scene.add.container(x, y);
  c.bg = scene.add.graphics();
  c.text = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: hex(textColor ?? textOn(color)), fontStyle: WEIGHT.bold }).setOrigin(0, 0.5);
  c.add(c.bg);
  if (icon) { c.icon = scene.add.image(0, 0, icon).setDisplaySize(iconSize, iconSize); c.add(c.icon); }
  c.add(c.text);
  const layout = () => {
    const w = pad + (icon ? iconSize + gap : 0) + c.text.width + pad;
    const x0 = -w * originX;
    c.w = w; c.h = h;
    c.bg.clear();
    drawShadow(c.bg, x0, -h / 2, w, h, h / 2, shadow);
    c.bg.fillStyle(color, 1); c.bg.fillRoundedRect(x0, -h / 2, w, h, h / 2);
    if (stroke !== null) { c.bg.lineStyle(2, stroke, 1); c.bg.strokeRoundedRect(x0 + 1, -h / 2 + 1, w - 2, h - 2, h / 2 - 1); }
    if (c.icon) c.icon.setPosition(x0 + pad + iconSize / 2, 0);
    c.text.setPosition(x0 + pad + (icon ? iconSize + gap : 0), 0);
  };
  layout();
  c.setText = (t) => { c.text.setText(t); layout(); return c; };
  return c;
}
