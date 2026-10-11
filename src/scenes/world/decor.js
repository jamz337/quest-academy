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
import { FONT } from '../../ui/TextStyles.js';

/**
 * One-off overlay baked into a RenderTexture: foam along shorelines, a soft inset edge around paths and
 * shadows cast by buildings. Cheap at runtime (a single texture) and keeps the tileset itself simple.
 */
export function drawDecor(w) {
  const { data, width: W, height: H } = w.map;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : data[y][x]);
  const PATHY = new Set([TID.path, TID.plinth, ...DOOR_TILES, TID.gateLocked, TID.gateOpen]);
  const BUILDING = new Set([...WALL_TILES, ...ROOF_TILES, ...DOOR_TILES]);
  const g = w.make.graphics({ add: false });
  // Shorelines and road edges are part of the painted terrain pieces now (systems/Terrain.js); only shadows remain.
  void PATHY;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = at(x, y), px = x * TILE, py = y * TILE;
    if (BUILDING.has(id)) {
      g.fillStyle(0x000000, 0.22);
      if (!BUILDING.has(at(x + 1, y))) g.fillRect(px + TILE, py + 4, 4, TILE);
      if (!BUILDING.has(at(x, y + 1)) && !DOOR_TILES.includes(id)) g.fillRect(px + 4, py + TILE, TILE, 4);
    }
  }
  drawTrail(w, g);
  bakeSharp(w, g, W * TILE, H * TILE, 1);
  g.destroy();
}

/**
 * Math Meadow's Number Trail: the plank bridge over the river, a numbered stepping stone every few steps (the
 * numbers are text on top) and a little something by each game's house: a start flag, balloons, a pizza sign.
 */
function drawTrail(w, g) {
  const { trail, bridge, npcSpots, fishSign } = w.map;
  if (fishSign) {   // "you can fish here": a fish on a board by the river bank
    const x = (fishSign.tx + 0.5) * TILE, y = (fishSign.ty + 0.5) * TILE;
    g.fillStyle(0x000000, 0.15); g.fillEllipse(x, y + 12, 12, 3);
    g.fillStyle(0x6e4a28, 1); g.fillRect(x - 1, y - 4, 2, 16);
    g.fillStyle(0x8f6238, 1); g.fillRoundedRect(x - 11, y - 14, 22, 13, 2.5);
    g.fillStyle(0xf4e3c1, 1); g.fillRoundedRect(x - 9.5, y - 12.5, 19, 10, 2);
    g.fillStyle(0x4c8df6, 1); g.fillEllipse(x - 1, y - 7.5, 10, 5.5); g.fillTriangle(x + 3, y - 7.5, x + 7.5, y - 10.5, x + 7.5, y - 4.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(x - 3.5, y - 8.2, 0.9);
  }
  if (bridge) {
    const x = bridge.tx * TILE, y = bridge.ty * TILE, h = bridge.h * TILE;
    g.fillStyle(0x0b4f8a, 0.25); g.fillRect(x - 3, y + 3, TILE + 6, h);                     // its shadow on the water
    g.fillStyle(0xb98552, 1); g.fillRect(x - 2, y - 2, TILE + 4, h + 4);
    g.fillStyle(0x8f6238, 1); for (let py = y + 4; py < y + h; py += 8) g.fillRect(x - 2, py, TILE + 4, 1.5);   // gaps between planks
    g.fillStyle(0x6e4a28, 1); g.fillRoundedRect(x - 5, y - 4, 5, h + 8, 2); g.fillRoundedRect(x + TILE, y - 4, 5, h + 8, 2);   // rails
    g.fillStyle(0xd9a770, 1); g.fillRect(x - 4, y - 3, 1.5, h + 6); g.fillRect(x + TILE + 1, y - 3, 1.5, h + 6);
  }
  for (const s of trail || []) {
    const cx = (s.tx + 0.5) * TILE, cy = (s.ty + 0.5) * TILE;
    g.fillStyle(0x000000, 0.18); g.fillEllipse(cx, cy + 2.5, 22, 19);
    g.fillStyle(0x2e63d6, 1); g.fillEllipse(cx, cy, 22, 19);
    g.fillStyle(0xffffff, 1); g.fillEllipse(cx, cy - 0.5, 18.5, 15.5);
  }
  const beside = (id) => (npcSpots[id] ? { x: (npcSpots[id].tx + 1.5) * TILE, y: (npcSpots[id].ty - 0.5) * TILE } : null);
  const post = (p) => { g.fillStyle(0x6e4a28, 1); g.fillRect(p.x - 1, p.y - 14, 2, 26); g.fillStyle(0x000000, 0.15); g.fillEllipse(p.x, p.y + 12, 10, 3); };
  const flag = beside('prof-plus');         // Number Dash: a chequered start flag
  if (flag) {
    post(flag);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.fillStyle((r + c) % 2 ? 0x1e1b4b : 0xffffff, 1); g.fillRect(flag.x + 1 + c * 3.5, flag.y - 14 + r * 3.5, 3.5, 3.5); }
  }
  const fair = beside('balloon-seller');    // Balloon Pop: a bunch of balloons
  if (fair) {
    post(fair);
    [[-6, -20, 0xff5c6c], [5, -22, 0xffc531], [0, -29, 0x4c8df6], [9, -14, 0x2ec46a]].forEach(([dx, dy, col]) => {
      g.lineStyle(0.6, 0x6e6357, 0.8); g.lineBetween(fair.x, fair.y - 10, fair.x + dx, fair.y + dy + 5);
      g.fillStyle(col, 1); g.fillEllipse(fair.x + dx, fair.y + dy, 9, 11);
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(fair.x + dx - 1.5, fair.y + dy - 2.5, 2.5, 3.5);
    });
  }
  const pizza = beside('chef-fraction');    // Fraction Pizza: a pizza on a signpost, one slice taken
  if (pizza) {
    post(pizza);
    g.fillStyle(0xd98a3a, 1); g.fillCircle(pizza.x, pizza.y - 18, 9);
    g.fillStyle(0xffd75e, 1); g.fillCircle(pizza.x, pizza.y - 18, 7.2);
    g.fillStyle(0xe8623f, 1); [[-3, -2], [2.5, -3.5], [-1, 3], [3.5, 2]].forEach(([dx, dy]) => g.fillCircle(pizza.x + dx, pizza.y - 18 + dy, 1.5));
    g.fillStyle(0xfff6e6, 1); g.slice(pizza.x, pizza.y - 18, 9.5, -Math.PI / 2, -Math.PI / 6, false); g.fillPath();
  }
}

/** The numbers on the trail's stepping stones (text, so they stay crisp). */
export function createTrailNumbers(w) {
  for (const s of w.map.trail || []) {
    w.add.text((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE - 0.5, String(s.n), { fontFamily: FONT, fontSize: s.n > 9 ? '9px' : '10px', color: '#2e63d6', fontStyle: '700' }).setOrigin(0.5).setDepth(1.5).setResolution(6);
  }
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
 * drawn piece by piece (yoke, crown, left side, right side, rope, clapper) as the bosses give them back. Missing pieces are
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
  g.lineStyle(1.3, 0x4a3320, 1); g.strokeRect(x - 13, y - 46, 4, 46); g.strokeRect(x + 9, y - 46, 4, 46); g.strokeRect(x - 15, y - 48, 30, 4); g.lineStyle(1.3, 0x6e2a18, 1); g.strokeTriangle(x - 19, y - 48, x + 19, y - 48, x, y - 60);
  // The bell, piece by piece. Missing pieces: faint dotted ghosts.
  const piece = (id, draw) => { if (have.has(id)) { g.fillStyle(0xffc531, 1); draw(); g.fillStyle(0xe09a12, 0.5); } else { g.fillStyle(0xfff1e8, 0.25); draw(); } };
  const by = y - 40;   // top of the bell body
  piece('yoke', () => { g.fillRect(x - 14, by - 10, 28, 3); g.fillRect(x - 14, by - 10, 3, 5); g.fillRect(x + 11, by - 10, 3, 5); });   // the beam the bell hangs from
  piece('crown', () => { g.fillRect(x - 3, by - 6, 6, 4); g.fillEllipse(x, by - 1, 12, 6); });
  piece('left', () => { g.fillPoints([{ x: x - 4, y: by }, { x, y: by }, { x, y: by + 16 }, { x: x - 11, y: by + 16 }, { x: x - 11, y: by + 13 }, { x: x - 6, y: by + 8 }], true); });
  piece('right', () => { g.fillPoints([{ x, y: by }, { x: x + 4, y: by }, { x: x + 6, y: by + 8 }, { x: x + 11, y: by + 13 }, { x: x + 11, y: by + 16 }, { x, y: by + 16 }], true); });
  piece('clapper', () => { g.fillRect(x - 1, by + 12, 2, 6); g.fillCircle(x, by + 19, 2.5); });
  piece('rope', () => { g.fillRect(x + 13, by - 5, 2, 26); g.fillCircle(x + 14, by + 22, 2.5); });   // the bell rope, hanging from the yoke
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
  g.lineStyle(1.3, 0x4a3320, 1); g.strokeRect(x - 28, y - 42, 4, 42); g.strokeRect(x + 24, y - 42, 4, 42); g.strokeRoundedRect(x - 30, y - 22, 60, 22, 3);
  g.lineStyle(1.2, 0xa8323f, 1); g.strokeRect(x - 34, y - 54, 68, 12);
  for (let i = 0; i < 8; i++) g.strokeTriangle(x - 34 + i * 8.5, y - 42, x - 34 + (i + 1) * 8.5, y - 42, x - 34 + i * 8.5 + 4.25, y - 37);
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
/**
 * History Harbor's dressing: the sea wall and bollards round the island, boats at the moorings, rails along the
 * pier, and what each villager has put up: Captain Compass's weathervane, Mayor Marigold's clock and flag, Flora's
 * bunting, the lighthouse beside Old Tom's house, and the flag over the Admiral's fort.
 */
export function createHarbour(w) {
  const m = w.map, isl = m.island;
  if (!isl) return;
  const low = w.add.graphics().setDepth(1.6);   // flat on the ground, under the player
  const high = w.add.graphics().setDepth(4);    // things that stand up, drawn over the player
  const x0 = isl.x * TILE, y0 = isl.y * TILE, x1 = (isl.x + isl.w) * TILE, y1 = (isl.y + isl.h) * TILE;

  // The sea wall: a stone kerb round the quay, bollards along the top with a rope slung between them.
  low.fillStyle(0x6f7a86, 1); low.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, 6); low.fillRect(x0 - 4, y1 - 2, x1 - x0 + 8, 6); low.fillRect(x0 - 4, y0 - 4, 6, y1 - y0 + 8); low.fillRect(x1 - 2, y0 - 4, 6, y1 - y0 + 8);
  low.fillStyle(0xaab3bd, 1); low.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, 2); low.fillRect(x0 - 4, y1 - 2, x1 - x0 + 8, 2); low.fillRect(x0 - 4, y0 - 4, 2, y1 - y0 + 8); low.fillRect(x1 - 2, y0 - 4, 2, y1 - y0 + 8);
  const pierX = m.pier ? m.pier.tx : -1;
  let last = null;
  for (let tx = isl.x + 1; tx < isl.x + isl.w; tx += 3) {
    const bx = (tx + 0.5) * TILE, by = y0 + 1;
    if (Math.abs(tx - pierX) > 1) {
      if (last !== null && bx - last < 4 * TILE) { low.lineStyle(1, 0x8b6b3e, 1); low.lineBetween(last, by, (last + bx) / 2, by + 5); low.lineBetween((last + bx) / 2, by + 5, bx, by); }
      low.fillStyle(0x2d2a4a, 1); low.fillCircle(bx, by + 1, 2.8); low.fillStyle(0x5a5674, 1); low.fillCircle(bx, by, 2.1);
      last = bx;
    } else last = null;
  }

  // Boats tied up along the sea wall and at the west jetty.
  const boat = (cx, cy, hull, sail) => {
    low.fillStyle(0x0b4f8a, 0.25); low.fillEllipse(cx + 2, cy + 7, 30, 8);
    low.fillStyle(hull, 1); low.fillPoints([{ x: cx - 15, y: cy }, { x: cx + 15, y: cy }, { x: cx + 10, y: cy + 8 }, { x: cx - 10, y: cy + 8 }], true);
    low.fillStyle(0xf6efdd, 1); low.fillRect(cx - 13, cy - 1, 26, 2);
    low.fillStyle(0x6e4a28, 1); low.fillRect(cx - 1, cy - 20, 2, 20);
    low.fillStyle(sail, 1); low.fillTriangle(cx + 1, cy - 19, cx + 12, cy - 6, cx + 1, cy - 4);
  };
  boat((isl.x + 4.5) * TILE, y0 - 14, 0xd94a4a, 0xffffff); boat((isl.x + 9.5) * TILE, y0 - 13, 0x3d8bff, 0xfcd116); boat((isl.x + 28.5) * TILE, y0 - 14, 0x2e9e6a, 0xffffff);
  if (m.jetty) { boat((m.jetty.x0 + 1) * TILE, (m.jetty.ty - 0.6) * TILE, 0xffc531, 0xffffff); boat((m.jetty.x0 + 2.5) * TILE, (m.jetty.ty + 1.4) * TILE, 0xd94a4a, 0x3d8bff); }

  // Rails along the pier, and plank lines across it.
  if (m.pier) {
    const px = m.pier.tx * TILE, top = m.pier.y0 * TILE, bottom = (m.pier.y1 + 1) * TILE;
    low.fillStyle(0x000000, 0.08); for (let y = top + 6; y < bottom; y += 8) low.fillRect(px + 2, y, TILE - 4, 1.5);
    low.fillStyle(0x8b6b3e, 1); low.fillRect(px + 2, top, 2, bottom - top); low.fillRect(px + TILE - 4, top, 2, bottom - top);
    for (let y = top + 4; y < bottom; y += 16) { low.fillRect(px + 1, y, 4, 6); low.fillRect(px + TILE - 5, y, 4, 6); }
  }

  // The villagers' houses: the roof is three tiles above the spot, the eaves one tile lower.
  const house = (id) => { const s = m.npcSpots[id]; return s ? { cx: (s.tx + 0.5) * TILE, top: (s.ty - 3) * TILE, eaves: (s.ty - 2) * TILE, left: (s.tx - 1) * TILE, right: (s.tx + 2) * TILE } : null; };
  const cc = house('captain-compass');   // a weathervane: pole, crossbar, gold arrow
  if (cc) {
    high.fillStyle(0x2d2a4a, 1); high.fillRect(cc.cx - 1, cc.top - 14, 2, 20); high.fillRect(cc.cx - 7, cc.top - 8, 14, 1.5);
    high.fillStyle(0xffc531, 1); high.fillTriangle(cc.cx + 9, cc.top - 8, cc.cx + 2, cc.top - 11.5, cc.cx + 2, cc.top - 4.5); high.fillRect(cc.cx - 9, cc.top - 9, 7, 2); high.fillCircle(cc.cx, cc.top - 15, 2);
  }
  const mm = house('mayor-marigold');    // a clock on the gable and the national flag on a pole
  if (mm) {
    high.fillStyle(0x1f3d75, 1); high.fillCircle(mm.cx, mm.top + 13, 8); high.fillStyle(0xffffff, 1); high.fillCircle(mm.cx, mm.top + 13, 6.5);
    high.lineStyle(1.2, 0x1f3d75, 1); high.lineBetween(mm.cx, mm.top + 13, mm.cx, mm.top + 8.5); high.lineBetween(mm.cx, mm.top + 13, mm.cx + 3.5, mm.top + 14.5);
    high.fillStyle(0x2d2a4a, 1); high.fillRect(mm.right - 7, mm.top - 20, 2, 26);
    high.fillStyle(0x00267f, 1); high.fillRect(mm.right - 5, mm.top - 20, 12, 8); high.fillStyle(0xffc726, 1); high.fillRect(mm.right - 1, mm.top - 20, 4, 8); high.fillStyle(0x000000, 1); high.fillRect(mm.right, mm.top - 18, 2, 4);
  }
  const fl = house('flora');             // bunting across the front
  if (fl) {
    high.lineStyle(1, 0x5a4634, 1); high.lineBetween(fl.left + 1, fl.eaves - 1, fl.right - 1, fl.eaves + 2);
    const cols = [0xd94a4a, 0xfcd116, 0x2e9e6a, 0x3d8bff, 0xffffff];
    for (let i = 0, x = fl.left + 4; x < fl.right - 4; i++, x += 8) { const y = fl.eaves + (i * 3) / ((fl.right - fl.left) / 8); high.fillStyle(cols[i % cols.length], 1); high.fillTriangle(x, y, x + 6, y, x + 3, y + 6); }
  }
  if (m.lighthouse) {                    // the lighthouse: white tower, red bands, a lamp room and a lit lamp
    const lx = (m.lighthouse.tx + 0.5) * TILE, base = (m.lighthouse.ty + 1) * TILE - 2, h = 50;
    w.add.ellipse(lx, base - h + 4, 30, 10, 0xffe8a3, 0.35).setDepth(3);
    high.fillStyle(0x2d2a4a, 0.18); high.fillEllipse(lx + 2, base + 1, 22, 6);
    high.fillStyle(0xf4f1ea, 1); high.fillPoints([{ x: lx - 9, y: base }, { x: lx + 9, y: base }, { x: lx + 6, y: base - h + 12 }, { x: lx - 6, y: base - h + 12 }], true);
    high.fillStyle(0xd94a4a, 1); high.fillRect(lx - 8, base - 12, 16, 7); high.fillRect(lx - 7, base - 30, 14, 7);
    high.fillStyle(0x2d2a4a, 1); high.fillRect(lx - 9, base - h + 10, 18, 3);                       // the gallery
    high.fillStyle(0xffd75e, 1); high.fillRect(lx - 4, base - h + 3, 8, 7); high.fillStyle(0x2d2a4a, 1); high.fillRect(lx - 5, base - h + 2, 1.5, 9); high.fillRect(lx + 3.5, base - h + 2, 1.5, 9);
    high.fillStyle(0xd94a4a, 1); high.fillTriangle(lx - 7, base - h + 2, lx + 7, base - h + 2, lx, base - h - 6);
  }
  const fort = (m.buildings || []).find((b) => b.style === 'fort');
  if (fort) {                            // the Admiral's flag on the fort's corner tower
    const fx = (fort.x + 0.5) * TILE, fy = fort.y * TILE;
    high.fillStyle(0x2d2a4a, 1); high.fillRect(fx - 1, fy - 22, 2, 26);
    high.fillStyle(0x1f3d75, 1); high.fillRect(fx + 1, fy - 22, 14, 9); high.fillStyle(0xffc531, 1); high.fillCircle(fx + 8, fy - 17.5, 2.2);
  }
}

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
