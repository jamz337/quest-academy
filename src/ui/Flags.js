// Flags drawn in code, so Flag Finder looks the same on every device (many desktops show a flag emoji as two
// letters). Each flag is painted once with Graphics into a 150 x 100 texture, 'flag-<code>', from a simplified
// design: the colours and the big shapes, which is what a child recognises.
import { COUNTRIES } from '../data/history/facts.js';

export const FLAG_W = 150, FLAG_H = 100;
export const flagKey = (code) => `flag-${code}`;

const W = FLAG_W, H = FLAG_H;
const starPoints = (cx, cy, outer, inner, n, rot) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 === 0 ? outer : inner, a = rot + (i * Math.PI) / n; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
  return pts;
};
const rect = (g, c, x, y, w, h) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };
const vbands = (g, cols) => cols.forEach((c, i) => rect(g, c, (W / cols.length) * i, 0, W / cols.length + 1, H));
const hbands = (g, cols) => cols.forEach((c, i) => rect(g, c, 0, (H / cols.length) * i, W, H / cols.length + 1));
const tri = (g, c, a, b, d) => { g.fillStyle(c, 1); g.fillTriangle(a[0], a[1], b[0], b[1], d[0], d[1]); };
const line = (g, c, w, x1, y1, x2, y2) => { g.lineStyle(w, c, 1); g.lineBetween(x1, y1, x2, y2); };
const star = (g, c, cx, cy, outer, n = 5, rot = -Math.PI / 2) => { g.fillStyle(c, 1); g.fillPoints(starPoints(cx, cy, outer, outer * (n === 5 ? 0.38 : 0.5), n, rot), true); };
const disc = (g, c, x, y, r) => { g.fillStyle(c, 1); g.fillCircle(x, y, r); };
const poly = (g, c, pts) => { g.fillStyle(c, 1); g.fillPoints(pts.map(([x, y]) => ({ x, y })), true); };

/** The Union Jack in the rectangle (x, y, w, h): the whole of the United Kingdom's flag, the corner of Australia's. */
function unionJack(g, x, y, w, h) {
  const k = w / W;
  rect(g, 0x012169, x, y, w, h);
  line(g, 0xffffff, 20 * k, x, y, x + w, y + h); line(g, 0xffffff, 20 * k, x + w, y, x, y + h);
  line(g, 0xc8102e, 6 * k, x, y, x + w, y + h); line(g, 0xc8102e, 6 * k, x + w, y, x, y + h);
  rect(g, 0xffffff, x, y + h / 2 - 16 * k, w, 32 * k); rect(g, 0xffffff, x + w / 2 - 16 * k, y, 32 * k, h);
  rect(g, 0xc8102e, x, y + h / 2 - 10 * k, w, 20 * k); rect(g, 0xc8102e, x + w / 2 - 10 * k, y, 20 * k, h);
}

const PAINT = {
  bb(g) {
    vbands(g, [0x00267f, 0xffc726, 0x00267f]);
    g.fillStyle(0x000000, 1);
    g.fillRect(71, 46, 8, 34); g.fillRect(58, 44, 34, 6);
    for (const [x, top, w] of [[58, 26, 7], [71, 16, 8], [85, 26, 7]]) { g.fillRect(x, top, w, 46 - top); g.fillTriangle(x, top, x + w, top, x + w / 2, top - 10); }
    g.fillTriangle(66, 86, 84, 86, 75, 94);
  },
  jm(g) { rect(g, 0x009b3a, 0, 0, W, H); tri(g, 0x000000, [0, 0], [75, 50], [0, 100]); tri(g, 0x000000, [150, 0], [75, 50], [150, 100]); line(g, 0xfed100, 16, 0, 0, W, H); line(g, 0xfed100, 16, W, 0, 0, H); },
  tt(g) { rect(g, 0xce1126, 0, 0, W, H); line(g, 0xffffff, 30, 0, 0, W, H); line(g, 0x000000, 20, 0, 0, W, H); },
  gy(g) { rect(g, 0x009e49, 0, 0, W, H); tri(g, 0xffffff, [0, 0], [150, 50], [0, 100]); tri(g, 0xfcd116, [0, 7], [136, 50], [0, 93]); tri(g, 0x000000, [0, 0], [78, 50], [0, 100]); tri(g, 0xce1126, [0, 9], [62, 50], [0, 91]); },
  lc(g) { rect(g, 0x66ccff, 0, 0, W, H); tri(g, 0xffffff, [75, 16], [112, 84], [38, 84]); tri(g, 0x000000, [75, 28], [102, 84], [48, 84]); tri(g, 0xfcd116, [75, 54], [112, 84], [38, 84]); },
  us(g) {
    for (let i = 0; i < 13; i++) rect(g, i % 2 === 0 ? 0xb22234 : 0xffffff, 0, (H / 13) * i, W, H / 13 + 1);
    rect(g, 0x3c3b6e, 0, 0, 60, (H / 13) * 7);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) disc(g, 0xffffff, 6 + c * 9.6, 6 + r * 10, 2);
  },
  ca(g) {
    rect(g, 0xffffff, 0, 0, W, H); rect(g, 0xff0000, 0, 0, 38, H); rect(g, 0xff0000, 112, 0, 38, H);
    poly(g, 0xff0000, [[75, 18], [80, 30], [91, 26], [87, 42], [99, 38], [95, 50], [106, 56], [80, 61], [80, 84], [70, 84], [70, 61], [44, 56], [55, 50], [51, 38], [63, 42], [59, 26], [70, 30]]);
  },
  gb(g) { unionJack(g, 0, 0, W, H); },
  fr(g) { vbands(g, [0x0055a4, 0xffffff, 0xef4135]); },
  de(g) { hbands(g, [0x000000, 0xdd0000, 0xffce00]); },
  it(g) { vbands(g, [0x009246, 0xffffff, 0xce2b37]); },
  es(g) { rect(g, 0xaa151b, 0, 0, W, H); rect(g, 0xf1bf00, 0, 25, W, 50); },
  br(g) { rect(g, 0x009c3b, 0, 0, W, H); poly(g, 0xffdf00, [[75, 8], [142, 50], [75, 92], [8, 50]]); disc(g, 0x002776, 75, 50, 26); line(g, 0xffffff, 5, 50, 57, 100, 43); },
  mx(g) { vbands(g, [0x006847, 0xffffff, 0xce1126]); disc(g, 0x8a5a2b, 75, 48, 9); g.fillStyle(0x6b8e23, 1); g.fillEllipse(75, 61, 24, 7); },
  jp(g) { rect(g, 0xffffff, 0, 0, W, H); disc(g, 0xbc002d, 75, 50, 30); },
  cn(g) { rect(g, 0xde2910, 0, 0, W, H); star(g, 0xffde00, 25, 25, 15); for (const [x, y] of [[50, 10], [60, 21], [60, 34], [50, 45]]) star(g, 0xffde00, x, y, 5); },
  in(g) {
    hbands(g, [0xff9933, 0xffffff, 0x138808]);
    g.lineStyle(3, 0x000080, 1); g.strokeCircle(75, 50, 12); disc(g, 0x000080, 75, 50, 2.5);
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; line(g, 0x000080, 1, 75, 50, 75 + Math.cos(a) * 12, 50 + Math.sin(a) * 12); }
  },
  au(g) { rect(g, 0x00008b, 0, 0, W, H); unionJack(g, 0, 0, 75, 50); star(g, 0xffffff, 37, 75, 10, 7); for (const [x, y, r] of [[112, 20, 6], [131, 38, 6], [112, 88, 6], [96, 52, 6], [119, 58, 3.5]]) star(g, 0xffffff, x, y, r, 7); },
  ke(g) {
    hbands(g, [0x000000, 0xbb0000, 0x006600]); rect(g, 0xffffff, 0, 31, W, 4); rect(g, 0xffffff, 0, 65, W, 4);
    line(g, 0xffffff, 3, 56, 14, 94, 86); line(g, 0xffffff, 3, 94, 14, 56, 86);
    g.fillStyle(0x000000, 1); g.fillEllipse(75, 50, 30, 60); g.fillStyle(0xbb0000, 1); g.fillEllipse(75, 50, 22, 52); g.fillStyle(0xffffff, 1); g.fillEllipse(75, 50, 6, 20);
  },
  ng(g) { vbands(g, [0x008751, 0xffffff, 0x008751]); },
  za(g) {
    rect(g, 0xde3831, 0, 0, W, 50); rect(g, 0x002395, 0, 50, W, 50);
    for (const [c, w] of [[0xffffff, 28], [0x007a4d, 17]]) { line(g, c, w, 0, 0, 64, 50); line(g, c, w, 0, 100, 64, 50); line(g, c, w, 60, 50, W, 50); }
    tri(g, 0xffb612, [0, 10], [46, 50], [0, 90]); tri(g, 0x000000, [0, 20], [34, 50], [0, 80]);
  },
  eg(g) { hbands(g, [0xce1126, 0xffffff, 0x000000]); disc(g, 0xc09300, 75, 47, 7); rect(g, 0xc09300, 69, 53, 12, 9); },
  gh(g) { hbands(g, [0xce1126, 0xfcd116, 0x006b3f]); star(g, 0x000000, 75, 50, 15); }
};
export const FLAG_CODES = Object.keys(PAINT);

/** Paints a flag at (0, 0), FLAG_W by FLAG_H, with a thin grey edge so white flags show against white. */
export function drawFlag(g, code) {
  (PAINT[code] || PAINT.bb)(g);
  g.lineStyle(2, 0x9aa3ad, 1); g.strokeRect(1, 1, W - 2, H - 2);
}

/** Makes sure the flag's texture exists and returns its key. */
export function ensureFlag(scene, code) {
  const key = flagKey(code);
  if (!scene.textures || scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFlag(g, code);
  g.generateTexture(key, W, H);
  g.destroy();
  return key;
}
export function ensureFlags(scene) { for (const c of COUNTRIES) ensureFlag(scene, c.code); }

/** A flag image fitted inside w by h (keeping its 3:2 shape), centred on (x, y). */
export function flagImage(scene, x, y, w, h, code) {
  const k = Math.min(w / W, h / H);
  return scene.add.image(x, y, ensureFlag(scene, code)).setDisplaySize(W * k, H * k);
}
