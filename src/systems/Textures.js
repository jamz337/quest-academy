// Every texture the game uses is generated here at boot from tiny pixel maps and Graphics calls.
// To swap in real art later, load spritesheets with the same keys and frame layout and skip the generator.
import Phaser from 'phaser';
import { TILE, AVATAR_COUNT } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { mulberry32 } from './Rng.js';
import { OUTLINE, MOUTH, BOOTS, CHARACTER_STYLES, NPC_STYLES, lookId } from '../data/avatars.js';
export { CHARACTER_STYLES, NPC_STYLES };
import { FRAME, PIXEL_FRAME, drawMonkey, pixelate, MONKEY_FRAMES } from '../ui/FlatCharacter.js';
import { LPC_FRAME, LPC_COLS, allLayerPaths, composeSheet, drawOutfitBack, drawOutfitFront, drawBustFromSheet, walkRange } from '../ui/LpcCharacter.js';
export { WORLD_SCALE as CHAR_WORLD_SCALE, IDLE_FRAMES } from '../ui/LpcCharacter.js';

const SHADOW = 'rgba(0,0,0,0.22)';
const PAL = {
  '.': null, k: OUTLINE, w: '#ffffff', s: '#ffd6b3', h: '#a8613a', t: '#7a4a2a', r: '#ff5c6c', b: '#3d8bff',
  n: '#2d2a4a', g: '#8fe07c', G: '#4fb84f', D: '#2f8a3a', y: '#ffc531', o: '#ff8f3f', p: '#ff6fae', l: '#8b7fd6',
  d: '#625f7e', c: '#d6cfc4', v: '#7c5cff', x: SHADOW,
  O: '#7d8f3c', f: '#f4dfc2', m: '#3a2a1a'   // Mango: olive coat, pale face, dark hands and feet
};

/** Darken (f < 1) or lighten (f > 1) a '#rrggbb' string. */
export function shade(hexStr, f = 0.7) {
  const n = parseInt(hexStr.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Paint rows of a pixel map (equal-length strings) onto a canvas context. */
function blit(ctx, rows, x0, y0, scale = 1, palette = PAL) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = palette[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
    });
  });
}

/** Draw frames (arrays of equal-length strings) side by side into one canvas texture with numbered frames. */
export function pixelTexture(scene, key, frames, palette = PAL, scale = 1) {
  if (scene.textures.exists(key)) return;
  const fh = frames[0].length, fw = frames[0][0].length;
  const tex = scene.textures.createCanvas(key, fw * scale * frames.length, fh * scale);
  const ctx = tex.getContext();
  frames.forEach((rows, fi) => {
    blit(ctx, rows, fi * fw * scale, 0, scale, palette);
    tex.add(fi, 0, fi * fw * scale, 0, fw * scale, fh * scale);
  });
  tex.refresh();
}

// ---- Characters from the Liberated Pixel Cup pack ----------------------------------------------------

const composed = new Map();   // lookId(+outfit) -> composed 576 x 256 canvas

/** The pack's layer images, as loaded by BootScene ('lpc:' + path). */
function lpcImages(scene) {
  const out = {};
  for (const p of allLayerPaths()) { const k = 'lpc:' + p; if (scene.textures.exists(k)) out[p] = scene.textures.get(k).getSourceImage(); }
  return out;
}

/** A look composed into one walking sheet (cached), with any worn market items and the special body drawn on. */
export function composeLookCanvas(scene, look, outfit = null, outfitKey = '') {
  const key = lookId(look) + '|' + outfitKey;
  if (composed.has(key)) return composed.get(key);
  const W = LPC_COLS * LPC_FRAME, H = 4 * LPC_FRAME;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const sheet = document.createElement('canvas'); sheet.width = W; sheet.height = H;
  const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
  composeSheet(sheet.getContext('2d', { willReadFrequently: true }), look, lpcImages(scene), scratch);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawOutfitBack(ctx, outfit);
  ctx.drawImage(sheet, 0, 0);
  drawOutfitFront(ctx, outfit, look.body || null);
  composed.set(key, canvas);
  return canvas;
}

/**
 * Character sheet texture: 36 frames of 64 px (row * 9 + column; rows up, left, down, right; column 0 standing,
 * 1..8 walking), shown at WORLD_SCALE in the world. opts: { outfit, outfitKey }.
 */
export function characterTexture(scene, key, look, scale = 1, opts = null) {
  if (scene.textures.exists(key)) return;
  const W = LPC_COLS * LPC_FRAME, H = 4 * LPC_FRAME;
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(composeLookCanvas(scene, look, opts && opts.outfit, (opts && opts.outfitKey) || ''), 0, 0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < LPC_COLS; c++) tex.add(r * LPC_COLS + c, 0, c * LPC_FRAME, r * LPC_FRAME, LPC_FRAME, LPC_FRAME);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  void scale;
}

// The robot rotates in the maze, so it has no ground shadow.
const ROBOT = [
  '.......kk.......', '......kyyk......', '.......kk.......', '...kkkkkkkkkk...',
  '...kcccccccck...', '...kcbbbbbbck...', '...kcbkbbkbck...', '...kcbbbbbbck...',
  '...kcccccccck...', '..kyccccccccyk..', '...kcccccccck...', '...kkkkkkkkkk...',
  '....kddkkddk....', '....kddkkddk....', '....kddkkddk....', '................'
];
const ROBOT2 = ROBOT.map((r, i) => (i >= 12 && i <= 14 ? '...kddk..kddk...' : r));

// The wandering sheep (faces left; flipX for right). Two walk frames swap the legs.
const SHEEP = [
  '................', '.....wwwwww.....', '....wwwwwwww....', '...wwwwwwwwww...',
  '..kkwwwwwwwwww..', '.kkkkwwwwwwwwww.', '.kckkwwwwwwwwww.', '.kkkkwwwwwwwwww.',
  '..kkwwwwwwwwwww.', '...wwwwwwwwwww..', '....wwwwwwwww...', '....kk...kk.....',
  '....kk...kk.....', '....xxxxxxxx....', '................', '................'
];
const SHEEP2 = SHEEP.map((r, i) => (i === 11 || i === 12 ? '...kk.....kk....' : r));

// The bunny: tall ears with pink insides, a pink nose and a white tail. Faces left.
const BUNNY = [
  '................', '..kk..kk........', '.kpckkpck.......', '.kpckkpck.......',
  '.kcckkcck.......', '.kccccccck......', '.kckcccccckkkk..', '.kccccccccccccck',
  '.kpcccccccccccwk', '..kcccccccccccwk', '...kkccccccccck.', '....kcck..kcck..',
  '....kkkk..kkkk..', '....xxxxxxxxxx..', '................', '................'
];
const BUNNY2 = BUNNY.map((r, i) => (i === 11 ? '...kcck....kcck.' : i === 12 ? '...kkkk....kkkk.' : r));



/** Tileset 'tiles' with TILE x TILE frames: see TILE_IDS. */
export const TILE_IDS = {
  grass: 0, path: 1, water: 2, tree: 3, wall: 4, door: 5, flower: 6, meadow: 7, woods: 8, cove: 9, gateLocked: 10, gateOpen: 11, roof: 12,
  roofMath: 13, wallMath: 14, doorMath: 15, roofWords: 16, wallWords: 17, doorWords: 18, roofCode: 19, wallCode: 20, doorCode: 21,
  roofBible: 22, wallBible: 23, doorBible: 24, castleTop: 25, castleWall: 26, castleDoor: 27, village: 28,
  flower2: 29, flower3: 30, flower4: 31, flower5: 32, flower6: 33,
  meadow2: 34, meadow3: 35, meadow4: 36, meadow5: 37, meadow6: 38, meadow7: 39, meadow8: 40
};
/** Flower and daisy patches come in several looks; the world picks one per map square so no two neighbours match. */
export const FLOWER_TILES = [6, 29, 30, 31, 32, 33], MEADOW_TILES = [7, 34, 35, 36, 37, 38, 39, 40];

const px = (ctx, x, y, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
// Smooth-shape helpers. Tiles are painted in a 32-unit space that the tileset scales up (see tilesTexture), so
// circles, curves and rounded shapes come out smooth instead of blocky.
const disc = (ctx, x, y, r, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; };
const oval = (ctx, x, y, rx, ry, col, a = 1, rot = 0) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; };
const stroke = (ctx, pts, col, w = 1, a = 1) => {
  ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke(); ctx.globalAlpha = 1;
};
/** A spot well inside the tile, so nothing is cut off at a tile edge. */
const inside = (rnd, m = 4) => m + rnd() * (TILE - m * 2);

/** Grass-like ground: base colour, soft darker patches, little fans of blades and a few light specks. */
function grassTile(ctx, x0, rnd, base, dark, light, tufts = 7) {
  px(ctx, x0, 0, base, TILE, TILE);
  for (let i = 0; i < 3; i++) oval(ctx, x0 + inside(rnd, 8), inside(rnd, 8), 5 + rnd() * 3, 3 + rnd() * 2, dark, 0.1, rnd() * 3);
  for (let i = 0; i < tufts; i++) {
    const x = x0 + inside(rnd), y = inside(rnd, 5);
    stroke(ctx, [x, y, x - 1.6, y - 2.6], dark, 0.9); stroke(ctx, [x, y, x, y - 3.4], dark, 0.9); stroke(ctx, [x, y, x + 1.6, y - 2.6], dark, 0.9);
  }
  for (let i = 0; i < 4; i++) disc(ctx, x0 + inside(rnd, 3), inside(rnd, 3), 0.7, light, 0.8);
}

function pathTile(ctx, x0, rnd, base = '#e6c58a', dark = '#cfa96a', light = '#f4dca8') {
  px(ctx, x0, 0, base, TILE, TILE);
  for (let i = 0; i < 2; i++) oval(ctx, x0 + inside(rnd, 8), inside(rnd, 8), 6, 3.5, dark, 0.12, rnd() * 3);
  for (let i = 0; i < 5; i++) {
    const x = x0 + inside(rnd), y = inside(rnd), r = 1.3 + rnd() * 0.9;
    oval(ctx, x, y, r * 1.3, r, dark, 1, rnd() * 3); oval(ctx, x - 0.4, y - 0.4, r * 0.6, r * 0.4, light, 0.9);
  }
  for (let i = 0; i < 6; i++) disc(ctx, x0 + inside(rnd, 3), inside(rnd, 3), 0.6, light, 0.9);
}

function waterTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#4aa8ff', TILE, TILE);
  for (let i = 0; i < 3; i++) oval(ctx, x0 + inside(rnd, 8), inside(rnd, 7), 6 + rnd() * 2, 2.2, '#3a8fe0', 0.45);
  [[9, 7], [22, 14], [10, 23], [23, 27]].forEach(([wx, wy]) => {
    stroke(ctx, [x0 + wx - 3.5, wy, x0 + wx - 1.5, wy - 1.6, x0 + wx, wy], '#d6efff', 1, 0.95);
    stroke(ctx, [x0 + wx, wy, x0 + wx + 1.5, wy + 1.6, x0 + wx + 3.5, wy], '#d6efff', 1, 0.95);
  });
}

function sandTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#f3e2ad', TILE, TILE);
  for (let i = 0; i < 2; i++) oval(ctx, x0 + inside(rnd, 8), inside(rnd, 8), 6, 3, '#dcc88e', 0.22, rnd() * 3);
  for (let i = 0; i < 8; i++) disc(ctx, x0 + inside(rnd, 3), inside(rnd, 3), 0.6, '#dcc88e');
  for (let i = 0; i < 3; i++) disc(ctx, x0 + inside(rnd, 3), inside(rnd, 3), 0.6, '#fff8e0');
  // a tiny shell
  ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.moveTo(x0 + 23, 23); ctx.arc(x0 + 23, 23, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
  stroke(ctx, [x0 + 23, 23, x0 + 21.6, 21], '#dcc88e', 0.5); stroke(ctx, [x0 + 23, 23, x0 + 23, 20.5], '#dcc88e', 0.5); stroke(ctx, [x0 + 23, 23, x0 + 24.4, 21], '#dcc88e', 0.5);
}

/** A round leafy tree with a short trunk and a soft shadow (transparent around it: it sits on the tree overlay layer). */
function treeTile(ctx, x0) {
  oval(ctx, x0 + 16, 29.2, 8, 2.2, '#1e1b4b', 0.18);
  ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.roundRect(x0 + 13.6, 19, 4.8, 10.6, 1.6); ctx.fill();
  ctx.fillStyle = '#a06a3e'; ctx.beginPath(); ctx.roundRect(x0 + 13.6, 19, 2.2, 10.6, 1.2); ctx.fill();
  const blobs = [[16, 12, 10.2], [9, 15.5, 6.6], [23, 15.5, 6.6], [16, 18, 7]];
  blobs.forEach(([bx, by, r]) => disc(ctx, x0 + bx, by, r + 0.9, '#1f6b3a'));        // the darker rim
  blobs.forEach(([bx, by, r]) => disc(ctx, x0 + bx, by, r, '#2f9a4f'));
  [[14.5, 10, 7.6], [9, 14, 4.4], [22, 14, 4.4]].forEach(([bx, by, r]) => disc(ctx, x0 + bx, by, r, '#46b862'));
  [[12.5, 7.5, 3.4], [8, 12.8, 1.9], [20.5, 11.5, 2.1]].forEach(([bx, by, r]) => disc(ctx, x0 + bx, by, r, '#7ad98a', 0.85));
}

const PETALS = ['#ff6fae', '#ffd23f', '#ffffff', '#ff8f5a', '#b98cff', '#ff5a6e', '#7fd4ff'];
/** A few flowers on stems, over whatever ground was painted first: how many, where, which colours and sizes all vary. */
function flowersOn(ctx, x0, rnd) {
  const spots = [], count = 2 + Math.floor(rnd() * 4);
  for (let tries = 0; spots.length < count && tries < 40; tries++) {
    const fx = inside(rnd, 5), fy = 5 + rnd() * (TILE - 13);
    if (spots.every(([sx, sy]) => Math.hypot(sx - fx, sy - fy) > 7)) spots.push([fx, fy]);
  }
  spots.sort((a, b) => a[1] - b[1]).forEach(([fx, fy]) => {
    const col = PETALS[Math.floor(rnd() * PETALS.length)], size = 0.75 + rnd() * 0.6, petals = rnd() < 0.3 ? 6 : 5, turn = rnd() * 6, lean = (rnd() - 0.5) * 2.4;
    stroke(ctx, [x0 + fx, fy + 1, x0 + fx + lean, fy + 3, x0 + fx + lean * 0.4, fy + 4 + size * 2], '#2f8f46', 0.9);
    if (rnd() < 0.5) oval(ctx, x0 + fx + lean + 1.2, fy + 3.4, 1.4, 0.7, '#3fa856', 1, 0.5);   // a leaf
    for (let i = 0; i < petals; i++) { const a = turn + (i / petals) * Math.PI * 2; disc(ctx, x0 + fx + Math.cos(a) * 1.7 * size, fy + Math.sin(a) * 1.7 * size, 1.25 * size, col); }
    disc(ctx, x0 + fx, fy, size, col === '#ffd23f' ? '#ff8f3f' : '#ffc531');
  });
}

/** Plaster wall with wooden beams on both sides. */
function wallBase(ctx, x0) {
  px(ctx, x0, 0, '#fff3dc', TILE, TILE);
  px(ctx, x0, 0, '#a06a3e', 2, TILE); px(ctx, x0 + TILE - 2, 0, '#a06a3e', 2, TILE);
  px(ctx, x0, TILE - 2, '#d6c4a0', TILE, 2);
}
function wallTile(ctx, x0) {
  wallBase(ctx, x0);
  px(ctx, x0 + 10, 8, '#a06a3e', 12, 12);
  px(ctx, x0 + 11, 9, '#a9d8ff', 10, 10);
  px(ctx, x0 + 15, 9, '#a06a3e', 1, 10); px(ctx, x0 + 11, 13, '#a06a3e', 10, 1);
  px(ctx, x0 + 12, 10, '#ffffff', 2, 1);
}
/** Arched wooden door on whatever wall `wallFn` paints. */
function doorTile(ctx, x0, wallFn = wallBase) {
  wallFn(ctx, x0);
  px(ctx, x0 + 8, 8, '#4e3220', 16, 24);
  px(ctx, x0 + 9, 9, '#a06a3e', 14, 23);
  ctx.fillStyle = '#4e3220'; ctx.beginPath(); ctx.arc(x0 + 16, 9, 8, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#a06a3e'; ctx.beginPath(); ctx.arc(x0 + 16, 10, 7, Math.PI, 0); ctx.fill();
  px(ctx, x0 + 13, 8, '#6b4630', 1, 24); px(ctx, x0 + 18, 8, '#6b4630', 1, 24);
  px(ctx, x0 + 19, 20, '#ffc531', 2, 2);
}
function roofTile(ctx, x0) {
  px(ctx, x0, 0, '#ff6b57', TILE, TILE);
  for (let band = 0; band < 4; band++) {
    const y = band * 8;
    px(ctx, x0, y + 7, '#d84a3a', TILE, 1);
    px(ctx, x0, y, '#ff9a8a', TILE, 1);
    for (let x = (band % 2) * 4; x < TILE; x += 8) px(ctx, x0 + x, y + 1, '#d84a3a', 1, 6);
  }
}
// ---- Neighbourhood styles -------------------------------------------------------------------

/** Math Meadow: thatched roof over the plaster-and-beam cottage walls. */
function thatchRoof(ctx, x0) {
  px(ctx, x0, 0, '#e6b94f', TILE, TILE);
  for (let y = 3; y < TILE; y += 4) for (let x = (y / 4) % 2 ? 0 : 3; x < TILE; x += 6) px(ctx, x0 + x, y, '#c9962f', 4, 1);
  for (let x = 1; x < TILE; x += 7) px(ctx, x0 + x, (x * 5) % TILE, '#f6d67e', 2, 1);
  px(ctx, x0, TILE - 2, '#b8862a', TILE, 2);
}

/** Word Woods: log cabin. */
function logWall(ctx, x0, window = true) {
  px(ctx, x0, 0, '#b57b4b', TILE, TILE);
  for (let y = 0; y < TILE; y += 6) { px(ctx, x0, y + 1, '#c98e5e', TILE, 1); px(ctx, x0, y + 5, '#7a4a2a', TILE, 1); }
  px(ctx, x0, 0, '#7a4a2a', 2, TILE); px(ctx, x0 + TILE - 2, 0, '#7a4a2a', 2, TILE);
  if (window) { px(ctx, x0 + 10, 9, '#4e3220', 12, 12); px(ctx, x0 + 11, 10, '#ffe08a', 10, 10); px(ctx, x0 + 15, 10, '#4e3220', 2, 10); px(ctx, x0 + 11, 14, '#4e3220', 10, 2); }
}
function shingleRoof(ctx, x0) {
  px(ctx, x0, 0, '#8a5a3a', TILE, TILE);
  for (let band = 0; band < 4; band++) {
    const y = band * 8;
    px(ctx, x0, y + 7, '#5e3a22', TILE, 1); px(ctx, x0, y, '#a8704a', TILE, 1);
    for (let x = (band % 2) * 4; x < TILE; x += 8) px(ctx, x0 + x, y + 1, '#5e3a22', 1, 6);
  }
}

/** Code Cove: teal metal roof over riveted panels with a glowing screen. */
function panelWall(ctx, x0, window = true) {
  px(ctx, x0, 0, '#dfe7ec', TILE, TILE);
  px(ctx, x0, 10, '#b9c6cf', TILE, 1); px(ctx, x0, 21, '#b9c6cf', TILE, 1); px(ctx, x0, 0, '#b9c6cf', 1, TILE); px(ctx, x0 + TILE - 1, 0, '#b9c6cf', 1, TILE);
  for (const [rx, ry] of [[3, 3], [27, 3], [3, 26], [27, 26], [3, 14], [27, 14]]) px(ctx, x0 + rx, ry, '#9aa8b2', 2, 2);
  if (window) {
    px(ctx, x0 + 9, 8, '#2d2a4a', 14, 14); px(ctx, x0 + 10, 9, '#0f1a2e', 12, 12);
    [[11, 11, 5], [11, 14, 8], [11, 17, 3]].forEach(([wx, wy, len]) => px(ctx, x0 + wx, wy, '#2ec46a', len, 1));
  }
}
function techRoof(ctx, x0) {
  px(ctx, x0, 0, '#3fb8c9', TILE, TILE);
  for (let x = 0; x < TILE; x += 4) { px(ctx, x0 + x, 0, '#2a95a6', 1, TILE); px(ctx, x0 + x + 2, 0, '#7fd8e4', 1, TILE); }
  px(ctx, x0, TILE - 2, '#1f7a88', TILE, 2);
}

/** Bible Village: sandstone chapel walls with a stained-glass window under a slate roof. */
function stoneWall(ctx, x0, window = true) {
  px(ctx, x0, 0, '#e8d9b5', TILE, TILE);
  for (let y = 7; y < TILE; y += 8) px(ctx, x0, y, '#c9b48e', TILE, 1);
  for (let row = 0; row < 4; row++) for (let x = (row % 2) * 5 + 2; x < TILE; x += 10) px(ctx, x0 + x, row * 8, '#c9b48e', 1, 7);
  if (window) {
    ctx.fillStyle = '#7a6a4a'; ctx.beginPath(); ctx.arc(x0 + 16, 13, 7, Math.PI, 0); ctx.fill(); px(ctx, x0 + 9, 13, '#7a6a4a', 14, 12);
    ctx.fillStyle = '#3d8bff'; ctx.beginPath(); ctx.arc(x0 + 16, 13, 5, Math.PI, 0); ctx.fill();
    px(ctx, x0 + 11, 13, '#ff5c6c', 5, 5); px(ctx, x0 + 16, 13, '#ffc531', 5, 5); px(ctx, x0 + 11, 18, '#2ec46a', 5, 5); px(ctx, x0 + 16, 18, '#8b5cf6', 5, 5);
    px(ctx, x0 + 15, 8, '#7a6a4a', 2, 15); px(ctx, x0 + 11, 17, '#7a6a4a', 10, 1);
  }
}
function slateRoof(ctx, x0) {
  px(ctx, x0, 0, '#5b6b8c', TILE, TILE);
  for (let band = 0; band < 6; band++) {
    const y = band * 5 + 4;
    px(ctx, x0, y, '#46557a', TILE, 1);
    for (let x = (band % 2) * 4; x < TILE; x += 8) px(ctx, x0 + x, y - 4, '#46557a', 1, 4);
    px(ctx, x0 + (band % 2) * 4 + 1, y - 3, '#7181a3', 2, 1);
  }
}

/** Castles: grey stone blocks, a crenellated top and a great iron-studded gate. */
function castleWall(ctx, x0, slit = true) {
  px(ctx, x0, 0, '#9aa3ad', TILE, TILE);
  for (let y = 7; y < TILE; y += 8) px(ctx, x0, y, '#6f7882', TILE, 1);
  for (let row = 0; row < 4; row++) for (let x = (row % 2) * 6 + 3; x < TILE; x += 12) px(ctx, x0 + x, row * 8, '#6f7882', 1, 7);
  for (let row = 0; row < 4; row++) px(ctx, x0 + (row % 2) * 6 + 5, row * 8 + 1, '#b4bcc4', 3, 1);
  if (slit) { px(ctx, x0 + 14, 9, '#2d2a4a', 4, 14); px(ctx, x0 + 15, 10, '#1d2b53', 2, 12); }
}
function castleTop(ctx, x0) {
  castleWall(ctx, x0, false);
  px(ctx, x0, 0, '#5e6771', TILE, 12);
  for (let x = 0; x < TILE; x += 8) { px(ctx, x0 + x, 0, '#7d8791', 4, 12); px(ctx, x0 + x, 0, '#b4bcc4', 4, 1); }
  px(ctx, x0, 12, '#b4bcc4', TILE, 1);
}
function castleDoor(ctx, x0) {
  castleWall(ctx, x0, false);
  px(ctx, x0 + 6, 9, '#2d2a4a', 20, 23);
  ctx.fillStyle = '#2d2a4a'; ctx.beginPath(); ctx.arc(x0 + 16, 10, 10, Math.PI, 0); ctx.fill();
  px(ctx, x0 + 8, 10, '#4e3220', 16, 22);
  ctx.fillStyle = '#4e3220'; ctx.beginPath(); ctx.arc(x0 + 16, 11, 8, Math.PI, 0); ctx.fill();
  px(ctx, x0 + 15, 10, '#2d2a4a', 2, 22);
  for (const [sx, sy] of [[10, 14], [20, 14], [10, 20], [20, 20], [10, 26], [20, 26]]) px(ctx, x0 + sx, sy, '#9aa3ad', 2, 2);
}

/** Cobbled village ground: rounded stones with a light top edge. */
function villageTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#d9c9a8', TILE, TILE);
  for (let i = 0; i < 7; i++) {
    const x = x0 + 2 + rnd() * (TILE - 10), y = 2 + rnd() * (TILE - 8);
    ctx.fillStyle = '#c4b08a'; ctx.beginPath(); ctx.roundRect(x, y, 6, 4, 1.6); ctx.fill();
    stroke(ctx, [x + 1.4, y + 0.9, x + 4.2, y + 0.9], '#ece0c4', 0.8);
  }
  for (let i = 0; i < 3; i++) disc(ctx, x0 + inside(rnd, 3), inside(rnd, 3), 0.6, '#b39d78');
}

function gateLockedTile(ctx, x0, rnd) {
  pathTile(ctx, x0, rnd);
  px(ctx, x0 + 1, 0, '#4e3220', 6, TILE); px(ctx, x0 + 2, 1, '#7a4a2a', 4, TILE - 2);
  px(ctx, x0 + TILE - 7, 0, '#4e3220', 6, TILE); px(ctx, x0 + TILE - 6, 1, '#7a4a2a', 4, TILE - 2);
  [5, 13, 21].forEach((y) => { px(ctx, x0 + 6, y, '#4e3220', 20, 7); px(ctx, x0 + 7, y + 1, '#a8613a', 18, 4); });
  px(ctx, x0 + 13, 8, '#625f7e', 6, 5); px(ctx, x0 + 14, 9, '#a8613a', 4, 4);   // shackle
  px(ctx, x0 + 12, 12, '#2d2a4a', 8, 9); px(ctx, x0 + 13, 13, '#ffc531', 6, 7);  // lock body
  px(ctx, x0 + 15, 15, '#2d2a4a', 2, 3);
}
function gateOpenTile(ctx, x0, rnd) {
  pathTile(ctx, x0, rnd);
  [1, TILE - 7].forEach((x) => {
    px(ctx, x0 + x, 0, '#4e3220', 6, TILE); px(ctx, x0 + x + 1, 1, '#7a4a2a', 4, TILE - 2); px(ctx, x0 + x + 1, 1, '#c98a5a', 4, 1);
  });
}

/**
 * The tileset is painted at TILE_RES times the world's tile size, so the camera's zoom shows smooth shapes instead of
 * enlarged pixels. Each tile sits in its own padded cell (its edges stretched into the padding) so smooth filtering
 * never pulls a neighbour's colour across a seam. The world's tile layers scale the result back down by 1 / TILE_RES.
 */
export const TILE_RES = 4, TILE_PAD = 4;
const TILE_COLS = 12;

export function tilesTexture(scene) {
  if (scene.textures.exists('tiles')) return;
  const n = Object.keys(TILE_IDS).length, rnd = mulberry32(7);
  const size = TILE * TILE_RES, cell = size + TILE_PAD * 2;
  const tex = scene.textures.createCanvas('tiles', cell * Math.min(n, TILE_COLS), cell * Math.ceil(n / TILE_COLS));   // rows, so it fits a phone's texture limit
  const atlas = tex.getContext();
  const scratch = document.createElement('canvas'); scratch.width = size; scratch.height = size;
  const ctx = scratch.getContext('2d');
  /** Paint one tile in 32-unit space, then copy it into its padded cell. Transparent tiles get no stretched edge. */
  const tile = (id, paint, { transparent = false } = {}) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, size, size);
    ctx.setTransform(TILE_RES, 0, 0, TILE_RES, 0, 0);
    paint(ctx);
    const x = (id % TILE_COLS) * cell, y = Math.floor(id / TILE_COLS) * cell;
    if (!transparent) atlas.drawImage(scratch, x, y, cell, cell);
    atlas.drawImage(scratch, x + TILE_PAD, y + TILE_PAD);
    tex.add(id, 0, x + TILE_PAD, y + TILE_PAD, size, size);
  };
  const T = TILE_IDS;
  tile(T.grass, (c) => grassTile(c, 0, rnd, '#5cc45a', '#45a648', '#8fe07c'));
  tile(T.path, (c) => pathTile(c, 0, rnd));
  tile(T.water, (c) => waterTile(c, 0, rnd));
  tile(T.tree, (c) => treeTile(c, 0), { transparent: true });   // drawn on the tree overlay layer
  tile(T.wall, (c) => wallTile(c, 0));
  tile(T.door, (c) => doorTile(c, 0));
  FLOWER_TILES.forEach((id) => tile(id, (c) => { grassTile(c, 0, rnd, '#5cc45a', '#45a648', '#8fe07c', 3); flowersOn(c, 0, rnd); }));
  MEADOW_TILES.forEach((id) => tile(id, (c) => {
    grassTile(c, 0, rnd, '#bfe05c', '#96c240', '#ecf7a6', 5);   // sunny lime, clearly not the hub's green
    // Daisies: none to four of them, big and small, mostly white with the odd pink, yellow or lilac one.
    const spots = [], count = Math.floor(rnd() * 5);
    for (let tries = 0; spots.length < count && tries < 30; tries++) {
      const x = inside(rnd, 5), y = inside(rnd, 5);
      if (spots.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > 6)) spots.push([x, y]);
    }
    spots.forEach(([x, y]) => {
      const pick = rnd(), col = pick < 0.6 ? '#ffffff' : pick < 0.75 ? '#ffd9ec' : pick < 0.9 ? '#fff1a6' : '#e2d4ff';
      const size = 0.6 + rnd() * 0.75, petals = 5 + Math.floor(rnd() * 2), turn = rnd() * 6;
      for (let k = 0; k < petals; k++) { const a = turn + (k / petals) * Math.PI * 2; disc(c, x + Math.cos(a) * 1.3 * size, y + Math.sin(a) * 1.3 * size, 0.95 * size, col); }
      disc(c, x, y, 0.8 * size, '#ffc531');
    });
  }));
  tile(T.woods, (c) => {
    grassTile(c, 0, rnd, '#3f9a45', '#2f7a36', '#57b25a', 8);
    for (let i = 0; i < 3; i++) { const x = inside(rnd, 5), y = inside(rnd, 5); stroke(c, [x, y, x + 2.4, y + 0.8], '#8a5a34', 0.8); }   // fallen twigs
  });
  tile(T.cove, (c) => sandTile(c, 0, rnd));
  tile(T.gateLocked, (c) => gateLockedTile(c, 0, rnd));
  tile(T.gateOpen, (c) => gateOpenTile(c, 0, rnd));
  tile(T.roof, (c) => roofTile(c, 0));
  tile(T.roofMath, (c) => thatchRoof(c, 0)); tile(T.wallMath, (c) => wallTile(c, 0)); tile(T.doorMath, (c) => doorTile(c, 0, wallBase));
  tile(T.roofWords, (c) => shingleRoof(c, 0)); tile(T.wallWords, (c) => logWall(c, 0)); tile(T.doorWords, (c) => doorTile(c, 0, (cc, x) => logWall(cc, x, false)));
  tile(T.roofCode, (c) => techRoof(c, 0)); tile(T.wallCode, (c) => panelWall(c, 0)); tile(T.doorCode, (c) => doorTile(c, 0, (cc, x) => panelWall(cc, x, false)));
  tile(T.roofBible, (c) => slateRoof(c, 0)); tile(T.wallBible, (c) => stoneWall(c, 0)); tile(T.doorBible, (c) => doorTile(c, 0, (cc, x) => stoneWall(cc, x, false)));
  tile(T.castleTop, (c) => castleTop(c, 0)); tile(T.castleWall, (c) => castleWall(c, 0)); tile(T.castleDoor, (c) => castleDoor(c, 0));
  tile(T.village, (c) => villageTile(c, 0, rnd));
  tex.refresh();
}

const BADGE = 80;   // badge frames are drawn at 2x and shown at ~40

/** One round badge: coloured disc with a darker rim and the character's head and shoulders, clipped to the disc. */
function paintBadge(scene, ctx, x0, look, outfit = null, outfitKey = '') {
  const bg = look.bg || '#3d8bff', S = BADGE;
  ctx.fillStyle = shade(bg, 0.82); ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(x0, 0, S, S);
  drawBustFromSheet(ctx, composeLookCanvas(scene, look, outfit, outfitKey), x0 + S / 2, S * 0.52, 62);
  ctx.restore();
}

/** Round avatar badges for the preset picker: 'avatar' sheet with AVATAR_COUNT frames of 80x80. */
export function avatarTexture(scene) {
  if (scene.textures.exists('avatar')) return;
  const tex = scene.textures.createCanvas('avatar', BADGE * AVATAR_COUNT, BADGE);
  const ctx = tex.getContext();
  CHARACTER_STYLES.forEach((st, i) => { paintBadge(scene, ctx, i * BADGE, st); tex.add(i, 0, i * BADGE, 0, BADGE, BADGE); });
  tex.refresh();
}

/** Badge for a resolved look (see data/avatars.js resolveLook): built on first use and cached. Returns the texture key. */
export function badgeTexture(scene, look, outfit = null, outfitKey = '') {
  const key = 'badge:' + lookId(look) + (outfitKey ? ':' + outfitKey : '');
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, BADGE, BADGE);
    paintBadge(scene, tex.getContext(), 0, look, outfit, outfitKey);
    tex.refresh();
  }
  return key;
}

/** Walking sheet plus -down/-up/-side animations for a resolved look. Returns the texture key. */
export function lookSpriteTexture(scene, look, outfit = null, outfitKey = '') {
  const key = 'look:' + lookId(look) + (outfitKey ? ':' + outfitKey : '');
  if (!scene.textures.exists(key)) {
    characterTexture(scene, key, look, 1, outfit ? { outfit, outfitKey } : null);
    walkAnims(scene, key);
  }
  return key;
}

function walkAnims(scene, key) {
  if (scene.anims.exists(`${key}-down`)) return;
  for (const pose of ['down', 'up', 'side']) scene.anims.create({ key: `${key}-${pose}`, frames: scene.anims.generateFrameNumbers(key, walkRange(pose)), frameRate: 12, repeat: -1 });
}

function star(g, cx, cy, r, color) {
  g.fillStyle(color, 1); g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath(); g.fillPath();
}

/** Icons used by the UI, generated at 2x so they stay smooth when scaled. Callers size them with setDisplaySize. */
export function uiTextures(scene) {
  const g = scene.make.graphics({ add: false });
  if (!scene.textures.exists('px')) { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 2, 2); g.generateTexture('px', 2, 2); g.clear(); }
  if (!scene.textures.exists('star')) {
    star(g, 48, 52, 44, THEME.warningDark); star(g, 48, 48, 44, THEME.gold); star(g, 48, 44, 22, 0xffe08a);
    g.generateTexture('star', 96, 96); g.clear();
  }
  if (!scene.textures.exists('star-off')) { star(g, 48, 48, 44, THEME.starOff); g.generateTexture('star-off', 96, 96); g.clear(); }
  if (!scene.textures.exists('coin')) {
    g.fillStyle(THEME.warningDark, 1); g.fillCircle(24, 24, 24);
    g.fillStyle(THEME.gold, 1); g.fillCircle(24, 22, 21);
    g.fillStyle(0xffe08a, 1); g.fillCircle(24, 22, 15);
    g.fillStyle(THEME.warningDark, 1); g.fillRoundedRect(20, 12, 8, 20, 3);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(15, 14, 4);
    g.generateTexture('coin', 48, 48); g.clear();
  }
  if (!scene.textures.exists('joy-base')) {
    g.fillStyle(THEME.ink, 0.12); g.fillCircle(120, 120, 116); g.lineStyle(6, 0xffffff, 0.75); g.strokeCircle(120, 120, 116);
    g.generateTexture('joy-base', 240, 240); g.clear();
  }
  if (!scene.textures.exists('joy-thumb')) {
    g.fillStyle(THEME.ink, 0.12); g.fillCircle(52, 56, 46); g.fillStyle(0xffffff, 0.92); g.fillCircle(52, 52, 46);
    g.generateTexture('joy-thumb', 104, 104); g.clear();
  }
  if (!scene.textures.exists('sparkle')) {
    // Four-point glint: white with a gold core, drawn at 2x.
    const pts = (r, q) => [[24, 24 - r], [24 + q, 24 - q], [24 + r, 24], [24 + q, 24 + q], [24, 24 + r], [24 - q, 24 + q], [24 - r, 24], [24 - q, 24 - q]];
    const poly = (list, color) => { g.fillStyle(color, 1); g.beginPath(); list.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillPath(); };
    poly(pts(24, 5), 0xffffff); poly(pts(14, 3), THEME.gold);
    g.generateTexture('sparkle', 48, 48); g.clear();
  }
  if (!scene.textures.exists('bobber')) {
    // Fishing float: red top, white bottom, drawn at 2x.
    g.fillStyle(THEME.ink, 0.15); g.fillCircle(25, 27, 22);
    g.fillStyle(0xff5c6c, 1); g.fillCircle(24, 24, 22);
    g.fillStyle(0xffffff, 1); g.beginPath(); g.arc(24, 24, 22, 0, Math.PI, false); g.closePath(); g.fillPath();
    g.fillStyle(THEME.ink, 1); g.fillRect(22, 0, 4, 10);
    g.generateTexture('bobber', 48, 48); g.clear();
  }
  if (!scene.textures.exists('bubble')) {
    g.fillStyle(THEME.ink, 0.15); g.fillRoundedRect(1, 3, 30, 30, 10);
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 32, 32, 10);
    g.fillStyle(THEME.danger, 1); g.fillRoundedRect(14, 6, 4, 14, 2); g.fillCircle(16, 25, 2.5);
    g.generateTexture('bubble', 32, 32); g.clear();
  }
  g.destroy();
}

export function generateAllTextures(scene) {
  uiTextures(scene);
  avatarTexture(scene);
  tilesTexture(scene);
  CHARACTER_STYLES.forEach((st, i) => characterTexture(scene, `char${i}`, st));
  NPC_STYLES.forEach((st, i) => characterTexture(scene, `npc${i}`, st, 1, st.outfit ? { outfit: st.outfit, outfitKey: 'npc' + i } : null));
  pixelTexture(scene, 'robot', [ROBOT, ROBOT2]);
  pixelTexture(scene, 'sheep', [SHEEP, SHEEP2]);
  pixelTexture(scene, 'bunny', [BUNNY, BUNNY2]);
  if (!scene.textures.exists('monkey') && scene.textures.exists('mango-front') && scene.textures.exists('mango-side')) {   // Mango from the reference art
    const P = PIXEL_FRAME, tex = scene.textures.createCanvas('monkey', P * 4, P), ctx = tex.getContext();
    const front = scene.textures.get('mango-front').getSourceImage(), side = scene.textures.get('mango-side').getSourceImage();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(front, P * MONKEY_FRAMES.stand, 0); ctx.drawImage(front, P * MONKEY_FRAMES.hop, -3); ctx.drawImage(front, P * MONKEY_FRAMES.cheer, -1); ctx.drawImage(side, P * MONKEY_FRAMES.side, 0);
    for (let i = 0; i < 4; i++) tex.add(i, 0, P * i, 0, P, P);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    scene.textures.get('mango-face').setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  if (!scene.textures.exists('monkey')) {   // fallback: Mango drawn with shapes, then pixelated to match the LPC people
    const src = document.createElement('canvas'); src.width = FRAME * 2; src.height = FRAME;
    const sctx = src.getContext('2d');
    drawMonkey(sctx, 0, 0, { step: 0, shadow: false }); drawMonkey(sctx, FRAME, 0, { step: 1, shadow: false });
    const P = PIXEL_FRAME, tex = scene.textures.createCanvas('monkey', P * 2, P), ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, FRAME * 2, FRAME, 0, 0, P * 2, P);
    pixelate(ctx, P * 2, P);
    tex.add(0, 0, 0, 0, P, P); tex.add(1, 0, P, 0, P, P); tex.add(2, 0, 0, 0, P, P); tex.add(3, 0, P, 0, P, P); tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  for (const [key, rate] of [['sheep', 5], ['bunny', 8], ['monkey', 5]]) {
    if (!scene.anims.exists(`${key}-walk`)) scene.anims.create({ key: `${key}-walk`, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: rate, repeat: -1 });
  }
  const sheets = [...CHARACTER_STYLES.map((_, i) => `char${i}`), ...NPC_STYLES.map((_, i) => `npc${i}`)];
  sheets.forEach((key) => walkAnims(scene, key));
  // The game renders anti-aliased (pixelArt: false); pixel-art sheets opt back in to crisp scaling.
  // (The 'tiles' sheet is painted at high resolution with smooth shapes, so it keeps the default smooth filtering.)
  ['robot', 'sheep', 'bunny'].forEach((key) => scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST));
  if (!scene.anims.exists('robot-walk')) scene.anims.create({ key: 'robot-walk', frames: scene.anims.generateFrameNumbers('robot', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
}
