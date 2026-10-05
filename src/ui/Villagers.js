// The Academy Hub's three hosts, drawn with smooth shapes in the same flat, lean style as Mango (ui/Mango.js):
// Headmistress Hope (grey bun, gold glasses, navy gown, a book), Signpost Sam (explorer's hat, green shirt and
// vest, a satchel and a little signpost) and Auntie Vee the market lady (orange headwrap, teal dotted dress, a
// basket of mangoes). Each is painted from the front, the back and the side (facing left; flip for right), standing
// and mid-step, into a sheet laid out like the pixel people's sheets so the world can treat them the same way.
import { LPC_COLS, LPC_ROWS } from './LpcCharacter.js';

/** Side of one painted cell. A villager's feet stand on the cell's bottom edge. */
export const VILLAGER_CELL = 192;
/** How tall they stand in the world, in world pixels (the pixel people stand about 26). */
export const VILLAGER_WORLD_HEIGHT = 40;
export const VILLAGERS = ['hope', 'sam', 'vee'];
/** Texture key of a villager's sheet. */
export const villagerKey = (who) => `villager-${who}`;

const INK = '#1e1b4b';

// Shapes are given in a 200 x 250 drawing space, the figure centred on x = 100 with its feet near y = 240.
const tools = (ctx) => ({
  fill: (d, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fill(new Path2D(d)); ctx.globalAlpha = 1; },
  line: (d, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(d)); },
  oval: (x, y, rx, ry, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); },
  ring: (x, y, r, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); },
  box: (x, y, w, h, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
});

/** Neck, head and (unless seen from behind) the face. `grin` opens the mouth in a smile. */
function head(ctx, skin, view, { grin = false } = {}) {
  const { line, oval, box, fill } = tools(ctx);
  box(92, 78, 16, 16, 5, skin);
  oval(100, 56, 25, 28, skin);
  if (view === 'back') return;
  const side = view === 'side';
  ctx.save(); ctx.translate(side ? -8 : 0, 0);
  oval(90, 56, 2.6, 3.3, INK);
  if (!side) oval(110, 56, 2.6, 3.3, INK);
  line(side ? 'M84 47q6-3 12 0' : 'M84 47q6-3 12 0M104 47q6-3 12 0', INK, 2.2);
  if (side) oval(80, 61, 3, 3, skin); else line('M97 63q3 2.5 6 0', INK, 1.6);
  if (grin) { fill(side ? 'M84 69q8 9 16 0z' : 'M89 69q11 11 22 0z', '#ffffff'); line(side ? 'M84 69q8 9 16 0z' : 'M89 69q11 11 22 0z', INK, 2); }
  else line(side ? 'M86 70q7 5 14 0' : 'M91 70q9 6 18 0', INK, 2.2);
  ctx.restore();
}

/** Two shoes; mid-step the second one is lifted. */
function shoes(ctx, col, y, step) {
  const { oval } = tools(ctx);
  oval(86, y, 13, 6, col); oval(114, y - (step ? 6 : 0), 13, 6, col);
}

function hope(ctx, view, step) {
  const { fill, line, oval, ring, box } = tools(ctx);
  const SKIN = '#8a5a3c', GOWN = '#2e2a5c', HAIR = '#d5d8e0', GOLD = '#ffc531';
  shoes(ctx, INK, 236, step);
  fill('M70 100q30-12 60 0l14 128q-44 12-88 0z', GOWN);
  if (view === 'front') { line('M100 98v131', GOLD, 3); fill('M84 96l16 16 16-16-6-6h-20z', '#ffffff'); }
  if (view === 'side') { line('M100 106c-5 16-5 36 0 52', GOWN, 15); oval(100, 162, 8, 8, SKIN); box(72, 132, 24, 32, 4, '#e8623f'); box(75, 137, 18, 4, 2, GOLD); }
  else {
    line('M72 104c-16 14-18 40-10 58', GOWN, 15); oval(62, 164, 8, 8, SKIN);
    if (view === 'front') { line('M128 104c14 12 16 30 6 46', GOWN, 15); box(112, 138, 30, 38, 4, '#e8623f'); box(116, 143, 22, 4, 2, GOLD); oval(134, 152, 8, 8, SKIN); }
    else { line('M128 104c16 14 18 40 10 58', GOWN, 15); oval(138, 164, 8, 8, SKIN); }
  }
  head(ctx, SKIN, view);
  if (view === 'back') { oval(100, 50, 27, 27, HAIR); oval(100, 14, 11, 11, HAIR); return; }
  fill('M75 52c0-24 12-34 25-34s25 10 25 34c-6-12-14-18-25-18s-19 6-25 18z', HAIR);
  if (view === 'side') { fill('M100 18c16 0 26 12 25 40c-6 4-14 4-18-2c2-12-2-20-7-20z', HAIR); oval(118, 20, 11, 11, HAIR); ring(82, 56, 8.5, GOLD, 2.2); }
  else { oval(100, 14, 11, 11, HAIR); ring(90, 56, 8.5, GOLD, 2.2); ring(110, 56, 8.5, GOLD, 2.2); line('M98.5 56h3', GOLD, 2.2); }
}

function sam(ctx, view, step) {
  const { fill, line, oval, box } = tools(ctx);
  const SKIN = '#a56a43', SHIRT = '#249762', VEST = '#8a5a34', BOOT = '#5a3a22';
  line(step ? 'M88 176l-5 46M112 176l5 52' : 'M88 176l-3 54M112 176l3 54', SKIN, 14);
  fill('M74 166h52l-2 34h-22l-2-14-2 14H76z', '#b89b62');
  box(step ? 75 : 78, step ? 214 : 222, 17, 14, 4, BOOT); box(106, 222, 17, 14, 4, BOOT);
  fill('M72 100q28-10 56 0l-2 72q-26 8-52 0z', view === 'back' ? VEST : SHIRT);
  if (view === 'front') { fill('M72 100q10-4 18-4l-4 80q-8-1-12-4zM128 100q-10-4-18-4l4 80q8-1 12-4z', VEST); line('M86 98l44 62', BOOT, 5); }
  if (view === 'back') line('M114 98l-40 62', BOOT, 5);
  // The satchel hangs at his hip.
  if (view !== 'side') { const sx = view === 'back' ? 52 : 122; box(sx, 156, 26, 22, 5, VEST); box(sx + 9, 164, 8, 5, 2, '#ffc531'); }
  if (view === 'side') { fill('M84 100q16-6 32 0l-1 74q-15 5-30 0z', VEST); line('M100 108c-5 14-5 32 0 46', SHIRT, 14); oval(100, 158, 8, 8, SKIN); box(104, 150, 24, 22, 5, VEST); }
  else {
    line('M74 106c-18 10-22 30-14 48', SHIRT, 14); oval(60, 156, 8, 8, SKIN);
    if (view === 'front') {
      // He holds up a little signpost.
      line('M126 106c20-4 34-20 40-40', SHIRT, 14); line('M176 44v24', '#6e4a28', 4);
      ctx.save(); ctx.translate(177, 37); ctx.rotate(-0.14); box(-17, -7, 34, 14, 4, '#4c8df6'); ctx.restore();
      oval(167, 64, 8.5, 8.5, SKIN);
    } else { line('M126 106c18 10 22 30 14 48', SHIRT, 14); oval(140, 156, 8, 8, SKIN); }
  }
  head(ctx, SKIN, view);
  if (view === 'back') fill('M75 58c0-20 10-30 25-30s25 10 25 30c-8 8-42 8-50 0z', '#2a1a12');
  else fill('M76 50q24-14 48 0l-2-10q-22-10-44 0z', '#2a1a12');
  oval(100, 38, 40, 9, '#d8b878');
  fill('M78 36c0-18 10-26 22-26s22 8 22 26z', '#e6c98c');
  box(78, 33, 44, 5, 0, '#e8623f');
}

function vee(ctx, view, step) {
  const { fill, line, oval, ring, box } = tools(ctx);
  const SKIN = '#6f4428', DRESS = '#1d9e9a', WRAP = '#ff9a3c', GOLD = '#ffc531';
  shoes(ctx, '#e8623f', 238, step);
  fill('M72 100q28-10 56 0l18 124q-46 14-92 0z', DRESS);
  [[84, 130], [112, 124], [96, 152], [122, 164], [78, 178], [104, 188], [128, 204], [86, 212]].forEach(([x, y]) => oval(x, y, 3.2, 3.2, '#ffd75e'));
  if (view === 'front') { fill('M82 122h36l8 84q-26 8-52 0z', '#fff8ef'); line('M82 122q18 8 36 0', '#e8623f', 3); }
  if (view === 'back') { line('M82 124h36', '#fff8ef', 4); line('M100 124l-8 14M100 124l8 14', '#fff8ef', 4); }   // the apron's bow
  const basket = () => {
    fill('M38 150h40l-5 30H43z', '#c99a62'); line('M36 150q22-34 44 0', '#8f6238', 4);
    oval(50, 146, 9, 9, '#ff9a3c'); oval(66, 146, 9, 9, GOLD); oval(58, 138, 8, 8, '#e8623f');
  };
  if (view === 'side') { basket(); line('M100 108c-14 8-24 24-28 40', SKIN, 13); line('M100 104c-4 4-6 8-7 14', DRESS, 16); }
  else {
    line('M74 106c-20 10-26 30-18 50', SKIN, 13); line('M74 104c-8 4-12 10-14 18', DRESS, 16);
    line('M126 106c18 8 22 24 16 42', SKIN, 13); line('M126 104c8 4 12 10 14 18', DRESS, 16);
    if (view === 'front') basket();
  }
  head(ctx, SKIN, view, { grin: true });
  if (view === 'back') { oval(100, 48, 27, 26, WRAP); line('M76 40q24-10 48 0', '#ffd75e', 4); }
  else {
    if (view === 'front') { ring(74, 66, 5, GOLD, 2.5); ring(126, 66, 5, GOLD, 2.5); } else ring(112, 68, 5, GOLD, 2.5);
    fill('M74 48c-2-22 10-34 26-34s28 12 26 34c-8-10-16-14-26-14s-18 4-26 14z', WRAP);
    if (view === 'side') fill('M100 14c18 0 28 14 26 40c-6 2-12 0-14-6c0-12-4-18-12-18z', WRAP);
    line('M78 34q22-10 44 0', '#ffd75e', 4);
  }
  fill('M112 16c8-12 22-10 24 0c-10-2-16 2-20 8zM110 18c0-12 10-18 18-14c-8 2-12 8-14 16z', GOLD);   // the wrap's bow
}

const PAINT = { hope, sam, vee };

/** Paint one villager into a size x size cell at (ox, oy). view: 'front' | 'back' | 'side' (facing left). */
export function drawVillager(ctx, who, ox, oy, size, view = 'front', step = 0) {
  const s = size / 250;
  ctx.save();
  ctx.translate(ox + (size - 200 * s) / 2, oy + 2 * s);   // feet just short of the bottom edge
  ctx.scale(s, s);
  PAINT[who](ctx, view, step);
  ctx.restore();
}

/**
 * Build a villager's sheet: six painted cells (front, back and side, each standing and mid-step), with frames
 * numbered like the pixel people's sheets (rows up / left / down / right, a standing frame then eight walking
 * frames), so the same frame numbers and walking animations work. Returns the texture key.
 */
export function villagerTexture(scene, who) {
  const key = villagerKey(who);
  if (scene.textures.exists(key)) return key;
  const C = VILLAGER_CELL, views = ['back', 'side', 'front'];   // cell columns 0-1 back, 2-3 side, 4-5 front
  const tex = scene.textures.createCanvas(key, C * 6, C), ctx = tex.getContext();
  views.forEach((view, v) => [0, 1].forEach((step) => drawVillager(ctx, who, C * (v * 2 + step), 0, C, view, step)));
  const viewOfRow = { [LPC_ROWS.up]: 0, [LPC_ROWS.left]: 1, [LPC_ROWS.down]: 2, [LPC_ROWS.right]: 1 };
  for (let row = 0; row < 4; row++) for (let col = 0; col < LPC_COLS; col++) {
    const cell = viewOfRow[row] * 2 + (col === 0 ? 0 : Math.ceil(col / 2) % 2);   // walking: two frames each of step, stand, step…
    tex.add(row * LPC_COLS + col, 0, C * cell, 0, C, C);
  }
  tex.refresh();
  return key;
}
