import { hex, mix } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';

// Bible Quiz / Verse Builder "Bible Village" look, drawn in code: a night-time village street of mud-brick houses
// under a purple dusk (each right answer lights a window), dark glass panels, and glowing answer cards with A-D badges.

export const VILLAGE = {
  bg: 0x1a2030, bgBottom: 0x232a3d, panel: 0x262d40, panelEdge: 0x3d4660, panelTop: 0x2f3750,
  glow: 0x8b5cf6, glowSoft: 0xb79cff, text: 0xece9fb, question: 0xc9b8ff, dim: 0x9a96b5,
  right: 0x6d45d9, rightEdge: 0xc4adff, wrong: 0xd9465a, wrongEdge: 0xff8a99, ok: 0x5ee08a,
  window: 0xffc86b, brick: 0x6b5140, brickDark: 0x4a3829, brickLight: 0x87684f
};

/** Rounded rect filled with a vertical two-colour blend (Graphics has no gradients on rounded shapes). */
function blendRect(g, x, y, w, h, top, bottom, r, step = 3) {
  for (let yy = 0; yy < h; yy += step) {
    const d = Math.min(yy, h - yy - step);
    const inset = d < r ? r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d))) : 0;
    g.fillStyle(mix(top, bottom, yy / h), 1);
    g.fillRect(x + inset, y + yy, w - inset * 2, Math.min(step, h - yy));
  }
}

/** A-D (or 1-4) on a keyboard calls onIndex(0..3). Bound once per scene (scenes are reused between launches). */
export function bindLetterKeys(scene, onIndex) {
  const kb = scene.input && scene.input.keyboard;
  if (!kb || scene.letterKeysBound) return;
  scene.letterKeysBound = true;
  kb.on('keydown', (ev) => {
    const key = String(ev && ev.key).toLowerCase();
    const i = 'abcd'.indexOf(key) >= 0 ? 'abcd'.indexOf(key) : '1234'.indexOf(key);
    if (i >= 0) onIndex(i);
  });
}

/** Dark slate backdrop for the whole play area. */
export function drawBackdrop(scene, r) {
  const g = scene.add.graphics();
  blendRect(g, r.x, r.y, r.w, r.h, VILLAGE.bg, VILLAGE.bgBottom, 20, 4);
  // A faint diagonal grid, like the mockup's etched floor.
  g.lineStyle(1, 0x3a4260, 0.25);
  for (let x = r.x - r.h; x < r.x + r.w; x += 90) g.lineBetween(Math.max(r.x, x), r.y + r.h - Math.max(0, r.x - x), Math.min(r.x + r.w, x + r.h), r.y + r.h - Math.min(r.h, r.x + r.w - x));
  return g;
}

/**
 * The village street banner in rect r: dusk sky, mountains, houses on both sides of a lamp-lit road. `lit` windows
 * glow (one per right answer so far); returns { windows } (centre points, in lighting order) for animating the newest.
 * opts.sides: which sides of the road have houses ([-1, 1] = both; the Ark keeps the right side for its boat).
 */
export function drawVillage(scene, r, f, lit, { sides = [-1, 1] } = {}) {
  const g = scene.add.graphics();
  const horizon = r.y + r.h * 0.52, cx = r.x + r.w / 2;
  // Sky, stars and a thin moon.
  blendRect(g, r.x, r.y, r.w, r.h, 0x221c44, 0x6a58a0, 14, 3);
  g.fillStyle(0xffffff, 0.7);
  for (let i = 0; i < 26; i++) g.fillCircle(r.x + ((i * 97) % 100) / 100 * r.w, r.y + ((i * 53) % 40) / 100 * r.h, (i % 3 ? 0.9 : 1.5) * f);
  g.fillStyle(0xf5f0ff, 0.9); g.fillCircle(r.x + r.w * 0.7, r.y + r.h * 0.16, 11 * f);
  g.fillStyle(0x2a2250, 1); g.fillCircle(r.x + r.w * 0.7 + 5 * f, r.y + r.h * 0.14, 10 * f);
  // Two ranges of mountains.
  const range = (pts, c) => { g.fillStyle(c, 1); g.fillPoints([{ x: r.x, y: horizon + 4 }, ...pts.map(([px, py]) => ({ x: r.x + px * r.w, y: r.y + py * r.h })), { x: r.x + r.w, y: horizon + 4 }], true); };
  range([[0, 0.42], [0.18, 0.3], [0.34, 0.4], [0.5, 0.26], [0.66, 0.38], [0.82, 0.28], [1, 0.4]], 0x4a3f78);
  range([[0, 0.5], [0.22, 0.4], [0.4, 0.48], [0.58, 0.38], [0.78, 0.47], [1, 0.42]], 0x372f5c);
  // Ground and the road running to the horizon, its edges lit by lamps.
  g.fillStyle(0x2b2640, 1); g.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  const roadW = r.w * 0.34;
  g.fillStyle(0x3b374f, 1); g.fillPoints([{ x: cx - roadW / 2, y: r.y + r.h }, { x: cx - 6 * f, y: horizon }, { x: cx + 6 * f, y: horizon }, { x: cx + roadW / 2, y: r.y + r.h }], true);
  g.lineStyle(Math.max(1.5, 2.5 * f), 0xffd08a, 0.55);
  g.lineBetween(cx - roadW / 2, r.y + r.h, cx - 6 * f, horizon); g.lineBetween(cx + roadW / 2, r.y + r.h, cx + 6 * f, horizon);
  g.lineStyle(Math.max(1, 1.5 * f), 0x9fd8ff, 0.35);
  for (let i = 1; i < 5; i++) { const t = i / 5; const y = horizon + (r.y + r.h - horizon) * t * t; g.lineBetween(cx - 3 * f * (1 + t * 4), y, cx + 3 * f * (1 + t * 4), y); }

  // Houses: near ones big at the edges, far ones small by the road. Windows are numbered near-to-far, left then right.
  const base = r.y + r.h;
  const houses = [];
  const side = (dir) => [
    { x: 0.0, w: 0.2, h: 0.62, wins: 3 }, { x: 0.17, w: 0.13, h: 0.5, wins: 2 }, { x: 0.28, w: 0.09, h: 0.4, wins: 2 }, { x: 0.35, w: 0.06, h: 0.33, wins: 1 }
  ].map((hh, i) => ({ ...hh, dir, i }));
  side(-1).forEach((hh, i) => { if (sides.includes(-1)) houses.push(hh); if (sides.includes(1)) houses.push(side(1)[i]); });
  const windows = [];
  // Draw far ones first so near houses overlap them.
  [...houses].sort((a, b) => b.i - a.i).forEach((hh) => {
    const w = hh.w * r.w, h = hh.h * r.h, y0 = base - h - (hh.i * 0.05) * r.h * 0.4;
    const x0 = hh.dir < 0 ? r.x + hh.x * r.w : r.x + r.w - hh.x * r.w - w;
    const sideW = w * 0.18, towardRoad = hh.dir < 0 ? x0 + w : x0 - sideW;
    g.fillStyle(VILLAGE.brickDark, 1); g.fillRect(towardRoad, y0 + h * 0.06, sideW, h - h * 0.06);
    g.fillStyle(VILLAGE.brick, 1); g.fillRect(x0, y0, w, h);
    g.fillStyle(VILLAGE.brickLight, 1); g.fillRect(x0 - 2 * f, y0 - 3 * f, w + 4 * f, 5 * f);   // flat roof ledge
    g.fillStyle(0x3a2a1e, 1);
    for (let b = 0; b < 3; b++) g.fillRect(x0 + w * (0.2 + b * 0.3), y0 + 3 * f, 4 * f, 3 * f);   // roof beams
    g.lineStyle(1, VILLAGE.brickDark, 0.35);
    for (let yy = y0 + 10 * f; yy < y0 + h; yy += 9 * f) g.lineBetween(x0, yy, x0 + w, yy);   // courses of brick
    g.fillStyle(0x2a1d15, 1); g.fillRoundedRect(x0 + w * 0.4, base - h * 0.34, w * 0.2, h * 0.34, { tl: w * 0.1, tr: w * 0.1, bl: 0, br: 0 });   // door
    for (let k = 0; k < hh.wins; k++) {
      const wx = x0 + w * (hh.wins === 1 ? 0.5 : 0.2 + k * (0.6 / (hh.wins - 1))), wy = y0 + h * 0.3;
      windows.push({ x: wx, y: wy, ww: Math.max(4 * f, w * 0.1), wh: Math.max(7 * f, h * 0.2), order: hh.i * 10 + (hh.dir < 0 ? 0 : 5) + k });
    }
  });
  windows.sort((a, b) => a.order - b.order);
  windows.forEach((wn, n) => {
    const on = n < lit;
    if (on) { g.fillStyle(VILLAGE.window, 0.18); g.fillRoundedRect(wn.x - wn.ww, wn.y - wn.wh * 0.9, wn.ww * 2, wn.wh * 1.8, 4 * f); }
    g.fillStyle(on ? VILLAGE.window : 0x1c1626, 1); g.fillRoundedRect(wn.x - wn.ww / 2, wn.y - wn.wh / 2, wn.ww, wn.wh, 2 * f);
  });
  // A soft fade into the page at the bottom.
  g.fillStyle(VILLAGE.bg, 0.5); g.fillRect(r.x, base - 6 * f, r.w, 6 * f);
  return { g, windows };
}

/** Dark glass panel (question card, lesson card) with a lighter top edge. */
export function glassPanel(scene, x, y, w, h, f, { edge = VILLAGE.panelEdge } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x + 2, y + 8 * f, w, h, 16 * f);
  g.fillStyle(edge, 1); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 17 * f);
  blendRect(g, x, y, w, h, VILLAGE.panelTop, VILLAGE.panel, 15 * f, 3);
  g.lineStyle(1, 0xffffff, 0.08); g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 13 * f);
  return g;
}

/**
 * An answer card: dark glass with a purple under-glow, a letter badge (A-D) top-left, and the answer in the middle.
 * state: 'idle' | 'chosen' (purple, no tick: picked in a story-order round) | 'right' | 'wrong' | 'dim'. Returns a Container centred on (x, y), tappable when `onTap` is given.
 */
export function answerCard(scene, x, y, w, h, label, { state = 'idle', letter = null, onTap = null, f = 1 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = 14 * f;
  const right = state === 'right' || state === 'chosen', wrong = state === 'wrong';
  const glowC = right ? VILLAGE.glow : wrong ? VILLAGE.wrong : VILLAGE.glow;
  const glowA = right || wrong ? 0.3 : 0.12;
  [10, 6, 3].forEach((p, i) => { g.fillStyle(glowC, glowA * (i + 1) / 3); g.fillRoundedRect(-w / 2 - p * f, -h / 2 - p * f + (right || wrong ? 0 : 4 * f), w + p * 2 * f, h + p * 2 * f, r + p * f); });
  g.fillStyle(right ? VILLAGE.rightEdge : wrong ? VILLAGE.wrongEdge : 0x4a5373, 1); g.fillRoundedRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, r + 1);
  blendRect(g, -w / 2, -h / 2, w, h, right ? 0x7e56ee : wrong ? 0x8c2a3c : 0x353d57, right ? 0x5a37c4 : wrong ? 0x5e1c2a : 0x262d42, r, 3);
  if (!right && !wrong) { g.fillStyle(VILLAGE.glow, 0.5); g.fillRoundedRect(-w / 2 + 10 * f, h / 2 - 3 * f, w - 20 * f, 2 * f, 1); }   // purple under-glow
  const parts = [g];
  if (letter) {
    const bs = Math.min(26 * f, h * 0.3);
    g.fillStyle(right ? 0x9f7cff : 0x3a4260, 1); g.fillRoundedRect(-w / 2 + 8 * f, -h / 2 + 8 * f, bs, bs, 6 * f);
    g.lineStyle(1.5, right ? 0xe0d4ff : 0x6b7394, 1); g.strokeRoundedRect(-w / 2 + 8 * f, -h / 2 + 8 * f, bs, bs, 6 * f);
    parts.push(scene.add.text(-w / 2 + 8 * f + bs / 2, -h / 2 + 8 * f + bs / 2, letter, { fontFamily: FONT, fontSize: Math.round(bs * 0.6) + 'px', color: hex(0xdcd6f7), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
  }
  const str = String(label);
  const mark = state === 'right' ? '✓' : wrong ? '✗' : null;
  // Keep clear of the badge (left) and the read-aloud button (right): wrap between words, shrink to fit.
  const side = letter ? Math.min(26 * f, h * 0.3) + 16 * f : 14 * f;
  const textW = Math.max(60, w - side * 2);
  let t = null;
  for (const px of [24, 21, 19, 17, 16].filter((p) => p <= (str.length > 28 ? 16 : str.length > 16 ? 19 : 23))) {
    if (t) t.destroy();
    t = scene.add.text(0, mark ? -h * 0.1 : 0, str, {
      fontFamily: FONT, fontSize: Math.round(px * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy, align: 'center',
      wordWrap: { width: textW }
    }).setOrigin(0.5);
    if ((t.width || 0) <= textW + 1 && (t.height || 0) <= h * (mark ? 0.6 : 0.86)) break;
  }
  parts.push(t);
  if (mark) parts.push(scene.add.text(0, h * 0.26, mark, { fontFamily: FONT, fontSize: Math.round(22 * f) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy }).setOrigin(0.5));
  c.add(parts);
  c.setSize(w, h);
  c.label = t;   // it is a button: tests (and findButton) know it by its answer
  if (state === 'dim') c.setAlpha(0.4);
  if (onTap) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { if (scene.tweens) scene.tweens.add({ targets: c, scale: 0.97, duration: 80, yoyo: true }); });
    c.on('pointerup', () => onTap());
  }
  return c;
}

/** Segmented timer bar: purple segments that go out one by one (red near the end). Works like ui/ProgressBar. */
export class SegmentBar {
  constructor(scene, x, y, w, h, { segments = 16, f = 1 } = {}) {
    this.scene = scene; this.x = x; this.y = y; this.w = w; this.h = h; this.n = segments; this.f = f;
    this.g = scene.add.graphics(); this.shown = -1;
    this.set(1);
  }
  set(ratio) {
    if (!this.active) return;
    const on = Math.max(0, Math.min(this.n, Math.ceil(ratio * this.n)));
    if (on === this.shown) return;
    this.shown = on;
    const g = this.g, gap = 4 * this.f, sw = (this.w - gap * (this.n - 1)) / this.n;
    g.clear();
    g.fillStyle(0x151a28, 1); g.fillRoundedRect(this.x - 4 * this.f, this.y - 4 * this.f, this.w + 8 * this.f, this.h + 8 * this.f, this.h);
    const low = ratio < 0.3;
    for (let i = 0; i < this.n; i++) {
      const lit = i < on;
      g.fillStyle(lit ? (low ? mix(0xff6b7d, 0xd9465a, i / this.n) : mix(0x7c5cff, 0xc4adff, i / this.n)) : 0x2c3348, 1);
      g.fillRoundedRect(this.x + i * (sw + gap), this.y, sw, this.h, Math.min(4 * this.f, this.h / 2));
    }
  }
  get active() { return this.g.active !== false; }
  setVisible(v) { this.g.setVisible(v); return this; }
}

/** The stats bar along the bottom: a trapezoid tab with "🔥 Streak", score and coins. */
export function statsBar(scene, cx, y, w, h, items, f) {
  const g = scene.add.graphics();
  const slant = h * 0.7;
  g.fillStyle(VILLAGE.panelEdge, 1);
  g.fillPoints([{ x: cx - w / 2 - 2, y: y + h }, { x: cx - w / 2 + slant - 2, y: y - 2 }, { x: cx + w / 2 - slant + 2, y: y - 2 }, { x: cx + w / 2 + 2, y: y + h }], true);
  g.fillStyle(VILLAGE.panel, 1);
  g.fillPoints([{ x: cx - w / 2, y: y + h }, { x: cx - w / 2 + slant, y }, { x: cx + w / 2 - slant, y }, { x: cx + w / 2, y: y + h }], true);
  const inner = w - slant * 2, cell = inner / items.length;
  items.forEach((it, i) => {
    const x = cx - inner / 2 + cell * (i + 0.5);
    if (i) { g.lineStyle(1, VILLAGE.panelEdge, 1); g.lineBetween(cx - inner / 2 + cell * i, y + h * 0.22, cx - inner / 2 + cell * i, y + h * 0.82); }
    scene.add.text(x, y + h / 2 + 1, it, { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
  });
  return g;
}

// Card colours for "Who Am I?": people on the left glow purple, what they did on the right glows blue.
const TONES = {
  purple: { top: 0x3a2d63, bottom: 0x241d40, edge: 0x7c5cff, pickTop: 0x7e56ee, pickBottom: 0x5a37c4, pickEdge: 0xc4adff },
  blue: { top: 0x243650, bottom: 0x1a2438, edge: 0x5fb8ff, pickTop: 0x2f7fd9, pickBottom: 0x1f5aa8, pickEdge: 0xa9dcff }
};

/**
 * A "Who Am I?" card. tone 'purple' | 'blue'; state 'idle' | 'picked' | 'wrong' | 'done'. With `medallion` a round gold
 * coin carries the first letter of the name on the left. Returns a Container centred on (x, y).
 */
export function matchCard(scene, x, y, w, h, label, { tone = 'purple', state = 'idle', medallion = false, onTap = null, f = 1 } = {}) {
  const T = TONES[tone] || TONES.purple;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = 12 * f;
  const picked = state === 'picked', wrong = state === 'wrong', done = state === 'done';
  const glowC = wrong ? VILLAGE.wrong : done ? 0x5ee0d0 : T.edge;
  [10, 6, 3].forEach((p, i) => { g.fillStyle(glowC, (picked || wrong ? 0.3 : 0.1) * (i + 1) / 3); g.fillRoundedRect(-w / 2 - p * f, -h / 2 - p * f, w + p * 2 * f, h + p * 2 * f, r + p * f); });
  g.fillStyle(wrong ? VILLAGE.wrongEdge : done ? 0x5ee0d0 : picked ? T.pickEdge : T.edge, picked || wrong || done ? 1 : 0.7);
  g.fillRoundedRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, r + 1);
  const [top, bottom] = wrong ? [0x8c2a3c, 0x5e1c2a] : done ? [0x1f4a4a, 0x163636] : picked ? [T.pickTop, T.pickBottom] : [T.top, T.bottom];
  blendRect(g, -w / 2, -h / 2, w, h, top, bottom, r, 3);
  if (state === 'idle') { g.fillStyle(T.edge, 0.55); g.fillRoundedRect(-w / 2 + 10 * f, h / 2 - 3 * f, w - 20 * f, 2 * f, 1); }
  const parts = [g];
  let textLeft = -w / 2 + 14 * f;
  if (medallion && w > 230 * f) {   // on narrow cards the name needs the room
    const mr = Math.min(h * 0.34, 24 * f), mx = -w / 2 + 12 * f + mr;
    g.fillStyle(0x8a6a2e, 1); g.fillCircle(mx, 0, mr + 2 * f);
    g.fillStyle(0xd9b36b, 1); g.fillCircle(mx, 0, mr);
    g.fillStyle(0x2a2150, 1); g.fillCircle(mx, 0, mr - 3 * f);
    parts.push(scene.add.text(mx, 1, String(label).trim().charAt(0).toUpperCase(), { fontFamily: FONT, fontSize: Math.round(mr * 1.1) + 'px', color: hex(0xf2d58c), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
    textLeft = mx + mr + 8 * f;
  }
  const str = String(label);
  const textRight = w / 2 - 36 * f;   // stay clear of the read-aloud button on the right
  // Wrap only between words; shrink until the longest word fits and the lines fit the card.
  let t = null;
  for (const px of [23, 20, 18, 16, 15].filter((p) => p <= (str.length > 24 ? 16 : str.length > 12 ? 19 : 23))) {
    if (t) t.destroy();
    t = scene.add.text((textLeft + textRight) / 2, 0, str, {
      fontFamily: FONT, fontSize: Math.round(px * f) + 'px', color: hex(done ? 0xc9fff6 : VILLAGE.text), fontStyle: WEIGHT.heavy, align: 'center',
      wordWrap: { width: Math.max(60, textRight - textLeft) }
    }).setOrigin(0.5);
    if ((t.width || 0) <= textRight - textLeft + 1 && (t.height || 0) <= h - 8 * f) break;
  }
  parts.push(t);
  if (done) parts.push(scene.add.text(w / 2 - 20 * f, h / 2 - 16 * f, '✓', { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(0x5ee0d0), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
  c.add(parts);
  c.setSize(w, h);
  c.word = t; c.state = state;
  if (onTap) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { if (scene.tweens) scene.tweens.add({ targets: c, scale: 0.97, duration: 80, yoyo: true }); });
    c.on('pointerup', () => onTap());
  }
  return c;
}

/** A crackling cyan link between two points, drawn on `g`; `seed` fixes its zig-zag so a rebuild draws the same bolt. */
export function lightning(g, a, b, f, seed = 0) {
  const n = 9, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const jitter = i === 0 || i === n ? 0 : (((seed * 31 + i * 17) % 13) / 13 - 0.5) * 14 * f;
    pts.push({ x: a.x + (b.x - a.x) * t + jitter * 0.4, y: a.y + (b.y - a.y) * t + jitter });
  }
  [[10, 0x3fb8ff, 0.18], [5, 0x5fd0ff, 0.45], [2, 0xe6fbff, 1]].forEach(([wd, col, al]) => { g.lineStyle(wd * f, col, al); g.strokePoints(pts); });
  g.fillStyle(0xe6fbff, 1); g.fillCircle(a.x, a.y, 3.5 * f); g.fillCircle(b.x, b.y, 3.5 * f);
  return pts;
}

/** New Skill page and "Let's see why" panel in the village look (see ui/SkillIntro.js and ui/Explain.js). */
export const villageLessonTheme = {
  title: VILLAGE.question, ink: VILLAGE.text, ink2: VILLAGE.dim, soft: VILLAGE.panelTop,
  backdrop(scene, area, f) {
    drawBackdrop(scene, area);
    const bh = Math.min(area.h * 0.2, 130 * f);
    drawVillage(scene, { x: area.x, y: area.y, w: area.w, h: bh }, f, 0);
    return { x: area.x, y: area.y + bh - 14 * f, w: area.w, h: area.h - bh + 14 * f };
  },
  card(scene, r, f) {
    const w = Math.min(r.w - 12 * f, 720 * f), x = r.x + (r.w - w) / 2;
    glassPanel(scene, x, r.y, w, r.h - 6 * f, f);
    return { x: x + 16 * f, y: r.y + 12 * f, w: w - 32 * f, h: r.h - 30 * f };
  },
  choice(scene, x, y, w, h, label, { state, onTap, seed, f }) {
    return answerCard(scene, x, y, w, h, label, { state: state === 'idle' ? 'idle' : state, letter: 'ABCD'[seed] || null, onTap, f });
  }
};
