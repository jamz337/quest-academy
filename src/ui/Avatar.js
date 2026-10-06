// The player's own character, drawn with smooth shapes in the same flat, lean family as Mango and the hub's hosts,
// with a child's proportions. Every choice from "Change the look" is honoured: boy or girl, the 18 hair styles,
// T-shirt or polo, trousers, shorts or skirt, and the skin, hair, top, bottom, eye and shoe colours, plus the
// hats, glasses and backpacks from the market. Painted from the front, the back and the side (facing left; flip
// for right), standing and mid-step, into a sheet numbered like the pixel people's sheets.
import { LPC_COLS, LPC_ROWS, swatch } from './LpcCharacter.js';

/** Side of one painted cell. The character's feet stand near the cell's bottom edge. */
export const AVATAR_CELL = 192;
/** How tall the player stands in the world, in world pixels (a little shorter than the grown-up hosts). */
export const AVATAR_WORLD_HEIGHT = 34;

const INK = '#1e1b4b';
const SHOES = { white: '#f6f6f6', brown: '#6e4a28', black: '#1e1b4b' };
const HEAD = { cx: 100, cy: 62, rx: 26, ry: 28 };   // the head, in the 200 x 250 drawing space

const tools = (ctx) => ({
  fill: (d, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fill(new Path2D(d)); ctx.globalAlpha = 1; },
  line: (d, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(d)); },
  oval: (x, y, rx, ry, col, rot = 0) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); },
  ring: (x, y, r, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); },
  box: (x, y, w, h, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
});

/** A colour a shade darker, for hair shine lines and clothing folds. */
function darker(hex, k = 0.72) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (!Number.isFinite(n)) return '#000000';
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---- Hair -------------------------------------------------------------------------------------------------
// Each style paints in two layers: `back` before the head (a ponytail, long hair down the back) and `front` after
// it (the cap over the forehead). `v` is the view; the side view faces left, so the back of the head is at x > 100.

const { cx: HX, cy: HY, rx: HR, ry: HRY } = HEAD;
const TOP = HY - HRY;   // y of the top of the head

/** The cap of hair over the top of the head, to `down` (0..1) of the head's height, with sideburns. */
const cap = (t, col, down = 0.45, v = 'front') => {
  const y = TOP + HRY * 2 * down;
  if (v === 'back') { t.oval(HX, HY - 2, HR + 1, HRY + 1, col); return; }
  t.fill(`M${HX - HR - 1} ${y}C${HX - HR - 2} ${TOP + 2} ${HX - 8} ${TOP - 4} ${HX} ${TOP - 4}C${HX + 8} ${TOP - 4} ${HX + HR + 2} ${TOP + 2} ${HX + HR + 1} ${y}C${HX + HR - 8} ${y - HRY * 0.35} ${HX + 10} ${y - HRY * 0.45} ${HX} ${y - HRY * 0.45}C${HX - 10} ${y - HRY * 0.45} ${HX - HR + 8} ${y - HRY * 0.35} ${HX - HR - 1} ${y}z`, col);
};
const bumps = (t, col, n, r, ry0, spread) => { for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI; t.oval(HX + Math.cos(a) * spread, ry0 + Math.sin(a) * spread * 0.75, r, r, col); } };
const sides = (t, col, toY, w = 9) => { t.box(HX - HR - 3, HY - 14, w, toY - (HY - 14), 5, col); t.box(HX + HR - w + 3, HY - 14, w, toY - (HY - 14), 5, col); };

const HAIR = {
  plain: { front: (t, c, v) => { cap(t, c, 0.45, v); if (v !== 'back') sides(t, c, HY + 4, 7); } },
  buzzcut: { front: (t, c, v) => cap(t, c, 0.36, v) },
  bangs: { front: (t, c, v) => { cap(t, c, 0.42, v); if (v !== 'back') { t.fill(`M${HX - HR + 2} ${TOP + 10}h${HR * 2 - 4}l-2 ${HRY * 0.7}l-5-4-6 5-6-5-6 5-6-5-5 4z`, c); sides(t, c, HY + 6, 7); } } },
  pixie: { front: (t, c, v) => { cap(t, c, 0.5, v); if (v !== 'back') { t.fill(`M${HX - HR} ${TOP + 12}c10-10 30-10 44 2l-6 ${HRY * 0.75}c-10-8-24-6-32 0z`, c); sides(t, c, HY + 10, 8); } } },
  spiked: { front: (t, c, v) => { cap(t, c, 0.42, v); for (let i = 0; i < 5; i++) { const x = HX - 20 + i * 10; t.fill(`M${x - 6} ${TOP + 4}l6-${16 + (i % 2) * 6}l6 ${16 + (i % 2) * 6}z`, c); } } },
  curly_short: { front: (t, c, v) => { cap(t, c, 0.45, v); bumps(t, c, 7, 7.5, TOP + 10, HR + 2); if (v !== 'back') sides(t, c, HY + 6, 8); } },
  curly_long: { back: (t, c) => { t.box(HX - HR - 8, HY - 10, HR * 2 + 16, 72, 20, c); for (let i = 0; i < 6; i++) { t.oval(HX - HR - 8 + (i % 2) * 2, HY + 10 + i * 10, 9, 9, c); t.oval(HX + HR + 6 - (i % 2) * 2, HY + 10 + i * 10, 9, 9, c); } }, front: (t, c, v) => { cap(t, c, 0.45, v); bumps(t, c, 7, 8, TOP + 10, HR + 3); } },
  afro: { back: (t, c) => t.oval(HX, HY - 6, HR + 14, HRY + 12, c), front: (t, c, v) => { cap(t, c, 0.4, v); for (let i = 0; i < 9; i++) { const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.9; t.oval(HX + Math.cos(a) * (HR + 12), HY - 6 + Math.sin(a) * (HRY + 10), 8, 8, c); } } },
  natural: { back: (t, c) => t.oval(HX, HY - 8, HR + 8, HRY + 6, c), front: (t, c, v) => { cap(t, c, 0.42, v); bumps(t, c, 8, 6, TOP + 6, HR + 4); } },
  cornrows: { front: (t, c, v) => { cap(t, c, 0.44, v); const d = darker(c, 0.6); for (let i = -2; i <= 2; i++) t.line(`M${HX + i * 9} ${TOP + 2 + Math.abs(i) * 4}q${i * 2} ${HRY * 0.5} ${i * 4} ${HRY * 0.9}`, d, 1.6); } },
  twists_straight: { front: (t, c, v) => { cap(t, c, 0.44, v); const n = v === 'side' ? 5 : 7; for (let i = 0; i < n; i++) { const x = HX - HR + 2 + i * ((HR * 2 - 4) / (n - 1)); t.line(`M${x} ${HY - 12}q${(i % 2 ? 3 : -3)} 18 ${(i % 2 ? 1 : -1)} 30`, c, 5); } } },
  dreadlocks_short: { front: (t, c, v) => { cap(t, c, 0.46, v); for (let i = 0; i < 6; i++) { const a = Math.PI * 1.1 + (i / 5) * Math.PI * 0.8; const x = HX + Math.cos(a) * (HR + 2), y = HY - 10 + Math.sin(a) * 8; t.line(`M${x} ${y}q${(i - 2.5) * 2} 14 ${(i - 2.5) * 3} 26`, c, 6); } for (let i = 0; i < 4; i++) t.line(`M${HX - 18 + i * 12} ${TOP + 2}q2-10 6-14`, c, 5); } },
  dreadlocks_long: { back: (t, c) => { for (let i = 0; i < 8; i++) t.line(`M${HX - 24 + i * 7} ${HY}q${(i - 3.5) * 2} 40 ${(i - 3.5) * 3} 78`, c, 7); }, front: (t, c, v) => { cap(t, c, 0.46, v); for (let i = 0; i < 5; i++) t.line(`M${HX - 20 + i * 10} ${TOP + 2}q2-10 6-14`, c, 5); } },
  bob: { front: (t, c, v) => { cap(t, c, 0.42, v); if (v !== 'back') { sides(t, c, HY + HRY - 2, 11); t.fill(`M${HX - HR + 2} ${TOP + 10}h${HR * 2 - 4}l-2 ${HRY * 0.6}q-${HR - 2}-10-${HR * 2 - 4} 0z`, c); } else t.box(HX - HR - 3, HY - 10, HR * 2 + 6, HRY + 22, 12, c); } },
  long: { back: (t, c) => t.box(HX - HR - 6, HY - 10, HR * 2 + 12, 84, 18, c), front: (t, c, v) => { cap(t, c, 0.44, v); if (v !== 'back') sides(t, c, HY + 24, 10); } },
  ponytail: { back: (t, c, v) => { const x = v === 'side' ? HX + HR + 2 : HX; t.line(`M${x} ${HY + 6}q${v === 'side' ? 10 : 0} 20 ${v === 'side' ? 6 : 0} 48`, c, 11); t.oval(x, HY + 8, 9, 7, c); }, front: (t, c, v) => { cap(t, c, 0.44, v); if (v !== 'back') sides(t, c, HY + 2, 7); } },
  high_ponytail: { back: (t, c, v) => { const x = v === 'side' ? HX + 14 : HX + 6; t.line(`M${x} ${TOP + 6}q${v === 'side' ? 26 : 12} 10 ${v === 'side' ? 24 : 14} 50`, c, 11); t.oval(x, TOP + 8, 9, 8, c); }, front: (t, c, v) => cap(t, c, 0.42, v) },
  braid: { back: (t, c, v) => { const x = v === 'side' ? HX + HR : v === 'back' ? HX : HX + HR - 6; for (let i = 0; i < 5; i++) t.oval(x + (i % 2 ? 2 : -2), HY + 10 + i * 11, 7, 7.5, c); t.oval(x, HY + 66, 5, 6, darker(c, 0.85)); }, front: (t, c, v) => { cap(t, c, 0.44, v); if (v !== 'back') sides(t, c, HY + 2, 7); } }
};

// ---- The figure -----------------------------------------------------------------------------------------------

/** Eyes, brows and mouth. The side view shows one eye and a little nose. */
function face(t, look, v) {
  if (v === 'back') return;
  const eye = swatch('eye', look.eyes) || '#5a3a22', side = v === 'side', girl = look.sex === 'girl';
  const eyes = side ? [[HX - 12, HY + 2]] : [[HX - 11, HY + 2], [HX + 11, HY + 2]];
  for (const [x, y] of eyes) {
    t.oval(x, y, 4.2, 5, '#ffffff'); t.oval(x, y + 0.5, 2.9, 3.6, eye); t.oval(x, y + 0.8, 1.5, 2, INK); t.oval(x + 1, y - 1.2, 0.9, 0.9, '#ffffff');
    if (girl) t.line(`M${x - 4} ${y - 4.5}l-1.5-2M${x + 4} ${y - 4.5}l1.5-2`, INK, 1.2);   // lashes
  }
  t.line(side ? `M${HX - 17} ${HY - 8}q5-2 10 0` : `M${HX - 16} ${HY - 8}q5-2 10 0M${HX + 6} ${HY - 8}q5-2 10 0`, INK, 2);
  if (side) t.oval(HX - HR + 3, HY + 8, 3, 2.6, swatch('body', look.skin) || '#c68a5a');
  t.line(side ? `M${HX - 16} ${HY + 16}q4 4 9 0` : `M${HX - 7} ${HY + 17}q7 5 14 0`, INK, 2.2);
}

/** A hat from the market, over the hair. */
function hat(t, style, v) {
  if (!style) return;
  const c = style.colour || '#4c8df6', d = darker(c);
  const y = TOP + 4;
  if (style.shape === 'cap') { t.fill(`M${HX - HR - 2} ${y + 8}c0-18 10-26 ${HR + 2}-26s${HR + 2} 8 ${HR + 2} 26z`, c); if (v !== 'back') t.fill(v === 'side' ? `M${HX - HR - 20} ${y + 6}h${HR + 20}v7h-${HR + 14}z` : `M${HX - HR - 6} ${y + 6}h${HR * 2 + 12}v7h-${HR * 2 + 12}z`, d); }
  else if (style.shape === 'sun') { t.fill(`M${HX - HR - 1} ${y + 10}c0-18 10-26 ${HR + 1}-26s${HR + 1} 8 ${HR + 1} 26z`, c); t.oval(HX, y + 10, HR + 18, 7, c); t.oval(HX, y + 10, HR + 18, 7, d); t.oval(HX, y + 8, HR + 16, 6, c); }
  else if (style.shape === 'beanie') { t.fill(`M${HX - HR - 2} ${y + 14}c0-22 10-30 ${HR + 2}-30s${HR + 2} 8 ${HR + 2} 30z`, c); t.box(HX - HR - 3, y + 8, HR * 2 + 6, 9, 4, d); t.oval(HX, y - 16, 7, 7, '#ffffff'); }
  else if (style.shape === 'party') { t.fill(`M${HX - 16} ${y + 6}l16-${HRY + 14}l16 ${HRY + 14}z`, c); t.oval(HX, y - HRY - 8, 5, 5, '#ffd75e'); for (let i = 0; i < 3; i++) t.oval(HX - 4 + i * 4, y - 6 + i * 6, 2.2, 2.2, '#ffffff'); }
  else if (style.shape === 'crown') { t.fill(`M${HX - HR + 2} ${y + 12}h${HR * 2 - 4}v-14l-9 6-9-12-8 12-8-12-8 12-10-6z`, '#ffc531'); for (let i = 0; i < 3; i++) t.oval(HX - 14 + i * 14, y + 7, 2.5, 2.5, '#e8623f'); }
  else if (style.shape === 'feathers') { ['#ff5c6c', '#ffc531', '#2ec46a', '#4c8df6', '#ff8fb8'].forEach((fc, i) => t.oval(HX - 20 + i * 10, y - 16 - (i === 2 ? 8 : Math.abs(i - 2) === 1 ? 4 : 0), 5, 16, fc, (i - 2) * 0.25)); t.box(HX - HR + 2, y + 2, HR * 2 - 4, 8, 4, c); }
}

function glasses(t, style, v) {
  if (!style || v === 'back') return;
  const sun = style.shape === 'sun';
  const eyes = v === 'side' ? [[HX - 12, HY + 2]] : [[HX - 11, HY + 2], [HX + 11, HY + 2]];
  for (const [x, y] of eyes) { if (sun) t.oval(x, y, 7.5, 6.5, INK); t.ring(x, y, 7.5, INK, 2); }
  if (v !== 'side') t.line(`M${HX - 3.5} ${HY + 2}h7`, INK, 2);
}

/** Things worn on the back: a backpack, a cape or wings. Drawn behind the body (and the straps in front). */
function backItem(t, style, v, layer) {
  if (!style) return;
  const c = style.colour || '#2ec46a', d = darker(c);
  if (layer === 'behind') {
    if (v === 'front') { if (style.shape === 'cape') t.fill(`M${HX - 28} 120q28-8 56 0l8 70q-36 10-72 0z`, c); if (style.shape === 'wings') for (const s of [-1, 1]) t.fill(`M${HX + s * 22} 118q${s * 40}-26 ${s * 44} 6q-8 26-${s * 44} 20z`, c); }
    if (v === 'back') { if (style.shape === 'backpack') { t.box(HX - 22, 118, 44, 44, 10, d); t.box(HX - 19, 121, 38, 38, 8, c); t.box(HX - 12, 136, 24, 12, 4, d); } if (style.shape === 'cape') t.fill(`M${HX - 30} 118q30-8 60 0l8 74q-38 10-76 0z`, c); if (style.shape === 'wings') for (const s of [-1, 1]) t.fill(`M${HX + s * 20} 118q${s * 44}-28 ${s * 48} 6q-8 28-${s * 48} 22z`, c); }
    if (v === 'side') { if (style.shape === 'backpack') { t.box(HX + 8, 120, 22, 42, 8, d); t.box(HX + 10, 122, 18, 38, 7, c); } if (style.shape === 'cape') t.fill(`M${HX + 6} 118q12-4 20 0l6 70q-14 8-30 0z`, c); if (style.shape === 'wings') t.fill(`M${HX + 10} 118q44-26 48 6q-8 26-48 20z`, c); }
  } else if (v === 'front' && style.shape === 'backpack') { t.line(`M${HX - 16} 118v30M${HX + 16} 118v30`, d, 5); }
}

/** Paint one view of the look (standing, or mid-step) into a `size` px cell whose top-left is (ox, oy). */
export function drawAvatar(ctx, look, outfit, ox, oy, size, view = 'front', step = 0) {
  const s = size / 250, t = tools(ctx);
  const skin = swatch('body', look.skin) || '#c68a5a', hairCol = swatch('hair', look.hair) || '#2a1a12';
  const topCol = swatch('cloth', look.top) || '#4c8df6', botCol = swatch('cloth', look.bottom) || '#1e3a8a';
  const shoeCol = SHOES[look.shoes] || swatch('cloth', look.shoes) || '#6e4a28';
  const v = view, hair = HAIR[look.hairStyle] || HAIR.plain, girl = look.sex === 'girl';
  const o = outfit || {};
  ctx.save();
  ctx.translate(ox + (size - 200 * s) / 2, oy - 2 * s);
  ctx.scale(s, s);
  // Behind the body: back items, then the hair that hangs down the back.
  backItem(t, o.back, v, 'behind');
  if (hair.back) hair.back(t, hairCol, v);
  // Legs and shoes, with one foot forward on the step frame.
  const lift = step ? 5 : 0;
  if (v === 'side') { t.line(`M${HX - 6} 170l${step ? -10 : -2} 60M${HX + 6} 170l${step ? 12 : 2} 58`, skin, 13); t.oval(HX - 8 - (step ? 9 : 0), 232, 13, 6, shoeCol); t.oval(HX + 8 + (step ? 9 : 0), 230 - lift, 13, 6, shoeCol); }
  else { t.line(`M${HX - 12} 170l-2 60M${HX + 12} 170l2 ${60 - lift}`, skin, 13); t.oval(HX - 14, 232, 13, 6, shoeCol); t.oval(HX + 14, 232 - lift, 13, 6, shoeCol); }
  // Bottoms.
  if (look.bottomStyle === 'skirt') t.fill(`M${HX - 26} 166h52l12 40h-76z`, botCol);
  else if (look.bottomStyle === 'shorts') { t.fill(`M${HX - 26} 164h52l-2 32h-20l-4-14-4 14h-20z`, botCol); }
  else { t.fill(`M${HX - 26} 164h52l-2 64h-19l-5-44-5 44h-19z`, botCol); t.line(`M${HX} 170v20`, darker(botCol, 0.8), 1.5); }
  // Arms (behind the torso's edge), hands.
  const armCol = topCol;
  if (v === 'side') { t.line(`M${HX} 124c-6 14-6 32-2 48`, armCol, 14); t.oval(HX, 174, 8, 8, skin); }
  else { t.line(`M${HX - 26} 122c-16 10-18 28-12 44`, armCol, 14); t.line(`M${HX + 26} 122c16 10 18 28 12 44`, armCol, 14); t.oval(HX - 38, 168, 8, 8, skin); t.oval(HX + 38, 168, 8, 8, skin); }
  // Torso and top.
  t.fill(`M${HX - 28} 118q28-10 56 0l-2 52q-26 8-52 0z`, topCol);
  t.fill(`M${HX + 14} 114q10 2 14 4l-2 52q-6 2-12 2z`, darker(topCol, 0.88));   // a soft fold
  if (v === 'front') {
    if (look.topStyle === 'polo') { t.fill(`M${HX - 12} 114l12 14 12-14-6-4h-12z`, '#ffffff'); t.oval(HX, 130, 2, 2, INK); }
    else t.line(`M${HX - 11} 115q11 7 22 0`, darker(topCol, 0.8), 2);
  }
  backItem(t, o.back, v, 'front');
  // Neck and head.
  t.box(HX - 8, HY + HRY - 6, 16, 18, 5, skin);
  t.oval(HX, HY, HR, HRY, skin);
  if (v !== 'back') { t.oval(HX - HR + 1, HY + 4, 4, 5, skin); if (v !== 'side') t.oval(HX + HR - 1, HY + 4, 4, 5, skin); }   // ears
  face(t, look, v);
  hair.front(t, hairCol, v);
  if (v !== 'back' && !['afro', 'natural', 'buzzcut'].includes(look.hairStyle)) t.line(`M${HX - 12} ${TOP + 8}q10-5 22 0`, 'rgba(255,255,255,0.28)', 3);   // a shine on the hair
  glasses(t, o.glasses, v);
  hat(t, o.hat, v);
  void girl;
  ctx.restore();
}

/**
 * Build a look's walking sheet: six painted cells (front, back and side, standing and mid-step), numbered like the
 * pixel people's sheets so every scene can use the same frame numbers and animations. Returns the texture key.
 */
export function avatarTexture(scene, key, look, outfit = null) {
  if (scene.textures.exists(key)) return key;
  const C = AVATAR_CELL, views = ['back', 'side', 'front'];
  const tex = scene.textures.createCanvas(key, C * 6, C), ctx = tex.getContext();
  views.forEach((view, v) => [0, 1].forEach((step) => drawAvatar(ctx, look, outfit, C * (v * 2 + step), 0, C, view, step)));
  const viewOfRow = { [LPC_ROWS.up]: 0, [LPC_ROWS.left]: 1, [LPC_ROWS.down]: 2, [LPC_ROWS.right]: 1 };
  for (let row = 0; row < 4; row++) for (let col = 0; col < LPC_COLS; col++) {
    const cell = viewOfRow[row] * 2 + (col === 0 ? 0 : Math.ceil(col / 2) % 2);
    tex.add(row * LPC_COLS + col, 0, C * cell, 0, C, C);
  }
  tex.refresh();
  return key;
}

/** The round badge: the head and shoulders on the look's background colour, with a darker rim. */
export function drawAvatarBadge(ctx, look, outfit, ox, oy, size) {
  const bg = look.bg || '#3d8bff', r = size / 2;
  ctx.fillStyle = darker(bg, 0.82); ctx.beginPath(); ctx.arc(ox + r, oy + r, r, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(ox + r, oy + r, r - size * 0.04, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(ox, oy, size, size);
  // The figure, scaled so the head fills most of the disc and the shoulders show at the bottom.
  const cell = size * 2.6;
  drawAvatar(ctx, look, outfit, ox + r - cell / 2, oy + r - cell * (HY / 250) + size * 0.02, cell, 'front', 0);
  ctx.restore();
}
