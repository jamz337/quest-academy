// The world HUD's painted-glass look: frosted pills for the coins and the land's name, a frosted round menu
// button, a glossy bubble for the action button and a parchment scroll for the errand being carried. Each piece is
// a Container with the same small API the HUD already uses (`.w`, `.h`, `.setText()` where it shows text).
import { hex } from './theme.js';
import { uiScale } from '../systems/Layout.js';
import { FONT, WEIGHT } from './TextStyles.js';

const INK = 0x1e1b4b;

/** Frosted glass: a translucent body, a brighter top half, a light rim and a soft shadow under it. */
function frost(g, x, y, w, h, r, tint = 0x5f6f73) {
  g.fillStyle(0x000000, 0.16); g.fillRoundedRect(x, y + 3, w, h, r);
  g.fillStyle(tint, 0.55); g.fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.48, { tl: r - 2, tr: r - 2, bl: 6, br: 6 });
  g.lineStyle(2, 0xffffff, 0.55); g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, r - 1);
}

/**
 * A frosted pill with an icon and white text, growing to the right of x (like ui/Chip.js's chip).
 * opts: text, icon (texture key), height, fontSize, tint, textColor, outline (the text's ink).
 */
export function glassPill(scene, x, y, opts = {}) {
  const { text: str = '', icon = null, height, fontSize = 16, tint = 0x5f6f73, textColor = 0xffffff, outline = 0x26343a } = opts;
  const s = uiScale(scene);
  const h = height ?? 36 * s, pad = 12 * s, iconSize = h * 0.82, gap = 6 * s;
  const c = scene.add.container(x, y);
  c.bg = scene.add.graphics();
  c.text = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: hex(textColor), fontStyle: WEIGHT.heavy, stroke: hex(outline), strokeThickness: Math.max(2, Math.round(3 * s)) }).setOrigin(0, 0.5);
  c.add(c.bg);
  if (icon) { c.icon = scene.add.image(0, 0, icon).setDisplaySize(iconSize, iconSize); c.add(c.icon); }
  c.add(c.text);
  const layout = () => {
    const w = (icon ? h * 0.12 : pad) + (icon ? iconSize + gap : 0) + c.text.width + pad * 1.2;
    c.w = w; c.h = h;
    c.bg.clear(); frost(c.bg, 0, -h / 2, w, h, h / 2, tint);
    if (c.icon) c.icon.setPosition(h * 0.12 + iconSize / 2, 0);
    c.text.setPosition((icon ? h * 0.12 + iconSize + gap : pad), 0);
  };
  layout();
  c.setText = (t) => { c.text.setText(t); layout(); return c; };
  return c;
}

/** The land's name: a pale lilac pill with a white rim and dark violet text. */
export function landPill(scene, x, y, opts = {}) {
  const { text: str = '', height, fontSize = 14 } = opts;
  const s = uiScale(scene), h = height ?? 28 * s, pad = 14 * s;
  const c = scene.add.container(x, y);
  c.bg = scene.add.graphics();
  c.text = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: '#3b2f86', fontStyle: WEIGHT.heavy }).setOrigin(0, 0.5);
  c.add([c.bg, c.text]);
  const layout = () => {
    const w = pad * 2 + c.text.width;
    c.w = w; c.h = h;
    c.bg.clear();
    c.bg.fillStyle(0x000000, 0.14); c.bg.fillRoundedRect(0, -h / 2 + 2, w, h, h / 2);
    c.bg.fillStyle(0xffffff, 1); c.bg.fillRoundedRect(0, -h / 2, w, h, h / 2);
    c.bg.fillStyle(0xe6e1fb, 1); c.bg.fillRoundedRect(2.5, -h / 2 + 2.5, w - 5, h - 5, h / 2 - 2.5);
    c.bg.fillStyle(0xffffff, 0.5); c.bg.fillRoundedRect(6, -h / 2 + 4, w - 12, h * 0.3, h * 0.15);
    c.text.setPosition(pad, 0);
  };
  layout();
  c.setText = (t) => { c.text.setText(t); layout(); return c; };
  return c;
}

/** A parchment scroll with rolled ends, for the errand line ("Carry the lost lamb to Shepherd Eli"). */
export function scrollBanner(scene, x, y, str, opts = {}) {
  const { fontSize = 15, maxWidth = 420 } = opts;
  const s = uiScale(scene), h = 36 * s, roll = 9 * s, pad = 16 * s;
  const c = scene.add.container(x, y);
  const t = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: '#7a4a12', fontStyle: WEIGHT.heavy });
  for (let size = fontSize; t.width > maxWidth * s - pad * 2 - roll * 2 && size > 11; size -= 1) t.setFontSize(Math.round(size * s));
  const w = t.width + pad * 2 + roll * 2;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.18); g.fillRoundedRect(roll * 0.5, -h / 2 + 3, w - roll, h, 6 * s);
  g.fillStyle(0xd9b36a, 1); g.fillRoundedRect(roll * 0.5, -h / 2, w - roll, h, 4 * s);
  g.fillStyle(0xf6e2b0, 1); g.fillRoundedRect(roll * 0.5 + 2, -h / 2 + 2, w - roll - 4, h - 4, 3 * s);
  g.fillStyle(0xffffff, 0.35); g.fillRect(roll, -h / 2 + 4, w - roll * 2, h * 0.18);
  for (const ex of [roll * 0.5, w - roll * 0.5]) {   // the rolled ends
    g.fillStyle(0xb98b45, 1); g.fillRoundedRect(ex - roll / 2, -h / 2 - 4 * s, roll, h + 8 * s, roll / 2);
    g.fillStyle(0xe7c27c, 1); g.fillRoundedRect(ex - roll / 2 + 2, -h / 2 - 3 * s, roll * 0.45, h + 6 * s, roll / 4);
  }
  t.setOrigin(0, 0.5).setPosition(roll + pad, 0);
  c.add([g, t]);
  c.w = w; c.h = h;
  return c;
}

/** A frosted round button with a drawn three-bar menu glyph. Calls onClick on release. */
export function glassMenuButton(scene, x, y, size, onClick) {
  const r = size / 2, c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.16); g.fillCircle(0, 3, r);
  g.fillStyle(0xdfe6dc, 0.78); g.fillCircle(0, 0, r);
  g.fillStyle(0xffffff, 0.45); g.fillEllipse(0, -r * 0.42, r * 1.5, r * 0.8);
  g.lineStyle(2, 0xffffff, 0.75); g.strokeCircle(0, 0, r - 1);
  for (const dy of [-0.3, 0, 0.3]) { g.fillStyle(INK, 1); g.fillRoundedRect(-r * 0.42, dy * r - r * 0.07, r * 0.84, r * 0.14, r * 0.07); }
  c.add(g); c.setSize(size, size); c.setInteractive({ useHandCursor: true });
  c.label = { text: '☰' };   // tests find it by its glyph
  c.on('pointerdown', () => c.setScale(0.92));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); if (onClick) onClick(); });
  return c;
}

/**
 * The world's panels (the dialog box, the quest board, the menu and its pages): cream parchment inside a thick ink
 * outline, a darker parchment edge and a soft shadow, drawn into graphics `g` (made if not given).
 */
export function storybookPanel(scene, x, y, w, h, opts = {}) {
  const s = uiScale(scene), r = Math.min(opts.radius ?? 22 * s, Math.min(w, h) / 2), ow = Math.max(2, 2.4 * s);
  const g = opts.g || scene.add.graphics();
  g.fillStyle(0x000000, 0.22); g.fillRoundedRect(x, y + 6 * s, w, h, r);
  g.fillStyle(PANEL_INK, 1); g.fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xe6c98f, 1); g.fillRoundedRect(x + ow, y + ow, w - ow * 2, h - ow * 2, r - ow);
  g.fillStyle(0xfff6e2, 1); g.fillRoundedRect(x + ow + 3 * s, y + ow + 3 * s, w - (ow + 3 * s) * 2, h - (ow + 3 * s) * 2, Math.max(4, r - ow - 3 * s));
  g.fillStyle(0xffffff, 0.5); g.fillRoundedRect(x + r, y + ow + 5 * s, w - r * 2, 3 * s, 1.5 * s);   // light along the top
  return g;
}
const PANEL_INK = 0x8a5a2b;   // the parchment's own dark edge

/**
 * A ribbon banner centred on (cx, cy) carrying `str` in white with an ink edge: a panel's title or a speaker's name.
 * opts: colour (the ribbon's fill), fontSize, minWidth. Returns a Container with `.text`, `.w`, `.h`.
 */
export function ribbon(scene, cx, cy, str, opts = {}) {
  const { colour = 0xd9642c, fontSize = 18, minWidth = 0 } = opts;
  const s = uiScale(scene), c = scene.add.container(cx, cy);
  const dark = darkenHex(colour), edge = darkenHex(dark);
  const t = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy, stroke: hex(edge), strokeThickness: Math.max(2, Math.round(3 * s)) }).setOrigin(0.5);
  const h = t.height + 10 * s, w = Math.max(minWidth, t.width + 34 * s), tail = 12 * s, g = scene.add.graphics();
  for (const side of [-1, 1]) {   // the folded tails behind the band
    const x0 = side * (w / 2 - 4 * s), x1 = side * (w / 2 + tail);
    g.fillStyle(edge, 1); g.fillPoints([{ x: x0, y: -h / 2 + 5 * s }, { x: x1, y: -h / 2 + 5 * s }, { x: x1 - side * 6 * s, y: 4 * s }, { x: x1, y: h / 2 + 5 * s }, { x: x0, y: h / 2 + 5 * s }], true);
    g.fillStyle(dark, 1); g.fillPoints([{ x: x0, y: -h / 2 + 7.5 * s }, { x: x1 - side * 2.5 * s, y: -h / 2 + 7.5 * s }, { x: x1 - side * 8 * s, y: 4 * s }, { x: x1 - side * 2.5 * s, y: h / 2 + 2.5 * s }, { x: x0, y: h / 2 + 2.5 * s }], true);
  }
  g.fillStyle(edge, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6 * s);
  g.fillStyle(colour, 1); g.fillRoundedRect(-w / 2 + 2 * s, -h / 2 + 2 * s, w - 4 * s, h - 4 * s, 4 * s);
  g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(-w / 2 + 6 * s, -h / 2 + 4 * s, w - 12 * s, h * 0.22, 2 * s);
  c.add([g, t]);
  c.text = t; c.w = w; c.h = h;
  return c;
}
function darkenHex(c) { const f = (v) => Math.round(v * 0.72); return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255); }

/** The glossy blue action bubble: a deep blue ball, a bright highlight across its top and a white "A" outlined in navy. */
export function paintActionBubble(scene, g, r, pressed = false) {
  g.clear();
  g.fillStyle(0x0b3a8a, 0.25); g.fillCircle(0, 5, r);
  g.fillStyle(0x9fd2ff, 0.5); g.fillCircle(0, 0, r + 3);                         // a soft glow round it
  g.fillStyle(pressed ? 0x1a5fc4 : 0x2478e0, 1); g.fillCircle(0, 0, r);
  g.fillStyle(pressed ? 0x2a74d8 : 0x4a9bf2, 1); g.fillCircle(0, -r * 0.06, r * 0.86);
  g.fillStyle(0xffffff, 0.42); g.fillEllipse(0, -r * 0.5, r * 1.3, r * 0.62);   // the gloss
  g.fillStyle(0xffffff, 0.85); g.fillCircle(-r * 0.42, -r * 0.5, r * 0.09);
  g.lineStyle(2.5, 0xffffff, 0.85); g.strokeCircle(0, 0, r - 1.5);
}
