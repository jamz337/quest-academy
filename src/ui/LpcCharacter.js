// Characters built from the Liberated Pixel Cup sprite sheets (public/lpc): a body, a head with eyes, hair,
// a top, a bottom and shoes, each a 576 x 256 walking sheet (9 frames x 4 directions of 64 x 64 px) drawn in one
// base colour and recoloured here from the pack's palettes. Pure canvas 2D and no Phaser, so the parent
// dashboard draws the same faces. Images are supplied by the caller (see loadLpcImages) so this file has no I/O.
//
// A look: { sex: 'boy'|'girl', skin, hairStyle, hair, topStyle, top, bottomStyle, bottom, shoes, eyes } where the
// colour fields are palette variant names (see SKIN_TONES, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS).

import BODY_PALETTE from '../data/lpc/body.json';
import HAIR_PALETTE from '../data/lpc/hair.json';
import CLOTH_PALETTE from '../data/lpc/cloth.json';
import EYE_PALETTE from '../data/lpc/eye.json';

export const LPC_FRAME = 64;                 // px per frame in the sheets
export const LPC_COLS = 9;                   // standing frame then eight walking frames
export const LPC_ROWS = { up: 0, left: 1, down: 2, right: 3 };
export const WORLD_SCALE = 32 / LPC_FRAME;   // a character stands about one tile tall in the world
export const LPC_BASE = 'lpc/spritesheets/';

/** Palette base variants: the colour each sheet is drawn in. */
const BASE = { body: 'light', hair: 'orange', cloth: 'white', eye: 'blue' };
const PALETTES = { body: BODY_PALETTE, hair: HAIR_PALETTE, cloth: CLOTH_PALETTE, eye: EYE_PALETTE };

/** The choices offered in the look editor, with a swatch colour for each. */
export const SKIN_TONES = ['light', 'amber', 'olive', 'taupe', 'bronze', 'brown', 'black'];
export const HAIR_COLOURS = ['black', 'dark_brown', 'chestnut', 'light_brown', 'blonde', 'ginger', 'redhead', 'gray', 'white', 'pink', 'purple', 'blue', 'green'];
export const CLOTH_COLOURS = ['white', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'navy', 'purple', 'pink', 'brown', 'gray', 'black'];
export const EYE_COLOURS = ['brown', 'blue', 'green', 'gray', 'orange', 'purple'];
/** Every variant each palette knows (villagers and bosses may use ones the editor does not offer). */
export const SKIN_VARIANTS = Object.keys(BODY_PALETTE), HAIR_VARIANTS = Object.keys(HAIR_PALETTE), CLOTH_VARIANTS = Object.keys(CLOTH_PALETTE), EYE_VARIANTS = Object.keys(EYE_PALETTE);
export const swatch = (material, variant) => { const ramp = PALETTES[material][variant]; return ramp ? ramp[Math.min(ramp.length - 1, Math.floor(ramp.length * 0.6))] : '#888888'; };

/** Hair styles in the pack we ship, with the folders their layers live in (bg draws behind the body). */
export const HAIR_STYLES = {
  plain: { name: 'Short', fg: 'hair/plain/adult/' },
  buzzcut: { name: 'Buzz cut', fg: 'hair/buzzcut/adult/' },
  bangs: { name: 'Fringe', fg: 'hair/bangs/adult/' },
  pixie: { name: 'Pixie', fg: 'hair/pixie/adult/' },
  spiked: { name: 'Spiky', fg: 'hair/spiked/adult/' },
  curly_short: { name: 'Curly', fg: 'hair/curly_short/adult/' },
  curly_long: { name: 'Long curls', fg: 'hair/curly_long/adult/' },
  afro: { name: 'Afro', fg: 'hair/afro/adult/' },
  natural: { name: 'Natural', fg: 'hair/natural/adult/' },
  cornrows: { name: 'Cornrows', fg: 'hair/cornrows/adult/' },
  twists_straight: { name: 'Twists', fg: 'hair/twists_straight/adult/' },
  dreadlocks_short: { name: 'Short locs', fg: 'hair/dreadlocks_short/adult/' },
  dreadlocks_long: { name: 'Long locs', fg: 'hair/dreadlocks_long/adult/' },
  bob: { name: 'Bob', fg: 'hair/bob/adult/' },
  long: { name: 'Long', fg: 'hair/long/adult/' },
  ponytail: { name: 'Ponytail', fg: 'hair/ponytail/adult/fg/', bg: 'hair/ponytail/adult/bg/' },
  high_ponytail: { name: 'High ponytail', fg: 'hair/high_ponytail/adult/fg/', bg: 'hair/high_ponytail/adult/bg/' },
  braid: { name: 'Braid', fg: 'hair/braid/adult/fg/', bg: 'hair/braid/adult/bg/' }
};
export const TOP_STYLES = { tshirt: { name: 'T-shirt', dir: 'torso/clothes/shortsleeve/tshirt/' }, polo: { name: 'Polo', dir: 'torso/clothes/shortsleeve/shortsleeve_polo/' } };
export const BOTTOM_STYLES = { pants: { name: 'Trousers', dir: 'legs/pants/' }, shorts: { name: 'Shorts', dir: 'legs/shorts/shorts/' }, skirt: { name: 'Skirt', dir: 'legs/skirts/plain/' } };

const bodyDir = (sex) => (sex === 'girl' ? 'female' : 'male');
const legsDir = (sex) => (sex === 'girl' ? 'thin' : 'male');

/**
 * The image paths (relative to LPC_BASE) a look needs, in drawing order: [{ path, material, variant }].
 * The head carries two materials: skin, then the eyes.
 */
export function layersFor(look) {
  const sex = look.sex === 'girl' ? 'girl' : 'boy';
  const hair = HAIR_STYLES[look.hairStyle] || HAIR_STYLES.plain;
  const top = TOP_STYLES[look.topStyle] || TOP_STYLES.tshirt;
  const bottom = BOTTOM_STYLES[look.bottomStyle] || BOTTOM_STYLES.pants;
  const out = [];
  if (hair.bg) out.push({ path: hair.bg + 'walk.png', material: 'hair', variant: look.hair });
  out.push({ path: `body/bodies/${bodyDir(sex)}/walk.png`, material: 'body', variant: look.skin });
  out.push({ path: `head/heads/human/${bodyDir(sex)}/walk.png`, material: 'body', variant: look.skin, second: { material: 'eye', variant: look.eyes } });
  out.push({ path: `feet/shoes/basic/${legsDir(sex)}/walk.png`, material: 'cloth', variant: look.shoes || 'brown' });
  out.push({ path: bottom.dir + `${legsDir(sex)}/walk.png`, material: 'cloth', variant: look.bottom });
  out.push({ path: top.dir + `${bodyDir(sex)}/walk.png`, material: 'cloth', variant: look.top });
  out.push({ path: hair.fg + 'walk.png', material: 'hair', variant: look.hair });
  return out;
}

/** Every image path any look could use (for preloading). */
export function allLayerPaths() {
  const paths = new Set();
  for (const sex of ['boy', 'girl']) {
    for (const p of ['body/bodies/', 'head/heads/human/']) paths.add(`${p}${bodyDir(sex)}/walk.png`);
    paths.add(`feet/shoes/basic/${legsDir(sex)}/walk.png`);
    for (const b of Object.values(BOTTOM_STYLES)) paths.add(b.dir + `${legsDir(sex)}/walk.png`);
    for (const t of Object.values(TOP_STYLES)) paths.add(t.dir + `${bodyDir(sex)}/walk.png`);
  }
  for (const h of Object.values(HAIR_STYLES)) { paths.add(h.fg + 'walk.png'); if (h.bg) paths.add(h.bg + 'walk.png'); }
  return [...paths];
}

const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * Recolour image data in place: every pixel matching the base ramp of `material` (within 1 per channel)
 * becomes the same index of the `variant` ramp. Unknown variants leave the base colours as they are.
 */
export function recolour(data, material, variant) {
  const pal = PALETTES[material];
  const from = pal && pal[BASE[material]], to = pal && pal[variant];
  if (!from || !to || variant === BASE[material]) return;
  const src = from.map(hexToRgb), dst = to.map(hexToRgb);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (let k = 0; k < src.length; k++) {
      const s = src[k];
      if (Math.abs(r - s[0]) <= 1 && Math.abs(g - s[1]) <= 1 && Math.abs(b - s[2]) <= 1) { const d = dst[Math.min(k, dst.length - 1)]; data[i] = d[0]; data[i + 1] = d[1]; data[i + 2] = d[2]; break; }
    }
  }
}

/**
 * Compose a look into `ctx` (a 576 x 256 canvas context): each layer is drawn on a scratch canvas, recoloured
 * and stamped on. `images` maps a layer path to a loaded image; `scratch` is a reusable 576 x 256 canvas.
 * Layers whose image is missing are skipped, so a half-loaded pack still shows something.
 */
export function composeSheet(ctx, look, images, scratch) {
  const W = LPC_COLS * LPC_FRAME, H = 4 * LPC_FRAME;
  ctx.clearRect(0, 0, W, H);
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  for (const layer of layersFor(look)) {
    const img = images[layer.path];
    if (!img) continue;
    sctx.clearRect(0, 0, W, H);
    sctx.drawImage(img, 0, 0);
    const id = sctx.getImageData(0, 0, W, H);
    recolour(id.data, layer.material, layer.variant);
    if (layer.second) recolour(id.data, layer.second.material, layer.second.variant);
    sctx.putImageData(id, 0, 0);
    ctx.drawImage(scratch, 0, 0);
  }
}

/** Frame index (column) and row for a pose and step: standing is column 0, walking cycles columns 1..8. */
export const frameAt = (pose, col) => ({ row: LPC_ROWS[pose === 'side' ? 'left' : pose] ?? LPC_ROWS.down, col });

/** Draw the head and shoulders of a composed sheet (its standing, facing-down frame) into a badge. */
export function drawBustFromSheet(ctx, sheet, cx, cy, size) {
  // The standing frame faces down at column 0, row 2; the head sits around y 6..30 of the 64 px cell.
  const sx = 0, sy = LPC_ROWS.down * LPC_FRAME;
  const s = size / 34;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, sx + 14, sy + 4, 36, 34, cx - 18 * s, cy - 17 * s, 36 * s, 34 * s);
}

/** Credits for the artwork we ship, gathered from the pack's sheet definitions. Shown on the Credits page. */
export const LPC_CREDITS = [
  { what: 'Character bases (bodies and heads)', authors: 'bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Pierre Vigier (pvigier), Matthew Krohn (makrohn), Johannes Sjölund (wulax), Stephen Challener (Redshrike)', licence: 'OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0', url: 'https://opengameart.org/content/lpc-character-bases' },
  { what: 'Hair styles', authors: 'bluecarrot16, ElizaWy, JaidynReiman, Fabzy, Manuel Riecke (MrBeast), Joe White, Nila122, Stephen Challener (Redshrike), Johannes Sjölund (wulax)', licence: 'CC0 / OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0', url: 'https://opengameart.org/content/lpc-hair' },
  { what: 'T-shirts, polos and shorts', authors: 'ElizaWy, JaidynReiman, Stephen Challener (Redshrike), Johannes Sjölund (wulax)', licence: 'OGA-BY 3.0', url: 'https://opengameart.org/content/lpc-expanded-simple-shirts' },
  { what: 'Trousers, skirts and shoes', authors: 'bluecarrot16, JaidynReiman, ElizaWy, Joe White, Pierre Vigier (pvigier), Ahmad3366, Matthew Krohn (makrohn), Johannes Sjölund (wulax), Stephen Challener (Redshrike)', licence: 'OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0', url: 'https://opengameart.org/content/lpc-expanded-pants' },
  { what: 'Sprite sheet layout and palettes', authors: 'The Universal LPC Spritesheet Character Generator contributors', licence: 'GPL 3.0 / CC-BY-SA 3.0', url: 'https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator' }
];

/** Frame indices in a composed sheet (row * LPC_COLS + column): the standing frame of each facing. */
export const IDLE_FRAMES = { down: LPC_ROWS.down * LPC_COLS, up: LPC_ROWS.up * LPC_COLS, side: LPC_ROWS.left * LPC_COLS };
/** Walking frames per facing: columns 1..8 of the facing's row. */
export const walkRange = (pose) => { const r = LPC_ROWS[pose === 'side' ? 'left' : pose] ?? LPC_ROWS.down; return { start: r * LPC_COLS + 1, end: r * LPC_COLS + LPC_COLS - 1 }; };

// ---- Worn things, drawn in pixels over the sheet -------------------------------------------------
// Measured on the pack's sheets: the head spans x 21..42 and y 15..35 of each 64 px cell (hair from y 13), the
// eyes sit at y 24, the torso at y 34..48 and the feet end at y 61. Walking frames bob by a pixel, ignored here. Rows: 0 up (back), 1 left, 2 down (front), 3 right.

const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const darker = (hex, f = 0.75) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex)); if (!m) return hex; const n = parseInt(m[1], 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join(''); };

/** A rounded dome `w` wide and `h` tall whose flat base sits at y = base, covering whatever hair is under it. */
function dome(ctx, hx, base, w, h, c) {
  for (let i = 0; i < h; i++) {   // from the top row down, each row wider than the last
    const t = (h - 1 - i) / h;
    const half = Math.max(2, Math.round((w / 2) * Math.sqrt(1 - t * t)));
    px(ctx, hx - half, base - h + i, half * 2, 1, c);
  }
}

function hatAt(ctx, ox, oy, style, row) {
  const c = style.colour || '#3d8bff', d = darker(c), back = row === LPC_ROWS.up, side = row === LPC_ROWS.left || row === LPC_ROWS.right, dir = row === LPC_ROWS.right ? -1 : 1;
  const hx = ox + 32, top = oy + 12, base = oy + 20;   // head centre x; hats sit from the top of the hair to the brow
  switch (style.shape) {
    case 'cap':
      dome(ctx, hx, base, 24, 9, c); px(ctx, hx - 12, base - 1, 24, 1, d);
      if (!back && !side) px(ctx, hx - 12, base, 24, 2, d);
      if (side) px(ctx, dir > 0 ? hx - 19 : hx + 11, base, 8, 2, d);
      px(ctx, hx - 1, top - 1, 2, 2, d);
      break;
    case 'sun':
      px(ctx, hx - 17, base - 1, 34, 2, darker(c, 0.9)); dome(ctx, hx, base - 1, 22, 8, c); px(ctx, hx - 11, base - 3, 22, 2, '#ff6fae');
      break;
    case 'beanie':
      dome(ctx, hx, base + 1, 24, 11, c); px(ctx, hx - 12, base - 1, 24, 2, d); px(ctx, hx - 2, top - 4, 4, 3, '#ffffff');
      break;
    case 'party':
      for (let i = 0; i < 8; i++) px(ctx, hx - i - 1, top - 6 + i * 2, i * 2 + 2, 2, i % 2 ? d : c);
      px(ctx, hx - 1, top - 8, 3, 2, '#ffc531');
      break;
    case 'crown':
      px(ctx, hx - 11, top + 2, 22, 5, c); for (const dx of [-11, -5, 1, 7]) px(ctx, hx + dx, top - 2, 3, 5, c);
      for (const [dx, col] of [[-8, '#ff5c6c'], [-1, '#3d8bff'], [6, '#2ec46a']]) px(ctx, hx + dx, top + 3, 2, 2, col);
      break;
    case 'feathers': {
      const cols = [c, '#ffc531', '#2ec46a', '#3d8bff', '#ff6fae'];
      cols.forEach((col, i) => px(ctx, hx - 10 + i * 4, top - 10 + Math.abs(i - 2) * 2, 3, 12 - Math.abs(i - 2) * 2, col));
      px(ctx, hx - 12, top + 1, 24, 4, '#ffc531');
      break;
    }
    default: break;
  }
}

function glassesAt(ctx, ox, oy, style, row) {
  if (row === LPC_ROWS.up) return;
  const hx = ox + 32, ey = oy + 23;
  const side = row === LPC_ROWS.left || row === LPC_ROWS.right;
  const eyes = side ? [row === LPC_ROWS.left ? hx - 7 : hx + 2] : [hx - 7, hx + 2];
  for (const x of eyes) {
    if (style.shape === 'sun') px(ctx, x, ey, 5, 3, '#2d2a4a');
    else { px(ctx, x, ey - 1, 5, 1, '#2d2a4a'); px(ctx, x, ey + 3, 5, 1, '#2d2a4a'); px(ctx, x, ey, 1, 3, '#2d2a4a'); px(ctx, x + 4, ey, 1, 3, '#2d2a4a'); }
  }
  if (!side) px(ctx, hx - 1, ey + 1, 2, 1, '#2d2a4a');
}

function backAt(ctx, ox, oy, style, row) {
  const c = style.colour || '#2ec46a', d = darker(c), bx = ox + 32, by = oy + 34;
  if (row === LPC_ROWS.up) {
    if (style.shape === 'backpack') { px(ctx, bx - 7, by, 14, 14, c); px(ctx, bx - 5, by + 7, 10, 5, d); }
    else if (style.shape === 'cape') { px(ctx, bx - 9, by, 18, 24, c); px(ctx, bx - 9, by + 22, 18, 2, d); }
    else if (style.shape === 'wings') for (const sx of [-1, 1]) { px(ctx, bx + sx * 9 - 5, by, 10, 6, c); px(ctx, bx + sx * 12 - 4, by + 4, 8, 6, c); }
    return;
  }
  if (row === LPC_ROWS.left || row === LPC_ROWS.right) {
    const dir = row === LPC_ROWS.left ? 1 : -1;
    if (style.shape === 'backpack') { px(ctx, bx + dir * 4 - 4, by, 8, 14, c); px(ctx, bx + dir * 4 - 2, by + 7, 4, 5, d); }
    else if (style.shape === 'cape') { px(ctx, bx + dir * 5 - 3, by, 6, 22, c); }
    else if (style.shape === 'wings') { px(ctx, bx + dir * 8 - 4, by, 8, 10, c); }
    return;
  }
  if (style.shape === 'backpack') { px(ctx, bx - 10, by + 2, 3, 12, d); px(ctx, bx + 7, by + 2, 3, 12, d); }
  else if (style.shape === 'cape') { px(ctx, bx - 11, by, 3, 22, c); px(ctx, bx + 8, by, 3, 22, c); }
  else if (style.shape === 'wings') for (const sx of [-1, 1]) px(ctx, bx + sx * 12 - 4, by - 2, 8, 8, c);
}

/** The Headmistress: round glasses and a ruler in hand. */
function headmistressAt(ctx, ox, oy, row) {
  glassesAt(ctx, ox, oy, { shape: 'round' }, row);
  const x = row === LPC_ROWS.up ? ox + 17 : row === LPC_ROWS.left ? ox + 22 : row === LPC_ROWS.right ? ox + 40 : ox + 45;
  px(ctx, x, oy + 36, 3, 20, '#ffc531'); for (let t = oy + 39; t < oy + 55; t += 4) px(ctx, x + 1, t, 2, 1, '#2d2a4a');
}

/**
 * Draw worn things over a composed sheet, frame by frame. Things worn on the back go under the body, so callers
 * draw the sheet on top of `drawOutfitBack` and then `drawOutfitFront` on top of the sheet.
 */
export function drawOutfitBack(ctx, outfit) {
  if (!outfit || !outfit.back) return;
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < 4; row++) for (let col = 0; col < LPC_COLS; col++) backAt(ctx, col * LPC_FRAME, row * LPC_FRAME, outfit.back, row);
}
export function drawOutfitFront(ctx, outfit, body = null) {
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < 4; row++) for (let col = 0; col < LPC_COLS; col++) {
    const ox = col * LPC_FRAME, oy = row * LPC_FRAME;
    if (body === 'headmistress') headmistressAt(ctx, ox, oy, row);
    if (outfit && outfit.glasses) glassesAt(ctx, ox, oy, outfit.glasses, row);
    if (outfit && outfit.hat) hatAt(ctx, ox, oy, outfit.hat, row);
  }
}
