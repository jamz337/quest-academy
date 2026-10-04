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
export const ICON_NAMES = Object.keys(PATHS);
const SIZE = 96;

/** Texture key for an icon in a colour (0xrrggbb), drawing it the first time it is asked for. */
export function icon(scene, name, color = 0xffffff) {
  const key = `ico-${name}-${(color >>> 0).toString(16)}`;
  if (!PATHS[name] || !scene.textures || scene.textures.exists(key)) return key;
  if (typeof scene.textures.createCanvas !== 'function' || typeof Path2D === 'undefined') return key;
  const tex = scene.textures.createCanvas(key, SIZE, SIZE);
  const ctx = tex.getContext();
  ctx.scale(SIZE / 24, SIZE / 24);
  ctx.fillStyle = hex(color);
  ctx.fill(new Path2D(PATHS[name]), 'evenodd');
  tex.refresh();
  return key;
}
