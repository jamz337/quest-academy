// Every texture the game uses is generated here at boot from tiny pixel maps and Graphics calls.
// To swap in real art later, load spritesheets with the same keys and frame layout and skip the generator.
import { C, TILE, AVATAR_COUNT } from '../constants.js';
import { mulberry32 } from './Rng.js';

const OUTLINE = '#1a1423';
const SHADOW = 'rgba(0,0,0,0.22)';
const PAL = {
  '.': null, k: OUTLINE, w: '#fff1e8', s: '#ffccaa', h: '#ab5236', t: '#7a3a1e', r: '#ff004d', b: '#29adff',
  n: '#1d2b53', g: '#6ed35f', G: '#3f9d3a', D: '#2a6e2a', y: '#ffec27', o: '#ffa300', p: '#ff77a8', l: '#83769c',
  d: '#5f574f', c: '#c2c3c7', v: '#7e2553', x: SHADOW
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
    L: colors.legs, B: '#3b2f2f', r: colors.mouth || '#e0567a'
  };
}

/** Character sheet: frames 0-1 down, 2-3 up, 4-5 side (facing left; flipX for right). */
export function characterTexture(scene, key, colors, scale = 1) {
  pixelTexture(scene, key, [CHAR_DOWN, CHAR_DOWN2, CHAR_UP, CHAR_UP2, CHAR_SIDE, CHAR_SIDE2], charPalette(colors), scale);
}

export const CHARACTER_STYLES = [
  { hair: '#ab5236', skin: '#ffccaa', top: '#29adff', legs: '#1d2b53' },
  { hair: '#1a1423', skin: '#ab5236', top: '#ff77a8', legs: '#7e2553' },
  { hair: '#ffec27', skin: '#ffccaa', top: '#00e436', legs: '#008751' },
  { hair: '#5f574f', skin: '#ffccaa', top: '#ffa300', legs: '#5f574f' },
  { hair: '#ff004d', skin: '#ffccaa', top: '#83769c', legs: '#1d2b53' },
  { hair: '#1a1423', skin: '#ffccaa', top: '#ffec27', legs: '#29adff' },
  { hair: '#7e2553', skin: '#ab5236', top: '#c2c3c7', legs: '#1d2b53' },
  { hair: '#c2c3c7', skin: '#ffccaa', top: '#ff004d', legs: '#1d2b53' }
];

// Extra NPC looks (index 8+) so villagers do not all resemble the player avatars.
export const NPC_STYLES = [
  { hair: '#fff1e8', skin: '#ffccaa', top: '#7e2553', legs: '#1d2b53' },
  { hair: '#ab5236', skin: '#ffccaa', top: '#fff1e8', legs: '#ff004d' },
  { hair: '#1a1423', skin: '#ab5236', top: '#ffec27', legs: '#5f574f' },
  { hair: '#5f574f', skin: '#ffccaa', top: '#008751', legs: '#ab5236' },
  { hair: '#ffa300', skin: '#ffccaa', top: '#29adff', legs: '#fff1e8' },
  { hair: '#83769c', skin: '#ab5236', top: '#ff77a8', legs: '#1a1423' },
  { hair: '#00e436', skin: '#ffccaa', top: '#5f574f', legs: '#29adff' },
  { hair: '#c2c3c7', skin: '#ffccaa', top: '#ab5236', legs: '#7e2553' },
  { hair: '#ff004d', skin: '#ab5236', top: '#00e436', legs: '#1d2b53' },
  { hair: '#ffec27', skin: '#ffccaa', top: '#83769c', legs: '#008751' }
];

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

function pathTile(ctx, x0, rnd, base = '#d9b67a', dark = '#c29a5c', light = '#eacb93') {
  px(ctx, x0, 0, base, TILE, TILE);
  for (let i = 0; i < 5; i++) {
    const x = x0 + Math.floor(rnd() * (TILE - 2)), y = Math.floor(rnd() * (TILE - 2));
    px(ctx, x, y, dark, 2, 2); px(ctx, x, y, light);
  }
  for (let i = 0; i < 6; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), light);
}

function waterTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#3aa9f2', TILE, TILE);
  for (let i = 0; i < 4; i++) px(ctx, x0 + Math.floor(rnd() * (TILE - 4)), Math.floor(rnd() * (TILE - 3)), '#2f93dc', 4, 2);
  [[4, 6], [17, 13], [8, 23], [21, 27]].forEach(([wx, wy]) => {
    px(ctx, x0 + wx, wy, '#b7e6ff', 3, 1); px(ctx, x0 + wx + 3, wy + 1, '#b7e6ff', 3, 1);
  });
}

function sandTile(ctx, x0, rnd) {
  px(ctx, x0, 0, '#e8d6a0', TILE, TILE);
  for (let i = 0; i < 8; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#d4bf85');
  for (let i = 0; i < 3; i++) px(ctx, x0 + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#fff7dc');
  px(ctx, x0 + 22, 20, '#fff7dc', 3, 2); px(ctx, x0 + 23, 22, '#d4bf85', 1, 1);   // a tiny shell
}

/** Plaster wall with wooden beams on both sides. */
function wallBase(ctx, x0) {
  px(ctx, x0, 0, '#f3e5c3', TILE, TILE);
  px(ctx, x0, 0, '#8a5a34', 2, TILE); px(ctx, x0 + TILE - 2, 0, '#8a5a34', 2, TILE);
  px(ctx, x0, TILE - 2, '#c9b58e', TILE, 2);
}
function wallTile(ctx, x0) {
  wallBase(ctx, x0);
  px(ctx, x0 + 10, 8, '#8a5a34', 12, 12);
  px(ctx, x0 + 11, 9, '#7fd0ff', 10, 10);
  px(ctx, x0 + 15, 9, '#8a5a34', 1, 10); px(ctx, x0 + 11, 13, '#8a5a34', 10, 1);
  px(ctx, x0 + 12, 10, '#ffffff', 2, 1);
}
function doorTile(ctx, x0) {
  wallBase(ctx, x0);
  px(ctx, x0 + 8, 8, '#4a2c14', 16, 24);
  px(ctx, x0 + 9, 9, '#8a5a34', 14, 23);
  ctx.fillStyle = '#4a2c14'; ctx.beginPath(); ctx.arc(x0 + 16, 9, 8, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.arc(x0 + 16, 10, 7, Math.PI, 0); ctx.fill();
  px(ctx, x0 + 13, 8, '#6e4424', 1, 24); px(ctx, x0 + 18, 8, '#6e4424', 1, 24);
  px(ctx, x0 + 19, 20, '#ffec27', 2, 2);
}
function roofTile(ctx, x0) {
  px(ctx, x0, 0, '#d94f3f', TILE, TILE);
  for (let band = 0; band < 4; band++) {
    const y = band * 8;
    px(ctx, x0, y + 7, '#a83528', TILE, 1);
    px(ctx, x0, y, '#ef7a68', TILE, 1);
    for (let x = (band % 2) * 4; x < TILE; x += 8) px(ctx, x0 + x, y + 1, '#a83528', 1, 6);
  }
}
function gateLockedTile(ctx, x0, rnd) {
  pathTile(ctx, x0, rnd);
  px(ctx, x0 + 1, 0, '#4a2c14', 6, TILE); px(ctx, x0 + 2, 1, '#7a3a1e', 4, TILE - 2);
  px(ctx, x0 + TILE - 7, 0, '#4a2c14', 6, TILE); px(ctx, x0 + TILE - 6, 1, '#7a3a1e', 4, TILE - 2);
  [5, 13, 21].forEach((y) => { px(ctx, x0 + 6, y, '#4a2c14', 20, 7); px(ctx, x0 + 7, y + 1, '#ab5236', 18, 4); });
  px(ctx, x0 + 13, 8, '#5f574f', 6, 5); px(ctx, x0 + 14, 9, '#ab5236', 4, 4);   // shackle
  px(ctx, x0 + 12, 12, '#1a1423', 8, 9); px(ctx, x0 + 13, 13, '#ffec27', 6, 7);  // lock body
  px(ctx, x0 + 15, 15, '#1a1423', 2, 3);
}
function gateOpenTile(ctx, x0, rnd) {
  pathTile(ctx, x0, rnd);
  [1, TILE - 7].forEach((x) => {
    px(ctx, x0 + x, 0, '#4a2c14', 6, TILE); px(ctx, x0 + x + 1, 1, '#7a3a1e', 4, TILE - 2); px(ctx, x0 + x + 1, 1, '#c27a4a', 4, 1);
  });
}

export function tilesTexture(scene) {
  if (scene.textures.exists('tiles')) return;
  const n = Object.keys(TILE_IDS).length, rnd = mulberry32(7);
  const tex = scene.textures.createCanvas('tiles', TILE * n, TILE);
  const ctx = tex.getContext();
  const at = (i) => i * TILE;
  grassTile(ctx, at(TILE_IDS.grass), rnd, '#4fae4a', '#3b8f3d', '#7fd06e');
  pathTile(ctx, at(TILE_IDS.path), rnd);
  waterTile(ctx, at(TILE_IDS.water), rnd);
  blit(ctx, TREE, at(TILE_IDS.tree), 0, 2);                       // transparent: drawn on the tree overlay layer
  wallTile(ctx, at(TILE_IDS.wall));
  doorTile(ctx, at(TILE_IDS.door));
  grassTile(ctx, at(TILE_IDS.flower), rnd, '#4fae4a', '#3b8f3d', '#7fd06e', 3);
  blit(ctx, FLOWERS, at(TILE_IDS.flower), 0, 2);
  grassTile(ctx, at(TILE_IDS.meadow), rnd, '#6cc85e', '#4fae4a', '#a6ef92', 5);
  for (let i = 0; i < 3; i++) {
    const x = at(TILE_IDS.meadow) + 2 + Math.floor(rnd() * 26), y = 2 + Math.floor(rnd() * 26);
    px(ctx, x, y, '#ffffff', 2, 2); px(ctx, x + 1, y + 1, '#ffec27');
  }
  grassTile(ctx, at(TILE_IDS.woods), rnd, '#3a8a3a', '#2a6a2a', '#52a44e', 8);
  for (let i = 0; i < 3; i++) px(ctx, at(TILE_IDS.woods) + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), '#8a5a34');
  sandTile(ctx, at(TILE_IDS.cove), rnd);
  gateLockedTile(ctx, at(TILE_IDS.gateLocked), rnd);
  gateOpenTile(ctx, at(TILE_IDS.gateOpen), rnd);
  roofTile(ctx, at(TILE_IDS.roof));
  for (let i = 0; i < n; i++) tex.add(i, 0, at(i), 0, TILE, TILE);
  tex.refresh();
}

/** Round avatar badges for profiles: 'avatar' sheet with AVATAR_COUNT frames of 40x40 showing each character's head. */
export function avatarTexture(scene) {
  if (scene.textures.exists('avatar')) return;
  const S = 40;
  const tex = scene.textures.createCanvas('avatar', S * AVATAR_COUNT, S);
  const ctx = tex.getContext();
  const head = CHAR_DOWN.slice(0, 9).map((r) => r.slice(3, 13));   // 10 x 9 pixels
  CHARACTER_STYLES.forEach((st, i) => {
    const x0 = i * S;
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = st.top; ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x0 + S / 2, S / 2 - 6, S / 2 - 6, Math.PI, 0); ctx.fill();
    blit(ctx, head, x0 + 5, 6, 3, charPalette(st));
    tex.add(i, 0, x0, 0, S, S);
  });
  tex.refresh();
}

function star(g, cx, cy, r, color) {
  g.fillStyle(color, 1); g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath(); g.fillPath();
}

export function uiTextures(scene) {
  const g = scene.make.graphics({ add: false });
  const O = 0x1a1423;
  if (!scene.textures.exists('px')) { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 2, 2); g.generateTexture('px', 2, 2); g.clear(); }
  if (!scene.textures.exists('star')) {
    star(g, 24, 25, 23, O); star(g, 24, 24, 20, C.yellow); star(g, 24, 22, 11, 0xfff7a0);
    g.generateTexture('star', 48, 48); g.clear();
  }
  if (!scene.textures.exists('star-off')) { star(g, 24, 25, 23, O); star(g, 24, 24, 20, 0x3b3550); g.generateTexture('star-off', 48, 48); g.clear(); }
  if (!scene.textures.exists('coin')) {
    g.fillStyle(O, 1); g.fillCircle(12, 12, 12);
    g.fillStyle(C.orange, 1); g.fillCircle(12, 12, 10.5);
    g.fillStyle(C.yellow, 1); g.fillCircle(11, 11, 8);
    g.fillStyle(0xd07a00, 1); g.fillRect(9.5, 6, 3, 10);
    g.fillStyle(0xffffff, 0.55); g.fillCircle(8, 8, 2);
    g.generateTexture('coin', 24, 24); g.clear();
  }
  if (!scene.textures.exists('joy-base')) {
    g.fillStyle(0xffffff, 0.18); g.fillCircle(60, 60, 58); g.lineStyle(3, 0xffffff, 0.5); g.strokeCircle(60, 60, 58);
    g.generateTexture('joy-base', 120, 120); g.clear();
  }
  if (!scene.textures.exists('joy-thumb')) { g.fillStyle(0xffffff, 0.6); g.fillCircle(26, 26, 24); g.generateTexture('joy-thumb', 52, 52); g.clear(); }
  if (!scene.textures.exists('bubble')) {
    g.fillStyle(O, 1); g.fillRoundedRect(0, 0, 16, 16, 5);
    g.fillStyle(C.white, 1); g.fillRoundedRect(1, 1, 14, 14, 4);
    g.fillStyle(C.red, 1); g.fillRect(7, 3, 2, 7); g.fillRect(7, 11, 2, 2);
    g.generateTexture('bubble', 16, 16); g.clear();
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
  sheets.forEach((key) => {
    if (scene.anims.exists(`${key}-down`)) return;
    scene.anims.create({ key: `${key}-down`, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: `${key}-up`, frames: scene.anims.generateFrameNumbers(key, { start: 2, end: 3 }), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: `${key}-side`, frames: scene.anims.generateFrameNumbers(key, { start: 4, end: 5 }), frameRate: 6, repeat: -1 });
  });
  if (!scene.anims.exists('robot-walk')) scene.anims.create({ key: 'robot-walk', frames: scene.anims.generateFrameNumbers('robot', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
}
