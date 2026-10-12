// Flags cut into the parts a child paints in Flag Finder's "paint the flag" board. Shapes use the same 150 x 100 frame
// and colours as the drawn flags (ui/Flags.js). A part is { paint, colour, shapes }: `paint` is the pot that belongs
// there, `colour` the flag's exact shade (shown once the right pot is used). Shapes: { r: [x, y, w, h] },
// { p: [x1, y1, x2, y2, ...] } or { c: [x, y, radius] }. Later parts sit on top of earlier ones.

/** The paint pots, in the order they are laid out. */
export const PAINTS = { red: 0xd21034, blue: 0x1f4fbf, 'light blue': 0x66ccff, gold: 0xffc726, green: 0x009b3a, black: 0x111111, white: 0xffffff };
export const PAINT_ORDER = Object.keys(PAINTS);

const R = (x, y, w, h) => ({ r: [x, y, w, h] });
const P = (...pts) => ({ p: pts });
const C = (x, y, r) => ({ c: [x, y, r] });
const part = (paint, colour, ...shapes) => ({ paint, colour, shapes });
const third = 100 / 3;
const star = (cx, cy, outer, inner) => P(...Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? inner : outer, a = -Math.PI / 2 + (i * Math.PI) / 5; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }).flat());
// A diagonal band from the top-left corner to the bottom-right, `w` wide, clipped to the flag.
const band = (w) => { const h = w / 2 / Math.sin(Math.atan(100 / 150)), v = w / 2 / Math.cos(Math.atan(100 / 150)); return P(0, 0, h, 0, 150, 100 - v, 150, 100, 150 - h, 100, 0, v); };
const mirror = (shape) => ({ p: shape.p.map((n, i) => (i % 2 === 0 ? 150 - n : n)) });

export const FLAG_PARTS = {
  bb: [
    part('blue', 0x00267f, R(0, 0, 50, 100)), part('gold', 0xffc726, R(50, 0, 50, 100)), part('blue', 0x00267f, R(100, 0, 50, 100)),
    part('black', 0x000000, R(71, 46, 8, 34), R(58, 44, 34, 6), R(58, 26, 7, 20), P(58, 26, 65, 26, 61.5, 16), R(71, 16, 8, 30), P(71, 16, 79, 16, 75, 6), R(85, 26, 7, 20), P(85, 26, 92, 26, 88.5, 16), P(66, 86, 84, 86, 75, 94))
  ],
  jm: [
    part('green', 0x009b3a, P(0, 0, 150, 0, 75, 50)), part('green', 0x009b3a, P(0, 100, 150, 100, 75, 50)),
    part('black', 0x000000, P(0, 0, 75, 50, 0, 100)), part('black', 0x000000, P(150, 0, 75, 50, 150, 100)),
    part('gold', 0xfed100, band(16), mirror(band(16)))
  ],
  tt: [part('red', 0xce1126, R(0, 0, 150, 100)), part('white', 0xffffff, band(30)), part('black', 0x000000, band(20))],
  gy: [
    part('green', 0x009e49, R(0, 0, 150, 100)), part('white', 0xffffff, P(0, 0, 150, 50, 0, 100)), part('gold', 0xfcd116, P(0, 7, 136, 50, 0, 93)),
    part('black', 0x000000, P(0, 0, 78, 50, 0, 100)), part('red', 0xce1126, P(0, 9, 62, 50, 0, 91))
  ],
  lc: [part('light blue', 0x66ccff, R(0, 0, 150, 100)), part('white', 0xffffff, P(75, 16, 112, 84, 38, 84)), part('black', 0x000000, P(75, 28, 102, 84, 48, 84)), part('gold', 0xfcd116, P(75, 54, 112, 84, 38, 84))],
  jp: [part('white', 0xffffff, R(0, 0, 150, 100)), part('red', 0xbc002d, C(75, 50, 30))],
  fr: [part('blue', 0x0055a4, R(0, 0, 50, 100)), part('white', 0xffffff, R(50, 0, 50, 100)), part('red', 0xef4135, R(100, 0, 50, 100))],
  it: [part('green', 0x009246, R(0, 0, 50, 100)), part('white', 0xffffff, R(50, 0, 50, 100)), part('red', 0xce2b37, R(100, 0, 50, 100))],
  de: [part('black', 0x000000, R(0, 0, 150, third)), part('red', 0xdd0000, R(0, third, 150, third)), part('gold', 0xffce00, R(0, 2 * third, 150, third))],
  es: [part('red', 0xaa151b, R(0, 0, 150, 25)), part('gold', 0xf1bf00, R(0, 25, 150, 50)), part('red', 0xaa151b, R(0, 75, 150, 25))],
  ca: [
    part('red', 0xff0000, R(0, 0, 38, 100)), part('white', 0xffffff, R(38, 0, 74, 100)), part('red', 0xff0000, R(112, 0, 38, 100)),
    part('red', 0xff0000, P(75, 18, 80, 30, 91, 26, 87, 42, 99, 38, 95, 50, 106, 56, 80, 61, 80, 84, 70, 84, 70, 61, 44, 56, 55, 50, 51, 38, 63, 42, 59, 26, 70, 30))
  ],
  ng: [part('green', 0x008751, R(0, 0, 50, 100)), part('white', 0xffffff, R(50, 0, 50, 100)), part('green', 0x008751, R(100, 0, 50, 100))],
  gh: [part('red', 0xce1126, R(0, 0, 150, third)), part('gold', 0xfcd116, R(0, third, 150, third)), part('green', 0x006b3f, R(0, 2 * third, 150, third)), part('black', 0x000000, star(75, 50, 15, 5.7))]
};
/** The flags Pre-K paints: the Caribbean, and Japan's red circle. */
export const PREK_PAINT = ['bb', 'jm', 'lc', 'tt', 'gy', 'jp'];

function inPoly(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const inShape = (s, x, y) => (s.r ? x >= s.r[0] && x <= s.r[0] + s.r[2] && y >= s.r[1] && y <= s.r[1] + s.r[3] : s.c ? Math.hypot(x - s.c[0], y - s.c[1]) <= s.c[2] : inPoly(s.p, x, y));

/** The topmost part under (x, y) in the 150 x 100 frame, or -1. */
export function partAt(parts, x, y) {
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].shapes.some((s) => inShape(s, x, y))) return i;
  return -1;
}
