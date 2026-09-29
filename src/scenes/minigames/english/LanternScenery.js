import { hex, mix, darken } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';

// Word Match's lantern festival: a cousin of Word Builder's rune glade and Grammar Gate's castle (a night scene,
// warm glows for right and wrong) with its own pieces: paper lanterns carrying the words, strings of lights they
// hang from, golden threads tying matched pairs, and sky lanterns that float up as pairs are matched.

export const LANTERN = {
  skyTop: 0x121436, skyMid: 0x2a2a66, skyLow: 0x5a3c78, hills: 0x1d1b40, lake: 0x1a2550, lakeLight: 0x2c3a72,
  paper: [0xffd27a, 0xffb08a, 0xff9c9c, 0xffc46b, 0xf8b4d6], cap: 0x6b2a1a, capLight: 0x8e3d24, cord: 0x3a2014,
  ink: 0x3b1f10, glow: 0xffc46b, bulb: 0xffe7a3, gold: 0xf2c14e, goldDark: 0xb8862b,
  right: 0x5fe08a, wrong: 0xff5c5c, ribbon: 0xfff1dc, ribbonEdge: 0xc0392b
};

/** The area with rounded corners, drawn in 4 px rows so a gradient never shows a seam: `colourAt(y)` per row. */
function roundedRows(g, r, colourAt, rad = 22) {
  const step = 4;
  for (let y = 0; y < r.h; y += step) {
    const d = Math.min(y, r.h - y - step);
    const inset = d < rad ? rad - Math.sqrt(Math.max(0, rad * rad - (rad - d) * (rad - d))) : 0;
    g.fillStyle(colourAt(r.y + y), 1);
    g.fillRect(r.x + inset, r.y + y, r.w - inset * 2, Math.min(step, r.h - y));
  }
}

/** Festival night filling the play area: sky, stars, hills, and a lake along the bottom (from `lakeY`) with reflections. */
export function drawFestival(scene, r, lakeY, ui) {
  const g = scene.add.graphics();
  const skyH = lakeY - r.y;
  roundedRows(g, r, (y) => {
    if (y >= lakeY) return mix(LANTERN.lakeLight, LANTERN.lake, Math.min(1, (y - lakeY) / Math.max(1, r.y + r.h - lakeY)));
    const k = (y - r.y) / Math.max(1, skyH);
    return k < 0.6 ? mix(LANTERN.skyTop, LANTERN.skyMid, k / 0.6) : mix(LANTERN.skyMid, LANTERN.skyLow, (k - 0.6) / 0.4);
  });
  g.fillStyle(0xffffff, 0.8);
  for (let i = 0; i < 30; i++) {
    const x = r.x + 14 + ((i * 89) % Math.max(20, r.w - 28)), y = r.y + 8 + ((i * 61) % Math.max(10, skyH * 0.7));
    g.fillCircle(x, y, (i % 4 === 0 ? 1.6 : 1) * ui);
  }
  // Hills on the far shore, and the lake with shimmering reflections of lantern light.
  g.fillStyle(LANTERN.hills, 1);
  g.fillEllipse(r.x + r.w * 0.25, lakeY, r.w * 0.8, 70 * ui);
  g.fillEllipse(r.x + r.w * 0.8, lakeY, r.w * 0.7, 56 * ui);
  g.fillStyle(LANTERN.glow, 0.12); g.fillRect(r.x + 10, lakeY, r.w - 20, 3 * ui);
  for (let i = 0; i < 12; i++) {
    const x = r.x + 20 + ((i * 131) % Math.max(40, r.w - 40)), y = lakeY + 10 * ui + ((i * 47) % Math.max(10, r.y + r.h - lakeY - 20 * ui));
    g.fillStyle(LANTERN.paper[i % LANTERN.paper.length], 0.18); g.fillRoundedRect(x, y, (18 + (i % 3) * 10) * ui, 3 * ui, 2);
  }
  return g;
}

/** A string of little lights sagging across from x0 to x1 at height y (the lanterns in a row hang from it). */
export function lightString(scene, x0, x1, y, sag, ui) {
  const g = scene.add.graphics();
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push({ x: x0 + (x1 - x0) * t, y: y + sag * 4 * t * (1 - t) }); }
  g.lineStyle(Math.max(1.5, 2 * ui), LANTERN.cord, 1); g.strokePoints(pts, false);
  for (let i = 1; i < 24; i += 2) {
    const p = pts[i];
    g.fillStyle(LANTERN.bulb, 0.25); g.fillCircle(p.x, p.y + 3 * ui, 6 * ui);
    g.fillStyle(LANTERN.bulb, 1); g.fillCircle(p.x, p.y + 3 * ui, 2.4 * ui);
  }
  return { g, yAt: (x) => { const t = (x - x0) / Math.max(1, x1 - x0); return y + sag * 4 * t * (1 - t); } };
}

/**
 * A paper lantern carrying a word, hanging by a cord from `hangY` (the string above). `state`: 'idle', 'picked'
 * (gold ring, brighter, lifted a little), 'wrong' (red), 'done' (dimmed, with a gold check). The word is dark ink on
 * the paper and shrinks until it fits. Returns a Container centred on the lantern.
 */
export function paperLantern(scene, x, y, w, h, label, { state = 'idle', seed = 0, hangY = null, onTap = null, fontSize = 24, ui = 1 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const paper = state === 'wrong' ? 0xffb3b3 : LANTERN.paper[seed % LANTERN.paper.length];
  const capH = Math.max(6, h * 0.12), capW = w * 0.62, bodyH = h - capH * 2, rad = Math.min(bodyH * 0.45, w * 0.2);
  // The cord up to the string.
  if (hangY !== null && hangY < y - h / 2) { g.lineStyle(Math.max(1.5, 2 * ui), LANTERN.cord, 1); g.lineBetween(0, hangY - y, 0, -h / 2); }
  // Glow around it.
  const glow = state === 'picked' ? LANTERN.gold : state === 'wrong' ? LANTERN.wrong : state === 'done' ? LANTERN.right : LANTERN.glow;
  const glowA = state === 'idle' ? 0.16 : state === 'done' ? 0.14 : 0.4;
  g.fillStyle(glow, glowA); g.fillRoundedRect(-w / 2 - 8, -h / 2 - 6, w + 16, h + 12, rad + 8);
  // Caps, paper body with ribs and a light from inside, and a tassel.
  g.fillStyle(LANTERN.cap, 1); g.fillRoundedRect(-capW / 2, -h / 2, capW, capH + 2, 4 * ui); g.fillRoundedRect(-capW / 2, h / 2 - capH - 2, capW, capH + 2, 4 * ui);
  g.fillStyle(LANTERN.capLight, 1); g.fillRect(-capW / 2 + 3, -h / 2 + 2, capW - 6, 2 * ui);
  g.fillStyle(darken(paper, 0.8), 1); g.fillRoundedRect(-w / 2, -h / 2 + capH, w, bodyH, rad);
  g.fillStyle(paper, 1); g.fillRoundedRect(-w / 2 + 2, -h / 2 + capH + 2, w - 4, bodyH - 4, rad - 1);
  g.fillStyle(mix(paper, 0xffffff, 0.45), 1); g.fillEllipse(0, 0, w * 0.62, bodyH * 0.62);
  g.lineStyle(Math.max(1, 1.4 * ui), darken(paper, 0.72), 0.55);
  for (const k of [-0.36, -0.12, 0.12, 0.36]) g.lineBetween(w * k, -h / 2 + capH + 3, w * k, h / 2 - capH - 3);
  g.fillStyle(LANTERN.ribbonEdge, 1); g.fillRect(-1.5 * ui, h / 2, 3 * ui, 7 * ui); g.fillEllipse(0, h / 2 + 9 * ui, 6 * ui, 7 * ui);
  if (state === 'picked' || state === 'wrong') { g.lineStyle(3 * ui, glow, 1); g.strokeRoundedRect(-w / 2 - 2, -h / 2 + capH - 2, w + 4, bodyH + 4, rad + 2); }
  // The word in dark ink, with room kept in the top-right corner for an answer's 🔊.
  const maxW = w - 30 * ui - Math.min(34 * ui, h * 0.45);
  let t = null;
  for (let px = Math.round(Math.min(fontSize * ui, bodyH * 0.5)); px >= 11; px -= 2) {
    if (t) t.destroy();
    t = scene.add.text(0, 1, String(label), { fontFamily: FONT, fontSize: px + 'px', color: hex(LANTERN.ink), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: maxW } }).setOrigin(0.5);
    if ((t.width || 0) <= maxW + 4 && (t.height || 0) <= bodyH - 8) break;
  }
  c.add([g, t]);
  if (state === 'done') {
    c.setAlpha(0.72);
    c.add(scene.add.text(-w / 2 + 16 * ui, 0, '✓', { fontFamily: FONT, fontSize: Math.round(Math.min(22 * ui, bodyH * 0.45)) + 'px', color: hex(0x1f7a3f), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
  }
  if (state === 'picked') c.y -= 4 * ui;
  c.setSize(w, h);
  c.word = t; c.state = state;
  if (onTap) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { if (scene.tweens) scene.tweens.add({ targets: c, scale: 0.96, duration: 70, yoyo: true }); onTap(); });
  }
  return c;
}

/** A paper ribbon banner with the task written on it. Returns { w, h }. */
export function ribbon(scene, cx, cy, str, ui, size = 16) {
  const t = scene.add.text(cx, cy, str, { fontFamily: FONT, fontSize: Math.round(size * ui) + 'px', color: hex(LANTERN.ink), fontStyle: WEIGHT.heavy, align: 'center' }).setOrigin(0.5);
  const w = (t.width || 200) + 40 * ui, h = (t.height || 20) + 14 * ui, tail = 16 * ui;
  const g = scene.add.graphics();
  g.fillStyle(LANTERN.ribbonEdge, 1);
  for (const s of [-1, 1]) {
    const ex = cx + s * (w / 2 + tail * 0.4);
    g.fillPoints([{ x: cx + s * (w / 2 - 6), y: cy - h / 2 + 5 }, { x: ex + s * tail * 0.6, y: cy - h / 2 + 5 }, { x: ex, y: cy + 1 }, { x: ex + s * tail * 0.6, y: cy + h / 2 + 5 }, { x: cx + s * (w / 2 - 6), y: cy + h / 2 + 5 }], true);
  }
  g.fillStyle(darken(LANTERN.ribbonEdge, 0.8), 1); g.fillRoundedRect(cx - w / 2, cy - h / 2 - 2, w, h + 4, 6 * ui);
  g.fillStyle(LANTERN.ribbon, 1); g.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 1, w - 6, h - 2, 5 * ui);
  if (scene.children && typeof scene.children.bringToTop === 'function') scene.children.bringToTop(t);
  return { w, h, t, g };
}

/** A small sky lantern (for the progress sky), as a Container at (x, y). */
export function skyLantern(scene, x, y, s, lit = true, seed = 0) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const w = 12 * s, h = 16 * s, col = LANTERN.paper[seed % LANTERN.paper.length];
  if (lit) {
    g.fillStyle(LANTERN.glow, 0.25); g.fillCircle(0, 0, 12 * s);
    g.fillStyle(col, 1); g.fillPoints([{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w * 0.38, y: h / 2 }, { x: -w * 0.38, y: h / 2 }], true);
    g.fillStyle(0xfff4c2, 1); g.fillEllipse(0, h * 0.3, w * 0.5, h * 0.25);
  } else {
    g.lineStyle(Math.max(1, 1.2 * s), 0x8d8fb8, 0.5);
    g.strokePoints([{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w * 0.38, y: h / 2 }, { x: -w * 0.38, y: h / 2 }], true);
  }
  c.add(g);
  return c;
}

/**
 * The progress sky across rect r: a slot per pair in the whole game, lit lanterns for the pairs matched so far and
 * faint outlines for the rest. Returns { lanterns (the lit ones, oldest first), slots }.
 */
export function lanternSky(scene, r, lit, total, ui) {
  const slots = [], lanterns = [];
  for (let i = 0; i < total; i++) {
    const x = r.x + (r.w * (i + 0.5)) / total;
    const y = r.y + r.h * (0.3 + 0.4 * (((i * 7) % 5) / 4));
    slots.push({ x, y });
    const l = skyLantern(scene, x, y, ui, i < lit, i);
    if (i < lit) lanterns.push(l);
  }
  return { lanterns, slots };
}
