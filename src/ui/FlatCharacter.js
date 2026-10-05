// Mango the green monkey. He is drawn with canvas shapes at FRAME px, then turned into a pixel sprite the
// size of the Liberated Pixel Cup people (PIXEL_FRAME px cells, a small colour ramp and a dark outline, see
// pixelate) so he sits beside them without looking like a sticker. Shown at 32 px in the world.
export const FRAME = 96;
export const PIXEL_FRAME = 64;
export const WORLD_SCALE = 32 / PIXEL_FRAME;

/**
 * Since 2026-09-27 Mango is real pixel art cut from the reference pictures in art/mango-reference (see
 * extract-sprites.js there): 'mango-front' (waving, faces the screen), 'mango-side' (with his headband, faces
 * right) and 'mango-face' (his badge), loaded by BootScene from public/mango. The drawing below is only the
 * fallback when those files are missing.
 */
export const MANGO_BASE = 'mango/';
export const MANGO_IMAGES = [];   // none now: Mango is painted smooth in code (ui/Mango.js), the pixel pictures are retired
/** Frames of the 'monkey' texture: waving, a hop mid-wave, a cheer, and the side view for duels (faces right). */
export const MONKEY_FRAMES = { stand: 0, hop: 1, cheer: 2, side: 3 };

/** The colours a finished Mango frame may contain (LPC-style ramps: light, mid and dark for the coat). */
export const MONKEY_PALETTE = ['#a3b45a', '#7d8f3c', '#5a6a2a', '#f4dfc2', '#d9bd97', '#3a2a1a', '#ff9fc4', '#2d2a4a', '#ffffff', '#e0567a'];
export const MONKEY_OUTLINE = '#1f1a12';

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/**
 * Turn an anti-aliased drawing into pixel art in place: every pixel that is at least half opaque snaps to the
 * nearest palette colour and becomes solid, everything else clears, and pixels on the silhouette's edge become
 * the outline colour, the way the LPC sheets are drawn.
 */
export function pixelate(ctx, w, h, palette = MONKEY_PALETTE, outline = MONKEY_OUTLINE) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const pal = palette.map(hexRgb), out = hexRgb(outline);
  const solid = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const dr = d[i] - pal[k][0], dg = d[i + 1] - pal[k][1], db = d[i + 2] - pal[k][2], dist = dr * dr + dg * dg + db * db;
      if (dist < bd) { bd = dist; best = k; }
    }
    d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; d[i + 3] = 255;
    solid[p] = 1;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (!solid[p]) continue;
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !solid[p - 1] || !solid[p + 1] || !solid[p - w] || !solid[p + w];
    if (edge) { d[p * 4] = out[0]; d[p * 4 + 1] = out[1]; d[p * 4 + 2] = out[2]; }
  }
  ctx.putImageData(img, 0, 0);
}

const INK = 'rgba(45, 42, 74, 0.28)';
const EYE = '#2d2a4a';
const MOUTH = '#e0567a';

function part(ctx, fill, path, stroke = true) {
  ctx.beginPath(); path(ctx); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
}
const rrect = (ctx, x, y, w, h, r) => { if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r); else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); } };
const circle = (ctx, x, y, r) => ctx.arc(x, y, r, 0, Math.PI * 2);
const ellipse = (ctx, x, y, rx, ry) => ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);

function shadow(ctx, x, y, rx = 20) {
  ctx.beginPath(); ellipse(ctx, x, y, rx, 5); ctx.fillStyle = 'rgba(45, 42, 74, 0.18)'; ctx.fill();
}

/** Mango the green monkey, two frames: standing and waving. */
export function drawMonkey(ctx, ox, oy, { step = 0, shadow: withShadow = true } = {}) {
  const coat = '#7d8f3c', coatShade = '#5a6a2a', coatLight = '#a3b45a', face = '#f4dfc2', dark = '#3a2a1a', cx = FRAME / 2;
  ctx.save(); ctx.translate(ox, oy);
  if (withShadow) shadow(ctx, cx, 91, 18);
  ctx.beginPath(); ctx.moveTo(cx + 10, 74); ctx.quadraticCurveTo(cx + 34, 70, cx + 30, 48); ctx.quadraticCurveTo(cx + 28, 40, cx + 22, 44);
  ctx.lineWidth = 5; ctx.strokeStyle = coat; ctx.lineCap = 'round'; ctx.stroke();
  if (step) { part(ctx, coat, (c) => rrect(c, cx + 14, 30, 8, 28, 4)); part(ctx, dark, (c) => circle(c, cx + 18, 29, 4.5)); }
  else { part(ctx, coatShade, (c) => rrect(c, cx + 14, 54, 8, 22, 4)); part(ctx, dark, (c) => circle(c, cx + 18, 77, 4.5)); }
  part(ctx, coat, (c) => rrect(c, cx - 11, 74, 9, 13, 3)); part(ctx, coat, (c) => rrect(c, cx + 2, 74, 9, 13, 3));
  part(ctx, dark, (c) => ellipse(c, cx - 6.5, 88, 6.5, 3.5), false); part(ctx, dark, (c) => ellipse(c, cx + 6.5, 88, 6.5, 3.5), false);
  part(ctx, coat, (c) => rrect(c, cx - 13, 50, 26, 28, 10));
  ctx.beginPath(); rrect(ctx, cx - 12, 53, 5, 20, 2.5); ctx.fillStyle = coatLight; ctx.fill();
  ctx.beginPath(); ellipse(ctx, cx, 64, 8, 10); ctx.fillStyle = face; ctx.fill();
  part(ctx, coat, (c) => rrect(c, cx - 22, 54, 8, 22, 4)); part(ctx, dark, (c) => circle(c, cx - 18, 77, 4.5));
  for (const sx of [-1, 1]) { part(ctx, coat, (c) => circle(c, cx + sx * 21, 30, 7)); ctx.beginPath(); circle(ctx, cx + sx * 21, 30, 3.5); ctx.fillStyle = '#ff9fc4'; ctx.fill(); }
  part(ctx, coat, (c) => circle(c, cx, 30, 20));
  ctx.beginPath(); ctx.arc(cx, 30, 20, -Math.PI * 0.35, Math.PI * 0.35); ctx.lineTo(cx + 10, 30); ctx.closePath(); ctx.fillStyle = coatShade; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, 30, 20, Math.PI * 0.8, Math.PI * 1.3); ctx.lineTo(cx - 9, 30); ctx.closePath(); ctx.fillStyle = coatLight; ctx.fill();
  ctx.beginPath(); ellipse(ctx, cx, 36, 14, 13); ctx.fillStyle = face; ctx.fill();
  for (const sx of [-1, 1]) { ctx.beginPath(); circle(ctx, cx + sx * 6, 34, 2.6); ctx.fillStyle = EYE; ctx.fill(); ctx.beginPath(); circle(ctx, cx + sx * 6 - 1, 33, 1); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  ctx.fillStyle = dark; ctx.beginPath(); circle(ctx, cx - 2, 41, 1.3); ctx.fill(); ctx.beginPath(); circle(ctx, cx + 2, 41, 1.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 3.5, 44); ctx.quadraticCurveTo(cx, 48, cx + 3.5, 44); ctx.lineWidth = 2; ctx.strokeStyle = MOUTH; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
