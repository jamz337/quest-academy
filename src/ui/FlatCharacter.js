// Mango the green monkey, drawn flat with canvas shapes (the people are Liberated Pixel Cup sprites, see
// LpcCharacter.js). Frames are FRAME px and shown at 32 px in the world.
export const FRAME = 96;
export const WORLD_SCALE = 32 / FRAME;

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
export function drawMonkey(ctx, ox, oy, { step = 0 } = {}) {
  const coat = '#7d8f3c', coatShade = '#5f6e2c', face = '#f4dfc2', dark = '#3a2a1a', cx = FRAME / 2;
  ctx.save(); ctx.translate(ox, oy);
  shadow(ctx, cx, 91, 18);
  ctx.beginPath(); ctx.moveTo(cx + 10, 74); ctx.quadraticCurveTo(cx + 34, 70, cx + 30, 48); ctx.quadraticCurveTo(cx + 28, 40, cx + 22, 44);
  ctx.lineWidth = 5; ctx.strokeStyle = coat; ctx.lineCap = 'round'; ctx.stroke();
  if (step) { part(ctx, coat, (c) => rrect(c, cx + 14, 30, 8, 28, 4)); part(ctx, dark, (c) => circle(c, cx + 18, 29, 4.5)); }
  else { part(ctx, coatShade, (c) => rrect(c, cx + 14, 54, 8, 22, 4)); part(ctx, dark, (c) => circle(c, cx + 18, 77, 4.5)); }
  part(ctx, coat, (c) => rrect(c, cx - 11, 74, 9, 13, 3)); part(ctx, coat, (c) => rrect(c, cx + 2, 74, 9, 13, 3));
  part(ctx, dark, (c) => ellipse(c, cx - 6.5, 88, 6.5, 3.5), false); part(ctx, dark, (c) => ellipse(c, cx + 6.5, 88, 6.5, 3.5), false);
  part(ctx, coat, (c) => rrect(c, cx - 13, 50, 26, 28, 10));
  ctx.beginPath(); ellipse(ctx, cx, 64, 8, 10); ctx.fillStyle = face; ctx.fill();
  part(ctx, coat, (c) => rrect(c, cx - 22, 54, 8, 22, 4)); part(ctx, dark, (c) => circle(c, cx - 18, 77, 4.5));
  for (const sx of [-1, 1]) { part(ctx, coat, (c) => circle(c, cx + sx * 21, 30, 7)); ctx.beginPath(); circle(ctx, cx + sx * 21, 30, 3.5); ctx.fillStyle = '#ff9fc4'; ctx.fill(); }
  part(ctx, coat, (c) => circle(c, cx, 30, 20));
  ctx.beginPath(); ctx.arc(cx, 30, 20, -Math.PI * 0.35, Math.PI * 0.35); ctx.lineTo(cx + 10, 30); ctx.closePath(); ctx.fillStyle = coatShade; ctx.fill();
  ctx.beginPath(); ellipse(ctx, cx, 36, 14, 13); ctx.fillStyle = face; ctx.fill();
  for (const sx of [-1, 1]) { ctx.beginPath(); circle(ctx, cx + sx * 6, 34, 2.6); ctx.fillStyle = EYE; ctx.fill(); ctx.beginPath(); circle(ctx, cx + sx * 6 - 1, 33, 1); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  ctx.fillStyle = dark; ctx.beginPath(); circle(ctx, cx - 2, 41, 1.3); ctx.fill(); ctx.beginPath(); circle(ctx, cx + 2, 41, 1.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 3.5, 44); ctx.quadraticCurveTo(cx, 48, cx + 3.5, 44); ctx.lineWidth = 2; ctx.strokeStyle = MOUTH; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
