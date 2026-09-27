// Drawn pictures for the Barbados quizzes and the house: Caribbean flags and the island's outline with a
// marker. Generated on first use as textures; keys look like 'flag:barbados' or 'map:sw'.
import { THEME } from './theme.js';

/** The outline of Barbados as (x, y) in [0,1]: narrow in the north, widest in the south, bulging to the east. */
export const ISLAND = [
  [0.44, 0.02], [0.58, 0.06], [0.68, 0.16], [0.75, 0.3], [0.86, 0.44], [0.97, 0.56], [0.92, 0.7], [0.8, 0.84],
  [0.62, 0.96], [0.4, 0.97], [0.22, 0.9], [0.12, 0.78], [0.1, 0.62], [0.16, 0.44], [0.2, 0.28], [0.3, 0.12]
];

/** Marker positions on the island for the map questions. */
export const MAP_SPOTS = { sw: [0.2, 0.8], n: [0.44, 0.1], e: [0.9, 0.55], c: [0.5, 0.5] };

export const FLAG_NAMES = { barbados: 'Barbados', jamaica: 'Jamaica', trinidad: 'Trinidad and Tobago', bahamas: 'The Bahamas' };

/** Fill the island polygon scaled into (x, y, w, h). */
export function drawIsland(g, x, y, w, h, fill = 0x2ec46a, stroke = 0x1f8f4c) {
  const pts = ISLAND.map(([px, py]) => ({ x: x + px * w, y: y + py * h }));
  g.fillStyle(fill, 1); g.fillPoints(pts, true);
  g.lineStyle(2, stroke, 1); g.strokePoints(pts, true);
}

export function drawFlag(g, id, x, y, w, h) {
  if (id === 'barbados') {
    g.fillStyle(0x00267f, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0xffc726, 1); g.fillRect(x + w / 3, y, w / 3, h);
    // The broken trident: three prongs on a bar, the shaft below.
    const cx = x + w / 2, u = h / 20;
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - u, y + 7 * u, 2 * u, 10 * u);
    g.fillRect(cx - 4 * u, y + 3 * u, 1.6 * u, 6 * u); g.fillRect(cx - u, y + 2 * u, 2 * u, 6 * u); g.fillRect(cx + 2.4 * u, y + 3 * u, 1.6 * u, 6 * u);
    g.fillRect(cx - 4 * u, y + 8 * u, 8 * u, 1.6 * u);
  } else if (id === 'jamaica') {
    g.fillStyle(0x009b3a, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0x000000, 1); g.fillTriangle(x, y, x + w / 2, y + h / 2, x, y + h); g.fillTriangle(x + w, y, x + w / 2, y + h / 2, x + w, y + h);
    g.lineStyle(Math.max(4, h / 7), 0xfed100, 1); g.lineBetween(x, y, x + w, y + h); g.lineBetween(x + w, y, x, y + h);
  } else if (id === 'trinidad') {
    g.fillStyle(0xce1126, 1); g.fillRect(x, y, w, h);
    const t = w * 0.16;
    g.fillStyle(0xffffff, 1); g.fillPoints([{ x: x + t * 0.6, y }, { x: x + t * 1.9, y }, { x: x + w, y: y + h }, { x: x + w - t * 1.3, y: y + h }], true);
    g.fillStyle(0x000000, 1); g.fillPoints([{ x: x + t * 0.9, y }, { x: x + t * 1.6, y }, { x: x + w - t * 0.3, y: y + h }, { x: x + w - t, y: y + h }], true);
  } else if (id === 'bahamas') {
    g.fillStyle(0x00abc9, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0xfae042, 1); g.fillRect(x, y + h / 3, w, h / 3);
    g.fillStyle(0x000000, 1); g.fillTriangle(x, y, x + w * 0.42, y + h / 2, x, y + h);
  } else { g.fillStyle(0xcccccc, 1); g.fillRect(x, y, w, h); }
}

/** A texture for a picture key ('flag:jamaica', 'map:sw'); returns the key, or null for an unknown picture. */
export function pictureTexture(scene, key) {
  const tex = 'pic:' + key;
  if (!scene.textures || !scene.make || !scene.make.graphics) return null;
  if (scene.textures.exists(tex)) return tex;
  const [kind, id] = String(key).split(':');
  const g = scene.make.graphics({ add: false });
  let w = 96, h = 64;
  if (kind === 'flag') {
    drawFlag(g, id, 0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.15); g.strokeRect(1, 1, w - 2, h - 2);
  } else if (kind === 'map') {
    w = 80; h = 96;
    g.fillStyle(0xdff3ff, 1); g.fillRoundedRect(0, 0, w, h, 8);
    drawIsland(g, 12, 8, w - 24, h - 16);
    const spot = MAP_SPOTS[id];
    if (spot) { g.fillStyle(0xff004d, 1); g.fillCircle(12 + spot[0] * (w - 24), 8 + spot[1] * (h - 16), 6); g.lineStyle(2, 0xffffff, 1); g.strokeCircle(12 + spot[0] * (w - 24), 8 + spot[1] * (h - 16), 6); }
  } else { g.destroy(); return null; }
  g.generateTexture(tex, w, h);
  g.destroy();
  return tex;
}

/** Whether a quiz picture is a drawn texture (as opposed to an emoji). */
export const isDrawnPicture = (pic) => typeof pic === 'string' && /^(flag|map):/.test(pic);
export const PICTURE_ACCENT = THEME.gold;
