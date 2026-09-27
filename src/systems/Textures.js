// Every texture the game uses is generated here at boot from tiny pixel maps and Graphics calls.
// To swap in real art later, load spritesheets with the same keys and frame layout and skip the generator.
import Phaser from 'phaser';
import { TILE, AVATAR_COUNT } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { mulberry32 } from './Rng.js';
import { OUTLINE, MOUTH, BOOTS, CHARACTER_STYLES, NPC_STYLES, lookId } from '../data/avatars.js';
export { CHARACTER_STYLES, NPC_STYLES };
import { FRAME, drawMonkey } from '../ui/FlatCharacter.js';
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

const TREE = [
  '......kkkk......', '....kkGGGGkk....', '...kGGgGGGGGk...', '..kGgggGGGGGDk..',
  '..kGgGGGGGGGDk..', '.kGGGGGGGGGDDDk.', '.kGgGGGGGGGDDDk.', '.kGGGGGGGGDDDDk.',
  '..kGGGGGGDDDDk..', '..kkGGGGDDDDkk..', '....kkGDDDkk....', '.....kkhhkk.....',
  '......khtk......', '......khtk......', '.....khhttk.....', '....xxxxxxxx....'
];

const FLOWERS = [
  '................', '....r...........', '...ryr......y...', '....r......ywy..',
  '....D.......y...', '....D....p...D..', '........pwp..D..', '.........p......',
  '..........D.....', '..y.......D.....', '.ywy........r...', '..y........rwr..',
  '..D.........r...', '..D..........D..', '.............D..', '................'
];

/** Tileset 'tiles' with TILE x TILE frames: see TILE_IDS. */
export const TILE_IDS = {
  grass: 0, path: 1, water: 2, tree: 3, wall: 4, door: 5, flower: 6, meadow: 7, woods: 8, cove: 9, gateLocked: 10, gateOpen: 11, roof: 12,
  roofMath: 13, wallMath: 14, doorMath: 15, roofWords: 16, wallWords: 17, doorWords: 18, roofCode: 19, wallCode: 20, doorCode: 21,
  roofBible: 22, wallBible: 23, doorBible: 24, castleTop: 25, castleWall: 26, castleDoor: 27, village: 28
};

const px = (ctx, x, y, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

/** Grass-like ground: base colour, little blade tips in a darker tone and a few light specks. */
function grassTile(ctx, x0, rnd, base, dark, light, tufts = 7) {
  px(ctx, x0, 0, base, TILE, TILE);
  for (let i = 0; i < tufts; i++) {
    const x = x0 + 1 + Math.floor(rnd() * (TILE - 4)), y = 1 + Math.floor(rnd() * (TILE - 3));
    px(ctx, x, y + 1, dark); px(ctx, x + 1, y, dark); px(ctx, x + 2, y + 1, dark);
  }
  for (let i = 0; i < 4; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), light);
}

function pathTile(ctx, x0, rnd, base = '#e6c58a', dark = '#cfa96a', light = '#f4dca8') {
  px(ctx, x0, 0, base, TILE, TILE);
  for (let i = 0; i < 5; i++) {
    const x = x0 + Math.floor(rnd() * (TILE - 2)), y = Math.floor(rnd() * (TILE - 2));
    px(ctx, x, y, dark, 2, 2); px(ctx, x, y, light);
  }
  for (let i = 0; i < 6; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), light);
}

function waterTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#4aa8ff', TILE, TILE);
  for (let i = 0; i < 4; i++) px(ctx, x0 + Math.floor(rnd() * (TILE - 4)), Math.floor(rnd() * (TILE - 3)), '#3a8fe0', 4, 2);
  [[4, 6], [17, 13], [8, 23], [21, 27]].forEach(([wx, wy]) => {
    px(ctx, x0 + wx, wy, '#c5e8ff', 3, 1); px(ctx, x0 + wx + 3, wy + 1, '#c5e8ff', 3, 1);
  });
}

function sandTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#f3e2ad', TILE, TILE);
  for (let i = 0; i < 8; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#dcc88e');
  for (let i = 0; i < 3; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#fff8e0');
  px(ctx, x0 + 22, 20, '#fff8e0', 3, 2); px(ctx, x0 + 23, 22, '#dcc88e', 1, 1);   // a tiny shell
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

/** Cobbled village ground. */
function villageTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#d9c9a8', TILE, TILE);
  for (let i = 0; i < 7; i++) {
    const x = x0 + Math.floor(rnd() * (TILE - 6)), y = Math.floor(rnd() * (TILE - 5));
    px(ctx, x, y, '#c4b08a', 6, 4); px(ctx, x + 1, y, '#ece0c4', 3, 1);
  }
  for (let i = 0; i < 3; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#b39d78');
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

export function tilesTexture(scene) {
  if (scene.textures.exists('tiles')) return;
  const n = Object.keys(TILE_IDS).length, rnd = mulberry32(7);
  const tex = scene.textures.createCanvas('tiles', TILE * n, TILE);
  const ctx = tex.getContext();
  const at = (i) => i * TILE;
  grassTile(ctx, at(TILE_IDS.grass), rnd, '#5cc45a', '#45a648', '#8fe07c');
  pathTile(ctx, at(TILE_IDS.path), rnd);
  waterTile(ctx, at(TILE_IDS.water), rnd);
  blit(ctx, TREE, at(TILE_IDS.tree), 0, 2);                       // transparent: drawn on the tree overlay layer
  wallTile(ctx, at(TILE_IDS.wall));
  doorTile(ctx, at(TILE_IDS.door));
  grassTile(ctx, at(TILE_IDS.flower), rnd, '#5cc45a', '#45a648', '#8fe07c', 3);
  blit(ctx, FLOWERS, at(TILE_IDS.flower), 0, 2);
  grassTile(ctx, at(TILE_IDS.meadow), rnd, '#7ad36a', '#5cc45a', '#b6f0a4', 5);
  for (let i = 0; i < 3; i++) {
    const x = at(TILE_IDS.meadow) + 2 + Math.floor(rnd() * 26), y = 2 + Math.floor(rnd() * 26);
    px(ctx, x, y, '#ffffff', 2, 2); px(ctx, x + 1, y + 1, '#ffc531');
  }
  grassTile(ctx, at(TILE_IDS.woods), rnd, '#3f9a45', '#2f7a36', '#57b25a', 8);
  for (let i = 0; i < 3; i++) px(ctx, at(TILE_IDS.woods) + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#a06a3e');
  sandTile(ctx, at(TILE_IDS.cove), rnd);
  gateLockedTile(ctx, at(TILE_IDS.gateLocked), rnd);
  gateOpenTile(ctx, at(TILE_IDS.gateOpen), rnd);
  roofTile(ctx, at(TILE_IDS.roof));
  thatchRoof(ctx, at(TILE_IDS.roofMath)); wallTile(ctx, at(TILE_IDS.wallMath)); doorTile(ctx, at(TILE_IDS.doorMath), wallBase);
  shingleRoof(ctx, at(TILE_IDS.roofWords)); logWall(ctx, at(TILE_IDS.wallWords)); doorTile(ctx, at(TILE_IDS.doorWords), (c, x) => logWall(c, x, false));
  techRoof(ctx, at(TILE_IDS.roofCode)); panelWall(ctx, at(TILE_IDS.wallCode)); doorTile(ctx, at(TILE_IDS.doorCode), (c, x) => panelWall(c, x, false));
  slateRoof(ctx, at(TILE_IDS.roofBible)); stoneWall(ctx, at(TILE_IDS.wallBible)); doorTile(ctx, at(TILE_IDS.doorBible), (c, x) => stoneWall(c, x, false));
  castleTop(ctx, at(TILE_IDS.castleTop)); castleWall(ctx, at(TILE_IDS.castleWall)); castleDoor(ctx, at(TILE_IDS.castleDoor));
  villageTile(ctx, at(TILE_IDS.village), rnd);
  for (let i = 0; i < n; i++) tex.add(i, 0, at(i), 0, TILE, TILE);
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
  if (!scene.textures.exists('monkey')) {   // Mango, drawn flat like the characters
    const tex = scene.textures.createCanvas('monkey', FRAME * 2, FRAME), ctx = tex.getContext();
    drawMonkey(ctx, 0, 0, { step: 0 }); drawMonkey(ctx, FRAME, 0, { step: 1 });
    tex.add(0, 0, 0, 0, FRAME, FRAME); tex.add(1, 0, FRAME, 0, FRAME, FRAME); tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  for (const [key, rate] of [['sheep', 5], ['bunny', 8], ['monkey', 4]]) {
    if (!scene.anims.exists(`${key}-walk`)) scene.anims.create({ key: `${key}-walk`, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: rate, repeat: -1 });
  }
  const sheets = [...CHARACTER_STYLES.map((_, i) => `char${i}`), ...NPC_STYLES.map((_, i) => `npc${i}`)];
  sheets.forEach((key) => walkAnims(scene, key));
  // The game renders anti-aliased (pixelArt: false); pixel-art sheets opt back in to crisp scaling.
  ['tiles', 'robot', 'sheep', 'bunny'].forEach((key) => scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST));
  if (!scene.anims.exists('robot-walk')) scene.anims.create({ key: 'robot-walk', frames: scene.anims.generateFrameNumbers('robot', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
}
