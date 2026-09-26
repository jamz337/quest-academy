// Every texture the game uses is generated here at boot from tiny pixel maps and Graphics calls.
// To swap in real art later, load spritesheets with the same keys and frame layout and skip the generator.
import Phaser from 'phaser';
import { TILE, AVATAR_COUNT } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { mulberry32 } from './Rng.js';
import { OUTLINE, MOUTH, BOOTS, CHARACTER_STYLES, NPC_STYLES, lookId } from '../data/avatars.js';
export { CHARACTER_STYLES, NPC_STYLES };

const SHADOW = 'rgba(0,0,0,0.22)';
const PAL = {
  '.': null, k: OUTLINE, w: '#ffffff', s: '#ffd6b3', h: '#a8613a', t: '#7a4a2a', r: '#ff5c6c', b: '#3d8bff',
  n: '#2d2a4a', g: '#8fe07c', G: '#4fb84f', D: '#2f8a3a', y: '#ffc531', o: '#ff8f3f', p: '#ff6fae', l: '#8b7fd6',
  d: '#625f7e', c: '#d6cfc4', v: '#7c5cff', x: SHADOW
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

// 16x16 chibi character template with a dark outline, a shaded side and a soft shadow under the feet.
// Letters: k outline, H hair, J hair shade, S skin, T top, U top shade, L legs, B boots, r mouth, x shadow.
const CHAR_DOWN = [
  '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHJk...', '...kHHHHHHHJk...',
  '...kHSSSSSSJk...', '...kSSSSSSSSk...', '...kSkSSSSkSk...', '...kSSSrrSSSk...',
  '....kSSSSSSk....', '.....kTTTTk.....', '....kTTTTTUk....', '..kSkTTTTTUkSk..',
  '....kTTTTTUk....', '....kLLkkLLk....', '....kBBkkBBk....', '....xxxxxxxx....'
];
const STEP = { 13: '...kLLk..kLLk...', 14: '...kBBk..kBBk...' };
const CHAR_DOWN2 = CHAR_DOWN.map((r, i) => STEP[i] || r);
const CHAR_UP = [
  '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHJk...', '...kHHHHHHHJk...',
  '...kHHHHHHHJk...', '...kHHHHHHHJk...', '...kHHHHHHHJk...', '....kHHHHHJk....',
  '.....kSSSSk.....', '.....kTTTTk.....', '....kTTTTTUk....', '..kSkTTTTTUkSk..',
  '....kTTTTTUk....', '....kLLkkLLk....', '....kBBkkBBk....', '....xxxxxxxx....'
];
const CHAR_UP2 = CHAR_UP.map((r, i) => STEP[i] || r);
const CHAR_SIDE = [
  '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHJk...', '...kHHHHHHHJk...',
  '...kSSSHHHHJk...', '...kSSSSHHHJk...', '...kSkSSSHHJk...', '...kSrSSSHHJk...',
  '....kSSSSHJk....', '.....kTTTTk.....', '....kTTTTTUk....', '....kTkSkTUk....',
  '....kTTTTTUk....', '.....kLLLLk.....', '.....kBBBBk.....', '....xxxxxxxx....'
];
const SIDE_STEP = { 13: '....kLLk.kLk....', 14: '...kBBk..kBBk...' };
const CHAR_SIDE2 = CHAR_SIDE.map((r, i) => SIDE_STEP[i] || r);

function charPalette(colors) {
  return {
    ...PAL, H: colors.hair, J: shade(colors.hair, 0.65), S: colors.skin, T: colors.top, U: shade(colors.top, 0.72),
    L: colors.legs, B: BOOTS, r: colors.mouth || MOUTH
  };
}

/** Character sheet: frames 0-1 down, 2-3 up, 4-5 side (facing left; flipX for right). */
export function characterTexture(scene, key, colors, scale = 1) {
  pixelTexture(scene, key, [CHAR_DOWN, CHAR_DOWN2, CHAR_UP, CHAR_UP2, CHAR_SIDE, CHAR_SIDE2], charPalette(colors), scale);
}

// The robot rotates in the maze, so it has no ground shadow.
const ROBOT = [
  '.......kk.......', '......kyyk......', '.......kk.......', '...kkkkkkkkkk...',
  '...kcccccccck...', '...kcbbbbbbck...', '...kcbkbbkbck...', '...kcbbbbbbck...',
  '...kcccccccck...', '..kyccccccccyk..', '...kcccccccck...', '...kkkkkkkkkk...',
  '....kddkkddk....', '....kddkkddk....', '....kddkkddk....', '................'
];
const ROBOT2 = ROBOT.map((r, i) => (i >= 12 && i <= 14 ? '...kddk..kddk...' : r));

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
export const TILE_IDS = { grass: 0, path: 1, water: 2, tree: 3, wall: 4, door: 5, flower: 6, meadow: 7, woods: 8, cove: 9, gateLocked: 10, gateOpen: 11, roof: 12 };

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
function doorTile(ctx, x0) {
  wallBase(ctx, x0);
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
  for (let i = 0; i < n; i++) tex.add(i, 0, at(i), 0, TILE, TILE);
  tex.refresh();
}

const BADGE = 80;   // badge frames are drawn at 2x and shown at ~40
const BUST = CHAR_DOWN.slice(0, 13).map((r) => r.slice(2, 14));   // 12 x 13 pixels: head, shoulders and arms

/** One round badge: coloured disc with a darker rim and the character from the shoulders up, clipped to the disc. */
function paintBadge(ctx, x0, look) {
  const bg = look.bg || look.top, S = BADGE;
  ctx.fillStyle = shade(bg, 0.82); ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(x0, 0, S, S);
  blit(ctx, BUST, x0 + 10, 14, 5, charPalette(look));
  ctx.restore();
}

/** Round avatar badges for the preset picker: 'avatar' sheet with AVATAR_COUNT frames of 80x80. */
export function avatarTexture(scene) {
  if (scene.textures.exists('avatar')) return;
  const tex = scene.textures.createCanvas('avatar', BADGE * AVATAR_COUNT, BADGE);
  const ctx = tex.getContext();
  CHARACTER_STYLES.forEach((st, i) => { paintBadge(ctx, i * BADGE, st); tex.add(i, 0, i * BADGE, 0, BADGE, BADGE); });
  tex.refresh();
}

/** Badge for a resolved look (see data/avatars.js resolveLook): built on first use and cached by colour. Returns the texture key. */
export function badgeTexture(scene, look) {
  const key = 'badge:' + lookId(look);
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, BADGE, BADGE);
    paintBadge(tex.getContext(), 0, look);
    tex.refresh();
  }
  return key;
}

/** Walking sheet plus -down/-up/-side animations for a resolved look. Returns the texture key. */
export function lookSpriteTexture(scene, look) {
  const key = 'look:' + lookId(look);
  if (!scene.textures.exists(key)) {
    characterTexture(scene, key, look);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    walkAnims(scene, key);
  }
  return key;
}

function walkAnims(scene, key) {
  if (scene.anims.exists(`${key}-down`)) return;
  scene.anims.create({ key: `${key}-down`, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
  scene.anims.create({ key: `${key}-up`, frames: scene.anims.generateFrameNumbers(key, { start: 2, end: 3 }), frameRate: 6, repeat: -1 });
  scene.anims.create({ key: `${key}-side`, frames: scene.anims.generateFrameNumbers(key, { start: 4, end: 5 }), frameRate: 6, repeat: -1 });
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
  NPC_STYLES.forEach((st, i) => characterTexture(scene, `npc${i}`, st));
  pixelTexture(scene, 'robot', [ROBOT, ROBOT2]);
  const sheets = [...CHARACTER_STYLES.map((_, i) => `char${i}`), ...NPC_STYLES.map((_, i) => `npc${i}`)];
  sheets.forEach((key) => walkAnims(scene, key));
  // The game renders anti-aliased (pixelArt: false); pixel-art sheets opt back in to crisp scaling.
  ['tiles', 'robot', ...sheets].forEach((key) => scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST));
  if (!scene.anims.exists('robot-walk')) scene.anims.create({ key: 'robot-walk', frames: scene.anims.generateFrameNumbers('robot', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
}
