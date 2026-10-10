// The Pre-K ark's picture book: a daylight shore with a sky that clouds over as the animals board, the ark with a
// window for every pair, Noah with his speech bubble, and the animal pairs. Each piece draws from plain values so
// a rebuild redraws the same picture, and returns the handles the scene animates.
import { hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { animalKey } from '../../../ui/AnimalArt.js';
import { capital } from '../../../data/early/animals.js';

export const ARK = {
  skyTop: 0x4fa9ff, sky: 0xa9e0ff, stormTop: 0x6b7a94, storm: 0xaab4c4, sun: 0xffd84a, cloud: 0xffffff, cloudDark: 0xc9d0dc,
  hillFar: 0xa6e09a, hill: 0x7ccb6b, grass: 0x5fb850, sand: 0xf4dfa8, sandDark: 0xe9cf90, water: 0x3f8fe0, waterLight: 0x8cc4ff,
  hull: 0xa0703f, hullDark: 0x6e4a26, plank: 0x80572f, cabin: 0xc08a56, cabinDark: 0x8d6236, roof: 0x7a4e2a, trim: 0xffd27a,
  window: 0x2a3a5c, windowLit: 0xfff0b8, ink: 0x2b2b2b, bubble: 0xffffff, bubbleEdge: 0xd9d2c5, text: 0x1e1b4b,
  robe: 0x5b7fd6, robeDark: 0x3f5fb3, skin: 0xc68a5a, beard: 0xf2f2f2, staff: 0x8a5a2b
};
const RAINBOW = [0xff5c6c, 0xff8f3f, 0xffc531, 0x2ec46a, 0x3d8bff, 0x7c5cff];

const mix = (a, b, t) => { const c = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t); return (c(16) << 16) | (c(8) << 8) | c(0); };

/**
 * Sky over rect r. `mood` 0 is a clear day, 1 is overcast; clouds gather and the sun fades between. `rain` 0..1 adds
 * falling drops. Returns { sun, clouds, rain } (containers/graphics the scene may animate).
 */
export function drawSky(scene, r, f, { mood = 0, rain = 0 } = {}) {
  const g = scene.add.graphics();
  g.fillGradientStyle(mix(ARK.skyTop, ARK.stormTop, mood), mix(ARK.skyTop, ARK.stormTop, mood), mix(ARK.sky, ARK.storm, mood), mix(ARK.sky, ARK.storm, mood), 1);
  g.fillRect(r.x, r.y, r.w, r.h);
  // The sun, with soft rays, fading as the clouds come.
  const sun = scene.add.container(r.x + r.w * 0.84, r.y + r.h * 0.3).setAlpha(1 - mood * 0.75);   // below Noah's bubble
  const sg = scene.add.graphics();
  sg.fillStyle(ARK.sun, 0.25); sg.fillCircle(0, 0, 34 * f);
  sg.fillStyle(ARK.sun, 1); sg.fillCircle(0, 0, 22 * f);
  sun.add(sg);
  if (scene.tweens) scene.tweens.add({ targets: sun, scale: 1.06, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  // Clouds: a few drift on a clear day, many crowd in as the storm gathers.
  const clouds = scene.add.container(0, 0);
  const n = 2 + Math.round(mood * 7);
  const spots = [[0.12, 0.3], [0.45, 0.25], [0.7, 0.36], [0.26, 0.4], [0.9, 0.44], [0.55, 0.42], [0.04, 0.46], [0.78, 0.26], [0.35, 0.33]];   // all below the bubble
  for (let i = 0; i < n && i < spots.length; i++) {
    const [px, py] = spots[i], cg = scene.add.graphics(), s = (0.8 + (i % 3) * 0.2) * f;
    cg.fillStyle(mix(ARK.cloud, ARK.cloudDark, mood * 0.9), 0.95);
    cg.fillEllipse(0, 0, 70 * s, 26 * s); cg.fillEllipse(-20 * s, 4 * s, 40 * s, 20 * s); cg.fillEllipse(22 * s, 6 * s, 44 * s, 22 * s); cg.fillEllipse(4 * s, -10 * s, 36 * s, 24 * s);
    const c = scene.add.container(r.x + r.w * px, r.y + r.h * py);
    c.add(cg); clouds.add(c);
    if (scene.tweens) scene.tweens.add({ targets: c, x: c.x + (i % 2 ? 14 : -14) * f, duration: 4000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  // Rain: falling streaks over the whole sky.
  let rg = null;
  if (rain > 0) {
    rg = scene.add.graphics().setAlpha(Math.min(1, rain));
    rg.lineStyle(2 * f, ARK.waterLight, 0.8);
    const step = rain > 0.6 ? 26 * f : 44 * f;
    for (let x = r.x + 8; x < r.x + r.w; x += step) for (let y = r.y + 10; y < r.y + r.h * 0.9; y += step * 1.6) rg.lineBetween(x + (y % 3) * 5, y, x - 4 * f + (y % 3) * 5, y + 14 * f);
    if (scene.tweens) scene.tweens.add({ targets: rg, y: 18 * f, duration: 420, repeat: -1 });
  }
  return { sun, clouds, rain: rg };
}

/** Rolling hills and the sandy shore below them. Returns the ground line (y of the shore's top). */
export function drawShore(scene, r, f) {
  const g = scene.add.graphics();
  const hy = r.y + r.h * 0.5;
  g.fillStyle(ARK.hillFar, 1);
  g.fillEllipse(r.x + r.w * 0.2, hy + 6 * f, r.w * 0.7, r.h * 0.26); g.fillEllipse(r.x + r.w * 0.8, hy + 10 * f, r.w * 0.8, r.h * 0.22);
  g.fillStyle(ARK.hill, 1);
  g.fillEllipse(r.x + r.w * 0.55, hy + 18 * f, r.w * 0.9, r.h * 0.22); g.fillEllipse(r.x + r.w * 0.05, hy + 20 * f, r.w * 0.6, r.h * 0.2);
  const groundY = hy + 22 * f;
  g.fillStyle(ARK.grass, 1); g.fillRect(r.x, groundY - 8 * f, r.w, 14 * f);
  g.fillStyle(ARK.sand, 1); g.fillRect(r.x, groundY + 6 * f, r.w, r.y + r.h - groundY - 6 * f);
  g.fillStyle(ARK.sandDark, 0.5);
  for (let i = 0; i < 14; i++) g.fillEllipse(r.x + ((i * 97) % r.w), groundY + 20 * f + ((i * 53) % Math.max(20, r.y + r.h - groundY - 30 * f)), 10 * f, 4 * f);
  return groundY;
}

/** The flood: water over the shore up to `level` (0..1 of the shore's height), with little waves. */
export function drawFlood(scene, r, groundY, f, level = 1) {
  const g = scene.add.graphics();
  const top = r.y + r.h - (r.y + r.h - groundY + 10 * f) * level;
  g.fillStyle(ARK.water, 0.92); g.fillRect(r.x, top, r.w, r.y + r.h - top);
  g.lineStyle(2 * f, ARK.waterLight, 0.7);
  for (let y = top + 10 * f; y < r.y + r.h; y += 18 * f) for (let x = r.x + 10; x < r.x + r.w - 20; x += 40 * f) g.lineBetween(x, y, x + 18 * f, y - 3 * f);
  return g;
}

/** A rainbow arching over the scene (hidden until the scene fades it in). */
export function drawRainbow(scene, r, f) {
  const bow = scene.add.graphics().setAlpha(0);
  const bx = r.x + r.w * 0.5, by = r.y + r.h * 0.55, br = Math.min(r.w * 0.46, r.h * 0.5);
  RAINBOW.forEach((col, i) => { bow.lineStyle(8 * f, col, 0.85); bow.beginPath(); bow.arc(bx, by, br - i * 8 * f, Math.PI, Math.PI * 2, false); bow.strokePath(); });
  return bow;
}

/**
 * The ark on the shore: hull, cabin with a window per pair (`lit` lists the animal keys already aboard, in boarding
 * order), roof, door and the ramp down to the sand. Returns { ark (container), door, rampBase, windows: [{x, y, key}] }.
 */
export function drawArk(scene, r, groundY, f, { windows = 8, lit = [], afloat = false } = {}) {
  const ark = scene.add.container(0, afloat ? -10 * f : 0);
  const g = scene.add.graphics();
  const aw = Math.min(r.w * 0.62, 460 * f), ax = r.x + r.w - aw - 10 * f;
  const ah = Math.min(r.h * 0.17, 64 * f), ay = groundY - ah + 4 * f;
  g.fillStyle(0x000000, 0.18); g.fillEllipse(ax + aw / 2, groundY + 6 * f, aw * 1.02, 12 * f);
  // Hull: a wide boat with an up-swept bow on the right.
  const hull = [{ x: ax, y: ay }, { x: ax + aw * 0.93, y: ay - ah * 0.1 }, { x: ax + aw, y: ay - ah * 0.4 }, { x: ax + aw * 0.86, y: ay + ah }, { x: ax + aw * 0.1, y: ay + ah }];
  g.fillStyle(ARK.hull, 1); g.fillPoints(hull, true);
  g.lineStyle(3 * f, ARK.hullDark, 1); g.strokePoints(hull, true);
  g.lineStyle(2 * f, ARK.plank, 0.9);
  for (let i = 1; i < 3; i++) { const yy = ay + (ah * i) / 3, inset = (aw * 0.1 * i) / 3; g.lineBetween(ax + inset, yy, ax + aw * 0.92 - inset * 0.5, yy); }
  g.lineStyle(4 * f, ARK.trim, 1); g.lineBetween(ax + 2 * f, ay + 4 * f, ax + aw * 0.93, ay - ah * 0.06);
  // Cabin with its row of windows and the door.
  const cw = aw * 0.72, ch = Math.min(r.h * 0.2, 74 * f), cx = ax + aw * 0.1, cy = ay - ch + 4 * f;
  g.fillStyle(ARK.cabin, 1); g.fillRect(cx, cy, cw, ch);
  g.lineStyle(3 * f, ARK.cabinDark, 1); g.strokeRect(cx, cy, cw, ch);
  g.fillStyle(ARK.roof, 1); g.fillRoundedRect(cx - 10 * f, cy - 14 * f, cw + 20 * f, 16 * f, 5 * f);
  g.lineStyle(3 * f, ARK.trim, 0.9); g.lineBetween(cx - 10 * f, cy - 14 * f, cx + cw + 10 * f, cy - 14 * f);
  const doorW = 22 * f, doorH = Math.min(ch - 6 * f, 34 * f), doorX = cx + 8 * f, doorY = cy + ch - doorH;
  g.fillStyle(ARK.hullDark, 1); g.fillRoundedRect(doorX, doorY, doorW, doorH, { tl: 10 * f, tr: 10 * f, bl: 0, br: 0 });
  ark.add(g);
  const wins = [];
  const wx0 = doorX + doorW + 8 * f, wAvail = cx + cw - 6 * f - wx0, ww = Math.min(26 * f, wAvail / windows - 4 * f), wy = cy + ch * 0.5;
  for (let i = 0; i < windows; i++) {
    const x = wx0 + (wAvail / windows) * (i + 0.5), key = lit[i] || null;
    const wg = scene.add.graphics();
    wg.fillStyle(key ? ARK.windowLit : ARK.window, 1); wg.fillRoundedRect(x - ww / 2, wy - ww / 2, ww, ww, 5 * f);
    wg.lineStyle(2 * f, ARK.cabinDark, 1); wg.strokeRoundedRect(x - ww / 2, wy - ww / 2, ww, ww, 5 * f);
    ark.add(wg);
    const win = { x, y: wy, w: ww, key, face: null };
    if (key && scene.textures.exists(animalKey(key))) { win.face = scene.add.image(x, wy + 1 * f, animalKey(key)).setDisplaySize(ww * 0.86, ww * 0.86); ark.add(win.face); }
    wins.push(win);
  }
  // The ramp from the sand up to the door.
  const rampBase = { x: doorX - 56 * f, y: groundY + 12 * f }, door = { x: doorX + doorW / 2, y: doorY + doorH - 6 * f };
  if (!afloat) {
    const rg = scene.add.graphics();
    rg.fillStyle(ARK.plank, 1); rg.fillPoints([{ x: rampBase.x - 10 * f, y: rampBase.y }, { x: rampBase.x + 12 * f, y: rampBase.y }, { x: door.x + 10 * f, y: door.y + 6 * f }, { x: door.x - 10 * f, y: door.y + 6 * f }], true);
    rg.lineStyle(2 * f, ARK.hullDark, 0.8);
    for (let i = 1; i < 6; i++) { const t = i / 6; rg.lineBetween(rampBase.x - 10 * f + (door.x - 10 * f - rampBase.x + 10 * f) * t, rampBase.y + (door.y + 6 * f - rampBase.y) * t, rampBase.x + 12 * f + (door.x + 10 * f - rampBase.x - 12 * f) * t, rampBase.y + (door.y + 6 * f - rampBase.y) * t); }
    ark.add(rg);
  }
  return { ark, door, rampBase, windows: wins, box: { x: ax, y: cy - 14 * f, w: aw, h: groundY - cy + 20 * f } };
}

/** Noah: a kind old man in a blue robe with a white beard and a staff. Returns the container; `mouth` moves when he talks. */
export function drawNoah(scene, x, y, h) {
  const c = scene.add.container(x, y);   // (x, y) is where his feet stand
  const s = h / 120, g = scene.add.graphics();
  const ink = (w = 3) => g.lineStyle(w * s, ARK.ink, 1);
  // Staff behind him.
  g.fillStyle(ARK.staff, 1); g.fillRoundedRect(28 * s, -118 * s, 6 * s, 118 * s, 3 * s); ink(2); g.strokeRoundedRect(28 * s, -118 * s, 6 * s, 118 * s, 3 * s);
  // Robe (a rounded trapezoid), sleeves and sandals.
  const robe = [{ x: -26 * s, y: -74 * s }, { x: 26 * s, y: -74 * s }, { x: 34 * s, y: 0 }, { x: -34 * s, y: 0 }];
  g.fillStyle(ARK.robe, 1); g.fillPoints(robe, true); ink(); g.strokePoints(robe, true);
  g.fillStyle(ARK.robeDark, 1); g.fillRect(-4 * s, -74 * s, 8 * s, 74 * s);
  g.fillStyle(ARK.robe, 1); g.fillEllipse(-30 * s, -50 * s, 16 * s, 34 * s); g.fillEllipse(30 * s, -50 * s, 16 * s, 34 * s);
  g.fillStyle(ARK.skin, 1); g.fillCircle(-32 * s, -34 * s, 7 * s); g.fillCircle(32 * s, -34 * s, 7 * s);
  g.fillStyle(ARK.staff, 1); g.fillEllipse(-14 * s, 0, 18 * s, 6 * s); g.fillEllipse(14 * s, 0, 18 * s, 6 * s);
  // Head, hair and beard.
  g.fillStyle(ARK.skin, 1); g.fillCircle(0, -94 * s, 22 * s); ink(); g.strokeCircle(0, -94 * s, 22 * s);
  g.fillStyle(ARK.beard, 1); g.fillEllipse(0, -72 * s, 36 * s, 28 * s); ink(2.5); g.strokeEllipse(0, -72 * s, 36 * s, 28 * s);
  g.fillStyle(ARK.beard, 1); g.fillEllipse(0, -112 * s, 40 * s, 16 * s);
  g.fillStyle(ARK.skin, 1); g.fillEllipse(0, -96 * s, 30 * s, 20 * s);   // the face over the beard's top edge
  g.fillStyle(ARK.ink, 1); g.fillCircle(-8 * s, -98 * s, 2.6 * s); g.fillCircle(8 * s, -98 * s, 2.6 * s);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(-7 * s, -99 * s, 1 * s); g.fillCircle(9 * s, -99 * s, 1 * s);
  g.fillStyle(0xe09a6a, 1); g.fillCircle(-14 * s, -90 * s, 3 * s); g.fillCircle(14 * s, -90 * s, 3 * s);   // rosy cheeks
  c.add(g);
  const mouth = scene.add.graphics();
  mouth.fillStyle(0x7a3b2e, 1); mouth.fillEllipse(0, 0, 10 * s, 5 * s);
  mouth.setPosition(0, -84 * s);
  c.add(mouth);
  c.mouth = mouth;
  return c;
}

/** A white speech bubble with big friendly text; its tail points left, at Noah. Returns { bubble, text }. */
export function speechBubble(scene, x, y, w, h, str, f) {
  const g = scene.add.graphics();
  g.fillStyle(ARK.bubbleEdge, 1); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 20 * f);
  g.fillStyle(ARK.bubble, 1); g.fillRoundedRect(x, y, w, h, 18 * f);
  g.fillStyle(ARK.bubble, 1); g.fillTriangle(x + 2, y + h * 0.55, x + 2, y + h * 0.8, x - 14 * f, y + h * 0.72);
  g.lineStyle(2, ARK.bubbleEdge, 1); g.lineBetween(x - 14 * f, y + h * 0.72, x, y + h * 0.55); g.lineBetween(x - 14 * f, y + h * 0.72, x, y + h * 0.8);
  const text = scene.add.text(x + w / 2 - 16 * f, y + h / 2, str, { fontFamily: FONT, fontSize: Math.round(20 * f) + 'px', color: hex(ARK.text), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: w - 70 * f } }).setOrigin(0.5);
  for (const size of [20, 18, 16, 14]) { if ((text.height || 0) <= h - 10 * f) break; text.setFontSize(Math.round(size * f)); }
  return { bubble: g, text };
}

/** Two of an animal, side by side, with its name underneath. Returns the container (`faces` for animating). */
export function animalPair(scene, x, y, size, animal, f) {
  const c = scene.add.container(x, y);
  const key = animalKey(animal.key), has = scene.textures.exists(key);
  const faces = [-0.42, 0.42].map((dx, i) => {
    const img = has ? scene.add.image(dx * size, i ? 4 * f : 0, key).setDisplaySize(size * 0.8, size * 0.8) : scene.add.text(dx * size, 0, animal.name[0].toUpperCase(), { fontSize: Math.round(size * 0.6) + 'px' }).setOrigin(0.5);
    if (i === 0 && img.setFlipX) img.setFlipX(true);   // the pair looks at each other
    return img;
  });
  const name = scene.add.text(0, size * 0.58, capital(animal.name), { fontFamily: FONT, fontSize: Math.round(13 * f) + 'px', color: hex(ARK.text), fontStyle: WEIGHT.heavy, backgroundColor: '#ffffffcc', padding: { x: 6 * f, y: 2 * f } }).setOrigin(0.5);
  c.add([...faces, name]);
  c.faces = faces; c.name = name; c.label = name;   // tests know a pair by its name
  c.setSize(size * 1.9, size * 1.3);
  return c;
}
