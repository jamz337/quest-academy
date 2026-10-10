// The Pre-K ark's picture: a painted backdrop (public/sprites/ark/backdrop.jpg: sky, hills, sun, sand and the ark,
// from the approved mock-up) with the live parts drawn over it: weather that gathers as the animals board, faces in
// the ark's windows, Noah's portrait with his speech bubble, the animal pairs on the sand, the flood and the rainbow.
// Positions on the ark are given in backdrop pixels (the picture is 1024 square) and mapped to the screen.
import { hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { animalKey, fitImage } from '../../../ui/AnimalArt.js';
import { capital } from '../../../data/early/animals.js';

export const BACKDROP_KEY = 'ark-backdrop', NOAH_KEY = 'ark-noah', BACKDROP = 1024;
/** Where a boarded pair's face shows: the cabin windows, the hull's portholes, then peeking over the rail. */
export const ARK_SPOTS = [[688, 432], [730, 432], [773, 432], [600, 432], [625, 510], [815, 500], [515, 466], [560, 466]];
export const ARK_DOOR = { x: 745, y: 530 }, ARK_RAMP_BASE = { x: 800, y: 625 }, ARK_GROUND = 600;

export const ARK = {
  storm: 0x5c6a82, water: 0x3f8fe0, waterLight: 0x9fd0ff, cloud: 0xb9c2d0, cloudEdge: 0x8f9bae,
  bubble: 0xeaf4ff, bubbleEdge: 0x9cc7f2, text: 0x1e1b4b
};
const RAINBOW = [0xff5c6c, 0xff8f3f, 0xffc531, 0x2ec46a, 0x3d8bff, 0x7c5cff];

/**
 * The painted backdrop filling `area` (scaled to cover it, cropped to it, the sand kept at the bottom). Returns
 * { map(px, py) -> screen point, scale, groundY, image }.
 */
export function drawBackdrop(scene, area) {
  const scale = Math.max(area.w / BACKDROP, area.h / BACKDROP);
  const size = BACKDROP * scale;
  const ox = area.x + (area.w - size) / 2, oy = area.y + area.h - size;   // bottom-aligned: the sand always shows
  const image = scene.textures.exists(BACKDROP_KEY) ? scene.add.image(ox, oy, BACKDROP_KEY).setOrigin(0).setDisplaySize(size, size) : null;
  if (image && image.setCrop) image.setCrop((area.x - ox) / scale, (area.y - oy) / scale, area.w / scale, area.h / scale);
  const map = (px, py) => ({ x: ox + px * scale, y: oy + py * scale });
  return { map, scale, groundY: map(0, ARK_GROUND).y, image };
}

/**
 * Weather over the backdrop: `mood` 0 leaves the sunny picture alone, 1 is overcast (a grey veil and heavy clouds);
 * `rain` 0..1 adds falling drops. Returns { veil, clouds, rain }.
 */
export function drawWeather(scene, area, f, { mood = 0, rain = 0 } = {}) {
  const veil = scene.add.rectangle(area.x, area.y, area.w, area.h, ARK.storm, Math.min(0.5, mood * 0.5)).setOrigin(0);
  const clouds = scene.add.container(0, 0);
  const n = Math.round(mood * 7);
  const spots = [[0.12, 0.22], [0.45, 0.17], [0.7, 0.28], [0.26, 0.32], [0.9, 0.34], [0.55, 0.34], [0.04, 0.38]];
  for (let i = 0; i < n && i < spots.length; i++) {
    const [px, py] = spots[i], g = scene.add.graphics(), s = (0.9 + (i % 3) * 0.25) * f;
    g.fillStyle(ARK.cloudEdge, 0.9); g.fillEllipse(0, 4 * s, 84 * s, 30 * s);
    g.fillStyle(ARK.cloud, 1); g.fillEllipse(0, 0, 80 * s, 28 * s); g.fillEllipse(-24 * s, 5 * s, 44 * s, 22 * s); g.fillEllipse(26 * s, 7 * s, 48 * s, 24 * s); g.fillEllipse(4 * s, -11 * s, 40 * s, 26 * s);
    const c = scene.add.container(area.x + area.w * px, area.y + area.h * py);
    c.add(g); clouds.add(c);
    if (scene.tweens) scene.tweens.add({ targets: c, x: c.x + (i % 2 ? 16 : -16) * f, duration: 4000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  let rg = null;
  if (rain > 0) {
    rg = scene.add.graphics().setAlpha(Math.min(1, rain));
    rg.lineStyle(2 * f, ARK.waterLight, 0.85);
    const step = rain > 0.6 ? 26 * f : 44 * f;
    for (let x = area.x + 8; x < area.x + area.w; x += step) for (let y = area.y + 10; y < area.y + area.h * 0.9; y += step * 1.6) rg.lineBetween(x + (y % 3) * 5, y, x - 4 * f + (y % 3) * 5, y + 14 * f);
    if (scene.tweens) scene.tweens.add({ targets: rg, y: 18 * f, duration: 420, repeat: -1 });
  }
  return { veil, clouds, rain: rg };
}

/** The flood: water over the sand from the ground line down, with little waves. */
export function drawFlood(scene, area, groundY, f) {
  const g = scene.add.graphics();
  const top = groundY - 6 * f;
  g.fillStyle(ARK.water, 0.9); g.fillRect(area.x, top, area.w, area.y + area.h - top);
  g.lineStyle(2 * f, ARK.waterLight, 0.7);
  for (let y = top + 12 * f; y < area.y + area.h; y += 18 * f) for (let x = area.x + 10; x < area.x + area.w - 20; x += 40 * f) g.lineBetween(x, y, x + 18 * f, y - 3 * f);
  if (scene.tweens) scene.tweens.add({ targets: g, y: 3 * f, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return g;
}

/** A rainbow arching over the ark (hidden until the scene fades it in). */
export function drawRainbow(scene, map, f) {
  const bow = scene.add.graphics().setAlpha(0);
  const c = map(640, 520), br = map(900, 0).x - map(380, 0).x;
  RAINBOW.forEach((col, i) => { bow.lineStyle(9 * f, col, 0.85); bow.beginPath(); bow.arc(c.x, c.y, br / 2 - i * 9 * f, Math.PI, Math.PI * 2, false); bow.strokePath(); });
  return bow;
}

/** Noah's portrait (the round picture from the mock-up), `size` across, standing at (x, y) centre. */
export function drawNoah(scene, x, y, size) {
  const c = scene.add.container(x, y);
  if (scene.textures.exists(NOAH_KEY)) c.add(scene.add.image(0, 0, NOAH_KEY).setDisplaySize(size, size));
  else { const g = scene.add.graphics(); g.fillStyle(0x5b7fd6, 1); g.fillCircle(0, 0, size / 2); c.add(g); }
  c.setSize(size, size);
  return c;
}

/** A pale blue speech bubble with big friendly text; its tail points left, at Noah. Returns { bubble, text }. */
export function speechBubble(scene, x, y, w, h, str, f) {
  const g = scene.add.graphics();
  g.fillStyle(ARK.bubbleEdge, 1); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 22 * f);
  g.fillStyle(ARK.bubble, 1); g.fillRoundedRect(x, y, w, h, 20 * f);
  g.fillStyle(ARK.bubbleEdge, 1); g.fillTriangle(x + 1, y + h * 0.4, x + 1, y + h * 0.66, x - 16 * f, y + h * 0.56);
  g.fillStyle(ARK.bubble, 1); g.fillTriangle(x + 3, y + h * 0.43, x + 3, y + h * 0.63, x - 12 * f, y + h * 0.56);
  const text = scene.add.text(x + w / 2 - 16 * f, y + h / 2, str, { fontFamily: FONT, fontSize: Math.round(20 * f) + 'px', color: hex(ARK.text), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: w - 70 * f } }).setOrigin(0.5);
  for (const size of [20, 18, 16, 14]) { if ((text.height || 0) <= h - 10 * f) break; text.setFontSize(Math.round(size * f)); }
  return { bubble: g, text };
}

/** Two of an animal, side by side, with its name underneath. Returns the container (`faces` for animating). */
export function animalPair(scene, x, y, size, animal, f) {
  const c = scene.add.container(x, y);
  const key = animalKey(animal.key), has = scene.textures.exists(key);
  const faces = [-0.42, 0.42].map((dx, i) => {
    const img = has ? fitImage(scene.add.image(dx * size, i ? 3 * f : 0, key).setOrigin(0.5, 1), size * 0.95, size * 1.3) : scene.add.text(dx * size, 0, animal.name[0].toUpperCase(), { fontSize: Math.round(size * 0.6) + 'px' }).setOrigin(0.5);
    if (i === 0 && img.setFlipX) img.setFlipX(true);   // the pair looks at each other
    return img;
  });
  const name = scene.add.text(0, size * 0.3, capital(animal.name), { fontFamily: FONT, fontSize: Math.round(13 * f) + 'px', color: hex(ARK.text), fontStyle: WEIGHT.heavy, backgroundColor: '#ffffffdd', padding: { x: 7 * f, y: 3 * f } }).setOrigin(0.5);
  c.add([...faces, name]);
  c.faces = faces; c.name = name; c.label = name;   // tests know a pair by its name
  c.setSize(size * 1.9, size * 1.6);
  return c;
}

/** An animal's head and shoulders in a window: the top of its picture, `size` tall, centred at (x, y). */
export function windowFace(scene, x, y, size, key) {
  const tex = animalKey(key);
  if (!scene.textures.exists(tex)) return scene.add.circle(x, y, size / 2, 0xffffff);
  const img = scene.add.image(x, y, tex);
  const fr = img.frame, fw = (fr && fr.width) || 10, fh = (fr && fr.height) || 10, part = 0.52;
  if (img.setCrop) img.setCrop(0, 0, fw, fh * part);
  img.setOrigin(0.5, part / 2);
  const k = Math.min(size / (fh * part), size / fw);
  img.setScale(k);
  return img;
}
