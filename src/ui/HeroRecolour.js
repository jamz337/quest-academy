// Recolouring the drawn heroes for each child: skin, hair, top, bottom and shoes are swapped on the hero's walking
// sheet while the shading is kept, so the look the child picks in the profile editor is the look that walks about.
// The current sheets are recoloured by finding each part from its drawn colour and its place on the figure; the
// marker-colour sheets to come (see docs/art/hub-art-guide.md, sheet 5) use the same code with cleaner markers.
import { swatch } from './LpcCharacter.js';

/** The hero colour choices a look can carry, and the editor material each one's names come from. */
export const HERO_COLOUR_KEYS = { heroSkin: 'body', heroHair: 'hair', heroTop: 'cloth', heroBottom: 'cloth', heroShoes: 'cloth' };

/**
 * Where each part sits on a hero sheet's figure (fractions of the figure's own height) and the hue it is drawn in.
 * `hair: null` means the sheet's hair cannot be recoloured (black has no hue to find).
 */
export const HERO_PARTS = {
  hero: { top: [0.30, 0.58, 215, 30], bottom: [0.58, 0.82, 215, 30], hair: null },
  'hero-girl': { top: [0.34, 0.60, 345, 30], bottom: [0.58, 0.88, 275, 30], hair: [0, 0.45, 20, 25] }
};

/** True when a look asks for any hero recolouring. */
export const heroRecoloured = (look) => !!look && Object.keys(HERO_COLOUR_KEYS).some((k) => look[k]);

/** The texture key for a hero look: the sheet alone, or the sheet plus its colour choices. */
export function heroColourKey(art, look) {
  const parts = Object.keys(HERO_COLOUR_KEYS).map((k) => (look && look[k]) || '');
  return parts.some(Boolean) ? `${art}:${parts.join('|')}` : art;
}

/** The hex colour a hero choice means, from the editor's named palettes. */
export const heroHex = (key, name) => (name ? swatch(HERO_COLOUR_KEYS[key], name) : null);

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const hexToHsl = (hx) => rgbToHsl(parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16));
const near = (h, t, tol) => Math.abs((((h - t + 180) % 360) + 360) % 360 - 180) <= tol;

/**
 * Which part a pixel belongs to, from its colour and its height on the figure (0 at the top of the head, 1 at
 * the feet): 'skin', 'hair', 'top', 'bottom', 'shoes' or null. Exported so the rules can be tested without a canvas.
 */
export function partOf(art, r, g, b, fy) {
  const parts = HERO_PARTS[art] || HERO_PARTS.hero;
  const [h, s, l] = rgbToHsl(r, g, b), dark = l < 0.16;
  const hair = parts.hair && fy < parts.hair[1] && near(h, parts.hair[2], parts.hair[3]) && s > 0.15 && l < 0.34;
  if (hair) return 'hair';
  if (!dark && s > 0.18 && near(h, 25, 20) && l > 0.22 && l < 0.86) return 'skin';
  if (!dark && fy >= parts.top[0] && fy < parts.top[1] && near(h, parts.top[2], parts.top[3]) && s > 0.25) return 'top';
  if (!dark && fy >= parts.bottom[0] && fy < parts.bottom[1] && near(h, parts.bottom[2], parts.bottom[3]) && s > 0.25) return 'bottom';
  if (!dark && fy > 0.86 && l > 0.25) return 'shoes';
  return null;
}

/** A part's new colour: the chosen hue and saturation, the drawn pixel's light and shade kept around the choice. */
export function shadeTo(part, hexColour, l) {
  const [th, ts, tl] = hexToHsl(hexColour);
  const mid = part === 'hair' ? 0.22 : part === 'bottom' ? 0.45 : part === 'shoes' ? 0.6 : 0.5;
  const k = part === 'hair' ? 1.2 : part === 'skin' ? 0.55 : part === 'shoes' ? 0.5 : 0.6;
  return hslToRgb(th, ts, tl + (l - mid) * k);
}

/**
 * Recolour a whole hero sheet (an image or canvas of cells `cell` px square, `cols` by `rows`) for a look.
 * Returns a canvas the same size. Each cell's figure is measured on its own, so the parts' bands stay true per pose.
 */
export function recolourSheet(source, art, look, cell, cols, rows) {
  const W = cols * cell, H = rows * cell;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const colours = {};
  for (const k of Object.keys(HERO_COLOUR_KEYS)) if (look[k]) colours[k.slice(4).toLowerCase()] = heroHex(k, look[k]);
  if (!Object.keys(colours).length) return canvas;
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    // The figure's top and bottom in this cell.
    let y0 = cell, y1 = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) { if (d[((cy * cell + y) * W + cx * cell + x) * 4 + 3] > 40) { if (y < y0) y0 = y; if (y + 1 > y1) y1 = y + 1; } }
    if (y1 <= y0) continue;
    const fh = y1 - y0;
    for (let y = y0; y < y1; y++) {
      const fy = (y - y0) / fh;
      for (let x = 0; x < cell; x++) {
        const i = ((cy * cell + y) * W + cx * cell + x) * 4;
        if (d[i + 3] < 40) continue;
        const part = partOf(art, d[i], d[i + 1], d[i + 2], fy);
        if (!part || !colours[part]) continue;
        const l = rgbToHsl(d[i], d[i + 1], d[i + 2])[2];
        const [r, g, b] = shadeTo(part, colours[part], l);
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
