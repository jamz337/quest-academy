import { hex, mix, darken } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';

// Word Builder's "ancient runes" look, drawn in code like the rest of the game's art: a moonlit forest glade, a
// parchment scroll for the hint, carved sockets on a stone altar and moss-covered rune stones with glowing letters.

export const RUNE = {
  skyTop: 0x0e2430, skyBottom: 0x1d4a3c, glow: 0x7ff5e6, glowDark: 0x0f4a47,
  stone: 0x7d8a8c, stoneDark: 0x566365, stoneEdge: 0x3c4749, moss: 0x6fa04a, mossDark: 0x4d7a33,
  parchment: 0xf3e2b8, parchmentDark: 0xc9a86a, ink: 0x3b2412, bronze: 0xc98b3c,
  right: 0x6cf29a, wrong: 0xff6b6b, reveal: 0xffc857
};
export const SERIF = 'Georgia, "Palatino Linotype", "Book Antiqua", "Times New Roman", serif';

/** A made-up rune: a stem with a couple of branches, stroked on `g` around (x, y) at size s. */
function runeGlyph(g, x, y, s, kind) {
  const l = (x1, y1, x2, y2) => g.lineBetween(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
  l(0, -1, 0, 1);
  switch (kind % 5) {
    case 0: l(0, -1, 0.6, -0.4); l(0, -0.3, 0.6, 0.3); break;          // ᚠ-like
    case 1: l(0, -1, 0.6, -0.5); l(0.6, -0.5, 0, 0); l(0, 0, 0.6, 1); break;   // ᚱ-like
    case 2: l(-0.5, -0.4, 0.5, 0.4); break;                              // ᚾ-like
    case 3: l(0, -0.2, 0.6, -0.8); l(0, -0.2, -0.6, -0.8); break;        // ᛉ-like
    default: l(0, -1, 0.6, -0.6); l(0.6, -0.6, 0, -0.2); l(0, -0.2, 0.6, 0.2); l(0.6, 0.2, 0, 0.6); break;  // ᛒ-like
  }
}

/** Moonlit glade filling the play area: night gradient, moon, tree shapes, faint glowing runes and flowers. */
export function drawGlade(scene, r, ui) {
  const g = scene.add.graphics();
  const rad = 22, step = 4;
  for (let y = 0; y < r.h; y += step) {
    const d = Math.min(y, r.h - y - step);
    const inset = d < rad ? rad - Math.sqrt(Math.max(0, rad * rad - (rad - d) * (rad - d))) : 0;
    g.fillStyle(mix(RUNE.skyTop, RUNE.skyBottom, y / r.h), 1);
    g.fillRect(r.x + inset, r.y + y, r.w - inset * 2, Math.min(step, r.h - y));
  }
  // Moon with a soft halo.
  const mx = r.x + r.w * 0.8, my = r.y + Math.min(r.h * 0.12, 70 * ui);
  [0.06, 0.1, 0.16].forEach((a, i) => { g.fillStyle(0xeaf6ff, a); g.fillCircle(mx, my, (46 - i * 10) * ui); });
  g.fillStyle(0xf4f8ff, 0.9); g.fillCircle(mx, my, 22 * ui);
  // Dark trees down both sides.
  const tree = (x, base, h, w, c) => {
    w = Math.min(w, r.w * 0.17);   // on a phone the trees stay at the edges
    g.fillStyle(c, 1);
    g.fillRect(x - w * 0.06, base - h * 0.35, w * 0.12, h * 0.35);
    g.fillEllipse(x, base - h * 0.62, w, h * 0.62); g.fillEllipse(x - w * 0.25, base - h * 0.45, w * 0.7, h * 0.4); g.fillEllipse(x + w * 0.25, base - h * 0.47, w * 0.7, h * 0.42);
  };
  const base = r.y + r.h;
  tree(r.x + 16 * ui, base, r.h * 0.85, 120 * ui, 0x0b1f1c); tree(r.x + r.w - 10 * ui, base, r.h * 0.9, 130 * ui, 0x0b1f1c);
  tree(r.x + 70 * ui, base, r.h * 0.6, 90 * ui, 0x12302a); tree(r.x + r.w - 76 * ui, base, r.h * 0.65, 100 * ui, 0x12302a);
  // Grassy ground and a scatter of flowers.
  g.fillStyle(0x1f5a3a, 1); g.fillEllipse(r.x + r.w * 0.5, base + 10 * ui, r.w * 1.1, 70 * ui);
  const flower = (x, y, c) => { g.fillStyle(c, 0.95); [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([dx, dy]) => g.fillCircle(x + dx * ui, y + dy * ui, 2.6 * ui)); g.fillStyle(0xffd84a, 1); g.fillCircle(x, y, 1.8 * ui); };
  [[0.05, 0xffffff], [0.12, 0xff8fb1], [0.2, 0xffe066], [0.82, 0xb58cff], [0.9, 0xffffff], [0.95, 0xff8fb1]].forEach(([fx, c], i) => flower(r.x + r.w * fx, base - (10 + (i % 3) * 7) * ui, c));
  // Faint glowing runes hovering in the trees.
  g.lineStyle(Math.max(1.5, 2.5 * ui), RUNE.glow, 0.55);
  [[0.06, 0.3], [0.1, 0.62], [0.93, 0.42], [0.88, 0.72], [0.14, 0.15]].forEach(([fx, fy], i) => runeGlyph(g, r.x + r.w * fx, r.y + r.h * fy, 9 * ui, i));
  return g;
}

/** Parchment scroll with rolled ends, centred at (cx, cy). */
export function scroll(scene, cx, cy, w, h, ui) {
  const g = scene.add.graphics();
  const roll = Math.min(22 * ui, h * 0.3);
  g.fillStyle(0x000000, 0.25); g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 8 * ui, w, h, 8);
  g.fillStyle(RUNE.parchmentDark, 1); g.fillRoundedRect(cx - w / 2 + roll * 0.6, cy - h / 2, w - roll * 1.2, h, 6);
  g.fillStyle(RUNE.parchment, 1); g.fillRoundedRect(cx - w / 2 + roll * 0.6 + 3, cy - h / 2 + 3, w - roll * 1.2 - 6, h - 6, 5);
  // Stains and a darker border line.
  g.fillStyle(RUNE.parchmentDark, 0.18); g.fillEllipse(cx - w * 0.22, cy + h * 0.15, w * 0.2, h * 0.4); g.fillEllipse(cx + w * 0.25, cy - h * 0.2, w * 0.16, h * 0.3);
  g.lineStyle(2, RUNE.parchmentDark, 0.6); g.strokeRoundedRect(cx - w / 2 + roll * 0.6 + 10, cy - h / 2 + 8, w - roll * 1.2 - 20, h - 16, 4);
  // Rolled ends.
  [cx - w / 2 + roll / 2, cx + w / 2 - roll / 2].forEach((x) => {
    g.fillStyle(RUNE.parchmentDark, 1); g.fillRoundedRect(x - roll / 2, cy - h / 2 - 6 * ui, roll, h + 12 * ui, roll / 2);
    g.fillStyle(RUNE.parchment, 1); g.fillRoundedRect(x - roll / 2 + 3, cy - h / 2 - 3 * ui, roll * 0.45, h + 6 * ui, roll / 3);
  });
  return g;
}

/** Stone plaque with a carved line of text. */
export function plaque(scene, cx, cy, str, ui, size = 16) {
  const t = scene.add.text(cx, cy, str, { fontFamily: FONT, fontSize: Math.round(size * ui) + 'px', color: hex(RUNE.ink), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
  const w = t.width + 36 * ui, h = t.height + 16 * ui;
  const g = scene.add.graphics();
  g.fillStyle(RUNE.stoneEdge, 1); g.fillRoundedRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8, 10);
  g.fillStyle(0x9aa7a8, 1); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
  g.fillStyle(RUNE.parchment, 1); g.fillRoundedRect(cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 10, 5);
  if (scene.children && typeof scene.children.bringToTop === 'function') scene.children.bringToTop(t);
  return { g, t, w, h };
}

/** Stone altar under the socket row, and one carved hollow per letter. `cells` are the socket rects. */
export function altar(scene, cells, ui) {
  const g = scene.add.graphics();
  if (!cells.length) return g;
  const x0 = Math.min(...cells.map((c) => c.x)), x1 = Math.max(...cells.map((c) => c.x + c.w));
  const y0 = Math.min(...cells.map((c) => c.y)), y1 = Math.max(...cells.map((c) => c.y + c.h));
  const padX = 18 * ui, padY = 12 * ui;
  g.fillStyle(0x000000, 0.3); g.fillEllipse((x0 + x1) / 2, y1 + padY + 6 * ui, (x1 - x0) + padX * 3, 26 * ui);
  g.fillStyle(RUNE.stoneEdge, 1); g.fillRoundedRect(x0 - padX - 3, y0 - padY - 3, x1 - x0 + padX * 2 + 6, y1 - y0 + padY * 2 + 6, 16 * ui);
  g.fillStyle(0x6b7779, 1); g.fillRoundedRect(x0 - padX, y0 - padY, x1 - x0 + padX * 2, y1 - y0 + padY * 2, 14 * ui);
  g.fillStyle(0x87938f, 1); g.fillRoundedRect(x0 - padX, y0 - padY, x1 - x0 + padX * 2, 8 * ui, { tl: 14 * ui, tr: 14 * ui, bl: 0, br: 0 });
  // Glowing carved runes along the altar's front edge.
  g.lineStyle(Math.max(1, 1.6 * ui), RUNE.glow, 0.6);
  const count = Math.max(2, Math.floor((x1 - x0) / (60 * ui)));
  for (let i = 0; i < count; i++) runeGlyph(g, x0 + (x1 - x0) * (i + 0.5) / count, y1 + padY * 0.55, 3.5 * ui, i + 2);
  cells.forEach((c) => {
    g.fillStyle(0x283134, 1); g.fillRoundedRect(c.x, c.y, c.w, c.h, 10 * ui);
    g.fillStyle(0x3a4548, 1); g.fillRoundedRect(c.x + 3, c.y + c.h * 0.55, c.w - 6, c.h * 0.42, 8 * ui);
    g.lineStyle(2, 0x9aa7a8, 0.5); g.strokeRoundedRect(c.x, c.y, c.w, c.h, 10 * ui);
  });
  return g;
}

/**
 * A rune stone: rough grey block with moss on top and a glowing letter. `glow` tints the letter (and adds a halo) for
 * right / wrong / revealed states. Returns a Container centred on the stone; `onTap` makes it tappable.
 */
export function runeStone(scene, x, y, size, letter, { glow = RUNE.glow, halo = false, moss = true, onTap = null, seed = 0 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const w = size, h = size, r = 10 * (size / 64);
  if (halo) { g.fillStyle(glow, 0.28); g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, r + 6); }
  g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, r);
  g.fillStyle(RUNE.stoneEdge, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(RUNE.stoneDark, 1); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, r - 1);
  g.fillStyle(RUNE.stone, 1); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.7, r - 2);
  // A crack and a chip, different per stone.
  g.lineStyle(Math.max(1, size / 40), RUNE.stoneEdge, 0.7);
  const cx = ((seed * 37) % 60 - 30) / 100 * w;
  g.lineBetween(-w / 2 + 4, cx * 0.3, -w / 2 + w * 0.2, cx * 0.3 + h * 0.12);
  if (moss) {
    g.fillStyle(RUNE.mossDark, 1); g.fillEllipse(-w * 0.18, -h / 2 + 3, w * 0.5, h * 0.16); g.fillEllipse(w * 0.2, -h / 2 + 2, w * 0.42, h * 0.13);
    g.fillStyle(RUNE.moss, 1); g.fillEllipse(-w * 0.2, -h / 2 + 1, w * 0.4, h * 0.11); g.fillEllipse(w * 0.22, -h / 2, w * 0.3, h * 0.09);
    if (seed % 2) { g.fillStyle(RUNE.moss, 1); g.fillEllipse(w / 2 - 4, -h * 0.1, w * 0.1, h * 0.28); }
  }
  const t = scene.add.text(0, 2, letter, {
    fontFamily: FONT, fontSize: Math.round(size * 0.52) + 'px', color: hex(glow), fontStyle: WEIGHT.heavy,
    stroke: hex(darken(glow, 0.25)), strokeThickness: Math.max(2, Math.round(size / 22)),
    shadow: { offsetX: 0, offsetY: 0, color: hex(glow), blur: Math.round(size / 5), fill: true, stroke: true }
  }).setOrigin(0.5);
  c.add([g, t]);
  c.setSize(w + 8, h + 8);
  c.letterText = t;
  if (onTap) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { if (scene.tweens) scene.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); onTap(); });
  }
  return c;
}

/** "Tries: 3" plaque with a bronze coin per try left (spent tries are dull). */
export function triesPlaque(scene, cx, cy, left, total, ui) {
  const t = scene.add.text(0, 0, `Tries: ${left}`, { fontFamily: FONT, fontSize: Math.round(15 * ui) + 'px', color: hex(RUNE.ink), fontStyle: WEIGHT.heavy }).setOrigin(0, 0.5);
  const coinR = 9 * ui, gap = 5 * ui;
  const w = t.width + 12 * ui + total * (coinR * 2 + gap) + 24 * ui, h = coinR * 2 + 14 * ui;
  const g = scene.add.graphics();
  g.fillStyle(RUNE.stoneEdge, 1); g.fillRoundedRect(cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6, 9);
  g.fillStyle(RUNE.parchment, 1); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 7);
  let x = cx - w / 2 + 12 * ui + coinR;
  for (let i = 0; i < total; i++) {
    const on = i < left;
    g.fillStyle(on ? darken(RUNE.bronze, 0.7) : 0x8d8a82, 1); g.fillCircle(x, cy, coinR);
    g.fillStyle(on ? RUNE.bronze : 0xb5b1a6, 1); g.fillCircle(x, cy, coinR - 2);
    g.lineStyle(Math.max(1, 1.4 * ui), on ? darken(RUNE.bronze, 0.55) : 0x8d8a82, 1); runeGlyph(g, x, cy, coinR * 0.5, i);
    x += coinR * 2 + gap;
  }
  t.setPosition(x - coinR + 4 * ui, cy);
  if (scene.children && typeof scene.children.bringToTop === 'function') scene.children.bringToTop(t);
  return { g, t };
}

/** Row of small stone tablets across the top: one per word, lit (with a glowing rune) once it is spelled. */
export function tabletTrail(scene, r, solved, total, current, ui) {
  const g = scene.add.graphics();
  const gap = 6 * ui, w = Math.min(46 * ui, (r.w - gap * (total - 1)) / total), h = Math.min(r.h, 34 * ui);
  const x0 = r.x + (r.w - (w * total + gap * (total - 1))) / 2, y = r.y + (r.h - h) / 2;
  const tablets = [];
  for (let i = 0; i < total; i++) {
    const x = x0 + i * (w + gap), lit = i < solved;
    if (lit) { g.fillStyle(RUNE.glow, 0.25); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 9); }
    g.fillStyle(RUNE.stoneEdge, 1); g.fillRoundedRect(x, y, w, h, 7);
    g.fillStyle(lit ? 0x7d8a8c : 0x4f5b5d, 1); g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 6);
    if (i === current) { g.lineStyle(2, RUNE.reveal, 0.9); g.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 8); }
    g.lineStyle(Math.max(1.5, 2 * ui), lit ? RUNE.glow : 0x6d797b, lit ? 1 : 0.6);
    runeGlyph(g, x + w / 2 - 2 * ui, y + h / 2, h * 0.28, i);
    tablets.push({ x: x + w / 2, y: y + h / 2 });
  }
  return { g, tablets };
}

/** The owl librarian perched at (x, y) (its feet), drawn at scale s. */
export function owl(scene, x, y, s) {
  const g = scene.add.graphics();
  const body = 0x8a6a4a, belly = 0xd9c3a0, dark = 0x5a4330;
  g.fillStyle(dark, 1); g.fillEllipse(0, -34 * s, 58 * s, 70 * s);
  g.fillStyle(body, 1); g.fillEllipse(0, -34 * s, 52 * s, 64 * s);
  g.fillStyle(belly, 1); g.fillEllipse(0, -24 * s, 32 * s, 40 * s);
  g.lineStyle(Math.max(1, 1.2 * s), body, 0.8);
  for (let i = 0; i < 3; i++) { g.lineBetween(-8 * s, (-32 + i * 9) * s, -3 * s, (-29 + i * 9) * s); g.lineBetween(3 * s, (-29 + i * 9) * s, 8 * s, (-32 + i * 9) * s); }
  // Ear tufts, eyes, beak, feet.
  g.fillStyle(dark, 1); g.fillTriangle(-22 * s, -58 * s, -12 * s, -62 * s, -20 * s, -76 * s); g.fillTriangle(22 * s, -58 * s, 12 * s, -62 * s, 20 * s, -76 * s);
  g.fillStyle(0xf2e6c9, 1); g.fillCircle(-11 * s, -52 * s, 10 * s); g.fillCircle(11 * s, -52 * s, 10 * s);
  g.fillStyle(0xffb627, 1); g.fillCircle(-11 * s, -52 * s, 6.5 * s); g.fillCircle(11 * s, -52 * s, 6.5 * s);
  g.fillStyle(0x1b1b1b, 1); g.fillCircle(-11 * s, -52 * s, 3.5 * s); g.fillCircle(11 * s, -52 * s, 3.5 * s);
  g.fillStyle(0xffffff, 1); g.fillCircle(-12.5 * s, -53.5 * s, 1.2 * s); g.fillCircle(9.5 * s, -53.5 * s, 1.2 * s);
  g.fillStyle(0xe0962b, 1); g.fillTriangle(-4 * s, -46 * s, 4 * s, -46 * s, 0, -38 * s);
  g.fillStyle(0xe0962b, 1); [-9, -4, 4, 9].forEach((fx) => g.fillEllipse(fx * s, -1 * s, 5 * s, 6 * s));
  g.setPosition(x, y);
  return g;
}
