// Static dressing of the overworld: shoreline foam, path edges and building shadows baked into one texture,
// the hub signpost, the player's house name plate and the star rows above villagers' houses.
import { TILE } from '../../constants.js';
import * as Store from '../../systems/Store.js';
import { signpost } from '../../ui/Signpost.js';
import { TID, ROOF_TILES, WALL_TILES, DOOR_TILES } from '../../data/world/map.js';
import { NPCS } from '../../data/world/npcs.js';
import { houseStars, effectiveGrade } from '../../systems/Progression.js';
import { bandFor } from '../../data/grades.js';
import { moduleProgress, churchProgress } from '../../systems/Church.js';
import { bellPieces, CHAPTERS } from '../../data/world/story.js';
import { bakeSharp } from '../../ui/Bake.js';

/**
 * One-off overlay baked into a RenderTexture: foam along shorelines, a soft inset edge around paths and
 * shadows cast by buildings. Cheap at runtime (a single texture) and keeps the tileset itself simple.
 */
export function drawDecor(w) {
  const { data, width: W, height: H } = w.map;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : data[y][x]);
  const PATHY = new Set([TID.path, ...DOOR_TILES, TID.gateLocked, TID.gateOpen]);
  const BUILDING = new Set([...WALL_TILES, ...ROOF_TILES, ...DOOR_TILES]);
  const g = w.make.graphics({ add: false });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = at(x, y), px = x * TILE, py = y * TILE;
    if (id === TID.water) {
      g.fillStyle(0xe4f6ff, 0.6);
      if (at(x, y - 1) !== TID.water) g.fillRect(px, py, TILE, 3);
      if (at(x - 1, y) !== TID.water) g.fillRect(px, py, 3, TILE);
      if (at(x + 1, y) !== TID.water) g.fillRect(px + TILE - 3, py, 3, TILE);
      g.fillStyle(0x0b4f8a, 0.3);
      if (at(x, y + 1) !== TID.water) g.fillRect(px, py + TILE - 3, TILE, 3);
    } else if (PATHY.has(id)) {
      g.fillStyle(0x000000, 0.13);
      if (!PATHY.has(at(x, y - 1))) g.fillRect(px, py, TILE, 3);
      if (!PATHY.has(at(x - 1, y))) g.fillRect(px, py, 2, TILE);
      if (!PATHY.has(at(x + 1, y))) g.fillRect(px + TILE - 2, py, 2, TILE);
      if (!PATHY.has(at(x, y + 1))) g.fillRect(px, py + TILE - 2, TILE, 2);
    } else if (BUILDING.has(id)) {
      g.fillStyle(0x000000, 0.22);
      if (!BUILDING.has(at(x + 1, y))) g.fillRect(px + TILE, py + 4, 4, TILE);
      if (!BUILDING.has(at(x, y + 1)) && !DOOR_TILES.includes(id)) g.fillRect(px + 4, py + TILE, TILE, 4);
    }
  }
  bakeSharp(w, g, W * TILE, H * TILE, 1);
  g.destroy();
}

/** The signpost beside Sam (with a post the player cannot walk through) and the name plate on the player's house. */
export function createLandmarks(w, profile) {
  const sign = w.map.signSpot;
  if (sign) {
    const sx = (sign.tx + 0.5) * TILE, sy = (sign.ty + 0.5) * TILE;
    w.signpost = signpost(w, sx, sy).setDepth(11);
    const post = w.add.rectangle(sx, sy - 3, 12, 8).setVisible(false);
    w.physics.add.existing(post, true);
    if (w.player) w.physics.add.collider(w.player, post);
  }
  const home = w.map.home;
  if (home) {
    const cx = (home.x + home.w / 2) * TILE, cy = (home.y - 0.35) * TILE;
    w.homePlate = w.add.text(cx, cy, `${profile.name}'s house`, { fontFamily: 'Fredoka, sans-serif', fontSize: '9px', color: '#2d2a4a', backgroundColor: '#fff8ef', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(4).setResolution(4);
  }
}

/**
 * The bell tower at the top of the plaza: a wooden frame with a roof, and the Academy Bell hanging inside it,
 * drawn piece by piece (crown, left side, right side, clapper) as the bosses give them back. Missing pieces are
 * shown as faint outlines so the goal is always in view. The base cannot be walked through.
 */
export function createBellTower(w) {
  const spot = w.map.bellSpot;
  if (!spot) return;
  const x = (spot.tx + 0.5) * TILE, y = (spot.ty + 1) * TILE - 4;
  w.bellTower = { x, y, g: w.add.graphics().setDepth(4), label: w.add.text(x, y + 4, '', { fontFamily: 'Fredoka, sans-serif', fontSize: '7px', color: '#2d2a4a', backgroundColor: '#fff8ef', padding: { x: 2, y: 1 } }).setOrigin(0.5, 0).setDepth(4).setResolution(4) };
  const post = w.add.rectangle(x, y - 6, 26, 10).setVisible(false);
  w.physics.add.existing(post, true);
  if (w.player) w.physics.add.collider(w.player, post);
  refreshBell(w);
}

export function refreshBell(w) {
  const t = w.bellTower, p = Store.getProfile();
  if (!t || !t.g || !t.g.active || !p) return;
  const g = t.g, x = t.x, y = t.y;
  const have = new Set(bellPieces(p));
  g.clear();
  // Ground shadow, two posts, a crossbeam and a little tiled roof.
  g.fillStyle(0x2d2a4a, 0.16); g.fillEllipse(x, y, 34, 8);
  g.fillStyle(0x7a4a2a, 1); g.fillRect(x - 13, y - 46, 4, 46); g.fillRect(x + 9, y - 46, 4, 46);
  g.fillStyle(0xa8613a, 1); g.fillRect(x - 12, y - 46, 2, 46); g.fillRect(x + 10, y - 46, 2, 46);
  g.fillStyle(0x7a4a2a, 1); g.fillRect(x - 15, y - 48, 30, 4);
  g.fillStyle(0xc45a3c, 1); g.fillTriangle(x - 19, y - 48, x + 19, y - 48, x, y - 60);
  g.fillStyle(0x8a3a24, 1); g.fillTriangle(x - 19, y - 48, x + 19, y - 48, x, y - 50);
  // The bell, piece by piece. Missing pieces: faint dotted ghosts.
  const piece = (id, draw) => { if (have.has(id)) { g.fillStyle(0xffc531, 1); draw(); g.fillStyle(0xe09a12, 0.5); } else { g.fillStyle(0xfff1e8, 0.25); draw(); } };
  const by = y - 40;   // top of the bell body
  piece('crown', () => { g.fillRect(x - 3, by - 6, 6, 4); g.fillEllipse(x, by - 1, 12, 6); });
  piece('left', () => { g.fillPoints([{ x: x - 4, y: by }, { x, y: by }, { x, y: by + 16 }, { x: x - 11, y: by + 16 }, { x: x - 11, y: by + 13 }, { x: x - 6, y: by + 8 }], true); });
  piece('right', () => { g.fillPoints([{ x, y: by }, { x: x + 4, y: by }, { x: x + 6, y: by + 8 }, { x: x + 11, y: by + 13 }, { x: x + 11, y: by + 16 }, { x, y: by + 16 }], true); });
  piece('clapper', () => { g.fillRect(x - 1, by + 12, 2, 6); g.fillCircle(x, by + 19, 2.5); });
  if (have.size === CHAPTERS.length) { g.lineStyle(1, 0xffc531, 0.7); g.strokeCircle(x, by + 8, 16); g.strokeCircle(x, by + 8, 20); }
  t.label.setText(have.size === CHAPTERS.length ? 'The Academy Bell' : `Academy Bell  ${have.size}/${CHAPTERS.length}`);
}

/** Auntie Vee's market stall: a striped awning over a wooden counter piled with fruit, and a little sign. */
export function createMarketStall(w) {
  const spot = w.map.marketSpot;
  if (!spot) return;
  const x = (spot.tx + spot.w / 2) * TILE, y = (spot.ty + spot.h) * TILE - 6;   // x centre, y the counter's base
  const g = w.add.graphics().setDepth(4);
  g.fillStyle(0x2d2a4a, 0.16); g.fillEllipse(x, y + 2, 64, 10);
  g.fillStyle(0x7a4a2a, 1); g.fillRect(x - 28, y - 44, 4, 44); g.fillRect(x + 24, y - 44, 4, 44);   // posts
  g.fillStyle(0xb07a4f, 1); g.fillRoundedRect(x - 30, y - 22, 60, 22, 3);                          // counter
  g.fillStyle(0x7a5033, 1); g.fillRect(x - 30, y - 22, 60, 3);
  const fruit = [[x - 18, y - 26, 0xff8f3f], [x - 6, y - 27, 0xffc531], [x + 8, y - 26, 0x2ec46a], [x + 20, y - 27, 0x8a5a3c]];
  for (const [fx, fy, c] of fruit) { g.fillStyle(0xd6cfc4, 1); g.fillEllipse(fx, fy + 3, 14, 6); g.fillStyle(c, 1); g.fillCircle(fx - 3, fy - 1, 3.5); g.fillCircle(fx + 3, fy - 1, 3.5); g.fillCircle(fx, fy - 4, 3.5); }
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xffffff : 0xff5c6c, 1); g.fillRect(x - 34 + i * 8.5, y - 52, 8.5, 10); }   // striped awning
  g.fillStyle(0xd94656, 1); g.fillRect(x - 34, y - 54, 68, 3);
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xffffff : 0xff5c6c, 1); g.fillTriangle(x - 34 + i * 8.5, y - 42, x - 34 + (i + 1) * 8.5, y - 42, x - 34 + i * 8.5 + 4.25, y - 37); }
  w.add.text(x, y - 60, 'Cheapside Market', { fontFamily: 'Fredoka, sans-serif', fontSize: '7px', color: '#2d2a4a', backgroundColor: '#fff8ef', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(4).setResolution(4);
  const post = w.add.rectangle(x, y - 12, 62, 24).setVisible(false);
  w.physics.add.existing(post, true);
  if (w.player) w.physics.add.collider(w.player, post);
}

/**
 * The Village Church: a stone chapel drawn over its building's tiles. A slate roof with moss, a limestone gable with
 * a small cross, and behind it a white belfry with its bell under a stained-glass dome and an ornate gold cross.
 * The cream limestone front has carved vines, a rose window with "VILLAGE CHURCH" and "LESSONS" carved above and
 * below it, four arched stained-glass windows, an arched oak door with iron hinges, a lantern, flowers and
 * flagstones. The doorway glows. Nothing here blocks the path; the building's own tiles do that.
 * The glass shows what has been learned inside: the four arched windows light up pane by pane for People, Stories,
 * Places and Books, the belfry dome for Memory Verses, and the rose window with everything together.
 */
export function createChurch(w) {
  const c = w.map.church;
  if (!c) return;
  const prof = Store.getProfile();
  const band = prof ? bandFor(effectiveGrade(prof, 'bible')) : 'A';
  const share = (id) => { const pr = prof ? moduleProgress(prof, id, band) : null; return pr && pr.total ? pr.done / pr.total : 0; };
  const overall = (() => { const pr = prof ? churchProgress(prof, band) : null; return pr && pr.total ? pr.done / pr.total : 0; })();
  const PLAIN = 0x9aa6b2;   // glass not yet lit
  const x0 = c.x * TILE, y0 = c.y * TILE, W = c.w * TILE, H = c.h * TILE, cx = x0 + W / 2, bottom = y0 + H;
  const g = w.add.graphics().setDepth(4);
  const shade = (base, k) => { const r = (base >> 16) & 255, gg = (base >> 8) & 255, b = base & 255; const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return (f(r) << 16) | (f(gg) << 8) | f(b); };
  const vary = (i, j) => [0.94, 1.03, 0.98, 1.06, 0.97][(i * 37 + j * 17) % 5];

  // Limestone walls, block by block, with mortar lines and a little moss low down.
  const wl = x0 - 4, wr = x0 + W + 4, wallTop = y0 + 20;
  g.fillStyle(0x2d2a4a, 0.2); g.fillRect(wl + 4, wallTop + 4, wr - wl, bottom - wallTop);
  g.fillStyle(0xc2b393, 1); g.fillRect(wl, wallTop, wr - wl, bottom - wallTop);
  for (let row = 0, y = wallTop; y < bottom; row += 1, y += 8) {
    for (let col = 0, x = wl - (row % 2 ? 7 : 0); x < wr; col += 1, x += 14) {
      const bx = Math.max(wl, x), bw = Math.min(wr, x + 13) - bx;
      if (bw <= 0) continue;
      g.fillStyle(shade(0xe4d9bf, vary(row, col)), 1); g.fillRect(bx, y, bw, Math.min(7, bottom - y));
      g.fillStyle(0xffffff, 0.18); g.fillRect(bx, y, bw, 1);
    }
  }
  g.fillStyle(0x7fa35a, 0.8);
  [[4, -6], [10, -3], [96, -5], [88, -9], [22, -2]].forEach(([dx, dy]) => g.fillCircle(wl + dx, bottom + dy, 1.6));
  // Carved vines curling around the upper windows and the rose.
  g.lineStyle(1, 0xb09a70, 0.9);
  for (const side of [-1, 1]) {
    g.beginPath(); g.arc(cx + side * 22, y0 + 36, 6, side < 0 ? 0.3 : 2.2, side < 0 ? 2.8 : 5.1, side > 0); g.strokePath();
    g.beginPath(); g.arc(cx + side * 22, y0 + 52, 5, side < 0 ? 3.6 : 5.8, side < 0 ? 5.8 : 3.6, side < 0); g.strokePath();
    g.fillStyle(0xb09a70, 1); g.fillCircle(cx + side * 26, y0 + 31, 1.3); g.fillCircle(cx + side * 17, y0 + 56, 1.3);
  }

  // Belfry behind the gable: white stone, an arched opening with the gold bell, a stained-glass dome and the cross.
  const bw = 20, bTop = y0 - 42, bBase = y0 - 8;
  g.fillStyle(0x2d2a4a, 0.18); g.fillRect(cx - bw / 2 + 3, bTop + 3, bw, bBase - bTop);
  g.fillStyle(0xf2eee4, 1); g.fillRect(cx - bw / 2, bTop, bw, bBase - bTop);
  g.fillStyle(0xd9d2c2, 1); g.fillRect(cx + bw / 2 - 4, bTop, 4, bBase - bTop);
  g.fillStyle(0xe6dfcf, 1); g.fillRect(cx - bw / 2 - 2, bTop - 3, bw + 4, 3); g.fillRect(cx - bw / 2 - 2, bBase - 12, bw + 4, 2);
  g.fillStyle(0x3a3a48, 1); g.fillRoundedRect(cx - 5, bTop + 4, 10, 14, { tl: 5, tr: 5, bl: 0, br: 0 });
  g.fillStyle(0xd4a24a, 1); g.fillTriangle(cx - 4, bTop + 16, cx + 4, bTop + 16, cx, bTop + 8); g.fillCircle(cx, bTop + 10, 2.6);
  g.fillStyle(0xf2cf7a, 1); g.fillRect(cx - 4, bTop + 15, 8, 1.5);
  // The dome: a half-ellipse of coloured panes with lead lines.
  const domeH = 17, domeW = bw + 4;
  const panes = [0x2f6fd6, 0x3fb0c0, 0xd94a3a, 0xe0a030, 0x7a4ab8, 0x2e9e6a];
  const domeLit = Math.round(6 * share('verses'));
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i < domeLit ? panes[i] : PLAIN, 1);
    g.slice(cx, bTop - 3, domeW / 2, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI, false); g.fillPath();
  }
  g.fillStyle(0xffffff, 0.25); g.slice(cx, bTop - 3, domeW / 2 - 3, Math.PI * 1.15, Math.PI * 1.45, false); g.fillPath();
  g.lineStyle(1, 0x2d2a3a, 1);
  g.beginPath(); g.arc(cx, bTop - 3, domeW / 2, Math.PI, Math.PI * 2, false); g.strokePath();
  for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; g.lineBetween(cx, bTop - 3, cx + Math.cos(a) * domeW / 2, bTop - 3 + Math.sin(a) * domeW / 2); }
  g.lineBetween(cx - domeW / 2, bTop - 3, cx + domeW / 2, bTop - 3);
  // Ornate gold cross on top.
  const crossBase = bTop - 3 - domeW / 2;
  g.fillStyle(0xc9982e, 1); g.fillRect(cx - 1.5, crossBase - 15, 3, 15); g.fillRect(cx - 6, crossBase - 11, 12, 3);
  g.fillStyle(0xf2cf7a, 1); g.fillCircle(cx, crossBase - 16, 1.8); g.fillCircle(cx - 6, crossBase - 9.5, 1.5); g.fillCircle(cx + 6, crossBase - 9.5, 1.5); g.fillCircle(cx, crossBase - 1, 1.8);
  g.fillStyle(0xf2cf7a, 1); g.fillRect(cx - 0.5, crossBase - 14, 1, 12);

  // Slate roof: rows of grey tiles with lighter edges, moss here and there, and a dark eave over the wall.
  const rl = wl - 5, rr = wr + 5, roofTop = y0 - 10, roofBottom = wallTop + 3;
  for (let row = 0, y = roofTop; y < roofBottom; row += 1, y += 5) {
    for (let col = 0, x = rl - (row % 2 ? 4 : 0); x < rr; col += 1, x += 8) {
      const bx = Math.max(rl, x), bwd = Math.min(rr, x + 7) - bx;
      if (bwd <= 0) continue;
      g.fillStyle(shade(0x6c6f78, vary(row, col)), 1); g.fillRect(bx, y, bwd, 5);
      g.fillStyle(0xffffff, 0.12); g.fillRect(bx, y, bwd, 1);
    }
  }
  g.fillStyle(0x7fa35a, 0.85);
  [[8, 4], [30, 12], [70, 2], [96, 14], [52, 18]].forEach(([dx, dy]) => g.fillEllipse(rl + dx, roofTop + dy, 7, 2.5));
  g.fillStyle(0x3e4047, 1); g.fillRect(rl, roofBottom - 2, rr - rl, 3);
  g.fillStyle(0x000000, 0.18); g.fillRect(wl, roofBottom + 1, wr - wl, 3);

  // Limestone gable over the middle of the front, trimmed, with a small stone cross at its peak.
  const gw = 50, gTop = roofTop - 2;
  g.fillStyle(0x8a8c93, 1); g.fillTriangle(cx - gw / 2 - 3, roofBottom + 1, cx + gw / 2 + 3, roofBottom + 1, cx, gTop - 3);
  g.fillStyle(0xe9e0c8, 1); g.fillTriangle(cx - gw / 2, roofBottom + 1, cx + gw / 2, roofBottom + 1, cx, gTop);
  g.lineStyle(1, 0xc9bc9c, 1); g.beginPath(); g.arc(cx, roofBottom - 5, 6, Math.PI, Math.PI * 2, false); g.strokePath();   // carved fan
  g.fillStyle(0xd8d0bc, 1); g.fillRect(cx - 1.5, gTop - 12, 3, 11); g.fillRect(cx - 4.5, gTop - 9, 9, 3);
  g.fillStyle(0xb8ad94, 1); g.fillRect(cx + 0.5, gTop - 12, 1, 11);

  // Rose window: a stone ring, lead, eight coloured panes and a bright heart.
  const ry = y0 + 43, rr0 = 10;
  g.fillStyle(0xcfc2a2, 1); g.fillCircle(cx, ry, rr0 + 3);
  g.fillStyle(0x2d2a3a, 1); g.fillCircle(cx, ry, rr0 + 1);
  const rose = [0x2f6fd6, 0xe0a030, 0x2e9e6a, 0xd94a3a, 0x3fb0c0, 0x7a4ab8, 0xe0a030, 0x2f6fd6];
  const roseLit = Math.round(8 * overall);
  rose.forEach((col, i) => { g.fillStyle(i < roseLit ? col : PLAIN, 1); g.slice(cx, ry, rr0, (i / 8) * Math.PI * 2 + 0.05, ((i + 1) / 8) * Math.PI * 2 - 0.05, false); g.fillPath(); });
  g.fillStyle(0x2d2a3a, 1); g.fillCircle(cx, ry, 4.5);
  g.fillStyle(overall > 0 ? 0x3fb0c0 : PLAIN, 1); g.fillCircle(cx, ry, 3.5);
  g.fillStyle(0xf2cf7a, 1); g.fillCircle(cx, ry, 1.5);

  // Arched stained-glass windows: two either side, upper and lower.
  const pane = (x, y, ww, hh, seed, lit) => {
    g.fillStyle(0xcfc2a2, 1); g.fillRoundedRect(x - 2, y - 2, ww + 4, hh + 4, { tl: ww / 2 + 2, tr: ww / 2 + 2, bl: 1, br: 1 });
    g.fillStyle(0x2d2a3a, 1); g.fillRoundedRect(x - 1, y - 1, ww + 2, hh + 2, { tl: ww / 2 + 1, tr: ww / 2 + 1, bl: 0, br: 0 });
    const cols = [0x2f6fd6, 0xd94a3a, 0xe0a030, 0x2e9e6a, 0x7a4ab8, 0x3fb0c0];
    // Panes light from the bottom up (six squares, then the round top).
    for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) { const order = (2 - r) * 2 + k; g.fillStyle(order < lit ? cols[(seed + r * 2 + k) % cols.length] : PLAIN, 1); g.fillRect(x + k * (ww / 2) + 0.5, y + r * (hh / 3) + 0.5, ww / 2 - 1, hh / 3 - 1); }
    g.fillStyle(lit >= 7 ? cols[(seed + 4) % cols.length] : PLAIN, 1); g.fillCircle(x + ww / 2, y + ww / 2 - 0.5, ww / 2 - 1);
    g.fillStyle(0xffffff, 0.3); g.fillRect(x + 1, y + 3, 1.5, hh - 5);
  };
  for (const side of [-1, 1]) {
    const [up, low] = side < 0 ? ['people', 'places'] : ['stories', 'books'];
    pane(cx + side * 40 - 5.5, y0 + 27, 11, 17, side < 0 ? 0 : 3, Math.round(7 * share(up)));   // clear of the carved lettering
    pane(cx + side * 40 - 5.5, y0 + 66, 11, 19, side < 0 ? 1 : 4, Math.round(7 * share(low)));
  }

  // Arched oak door in a stone frame, with iron hinges and a keyhole plate.
  const dw = 18, dTop = y0 + 62;
  g.fillStyle(0xcfc2a2, 1); g.fillRoundedRect(cx - dw / 2 - 3, dTop - 3, dw + 6, bottom - dTop + 3, { tl: dw / 2 + 3, tr: dw / 2 + 3, bl: 0, br: 0 });
  g.fillStyle(0x6a4126, 1); g.fillRoundedRect(cx - dw / 2, dTop, dw, bottom - dTop, { tl: dw / 2, tr: dw / 2, bl: 0, br: 0 });
  g.fillStyle(0x7f5232, 1); for (let i = 0; i < 4; i++) g.fillRect(cx - dw / 2 + 1 + i * 4.3, dTop + 4, 3.3, bottom - dTop - 4);
  g.fillStyle(0x2d2a2a, 1);
  for (const hy of [dTop + 8, bottom - 8]) { g.fillRect(cx - dw / 2, hy, dw * 0.7, 2); g.fillCircle(cx - dw / 2 + dw * 0.7, hy + 1, 1.6); }
  g.fillRect(cx + dw / 2 - 5, dTop + 17, 3, 6); g.fillStyle(0xd4a24a, 1); g.fillCircle(cx + dw / 2 - 3.5, dTop + 19, 0.9);
  // A lantern on the wall beside the door.
  const lx = cx + 17, ly = y0 + 70;
  g.fillStyle(0x2d2a2a, 1); g.fillRect(lx - 1, ly - 4, 5, 1.5); g.fillRect(lx - 3, ly - 2, 6, 1.5); g.fillRect(lx - 3, ly + 7, 6, 1.5);
  g.fillStyle(0xffc86b, 1); g.fillRect(lx - 2, ly - 0.5, 4, 7.5);
  g.fillStyle(0xffc86b, 0.25); g.fillCircle(lx, ly + 3, 7);

  // Flagstones by the door and flowers along the foot of the wall.
  g.fillStyle(0xbfb8aa, 1);
  [[20, 5, 9, 5], [30, 11, 8, 5], [40, 4, 10, 6], [52, 12, 8, 5]].forEach(([dx, dy, ww, hh]) => g.fillEllipse(cx + dx, bottom + dy, ww, hh));
  g.fillStyle(0x9a9385, 0.6);
  [[20, 6, 7, 2], [40, 6, 8, 2]].forEach(([dx, dy, ww, hh]) => g.fillEllipse(cx + dx, bottom + dy, ww, hh));
  const flower = (x, y, col) => { g.fillStyle(0x4f7a3a, 1); g.fillRect(x - 0.5, y, 1, 5); g.fillEllipse(x - 2, y + 4, 4, 2); g.fillStyle(col, 1); g.fillCircle(x, y, 1.8); };
  [[wl + 3, 0x9b59c7], [wl + 8, 0xc77adb], [wr - 4, 0x9b59c7], [wr - 9, 0xe0a0e8], [wr - 14, 0x9b59c7]].forEach(([fx, col], i) => flower(fx, bottom - 6 - (i % 2) * 2, col));

  // The carved lettering around the rose window.
  const carve = (str, y) => {
    w.add.text(cx + 0.5, y + 0.5, str, { fontFamily: 'Fredoka, sans-serif', fontSize: '6px', color: '#f6efdd', fontStyle: '700' }).setOrigin(0.5).setDepth(4).setResolution(4);
    w.add.text(cx, y, str, { fontFamily: 'Fredoka, sans-serif', fontSize: '6px', color: '#7a6644', fontStyle: '700' }).setOrigin(0.5).setDepth(4).setResolution(4);
  };
  carve('VILLAGE CHURCH', y0 + 28);
  carve('LESSONS', y0 + 58);

  // Warm light spilling out of the doorway, gently pulsing.
  const glow = w.add.ellipse(cx, bottom + 2, 26, 9, 0xffc86b, 0.35).setDepth(3);
  w.tweens.add({ targets: glow, alpha: 0.12, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}

/** Three small stars above every villager's house, lit as the game's levels are passed. */
export function createHouseStars(w) {
  w.houseStarSprites = {};
  for (const npc of NPCS) {
    if (!npc.gameId) continue;
    const spot = w.map.npcSpots[npc.id];
    const b = spot && w.map.buildings.find((x) => x.door && x.door.tx === spot.tx && x.door.ty === spot.ty - 1);
    if (!b) continue;
    const cx = (b.x + b.w / 2) * TILE, cy = (b.y - 0.35) * TILE;
    w.houseStarSprites[npc.gameId] = [0, 1, 2].map((i) => w.add.image(cx + (i - 1) * 11, cy, 'star-off').setDisplaySize(10, 10).setDepth(4));
  }
  refreshHouseStars(w);
}

export function refreshHouseStars(w) {
  const p = Store.getProfile();
  if (!p) return;
  for (const [gameId, imgs] of Object.entries(w.houseStarSprites || {})) {
    const n = houseStars(p, gameId);
    imgs.forEach((img, i) => { if (img.active) img.setTexture(i < n ? 'star' : 'star-off'); });
  }
}
