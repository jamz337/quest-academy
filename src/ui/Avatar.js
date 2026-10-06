// The player's own character, drawn with smooth shapes in the same flat, lean family as Mango and the hub's hosts,
// in the outlined, shaded cartoon style of the reference sheets, with a teenager's proportions. Every choice from "Change the look" is honoured: boy or girl, the 18 hair styles,
// T-shirt or polo, trousers, shorts or skirt, and the skin, hair, top, bottom, eye and shoe colours, plus the
// hats, glasses and backpacks from the market. Painted from the front, the back and the side (facing left; flip
// for right), standing and mid-step, into a sheet numbered like the pixel people's sheets.
import { LPC_COLS, LPC_ROWS, swatch } from './LpcCharacter.js';

/** Side of one painted cell. The character's feet stand near the cell's bottom edge. */
export const AVATAR_CELL = 192;
/** How tall the player stands in the world, in world pixels (a little shorter than the grown-up hosts). */
export const AVATAR_WORLD_HEIGHT = 34;

const INK = '#1d1a3a', LW = 2.2;   // the navy outline around every shape, as in the reference sheets
const SHOES = { white: '#f4f1ea', brown: '#6e4a28', black: '#1e1b4b' };
const HEAD = { cx: 100, cy: 54, rx: 26, ry: 29 };   // the head, in the 200 x 250 drawing space (taller, teen proportions)

/** Painting helpers: every shape gets the outline; `detail`, `shade` and `glow` are the lines and tones laid over it. */
const tools = (ctx) => {
  const outline = (p) => { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = LW * 2; ctx.stroke(p); };
  return {
    fill: (d, col, a = 1) => { const p = new Path2D(d); ctx.globalAlpha = a; outline(p); ctx.fillStyle = col; ctx.fill(p); ctx.globalAlpha = 1; },
    line: (d, col, w) => { const p = new Path2D(d); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = w + LW * 2; ctx.stroke(p); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(p); },
    oval: (x, y, rx, ry, col, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = LW * 2; ctx.stroke(); ctx.fillStyle = col; ctx.fill(); },
    ring: (x, y, r, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); },
    box: (x, y, w, h, r, col) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = LW * 2; ctx.stroke(); ctx.fillStyle = col; ctx.fill(); },
    detail: (d, col, w, a = 1) => { ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(new Path2D(d)); ctx.globalAlpha = 1; },
    dot: (x, y, rx, ry, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    shade: (d, a = 0.16) => { ctx.globalAlpha = a; ctx.fillStyle = '#1d1a3a'; ctx.fill(new Path2D(d)); ctx.globalAlpha = 1; },
    glow: (d, a = 0.22) => { ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fill(new Path2D(d)); ctx.globalAlpha = 1; }
  };
};

/** Two colours mixed, `k` of the way from the first to the second. */
function mixHex(a, b, k) {
  const pa = parseInt(String(a).replace('#', ''), 16), pb = parseInt(String(b).replace('#', ''), 16);
  if (!Number.isFinite(pa) || !Number.isFinite(pb)) return a;
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return '#' + [ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

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
  cornrows: { front: (t, c, v) => { cap(t, c, 0.44, v); const d = darker(c, 0.6); for (let i = -2; i <= 2; i++) t.detail(`M${HX + i * 9} ${TOP + 2 + Math.abs(i) * 4}q${i * 2} ${HRY * 0.5} ${i * 4} ${HRY * 0.9}`, d, 1.6); } },
  twists_straight: { front: (t, c, v) => { cap(t, c, 0.44, v); const n = v === 'side' ? 5 : 7; for (let i = 0; i < n; i++) { const x = HX - HR + 2 + i * ((HR * 2 - 4) / (n - 1)); t.line(`M${x} ${HY - 12}q${(i % 2 ? 3 : -3)} 18 ${(i % 2 ? 1 : -1)} 30`, c, 5); } } },
  dreadlocks_short: { back: (t, c, v) => {
    // A thick mass behind the head, with locs hanging down either side of the face (never over it).
    t.oval(HX, HY + 2, HR + 7, HRY + 1, c);
    const cols = v === 'back' ? [-20, -10, 0, 10, 20].map((dx) => [HX + dx, 0]) : v === 'side' ? [[HX - HR - 2, -1], [HX + HR - 6, 1], [HX + HR + 2, 1]] : [[HX - HR - 3, -1], [HX - HR + 3, -1], [HX + HR - 3, 1], [HX + HR + 3, 1]];
    for (const [x, sx] of cols) { t.line(`M${x} ${HY - 14}q${sx * 3} 14 ${sx * 2} 30`, c, 7.5); t.dot(x + sx * 2, HY + 16, 3.5, 3.5, darker(c, 0.75)); }
  }, front: (t, c, v) => {
    cap(t, c, 0.4, v);
    for (let i = 0; i < 5; i++) { const x = HX - 20 + i * 10; t.line(`M${x} ${TOP + 4}q${(i - 2) * 3} -10 ${(i - 2) * 5} -14`, c, 6); }
  } },
  dreadlocks_long: { back: (t, c) => { t.oval(HX, HY + 4, HR + 8, HRY + 2, c); for (let i = 0; i < 8; i++) t.line(`M${HX - 26 + i * 7.4} ${HY + 4}q${(i - 3.5) * 2} 40 ${(i - 3.5) * 3} 76`, c, 7); }, front: (t, c, v) => {
    cap(t, c, 0.42, v);
    for (let i = 0; i < 5; i++) { const x = HX - 20 + i * 10; t.line(`M${x} ${TOP + 4}q${(i - 2) * 3} -10 ${(i - 2) * 5} -14`, c, 6); }
    if (v !== 'back') for (const sx of [-1, 1]) { const x = HX + sx * (HR + 2); t.line(`M${x} ${HY - 12}q${sx * 4} 30 ${sx * 2} 56`, c, 7.5); t.dot(x + sx * 2, HY + 44, 3.5, 3.5, darker(c, 0.75)); }
  } },
  bob: { front: (t, c, v) => { cap(t, c, 0.42, v); if (v !== 'back') { sides(t, c, HY + HRY - 2, 11); t.fill(`M${HX - HR + 2} ${TOP + 10}h${HR * 2 - 4}l-2 ${HRY * 0.6}q-${HR - 2}-10-${HR * 2 - 4} 0z`, c); } else t.box(HX - HR - 3, HY - 10, HR * 2 + 6, HRY + 22, 12, c); } },
  long: { back: (t, c) => t.box(HX - HR - 6, HY - 10, HR * 2 + 12, 84, 18, c), front: (t, c, v) => { cap(t, c, 0.44, v); if (v !== 'back') sides(t, c, HY + 24, 10); } },
  ponytail: { back: (t, c, v) => { const x = v === 'side' ? HX + HR + 2 : HX; t.line(`M${x} ${HY + 6}q${v === 'side' ? 10 : 0} 20 ${v === 'side' ? 6 : 0} 48`, c, 11); t.oval(x, HY + 8, 9, 7, c); }, front: (t, c, v) => { cap(t, c, 0.44, v); if (v !== 'back') sides(t, c, HY + 2, 7); } },
  high_ponytail: { back: (t, c, v) => { const x = v === 'side' ? HX + 14 : HX + 6; t.line(`M${x} ${TOP + 6}q${v === 'side' ? 26 : 12} 10 ${v === 'side' ? 24 : 14} 50`, c, 11); t.oval(x, TOP + 8, 9, 8, c); }, front: (t, c, v) => cap(t, c, 0.42, v) },
  braid: { back: (t, c, v) => { const x = v === 'side' ? HX + HR : v === 'back' ? HX : HX + HR - 6; for (let i = 0; i < 5; i++) t.oval(x + (i % 2 ? 2 : -2), HY + 10 + i * 11, 7, 7.5, c); t.oval(x, HY + 66, 5, 6, darker(c, 0.85)); }, front: (t, c, v) => { cap(t, c, 0.44, v); if (v !== 'back') sides(t, c, HY + 2, 7); } }
};

// ---- The figure -----------------------------------------------------------------------------------------------

/** Eyes with an iris and a lid, brows, a nose and lips. The side view shows one eye and the nose in profile. */
function face(t, look, v, skin) {
  if (v === 'back') return;
  const eye = swatch('eye', look.eyes) || '#5a3a22', side = v === 'side', girl = look.sex === 'girl';
  const eyes = side ? [[HX - 10, HY + 4]] : [[HX - 10, HY + 4], [HX + 10, HY + 4]];
  for (const [x, y] of eyes) {
    t.dot(x, y, 5.2, 4.3, '#ffffff'); t.dot(x, y + 0.4, 3.2, 3.4, eye); t.dot(x, y + 0.6, 1.7, 1.9, INK); t.dot(x + 1.2, y - 1.2, 1, 1, '#ffffff');
    t.detail(`M${x - 5.5} ${y - 1.5}q5.5-6 11 0`, INK, 1.8);                                          // the upper lid
    if (girl) t.detail(`M${x - 5} ${y - 4}l-1.5-2.2M${x + 5} ${y - 4}l1.5-2.2`, INK, 1.3);            // lashes
  }
  t.detail(side ? `M${HX - 17} ${HY - 7}q6-4 12-1` : `M${HX - 17} ${HY - 7}q6-4 13-1M${HX + 4} ${HY - 8}q7-3 13 1`, INK, 3);   // brows
  if (side) t.fill(`M${HX - HR + 2} ${HY + 2}q-6 5-3 10q2 2 5 0z`, skin); else { t.detail(`M${HX - 1} ${HY + 4}l-3 10q3 3 7 0`, INK, 1.4, 0.55); t.dot(HX - 3, HY + 15, 1.3, 0.9, INK, 0.35); t.dot(HX + 3, HY + 15, 1.3, 0.9, INK, 0.35); }
  // Lips: a darker line between them and a soft lower lip in the skin's own tone.
  const lip = mixHex(darker(skin, 0.78), '#c0606a', 0.4);
  if (side) { t.detail(`M${HX - 18} ${HY + 20}q4 1 8-1`, INK, 1.8); t.dot(HX - 14, HY + 22.5, 3.5, 1.5, lip, 0.9); }
  else { t.dot(HX, HY + 21.5, 6.5, 2.2, lip, 0.95); t.detail(`M${HX - 7} ${HY + 20}q7-3 14 0`, INK, 1.6); }
}

/** A hat from the market, over the hair. */
function hat(t, style, v) {
  if (!style) return;
  const c = style.colour || '#4c8df6', d = darker(c);
  const y = TOP + 4;
  if (style.shape === 'cap') { t.fill(`M${HX - HR - 2} ${y + 8}c0-18 10-26 ${HR + 2}-26s${HR + 2} 8 ${HR + 2} 26z`, c); if (v !== 'back') t.fill(v === 'side' ? `M${HX - HR - 20} ${y + 6}h${HR + 20}v7h-${HR + 14}z` : `M${HX - HR - 6} ${y + 6}h${HR * 2 + 12}v7h-${HR * 2 + 12}z`, d); }
  else if (style.shape === 'sun') { t.fill(`M${HX - HR - 1} ${y + 10}c0-18 10-26 ${HR + 1}-26s${HR + 1} 8 ${HR + 1} 26z`, c); t.oval(HX, y + 10, HR + 18, 7, d); t.oval(HX, y + 8, HR + 16, 6, c); }
  else if (style.shape === 'beanie') { t.fill(`M${HX - HR - 2} ${y + 14}c0-22 10-30 ${HR + 2}-30s${HR + 2} 8 ${HR + 2} 30z`, c); t.box(HX - HR - 3, y + 8, HR * 2 + 6, 9, 4, d); t.oval(HX, y - 16, 7, 7, '#ffffff'); }
  else if (style.shape === 'party') { t.fill(`M${HX - 16} ${y + 6}l16-${HRY + 14}l16 ${HRY + 14}z`, c); t.oval(HX, y - HRY - 8, 5, 5, '#ffd75e'); for (let i = 0; i < 3; i++) t.dot(HX - 4 + i * 4, y - 6 + i * 6, 2.2, 2.2, '#ffffff'); }
  else if (style.shape === 'crown') { t.fill(`M${HX - HR + 2} ${y + 12}h${HR * 2 - 4}v-14l-9 6-9-12-8 12-8-12-8 12-10-6z`, '#ffc531'); for (let i = 0; i < 3; i++) t.dot(HX - 14 + i * 14, y + 7, 2.5, 2.5, '#e8623f'); }
  else if (style.shape === 'feathers') { ['#ff5c6c', '#ffc531', '#2ec46a', '#4c8df6', '#ff8fb8'].forEach((fc, i) => t.oval(HX - 20 + i * 10, y - 16 - (i === 2 ? 8 : Math.abs(i - 2) === 1 ? 4 : 0), 5, 16, fc, (i - 2) * 0.25)); t.box(HX - HR + 2, y + 2, HR * 2 - 4, 8, 4, c); }
}

function glasses(t, style, v) {
  if (!style || v === 'back') return;
  const sun = style.shape === 'sun';
  const eyes = v === 'side' ? [[HX - 10, HY + 4]] : [[HX - 10, HY + 4], [HX + 10, HY + 4]];
  for (const [x, y] of eyes) { if (sun) t.dot(x, y, 7.5, 6.5, INK, 0.9); t.ring(x, y, 7.5, INK, 2); }
  if (v !== 'side') t.detail(`M${HX - 2.5} ${HY + 4}h5`, INK, 2);
}

/** Things worn on the back: a backpack, a cape or wings. Drawn behind the body (and the straps in front). */
function backItem(t, style, v, layer) {
  if (!style) return;
  const c = style.colour || '#2ec46a', d = darker(c);
  if (layer === 'behind') {
    if (v === 'front') { if (style.shape === 'cape') t.fill(`M${HX - 30} 100q30-8 60 0l8 72q-38 10-76 0z`, c); if (style.shape === 'wings') for (const s of [-1, 1]) t.fill(`M${HX + s * 24} 100q${s * 42}-26 ${s * 46} 6q-8 26-${s * 46} 20z`, c); }
    if (v === 'back') { if (style.shape === 'backpack') { t.box(HX - 22, 100, 44, 46, 10, d); t.box(HX - 19, 103, 38, 40, 8, c); t.box(HX - 12, 120, 24, 12, 4, d); } if (style.shape === 'cape') t.fill(`M${HX - 32} 98q32-8 64 0l8 76q-40 10-80 0z`, c); if (style.shape === 'wings') for (const s of [-1, 1]) t.fill(`M${HX + s * 22} 100q${s * 46}-28 ${s * 50} 6q-8 28-${s * 50} 22z`, c); }
    if (v === 'side') { if (style.shape === 'backpack') { t.box(HX + 6, 102, 22, 44, 8, d); t.box(HX + 8, 104, 18, 40, 7, c); } if (style.shape === 'cape') t.fill(`M${HX + 4} 100q12-4 20 0l6 72q-14 8-30 0z`, c); if (style.shape === 'wings') t.fill(`M${HX + 8} 100q44-26 48 6q-8 26-48 20z`, c); }
  } else if (v === 'front' && style.shape === 'backpack') { t.line(`M${HX - 18} 100v32M${HX + 18} 100v32`, d, 5); }
}

/** A sneaker: white (or the chosen colour) with a grey sole and a lace line. `dir` is -1 facing left, 0 front. */
function shoe(t, x, y, col, dir = 0) {
  if (dir) { t.fill(`M${x - 17} ${y}c0-5 5-11 14-11c9 0 16 5 19 11z`, col); t.box(x - 17, y - 2, 33, 5, 2, '#c9c3b8'); t.detail(`M${x - 8} ${y - 6}l4-2`, INK, 1.4, 0.5); }
  else { t.fill(`M${x - 13} ${y}c0-7 6-11 13-11c7 0 13 4 13 11z`, col); t.box(x - 13, y - 2, 26, 5, 2, '#c9c3b8'); t.detail(`M${x - 4} ${y - 6}h8`, INK, 1.4, 0.5); }
}

/** Paint one view of the look (standing, or mid-step) into a `size` px cell whose top-left is (ox, oy). */
export function drawAvatar(ctx, look, outfit, ox, oy, size, view = 'front', step = 0) {
  const s = size / 250, t = tools(ctx);
  const skin = swatch('body', look.skin) || '#c68a5a', hairCol = swatch('hair', look.hair) || '#2a1a12';
  const topCol = swatch('cloth', look.top) || '#4c8df6', botCol = swatch('cloth', look.bottom) || '#1e3a8a';
  const shoeCol = SHOES[look.shoes] || swatch('cloth', look.shoes) || '#6e4a28';
  const v = view, hair = HAIR[look.hairStyle] || HAIR.plain, o = outfit || {};
  const side = v === 'side', back = v === 'back';
  ctx.save();
  ctx.translate(ox + (size - 200 * s) / 2, oy - 2 * s);
  ctx.scale(s, s);
  // Behind the body: back items, then the hair that hangs down the back.
  backItem(t, o.back, v, 'behind');
  if (hair.back) hair.back(t, hairCol, v);
  // Legs: calves show below shorts and skirts; one foot forward on the step frame.
  const lift = step ? 6 : 0, trousers = look.bottomStyle === 'pants';
  if (side) {
    if (!trousers) { t.line(`M${HX + 4} 196l${step ? 14 : 4} 36`, skin, 16); t.line(`M${HX - 4} 196l${step ? -12 : -2} 36`, skin, 16); }
    shoe(t, HX + 10 + (step ? 12 : 0), 234 - lift, shoeCol, -1); shoe(t, HX - 8 - (step ? 10 : 0), 236, shoeCol, -1);
  } else {
    if (!trousers) { t.line(`M${HX - 15} 198l-2 34`, skin, 16); t.line(`M${HX + 15} 198l2 ${34 - lift}`, skin, 16); t.shade(`M${HX + 8} 196h14l2 36h-14z`, 0.12); }
    shoe(t, HX - 16, 236, shoeCol); shoe(t, HX + 16, 236 - lift, shoeCol);
  }
  // Bottoms.
  if (look.bottomStyle === 'skirt') { t.fill(side ? `M${HX - 18} 158h36l8 46h-52z` : `M${HX - 28} 158h56l10 48h-76z`, botCol); t.shade(side ? `M${HX + 2} 158h16l8 46h-20z` : `M${HX + 6} 158h22l10 48h-26z`, 0.14); }
  else if (look.bottomStyle === 'shorts') { t.fill(side ? `M${HX - 18} 158h36l2 42h-40z` : `M${HX - 28} 158h56l4 46h-26l-6-20-6 20h-26z`, botCol); t.shade(side ? `M${HX + 2} 158h16l2 42h-18z` : `M${HX + 6} 158h22l4 46h-26l-2-28z`, 0.14); }
  else { t.fill(side ? `M${HX - 18} 158h36l${step ? 10 : 2} 76h-18l-8-44-8 44h-16z` : `M${HX - 28} 158h56l2 76h-20l-8-50-8 50h-20z`, botCol); t.shade(side ? `M${HX + 2} 158h16l${step ? 10 : 2} 76h-18l-6-40z` : `M${HX + 6} 158h22l2 76h-20l-6-40z`, 0.14); }
  // Arms (under the sleeves): upper arm, forearm and a fist; the right side a shade darker.
  if (side) { t.line(`M${HX - 2} 116c-8 14-10 30-8 44`, skin, 15); t.line(`M${HX - 10} 160c0 12 2 22 6 30`, skin, 13); t.oval(HX - 4, 194, 7, 8, skin); }
  else {
    t.line(`M${HX - 36} 114c-8 12-12 26-10 42`, skin, 15); t.line(`M${HX - 46} 156c-2 12 0 22 4 32`, skin, 13); t.oval(HX - 41, 194, 7, 8, skin);
    t.line(`M${HX + 36} 114c8 12 12 26 10 42`, skin, 15); t.line(`M${HX + 46} 156c2 12 0 22-4 32`, skin, 13); t.oval(HX + 41, 194, 7, 8, skin);
    t.shade(`M${HX + 38} 110c10 12 14 30 12 48c-2 12 0 22-4 32l-8-2c4-10 2-20 2-30c2-16-2-30-10-42z`, 0.14);
    t.detail(`M${HX - 40} 150q3-2 6 0M${HX + 34} 150q3-2 6 0`, INK, 1.3, 0.45);   // elbows
  }
  // Torso and top, with short sleeves.
  if (side) { t.fill(`M${HX - 20} 100q20-8 40 0l2 20-6 2-2 38q-14 6-28 0l-2-38-6-2z`, topCol); t.shade(`M${HX + 4} 96q8 1 16 4l2 20-6 2-2 38q-5 2-10 2z`, 0.14); }
  else {
    t.fill(`M${HX - 36} 100q36-10 72 0l8 24-12 4-4 32q-28 8-56 0l-4-32-12-4z`, topCol);
    t.shade(`M${HX + 4} 94q16 0 32 6l8 24-12 4-4 32q-12 4-24 4z`, 0.14);
    t.glow(`M${HX - 24} 110q3-6 8-6q-3 8-2 20q-5-4-6-14z`, 0.22);
    if (back) t.detail(`M${HX - 12} 100q12 4 24 0`, INK, 1.4, 0.4);
    else if (look.topStyle === 'polo') { t.fill(`M${HX - 13} 98l13 16 13-16-7-5h-12z`, '#ffffff'); t.detail(`M${HX} 114v12`, INK, 1.4, 0.4); t.dot(HX, 120, 1.8, 1.8, INK); }
    else t.detail(`M${HX - 12} 99q12 8 24 0`, INK, 1.6, 0.5);
  }
  backItem(t, o.back, v, 'front');
  // Neck, ears, head (a rounder crown with a softer jaw) and its shadow side.
  t.box(HX - 8, HY + HRY - 8, 16, 20, 5, skin); t.shade(`M${HX - 8} ${HY + HRY - 8}h16v10q-8 6-16 2z`, 0.18);
  if (!back) { t.oval(HX - HR + 1, HY + 6, 4, 5.5, skin); if (!side) t.oval(HX + HR - 1, HY + 6, 4, 5.5, skin); }
  t.fill(`M${HX - HR} ${HY - 2}C${HX - HR} ${TOP + 2} ${HX + HR} ${TOP + 2} ${HX + HR} ${HY - 2}C${HX + HR} ${HY + 16} ${HX + 12} ${HY + HRY} ${HX} ${HY + HRY}C${HX - 12} ${HY + HRY} ${HX - HR} ${HY + 16} ${HX - HR} ${HY - 2}z`, skin);
  if (!back) t.shade(`M${HX + 6} ${TOP + 2}C${HX + HR} ${TOP + 6} ${HX + HR} ${HY + 16} ${HX} ${HY + HRY}C${HX + 10} ${HY + 16} ${HX + 14} ${HY} ${HX + 6} ${TOP + 2}z`, 0.12);
  face(t, look, v, skin);
  hair.front(t, hairCol, v);
  if (!back && !['afro', 'natural', 'buzzcut'].includes(look.hairStyle)) t.detail(`M${HX - 12} ${TOP + 8}q10-5 22 0`, '#ffffff', 3, 0.28);   // a shine on the hair
  glasses(t, o.glasses, v);
  hat(t, o.hat, v);
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
