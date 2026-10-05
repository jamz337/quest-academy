// Drawn icons, so the interface looks the same on every phone (emoji differ from device to device).
// Each icon is one SVG path on a 24 x 24 grid, rendered once per colour into a texture; use the returned key with
// scene.add.image or a Button's `icon` option.
import { hex } from './theme.js';

const PATHS = {
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM4 5.5h2.2v2H5.6a1.6 1.6 0 0 0 1.5 1.6l.3 1.9A3.5 3.5 0 0 1 4 7.6zM17.8 5.5H20v2.1a3.5 3.5 0 0 1-3.4 3.4l.3-1.9a1.6 1.6 0 0 0 1.5-1.6h-.6zM10.5 14.5h3v3h3v2.5h-9v-2.5h3z',
  family: 'M8 5a3 3 0 1 1 0 6a3 3 0 0 1 0-6zm8 1a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5zM2.5 20a5.5 5.5 0 0 1 11 0zm12.3 0a7 7 0 0 0-1.5-4.4A4.5 4.5 0 0 1 21.5 20z',
  person: 'M12 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM4 21a8 6 0 0 1 16 0z',
  sound: 'M4 9h4l5-4v14l-5-4H4zM15.2 9.2l1.3-1.3a5.8 5.8 0 0 1 0 8.2l-1.3-1.3a4 4 0 0 0 0-5.6z',
  mute: 'M4 9h4l5-4v14l-5-4H4zM15.2 10.1l1.2-1.2 1.9 1.9 1.9-1.9 1.2 1.2-1.9 1.9 1.9 1.9-1.2 1.2-1.9-1.9-1.9 1.9-1.2-1.2 1.9-1.9z',
  compass: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 2a7 7 0 1 1 0 14a7 7 0 0 1 0-14zm3.8 3.2-2.3 5.3-5.3 2.3 2.3-5.3z',
  spark: 'M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z',
  book: 'M3 5h6.5A1.5 1.5 0 0 1 11 6.5V20a2 2 0 0 0-1.5-1H3zM21 5h-6.5A1.5 1.5 0 0 0 13 6.5V20a2 2 0 0 1 1.5-1H21z',
  bars: 'M4 12h4v8H4zM10 6h4v14h-4zM16 14h4v6h-4z',
  cloud: 'M7 18a4 4 0 0 1-.4-8 5.2 5.2 0 0 1 10-1.3A4.7 4.7 0 0 1 17.5 18z',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3h1.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zm2 0h4V8a2 2 0 0 0-4 0z'
};

// Shape helpers for the game icons below: a circle, an oval and a rounded rectangle as path text.
const o = (cx, cy, rx, ry = rx) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0z`;
const rr = (x, y, w, h, r = 0) => `M${x + r} ${y}h${w - r * 2}a${r} ${r} 0 0 1 ${r} ${r}v${h - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
// One icon per mini-game (named `game-<id>`), for the Challenge menu. `fill` is painted solid, then `cut` is
// punched out of it (eyes, windows, pepperoni), so shapes can overlap freely.
const GAMES = {
  'math-dash': { fill: 'M13.5 2 5 13.5h5.5L9.5 22 19 10h-5.5z' },
  'math-pizza': { fill: 'M12 21.5 3.5 6.5a17 17 0 0 1 17 0z', cut: o(9.6, 9.4, 1.5) + o(14.3, 10.4, 1.5) + o(11.9, 14.6, 1.3) },
  'math-bridge': { fill: 'M2 7.5h20v3h-2V19h-3v-4a5 5 0 0 0-10 0v4H4v-8.5H2z' },
  'math-balloons': { fill: o(12, 9.3, 6.4, 7.3) + 'M12 15.8l2.2 3.2H9.8z' + rr(11.6, 18.6, 0.8, 3.6, 0.4), cut: o(9.5, 6.6, 1.1, 1.8) },
  'math-count': { fill: rr(3, 3, 18, 18, 4), cut: o(8, 8, 1.8) + o(16, 8, 1.8) + o(12, 12, 1.8) + o(8, 16, 1.8) + o(16, 16, 1.8) },
  'eng-builder': { fill: 'M10 3h4l6 18h-3.8l-1.2-4H9l-1.2 4H4z', cut: 'M12 7.8 10.1 13.6h3.8z' },
  'eng-grammar': { fill: 'M6 21V9a6 6 0 0 1 12 0v12z', cut: o(14.6, 13, 1.3) },
  'eng-match': { fill: rr(3, 4, 8, 8, 1.6) + rr(13, 12, 8, 8, 1.6) + rr(11, 10.5, 2, 3, 0) },
  'eng-frog': { fill: o(12, 13.6, 8, 6.4) + o(7.5, 8, 3.2) + o(16.5, 8, 3.2), cut: o(7.5, 8, 1.3) + o(16.5, 8, 1.3) + rr(8.5, 15.2, 7, 1.3, 0.65) },
  'eng-trace': { fill: 'M4 20l1.2-4.8L15.5 4.9l3.6 3.6L8.8 18.8zM16.6 3.8l1.3-1.3a1.5 1.5 0 0 1 2.1 0l1.5 1.5a1.5 1.5 0 0 1 0 2.1l-1.3 1.3z' },
  'code-maze': { fill: rr(4, 8, 16, 11, 2.5) + rr(11.25, 4.5, 1.5, 4, 0) + o(12, 3.8, 1.7), cut: o(9, 12.8, 1.7) + o(15, 12.8, 1.7) + rr(9.5, 16, 5, 1.3, 0.6) },
  'code-bug': { fill: o(12, 13.6, 5.4, 6.9) + o(12, 5.8, 2.9) + [[2.6, 9.6], [17.4, 9.6], [2, 13.4], [18, 13.4], [2.8, 17.2], [17.2, 17.2]].map(([x, y]) => rr(x, y, 4, 1.4, 0.7)).join(''), cut: rr(11.45, 8.6, 1.1, 12, 0.5) },
  'code-predict': { fill: o(12, 10.2, 7.4) + 'M7 18.6h10l1.5 3h-13z', cut: 'M12 5.6l1.2 3.4 3.4 1.2-3.4 1.2-1.2 3.4-1.2-3.4-3.4-1.2 3.4-1.2z' },
  'code-dance': { fill: 'M9 4.6 19.5 3v12.6h-2V7.3l-6.5 1V17.6H9z' + o(7.2, 17.6, 2.9, 2.3) + o(15.7, 15.6, 2.9, 2.3) },
  'bible-quiz': { fill: PATHS.book },
  'bible-verse': { fill: PATHS.spark },
  'bible-match': { fill: o(9, 11.5, 3.6) + o(13, 9.6, 3.8) + o(16.4, 12.4, 3.4) + o(12.4, 13.6, 4) + o(5.6, 10.2, 2.7, 3.1) + rr(9, 16, 1.7, 4.6, 0.8) + rr(14.2, 16, 1.7, 4.6, 0.8), cut: o(5, 9.6, 0.7) },
  'bible-ark': { fill: 'M2 13h20l-3 6.5H5z' + rr(7, 8.2, 10, 4.8, 0.8) + 'M5.5 8.6 12 4l6.5 4.6z', cut: rr(9, 9.6, 2, 2.2, 0.4) + rr(13, 9.6, 2, 2.2, 0.4) }
};
for (const [id, shape] of Object.entries(GAMES)) PATHS[`game-${id}`] = shape;
export const ICON_NAMES = Object.keys(PATHS);
/** Is there a drawn icon with this name? */
export const hasIcon = (name) => !!PATHS[name];
// Sized for the screen: sharp on a 3x phone, without being shrunk so far on a 1x screen that it shimmers.
const SIZE = Math.round(64 * Math.max(1.5, Math.min(3.5, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)));

/** Texture key for an icon in a colour (0xrrggbb), drawing it the first time it is asked for. */
export function icon(scene, name, color = 0xffffff) {
  const key = `ico-${name}-${(color >>> 0).toString(16)}`;
  if (!PATHS[name] || !scene.textures || scene.textures.exists(key)) return key;
  if (typeof scene.textures.createCanvas !== 'function' || typeof Path2D === 'undefined') return key;
  const tex = scene.textures.createCanvas(key, SIZE, SIZE);
  const ctx = tex.getContext();
  ctx.scale(SIZE / 24, SIZE / 24);
  ctx.fillStyle = hex(color);
  const shape = PATHS[name];
  if (typeof shape === 'string') ctx.fill(new Path2D(shape), 'evenodd');
  else {
    ctx.fill(new Path2D(shape.fill));
    if (shape.cut) { ctx.globalCompositeOperation = 'destination-out'; ctx.fill(new Path2D(shape.cut)); ctx.globalCompositeOperation = 'source-over'; }
  }
  tex.refresh();
  return key;
}
