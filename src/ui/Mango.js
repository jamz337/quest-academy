// Mango the monkey, drawn with smooth shapes: a lean green monkey with flying goggles and a red scarf (the "Pilot"
// look). He is painted large into the 'monkey' sheet (poses below) and the round 'mango-face' badge, so he stays
// sharp at any size: in a game's header, beside the player in the world, and in duels.

/** Side of one cell of the 'monkey' sheet. His feet stand on the bottom edge. */
export const MANGO_CELL = 256;
/** Scale for the world, where he stands a little shorter than a tile. */
export const MANGO_WORLD_SCALE = 30 / MANGO_CELL;
/** Side of the 'mango-face' badge. */
export const MANGO_FACE = 240;

const FUR = '#75883a', DARK = '#52622a', TAN = '#f0d7a4', INK = '#1e1b4b', SCARF = '#e8623f', STRAP = '#3b3550', LENS = '#9fdcff';

// Shapes are given in a 200 x 250 drawing space (the head is drawn 6 lower on the body).
const tools = (ctx) => ({
  fill: (d, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fill(new Path2D(d)); ctx.globalAlpha = 1; },
  line: (d, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(d)); },
  oval: (x, y, rx, ry, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); },
  lens: (x, y) => {
    ctx.beginPath(); ctx.roundRect(x, y, 26, 18, 8); ctx.fillStyle = LENS; ctx.fill(); ctx.strokeStyle = STRAP; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 5, y + 6); ctx.lineTo(x + 13, y + 4); ctx.stroke();
  }
});

/** His head. `turn` slides the face to the right (the side view); `happy` opens his mouth. */
function drawHead(ctx, { turn = 0, happy = false } = {}) {
  const { fill, line, oval, lens } = tools(ctx);
  const t = turn;   // how far the face has turned, in drawing units
  oval(55, 72, 13, 13, DARK); oval(55, 72, 7, 7, TAN);
  if (!t) { oval(145, 72, 13, 13, DARK); oval(145, 72, 7, 7, TAN); }
  fill('M100 28c30 0 46 18 46 42c0 8-3 14-3 14l8 6l-12 2c-8 14-22 20-39 20s-31-6-39-20l-12-2l8-6s-3-6-3-14c0-24 16-42 46-42z', FUR);
  fill('M82 34l8-15l7 10l9-13l3 14l12-7l-6 15z', DARK);
  ctx.save(); ctx.translate(t, 0);
  fill('M100 54c-10-9-22-9-29-1c-8 9-6 22-1 30c5 12 16 19 30 19s25-7 30-19c5-8 7-21-1-30c-7-8-19-8-29 1z', TAN);
  fill('M100 54c-10-9-22-9-29-1c-4 5-6 11-5 17c10-8 22-9 34-2c12-7 24-6 34 2c1-6-1-12-5-17c-7-8-19-8-29 1z', '#ffffff', 0.25);
  oval(84, 72, 5, 6.5, INK); oval(116, 72, t ? 4 : 5, 6.5, INK);
  oval(86, 69.5, 1.8, 1.8, '#ffffff'); oval(118, 69.5, 1.8, 1.8, '#ffffff');
  line(happy ? 'M75 62l15-1M125 62l-15-1' : 'M74 62l16 2M126 60l-16 4', INK, 3.5);
  line('M95 84q5 3.5 10 0', INK, 2.5);
  if (happy) { fill('M88 90q12 15 24 0z', '#7a2e3a'); fill('M94 97q6 4 12 0q-6-3-12 0z', '#ff8fa3'); }
  else line('M89 93q11 7 23-4', INK, 3);
  ctx.restore();
  ctx.save(); ctx.translate(t * 0.5, 0);
  line('M56 50q44-16 88 0', STRAP, 7);
  lens(70, 34); lens(104, 34);
  ctx.restore();
}

/**
 * Paint one pose with his feet at the bottom of a `size` px cell whose top-left is (ox, oy).
 * Poses: 'stand' (hand on hip, waving), 'hop' (the same, mid-jump), 'cheer' (both arms up, grinning) and
 * 'side' (facing right, pointing ahead).
 */
export function drawMango(ctx, ox, oy, size, pose = 'stand') {
  const s = size / 250, side = pose === 'side', cheer = pose === 'cheer';
  ctx.save();
  ctx.translate(ox + (size - 200 * s) / 2, oy + (250 - 238 - 5) * s - (pose === 'hop' ? 12 * s : 0));   // feet stop just short of the cell's edge, so nothing bleeds across it
  ctx.scale(s, s);
  const { fill, line, oval } = tools(ctx);
  // Tail (behind him: on the left when he faces right).
  ctx.save(); if (side) { ctx.translate(200, 0); ctx.scale(-1, 1); }
  line('M122 176c40 6 58-14 50-42c-5-17-22-18-26-6', DARK, 9);
  ctx.restore();
  // Legs and feet (tucked up a little in a hop).
  if (pose === 'hop') { line('M89 178l-12 34M111 178l12 34', FUR, 15); oval(73, 218, 15, 7.5, DARK); oval(127, 218, 15, 7.5, DARK); }
  else if (side) { line('M92 178l-10 46M110 178l12 44', FUR, 15); oval(86, 230, 16, 7.5, DARK); oval(128, 228, 16, 7.5, DARK); }
  else { line('M89 178l-7 46M111 178l7 46', FUR, 15); oval(78, 230, 15, 7.5, DARK); oval(122, 230, 15, 7.5, DARK); }
  // Body and arms.
  fill('M77 124q23-9 46 0l7 56q-30 13-60 0z', FUR);
  fill('M86 132q14-5 28 0l4 42q-18 7-36 0z', TAN);
  if (cheer) { line('M80 130c-26-2-36-18-36-38', FUR, 13); oval(44, 88, 9, 9, TAN); }
  else { line('M80 130c-24 10-28 30-12 44', FUR, 13); oval(70, 175, 8.5, 8.5, TAN); }
  if (side) { line('M119 132c20 6 34 4 46-6', FUR, 13); oval(167, 124, 9, 9, TAN); }
  else { line('M120 130c26-2 36-18 36-38', FUR, 13); oval(156, 88, 9, 9, TAN); }
  // Scarf, its end blowing behind him.
  fill('M72 118q28 14 56 0l-2 12q-26 11-52 0z', SCARF);
  fill(side ? 'M84 128l-17 20 20-7z' : 'M116 128l15 22-19-8z', SCARF, 0.8);
  ctx.translate(side ? 5 : 0, 6);
  drawHead(ctx, { turn: side ? 10 : 0, happy: cheer });
  ctx.restore();
}

/** His round badge: his head on a pale green disc with a darker rim. */
export function drawMangoFace(ctx, ox, oy, size, { happy = false } = {}) {
  const r = size / 2;
  ctx.fillStyle = '#9cb857'; ctx.beginPath(); ctx.arc(ox + r, oy + r, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d6ea9c'; ctx.beginPath(); ctx.arc(ox + r, oy + r, r * 0.92, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(ox + r, oy + r, r * 0.92, 0, Math.PI * 2); ctx.clip();
  const s = size / 128;   // the head spans about 36..164 across and 18..114 down
  ctx.translate(ox + r - 100 * s, oy + r - 64 * s); ctx.scale(s, s);
  drawHead(ctx, { happy });
  ctx.restore();
}
