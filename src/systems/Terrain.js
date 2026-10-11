// Painted terrain edges: roads and water drawn on a "dual grid", a layer offset half a tile from the map, where each
// piece is chosen by which of its four corners (map squares) are road or water. Inside a piece the edge is a smooth,
// slightly wobbly curve with an ink outline; along a road, tufts of the neighbouring ground's grass lean over it;
// along water, a band of foam. The curve always crosses a piece's side at its middle, straight across, so pieces
// join without seams. Pure canvas painting into one texture, 'terrain'; WorldScene builds the layers from it.
import { mulberry32 } from './Rng.js';

export const TERRAIN_KEY = 'terrain';
export const TERRAIN_COLS = 16;   // a row per (kind, variant); the column is the corner mask, 1..15
export const VARIANTS = 2;

/** The ground a road can run across, and how its edge looks there. `fringe` is the grass that leans over the road. */
export const ROAD_KINDS = [
  { id: 'grass', fringe: '#5cbd48', light: '#86d966', outline: '#2c6e2a' },
  { id: 'meadow', fringe: '#a6d44e', light: '#cbe97a', outline: '#5f8a22' },
  { id: 'woods', fringe: '#3f9a45', light: '#5cb85e', outline: '#1f5326' },
  { id: 'springs', fringe: '#6fcdb7', light: '#9fe6d6', outline: '#2d7f6f' },
  { id: 'cove', fringe: null, outline: '#c4a062' },
  { id: 'village', fringe: null, outline: '#a08a63' },
  { id: 'quay', fringe: null, outline: '#8f8a80' }
];
export const ROAD_ROWS = ROAD_KINDS.length * VARIANTS;
export const WATER_ROW = ROAD_ROWS;   // then VARIANTS rows of water
export const TERRAIN_ROWS = ROAD_ROWS + VARIANTS;

const ROAD = { base: [236, 201, 140], dark: '#d2a463', light: '#f8e3b6', shade: 0.13 };
const WATER = { base: [74, 168, 240], deep: [58, 143, 224], foam: [214, 240, 255], outline: '#2a6fa8' };

/** The tile index in the terrain tileset for a road of kind `k` (index into ROAD_KINDS), variant v and corner mask m. */
export const roadTile = (k, v, m) => (k * VARIANTS + v) * TERRAIN_COLS + m;
export const waterTile = (v, m) => (WATER_ROW + v) * TERRAIN_COLS + m;

/** Corner mask from the four corners: top-left 8, top-right 4, bottom-left 2, bottom-right 1. */
export const cornerMask = (tl, tr, bl, br) => (tl ? 8 : 0) | (tr ? 4 : 0) | (bl ? 2 : 0) | (br ? 1 : 0);

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ramp = (a, b, t) => clamp01((t - a) / (b - a));

/** The edge field of a piece, f > 0.5 inside: corner values blended smoothly, plus a wobble that is zero at the sides. */
function field(size, mask, noise) {
  const tl = (mask >> 3) & 1, tr = (mask >> 2) & 1, bl = (mask >> 1) & 1, br = mask & 1;
  const f = new Float32Array(size * size);
  const diag = (tl && br && !tr && !bl) || (tr && bl && !tl && !br);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size, sv = smooth(v), wy = Math.sin(Math.PI * v);
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, su = smooth(u), w = Math.sin(Math.PI * u) * wy;
      let val = tl * (1 - su) * (1 - sv) + tr * su * (1 - sv) + bl * (1 - su) * sv + br * su * sv;
      if (diag) val += 0.12 * w;                       // diagonal corners join up through the middle
      f[y * size + x] = val + noise[y * size + x] * w;
    }
  }
  return f;
}

/** Signed distance to the edge in pixels (positive inside), from the field and its slope. */
function distances(f, size) {
  const d = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const gx = (f[y * size + Math.min(size - 1, x + 1)] - f[y * size + Math.max(0, x - 1)]) / 2;
    const gy = (f[Math.min(size - 1, y + 1) * size + x] - f[Math.max(0, y - 1) * size + x]) / 2;
    const g = Math.hypot(gx, gy);
    d[i] = g > 1e-5 ? (f[i] - 0.5) / g : (f[i] > 0.5 ? 99 : -99);
  }
  return d;
}

/** A soft wobble for a variant: a few gentle waves, the same for every piece of that variant. */
function wobble(size, rnd, amp) {
  const n = new Float32Array(size * size), waves = [];
  for (let k = 0; k < 4; k++) waves.push({ fx: 1 + rnd() * 3, fy: 1 + rnd() * 3, p: rnd() * Math.PI * 2, a: amp * (0.5 + rnd() * 0.5) / (k + 1) });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let s = 0;
    for (const w of waves) s += w.a * Math.sin(Math.PI * 2 * (w.fx * u + w.fy * v) + w.p);
    n[y * size + x] = s;
  }
  return n;
}

/** Points on the edge, spaced out and away from the piece's sides (so nothing drawn there is cut off at a seam). */
function edgePoints(f, d, size, rnd, step, margin) {
  const pts = [];
  for (let y = margin; y < size - margin; y += step) for (let x = margin; x < size - margin; x += step) {
    let px = x + (rnd() - 0.5) * step * 0.8, py = y + (rnd() - 0.5) * step * 0.8;
    for (let it = 0; it < 4; it++) {
      const ix = Math.round(px), iy = Math.round(py);
      if (ix < 1 || iy < 1 || ix >= size - 1 || iy >= size - 1) break;
      const i = iy * size + ix;
      const gx = (f[i + 1] - f[i - 1]) / 2, gy = (f[i + size] - f[i - size]) / 2, g2 = gx * gx + gy * gy;
      if (g2 < 1e-8) break;
      const k = (0.5 - f[i]) / g2; px += gx * k; py += gy * k;
    }
    const ix = Math.round(px), iy = Math.round(py);
    if (ix < margin || iy < margin || ix >= size - margin || iy >= size - margin) continue;
    if (Math.abs(d[iy * size + ix]) > 1.5) continue;
    const i = iy * size + ix, gx = (f[i + 1] - f[i - 1]) / 2, gy = (f[i + size] - f[i - size]) / 2, g = Math.hypot(gx, gy) || 1;
    if (pts.every((p) => Math.hypot(p.x - px, p.y - py) > step * 0.7)) pts.push({ x: px, y: py, nx: gx / g, ny: gy / g });
  }
  return pts;
}

/** Paint the road piece for a corner mask into ctx (size x size at 0, 0). */
function paintRoad(ctx, size, mask, kind, shape, rnd) {
  const { f, d } = shape, s = size / 128;
  const ow = 3.6 * s, img = ctx.createImageData(size, size), px = img.data;
  const oc = hexRgb(kind.outline);
  for (let i = 0; i < size * size; i++) {
    const di = d[i];
    const a = ramp(-ow / 2 - 0.8, -ow / 2 + 0.8, di);
    if (a <= 0) continue;
    const t = ramp(ow / 2 - 0.8, ow / 2 + 0.8, di);                 // 0 on the outline, 1 on the road
    const shade = 1 - ROAD.shade * (1 - ramp(ow / 2, ow / 2 + 10 * s, di));   // the edge of the road lies in shade
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.round(oc[c] * (1 - t) + ROAD.base[c] * shade * t);
    px[i * 4 + 3] = Math.round(255 * a);
  }
  ctx.putImageData(img, 0, 0);
  // Pebbles and specks on the road only.
  ctx.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < 7; k++) {
    const x = (14 + rnd() * 100) * s, y = (14 + rnd() * 100) * s, r = (2.2 + rnd() * 2.6) * s;
    ctx.fillStyle = ROAD.dark; ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ROAD.light; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.7, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let k = 0; k < 10; k++) { ctx.fillStyle = rnd() < 0.5 ? ROAD.light : ROAD.dark; ctx.beginPath(); ctx.arc((8 + rnd() * 112) * s, (8 + rnd() * 112) * s, 1.2 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  // Grass leaning over the edge, in tufts of two or three blades.
  if (kind.fringe && mask !== 15) {
    for (const p of edgePoints(f, d, size, rnd, 22 * s, 12 * s)) tuft(ctx, p, kind, s, rnd);
  }
}

function tuft(ctx, p, kind, s, rnd) {
  const n = 2 + Math.floor(rnd() * 2), tx = -p.ny, ty = p.nx;   // along the edge
  const blades = [];
  for (let b = 0; b < n; b++) {
    const off = (b - (n - 1) / 2) * 4.2 * s, len = (8 + rnd() * 6) * s, lean = (rnd() - 0.5) * 6 * s, w = 2.6 * s;
    const bx = p.x - p.nx * 3 * s + tx * off, by = p.y - p.ny * 3 * s + ty * off;   // rooted just on the grass side
    blades.push([[bx - tx * w, by - ty * w], [bx + p.nx * len + tx * lean, by + p.ny * len + ty * lean], [bx + tx * w, by + ty * w]]);
  }
  const shape = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.quadraticCurveTo((pts[0][0] + pts[1][0]) / 2 + ty, (pts[0][1] + pts[1][1]) / 2 - tx, pts[1][0], pts[1][1]); ctx.quadraticCurveTo((pts[2][0] + pts[1][0]) / 2 - ty, (pts[2][1] + pts[1][1]) / 2 + tx, pts[2][0], pts[2][1]); ctx.closePath(); };
  ctx.lineJoin = 'round';
  for (const pts of blades) { shape(pts); ctx.lineWidth = 3 * s; ctx.strokeStyle = kind.outline; ctx.stroke(); }
  for (const pts of blades) { shape(pts); ctx.fillStyle = kind.fringe; ctx.fill(); }
  ctx.strokeStyle = kind.light; ctx.lineWidth = 1 * s;
  for (const pts of blades) { const [a, tip] = [pts[0], pts[1]]; ctx.beginPath(); ctx.moveTo((a[0] + pts[2][0]) / 2, (a[1] + pts[2][1]) / 2); ctx.lineTo((a[0] * 0.3 + tip[0] * 0.7), (a[1] * 0.3 + tip[1] * 0.7)); ctx.stroke(); }
}

/** Paint the water piece for a corner mask: an ink edge, a band of foam inside it, deeper water further out, ripples. */
function paintWater(ctx, size, mask, noise, rnd) {
  const f = field(size, mask, noise), d = distances(f, size), s = size / 128;
  const ow = 3.6 * s, img = ctx.createImageData(size, size), px = img.data, oc = hexRgb(WATER.outline);
  for (let i = 0; i < size * size; i++) {
    const di = d[i];
    const a = ramp(-ow / 2 - 0.8, -ow / 2 + 0.8, di);
    if (a <= 0) continue;
    const t = ramp(ow / 2 - 0.8, ow / 2 + 0.8, di);
    const foam = 1 - ramp(ow / 2 + 4 * s, ow / 2 + 8 * s, di);            // a white rim just inside the edge
    const deep = ramp(14 * s, 40 * s, di);
    for (let c = 0; c < 3; c++) {
      const water = WATER.base[c] * (1 - deep) + WATER.deep[c] * deep;
      const col = water * (1 - foam) + WATER.foam[c] * foam;
      px[i * 4 + c] = Math.round(oc[c] * (1 - t) + col * t);
    }
    px[i * 4 + 3] = Math.round(255 * a);
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(226,246,255,0.9)'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const x = (24 + rnd() * 80) * s, y = (24 + rnd() * 80) * s, w = (6 + rnd() * 4) * s;
    if (d[Math.round(y) * size + Math.round(x)] < 14 * s) continue;     // ripples out in open water
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w / 2, y - 3.5 * s, x, y); ctx.quadraticCurveTo(x + w / 2, y + 3.5 * s, x + w, y); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/**
 * Build the terrain tileset into a canvas texture: `size` px pieces in padded cells (pad px each side, the piece
 * stretched into the padding so filtering never pulls in a neighbour). Row layout: ROAD_KINDS x VARIANTS, then water.
 */
export function terrainTexture(scene, size, pad) {
  if (scene.textures.exists(TERRAIN_KEY)) return;
  const cell = size + pad * 2;
  const tex = scene.textures.createCanvas(TERRAIN_KEY, cell * TERRAIN_COLS, cell * TERRAIN_ROWS);
  const atlas = tex.getContext();
  const scratch = document.createElement('canvas'); scratch.width = size; scratch.height = size;
  const ctx = scratch.getContext('2d');
  const put = (row, m) => {
    const x = m * cell, y = row * cell;
    atlas.drawImage(scratch, x, y, cell, cell);
    atlas.clearRect(x + pad, y + pad, size, size);
    atlas.drawImage(scratch, x + pad, y + pad);
  };
  for (let v = 0; v < VARIANTS; v++) {
    const roadNoise = wobble(size, mulberry32(101 + v), 0.09), waterNoise = wobble(size, mulberry32(201 + v), 0.08);
    // The edge's shape depends only on the corners and the variant, so it is worked out once for every ground kind.
    const shapes = [null];
    for (let m = 1; m < 16; m++) { const f = field(size, m, roadNoise); shapes.push({ f, d: distances(f, size) }); }
    ROAD_KINDS.forEach((kind, k) => {
      for (let m = 1; m < 16; m++) { ctx.clearRect(0, 0, size, size); paintRoad(ctx, size, m, kind, shapes[m], mulberry32(1000 + k * 97 + v * 31 + m)); put(k * VARIANTS + v, m); }
    });
    for (let m = 1; m < 16; m++) { ctx.clearRect(0, 0, size, size); paintWater(ctx, size, m, waterNoise, mulberry32(3000 + v * 31 + m)); put(WATER_ROW + v, m); }
  }
  tex.refresh();
}
