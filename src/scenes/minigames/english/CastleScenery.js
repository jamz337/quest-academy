import { THEME, hex, mix, darken } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';

// Grammar Gate's castle at dusk: a cousin of Word Builder's rune glade (night sky, carved stone, parchment,
// glowing right / wrong states) with its own pieces: a stone gatehouse whose iron portcullis drops a notch for
// every right word, torches and banners, a notice board for the sentence, wooden answer planks bound with iron,
// and a row of heraldic shields for progress. Drawn in code like the rest of the game's art.

export const CASTLE = {
  skyTop: 0x1f1838, skyMid: 0x5a3a6a, skyLow: 0xd9825a, hills: 0x3a2a48,
  stone: 0x8f877a, stoneLight: 0xa9a092, stoneDark: 0x645c52, stoneEdge: 0x3b352f, mortar: 0x564f46,
  cobble: 0x6a6258, cobbleLight: 0x7d7468, cobbleDark: 0x4c453d,
  iron: 0x3a3e45, ironLight: 0x6e747e, ironDark: 0x24272c,
  wood: 0x7a4a22, woodLight: 0x94602f, woodDark: 0x4f2f14,
  parchment: 0xf3e2b8, parchmentDark: 0xc9a86a, ink: 0x3b2412, cream: 0xfff4dc,
  flame: 0xffb347, flameCore: 0xfff1a8, banner: 0xa8323a, gold: 0xe8b84a, goldDark: 0xa87a1e,
  right: 0x5fe08a, wrong: 0xff6b6b, seal: 0xb3262e
};

/** The area with rounded corners, drawn in 4 px rows so a gradient never shows a seam: `colourAt(t, y)` per row. */
function roundedRows(g, r, colourAt, rad = 22) {
  const step = 4;
  for (let y = 0; y < r.h; y += step) {
    const d = Math.min(y, r.h - y - step);
    const inset = d < rad ? rad - Math.sqrt(Math.max(0, rad * rad - (rad - d) * (rad - d))) : 0;
    g.fillStyle(colourAt(y / r.h, r.y + y), 1);
    g.fillRect(r.x + inset, r.y + y, r.w - inset * 2, Math.min(step, r.h - y));
  }
}

/**
 * The courtyard at dusk filling the play area: sky fading from night to sunset, stars, a moon, far hills, the
 * castle wall along the horizon (`horizon` = its foot) and cobblestones below.
 */
export function drawCourtyard(scene, r, horizon, wallH, ui) {
  const g = scene.add.graphics();
  const skyH = horizon - r.y;
  roundedRows(g, r, (t, y) => {
    if (y >= horizon) return CASTLE.cobble;
    const k = (y - r.y) / Math.max(1, skyH);
    return k < 0.55 ? mix(CASTLE.skyTop, CASTLE.skyMid, k / 0.55) : mix(CASTLE.skyMid, CASTLE.skyLow, (k - 0.55) / 0.45);
  });
  // Stars and a moon.
  g.fillStyle(0xffffff, 0.85);
  for (let i = 0; i < 26; i++) {
    const x = r.x + 14 + ((i * 97) % Math.max(20, r.w - 28)), y = r.y + 8 + ((i * 53) % Math.max(10, skyH * 0.5));
    g.fillCircle(x, y, (i % 3 === 0 ? 1.6 : 1) * ui);
  }
  const mx = r.x + r.w * 0.14, my = r.y + Math.min(skyH * 0.28, 60 * ui);
  [0.06, 0.1].forEach((a, i) => { g.fillStyle(0xfff3d0, a); g.fillCircle(mx, my, (34 - i * 10) * ui); });
  g.fillStyle(0xfff3d0, 0.95); g.fillCircle(mx, my, 15 * ui);
  g.fillStyle(mix(CASTLE.skyTop, CASTLE.skyMid, 0.3), 1); g.fillCircle(mx + 6 * ui, my - 4 * ui, 13 * ui);   // crescent
  // Far hills.
  g.fillStyle(CASTLE.hills, 1);
  g.fillEllipse(r.x + r.w * 0.2, horizon - wallH * 0.7, r.w * 0.7, wallH * 1.4);
  g.fillEllipse(r.x + r.w * 0.85, horizon - wallH * 0.6, r.w * 0.6, wallH * 1.2);
  // The castle wall: stone courses and battlements.
  const wy = horizon - wallH;
  g.fillStyle(CASTLE.stoneDark, 1); g.fillRect(r.x, wy, r.w, wallH);
  g.fillStyle(CASTLE.stone, 1); g.fillRect(r.x, wy + 3 * ui, r.w, wallH - 6 * ui);
  bricks(g, r.x, wy + 3 * ui, r.w, wallH - 6 * ui, 12 * ui, 30 * ui);
  const merlon = 16 * ui;
  for (let x = r.x; x < r.x + r.w; x += merlon * 2) {
    g.fillStyle(CASTLE.stoneDark, 1); g.fillRect(x, wy - merlon * 0.8, merlon, merlon * 0.8 + 2);
    g.fillStyle(CASTLE.stone, 1); g.fillRect(x + 2, wy - merlon * 0.8 + 2, merlon - 4, merlon * 0.8);
  }
  g.fillStyle(0x000000, 0.28); g.fillRect(r.x, horizon - 4 * ui, r.w, 4 * ui);
  // Cobblestones.
  const ch = 18 * ui, cw = 34 * ui;
  for (let y = horizon + 6 * ui, row = 0; y < r.y + r.h - 6 * ui; y += ch, row++) {
    for (let x = r.x + 6 + (row % 2) * cw / 2 - cw / 2; x < r.x + r.w - 6; x += cw) {
      const x0 = Math.max(r.x + 8, x), x1 = Math.min(r.x + r.w - 8, x + cw - 4);
      if (x1 - x0 < 8) continue;
      g.fillStyle((row + Math.round(x / cw)) % 3 ? CASTLE.cobbleLight : CASTLE.cobbleDark, 0.55);
      g.fillRoundedRect(x0, y, x1 - x0, ch - 4, 6 * ui);
    }
  }
  return g;
}

/** Mortar lines for a block of wall: courses of height `bh`, bricks `bw` wide, every other course offset. */
function bricks(g, x, y, w, h, bh, bw) {
  g.lineStyle(1, CASTLE.mortar, 0.7);
  for (let yy = y + bh, row = 1; yy < y + h; yy += bh, row++) g.lineBetween(x, yy, x + w, yy);
  for (let yy = y, row = 0; yy < y + h; yy += bh, row++) {
    for (let xx = x + (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) g.lineBetween(xx, yy, xx, Math.min(y + h, yy + bh));
  }
}

/** Battlements along the top of a block. */
function crenels(g, x, y, w, size) {
  const n = Math.max(2, Math.round(w / (size * 2)) );
  const step = w / (n * 2 - 1);
  for (let i = 0; i < n; i++) {
    const mx = x + i * step * 2;
    g.fillStyle(CASTLE.stoneEdge, 1); g.fillRect(mx, y - size, step, size + 2);
    g.fillStyle(CASTLE.stoneLight, 1); g.fillRect(mx + 2, y - size + 2, step - 4, size);
  }
}

/**
 * The gatehouse standing on `baseY`, `gw` wide and `gh` tall, centred on cx. The portcullis is lowered to `closed`
 * (0 open .. 1 shut). Returns { bars, yFor, flames } so the caller can drop the portcullis with a tween
 * (bars.y = yFor(closed)) and flicker the torch flames.
 */
export function gatehouse(scene, cx, baseY, gw, gh, closed, ui, banner = CASTLE.banner) {
  const g = scene.add.graphics();
  const towerW = gw * 0.25, midW = gw - towerW * 2, midH = gh * 0.74;
  const x0 = cx - gw / 2, midX = x0 + towerW, wallTop = baseY - midH;
  const archW = midW * 0.64, archH = midH * 0.74, archX = cx - archW / 2, archTop = baseY - archH;
  const crenel = Math.max(8, gh * 0.08);
  g.fillStyle(0x000000, 0.3); g.fillEllipse(cx, baseY + 4 * ui, gw * 1.05, 16 * ui);
  // Central block with its battlements, then the two towers in front of it.
  g.fillStyle(CASTLE.stoneEdge, 1); g.fillRect(midX - 2, wallTop - 2, midW + 4, midH + 2);
  g.fillStyle(CASTLE.stone, 1); g.fillRect(midX, wallTop, midW, midH);
  bricks(g, midX, wallTop, midW, midH, gh * 0.075, gh * 0.16);
  crenels(g, midX, wallTop, midW, crenel);
  for (const tx of [x0, x0 + gw - towerW]) {
    g.fillStyle(CASTLE.stoneEdge, 1); g.fillRect(tx - 2, baseY - gh - 2, towerW + 4, gh + 2);
    g.fillStyle(CASTLE.stoneDark, 1); g.fillRect(tx, baseY - gh, towerW, gh);
    g.fillStyle(CASTLE.stone, 1); g.fillRect(tx, baseY - gh, towerW * 0.8, gh);
    bricks(g, tx, baseY - gh, towerW, gh, gh * 0.075, gh * 0.14);
    crenels(g, tx - 3, baseY - gh, towerW + 6, crenel);
    // An arrow slit.
    g.fillStyle(CASTLE.ironDark, 1); g.fillRoundedRect(tx + towerW / 2 - 3 * ui, baseY - gh * 0.78, 6 * ui, gh * 0.16, 3 * ui);
  }
  // Banners hanging from the towers.
  for (const bx of [x0 + towerW / 2, x0 + gw - towerW / 2]) {
    const bw = towerW * 0.5, bh = gh * 0.34, by = baseY - gh * 0.58;
    g.fillStyle(CASTLE.ironDark, 1); g.fillRect(bx - bw / 2 - 3, by - 3, bw + 6, 4);
    g.fillStyle(banner, 1);
    g.fillPoints([{ x: bx - bw / 2, y: by }, { x: bx + bw / 2, y: by }, { x: bx + bw / 2, y: by + bh }, { x: bx, y: by + bh * 0.8 }, { x: bx - bw / 2, y: by + bh }], true);
    g.fillStyle(darken(banner, 0.75), 1); g.fillRect(bx + bw * 0.25, by, bw * 0.25, bh * 0.85);
    g.fillStyle(CASTLE.gold, 1); g.fillCircle(bx, by + bh * 0.38, bw * 0.2);
    g.fillStyle(darken(banner, 0.8), 1); g.fillCircle(bx, by + bh * 0.38, bw * 0.1);
  }
  // The archway: a dark passage lit warm from inside, with a ring of arch stones.
  const rad = archW / 2;
  g.fillStyle(0x1b120c, 1); g.fillRoundedRect(archX, archTop, archW, archH, { tl: rad, tr: rad, bl: 0, br: 0 });
  g.fillStyle(CASTLE.flame, 0.18); g.fillRoundedRect(archX + archW * 0.15, baseY - archH * 0.35, archW * 0.7, archH * 0.35, { tl: archW * 0.3, tr: archW * 0.3, bl: 0, br: 0 });
  g.lineStyle(Math.max(4, archW * 0.08), CASTLE.stoneLight, 1);
  g.beginPath(); g.arc(cx, archTop + rad, rad + archW * 0.04, Math.PI, 0, false); g.strokePath();
  g.lineStyle(Math.max(1, archW * 0.012), CASTLE.mortar, 0.8);
  for (let i = 1; i < 7; i++) {
    const a = Math.PI + (Math.PI * i) / 7, r0 = rad, r1 = rad + archW * 0.08;
    g.lineBetween(cx + Math.cos(a) * r0, archTop + rad + Math.sin(a) * r0, cx + Math.cos(a) * r1, archTop + rad + Math.sin(a) * r1);
  }
  // The portcullis: iron bars with spikes, masked to the archway so it slides down out of the wall.
  const bars = scene.add.graphics();
  const nBars = 6, barW = Math.max(3, archW * 0.045);
  for (let i = 0; i < nBars; i++) {
    const bx = (archW * (i + 0.5)) / nBars - barW / 2;
    bars.fillStyle(CASTLE.ironDark, 1); bars.fillRect(bx, 0, barW, archH);
    bars.fillStyle(CASTLE.ironLight, 1); bars.fillRect(bx, 0, barW * 0.4, archH);
    bars.fillStyle(CASTLE.iron, 1); bars.fillTriangle(bx - barW * 0.4, archH, bx + barW * 1.4, archH, bx + barW / 2, archH + barW * 2.2);
  }
  for (let j = 1; j < 5; j++) {
    const by = (archH * j) / 5;
    bars.fillStyle(CASTLE.ironDark, 1); bars.fillRect(0, by - barW / 2, archW, barW);
    bars.fillStyle(CASTLE.ironLight, 0.7); bars.fillRect(0, by - barW / 2, archW, barW * 0.35);
    bars.fillStyle(CASTLE.gold, 0.8);
    for (let i = 0; i < nBars; i++) bars.fillCircle((archW * (i + 0.5)) / nBars, by, barW * 0.35);   // rivets
  }
  // Open, a hand's width of spikes still shows; shut, the spikes meet the ground.
  const yFor = (c) => archTop - archH * (1 - (0.1 + 0.9 * Math.max(0, Math.min(1, c)))) + 2;
  bars.setPosition(archX, yFor(closed));
  if (scene.make && typeof scene.make.graphics === 'function') {
    const shape = scene.make.graphics({ add: false });
    shape.fillStyle(0xffffff, 1); shape.fillRoundedRect(archX, archTop, archW, archH + 1, { tl: rad, tr: rad, bl: 0, br: 0 });
    if (typeof shape.createGeometryMask === 'function') bars.setMask(shape.createGeometryMask());
  }
  // Torches either side of the arch.
  const flames = [];
  for (const side of [-1, 1]) {
    const tx = cx + side * (archW / 2 + midW * 0.1), ty = baseY - archH * 0.62;
    g.fillStyle(CASTLE.ironDark, 1); g.fillRect(tx - 2 * ui, ty, 4 * ui, 16 * ui); g.fillRect(tx - 6 * ui, ty, 12 * ui, 4 * ui);
    g.fillStyle(CASTLE.flame, 0.16); g.fillCircle(tx, ty - 6 * ui, 22 * ui);
    const fl = scene.add.container(tx, ty);
    const fg = scene.add.graphics();
    fg.fillStyle(CASTLE.flame, 1); fg.fillEllipse(0, -8 * ui, 10 * ui, 18 * ui);
    fg.fillStyle(CASTLE.flameCore, 1); fg.fillEllipse(0, -5 * ui, 5 * ui, 9 * ui);
    fl.add(fg);
    flames.push(fl);
  }
  return { g, bars, yFor, flames, arch: { x: archX, y: archTop, w: archW, h: archH } };
}

/**
 * A wooden notice board with a parchment sheet nailed to it and a red wax seal, centred at (cx, cy).
 * Returns the parchment's inner rect for the text.
 */
export function noticeBoard(scene, cx, cy, w, h, ui) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3); g.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 7 * ui, w, h, 10 * ui);
  g.fillStyle(CASTLE.woodDark, 1); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10 * ui);
  g.fillStyle(CASTLE.wood, 1); g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 4, w - 8, h - 8, 8 * ui);
  g.lineStyle(1.5, CASTLE.woodDark, 0.5);
  for (let i = 1; i < 4; i++) g.lineBetween(cx - w / 2 + 6, cy - h / 2 + (h * i) / 4, cx + w / 2 - 6, cy - h / 2 + (h * i) / 4);   // planks
  const pad = 12 * ui, px = cx - w / 2 + pad, py = cy - h / 2 + pad, pw = w - pad * 2, ph = h - pad * 2;
  g.fillStyle(CASTLE.parchmentDark, 1); g.fillRoundedRect(px, py, pw, ph, 4 * ui);
  g.fillStyle(CASTLE.parchment, 1); g.fillRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 3 * ui);
  g.fillStyle(CASTLE.parchmentDark, 0.18); g.fillEllipse(px + pw * 0.25, py + ph * 0.7, pw * 0.22, ph * 0.4); g.fillEllipse(px + pw * 0.75, py + ph * 0.3, pw * 0.18, ph * 0.3);
  // Nails in the corners and a wax seal hanging off the bottom edge.
  g.fillStyle(CASTLE.ironDark, 1);
  for (const [nx, ny] of [[px + 7 * ui, py + 7 * ui], [px + pw - 7 * ui, py + 7 * ui], [px + 7 * ui, py + ph - 7 * ui], [px + pw - 7 * ui, py + ph - 7 * ui]]) g.fillCircle(nx, ny, 2.6 * ui);
  const sx = px + pw - 26 * ui, sy = py + ph;
  g.fillStyle(CASTLE.seal, 1); g.fillTriangle(sx - 6 * ui, sy, sx - 1 * ui, sy, sx - 9 * ui, sy + 14 * ui); g.fillTriangle(sx + 1 * ui, sy, sx + 6 * ui, sy, sx + 9 * ui, sy + 14 * ui);
  g.fillStyle(darken(CASTLE.seal, 0.8), 1); g.fillCircle(sx, sy, 10 * ui);
  g.fillStyle(CASTLE.seal, 1); g.fillCircle(sx, sy, 8 * ui);
  g.lineStyle(1.5 * ui, darken(CASTLE.seal, 0.6), 1); g.strokeCircle(sx, sy, 5 * ui);
  return { g, inner: { x: px + 8 * ui, y: py + 6 * ui, w: pw - 16 * ui, h: ph - 12 * ui } };
}

/**
 * A wooden answer plank bound with iron at both ends, with the word painted in cream. `state`: 'idle', 'right'
 * (green glow), 'wrong' (red glow) or 'dim' (faded). The word shrinks until it fits. Returns a Container.
 */
export function plank(scene, x, y, w, h, label, { state = 'idle', onTap = null, seed = 0, fontSize = 28, ui = 1 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = Math.min(10 * ui, h * 0.18);
  const glow = state === 'right' ? CASTLE.right : state === 'wrong' ? CASTLE.wrong : null;
  if (glow) { g.fillStyle(glow, 0.35); g.fillRoundedRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, r + 7); }
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, r);
  g.fillStyle(CASTLE.woodDark, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(CASTLE.wood, 1); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, r - 1);
  g.fillStyle(CASTLE.woodLight, 1); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.18, { tl: r - 1, tr: r - 1, bl: 0, br: 0 });
  // Wood grain and a knot, different per plank.
  g.lineStyle(Math.max(1, h / 45), CASTLE.woodDark, 0.45);
  for (let i = 1; i < 4; i++) {
    const gy = -h / 2 + (h * i) / 4 + ((seed * 7 + i * 5) % 7) - 3;
    g.lineBetween(-w / 2 + 16 * ui, gy, w / 2 - 16 * ui, gy + ((seed + i) % 3) - 1);
  }
  g.fillStyle(CASTLE.woodDark, 0.55); g.fillEllipse(-w * 0.3 + ((seed * 37) % 60) / 100 * w * 0.6, h * 0.22, 12 * ui, 6 * ui);
  // Iron bands with rivets at both ends.
  const band = Math.max(8, 12 * ui);
  for (const bx of [-w / 2 + 10 * ui, w / 2 - 10 * ui - band]) {
    g.fillStyle(CASTLE.ironDark, 1); g.fillRect(bx, -h / 2 + 1, band, h - 2);
    g.fillStyle(CASTLE.iron, 1); g.fillRect(bx + 1, -h / 2 + 1, band - 3, h - 2);
    g.fillStyle(CASTLE.ironLight, 1); g.fillCircle(bx + band / 2, -h * 0.26, 2.2 * ui); g.fillCircle(bx + band / 2, h * 0.26, 2.2 * ui);
  }
  if (state === 'right' || state === 'wrong') { g.lineStyle(3 * ui, glow, 1); g.strokeRoundedRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, r + 1); }
  // The word, painted in cream with a dark outline so it reads on the wood.
  const colour = state === 'right' ? 0xd9ffe4 : state === 'wrong' ? 0xffe0e0 : CASTLE.cream;
  const maxW = w - band * 2 - 36 * ui - Math.min(34 * ui, h * 0.45);   // leave the corner for an answer's 🔊
  let t = null;
  for (let px = Math.round(Math.min(fontSize * ui, h * 0.56)); px >= 11; px -= 2) {
    if (t) t.destroy();
    t = scene.add.text(0, 1, String(label), {
      fontFamily: FONT, fontSize: px + 'px', color: hex(colour), fontStyle: WEIGHT.heavy, align: 'center',
      stroke: hex(0x2a1606), strokeThickness: Math.max(3, Math.round(px / 6)), wordWrap: { width: maxW }
    }).setOrigin(0.5);
    if ((t.width || 0) <= maxW + 4 && (t.height || 0) <= h - 10) break;
  }
  c.add([g, t]);
  c.setSize(w, h);
  c.word = t;
  if (state === 'dim') c.setAlpha(0.4);
  if (onTap) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { if (scene.tweens) scene.tweens.add({ targets: c, scale: 0.96, duration: 70, yoyo: true }); onTap(); });
  }
  return c;
}

/** A small heater shield: flat top, straight sides, curving to a point. */
function shieldPoints(x, y, w, h) {
  const pts = [{ x: x - w / 2, y: y - h / 2 }, { x: x + w / 2, y: y - h / 2 }, { x: x + w / 2, y: y }];
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push({ x: x + (w / 2) * Math.cos(a), y: y + (h / 2) * Math.sin(a) }); }
  for (let i = 5; i >= 0; i--) { const a = (i / 6) * (Math.PI / 2); pts.push({ x: x - (w / 2) * Math.cos(a), y: y + (h / 2) * Math.sin(a) }); }
  return pts;
}

/**
 * Row of heraldic shields across rect r, one per sentence: gold for a right answer, cracked for a missed one,
 * plain iron still to come; the current one is outlined. `marks[i]` is true / false once answered.
 */
export function shieldRow(scene, r, marks, total, current, ui) {
  const g = scene.add.graphics();
  const gap = 6 * ui, w = Math.min(30 * ui, (r.w - gap * (total - 1)) / total), h = Math.min(r.h, w * 1.2);
  const x0 = r.x + (r.w - (w * total + gap * (total - 1))) / 2, cy = r.y + r.h / 2;
  const centres = [];
  for (let i = 0; i < total; i++) {
    const x = x0 + i * (w + gap) + w / 2, right = marks[i] === true, missed = marks[i] === false;
    if (right) { g.fillStyle(CASTLE.gold, 0.3); g.fillPoints(shieldPoints(x, cy, w + 6, h + 6), true); }
    g.fillStyle(right ? CASTLE.goldDark : CASTLE.ironDark, 1); g.fillPoints(shieldPoints(x, cy, w, h), true);
    g.fillStyle(right ? CASTLE.gold : missed ? 0x55504a : CASTLE.iron, 1); g.fillPoints(shieldPoints(x, cy, w - 4, h - 4), true);
    if (right) { g.fillStyle(CASTLE.banner, 1); g.fillRect(x - w * 0.08, cy - h * 0.36, w * 0.16, h * 0.62); g.fillRect(x - w * 0.3, cy - h * 0.16, w * 0.6, h * 0.14); }
    if (missed) { g.lineStyle(Math.max(1.5, 2 * ui), CASTLE.wrong, 0.9); g.lineBetween(x - w * 0.2, cy - h * 0.3, x + w * 0.05, cy); g.lineBetween(x + w * 0.05, cy, x - w * 0.05, cy + h * 0.3); }
    if (i === current) { g.lineStyle(2, CASTLE.flame, 1); g.strokePoints(shieldPoints(x, cy, w + 4, h + 4), true); }
    centres.push({ x, y: cy });
  }
  return { g, shields: centres };
}
