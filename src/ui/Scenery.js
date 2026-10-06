// Little scenes that sit above a quiz and grow with the score: a race track, a castle gate, a bookshelf,
// a sheep fold, a row of lamps and a safari trail. Each draws from plain values so a rebuild redraws the
// same picture, and returns handles the game can animate right after a rebuild.
import { THEME, hex } from './theme.js';
import { FONT, WEIGHT } from './TextStyles.js';
import { figureFix } from './Hero.js';

const band = (scene, r, color, radius = 16) => { const g = scene.add.graphics(); g.fillStyle(color, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, radius); return g; };
const cloud = (g, x, y, s) => { g.fillEllipse(x, y, 46 * s, 16 * s); g.fillEllipse(x - 14 * s, y + 3 * s, 26 * s, 12 * s); g.fillEllipse(x + 15 * s, y + 4 * s, 28 * s, 13 * s); };

/**
 * A running track with a start flag, a checkered finish and a runner (the player's own sprite) whose position
 * shows the score. Returns { runner, xFor(progress) }.
 */
export function raceTrack(scene, r, { progress = 0, total = 10, spriteKey = null, ui = 1 } = {}) {
  const g = band(scene, r, 0xdff1ff);
  g.fillStyle(0xffffff, 0.9); cloud(g, r.x + r.w * 0.2, r.y + r.h * 0.28, ui * 0.8); cloud(g, r.x + r.w * 0.68, r.y + r.h * 0.22, ui * 0.6);
  const ty = r.y + r.h * 0.62, th = Math.min(22 * ui, r.h * 0.34);
  g.fillStyle(0x8fd48a, 1); g.fillRoundedRect(r.x, ty - 6 * ui, r.w, r.y + r.h - ty + 6 * ui, 16);
  g.fillStyle(0xb85c3c, 1); g.fillRoundedRect(r.x + 10, ty, r.w - 20, th, 6);
  g.fillStyle(0xffffff, 0.8); for (let x = r.x + 22; x < r.x + r.w - 26; x += 22 * ui) g.fillRect(x, ty + th / 2 - 1, 10 * ui, 2);
  const x0 = r.x + 30 * ui, x1 = r.x + r.w - 30 * ui;
  const xFor = (p) => x0 + (x1 - x0) * Math.max(0, Math.min(1, p / total));
  // Finish: a checkered flag on a pole.
  g.fillStyle(THEME.ink2, 1); g.fillRect(x1 + 8 * ui, ty - 26 * ui, 2, 26 * ui);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle((i + j) % 2 ? 0xffffff : THEME.ink, 1); g.fillRect(x1 + 10 * ui + i * 4 * ui, ty - 26 * ui + j * 4 * ui, 4 * ui, 4 * ui); }
  g.fillStyle(THEME.success, 1); g.fillRect(x0 - 12 * ui, ty - 22 * ui, 2, 22 * ui); g.fillTriangle(x0 - 10 * ui, ty - 22 * ui, x0 + 2 * ui, ty - 17 * ui, x0 - 10 * ui, ty - 12 * ui);
  let runner = null;
  if (spriteKey && scene.textures.exists(spriteKey)) {
    const size = 28 * ui * figureFix(spriteKey);
    runner = scene.add.sprite(xFor(progress), ty + th / 2 - 8 * ui, spriteKey, 9).setDisplaySize(size, size).setFlipX(true);   // frame 9: standing, facing left
  }
  return { runner, xFor, trackY: ty + th / 2 - 8 * ui };
}

/**
 * A castle gate whose portcullis rises as `open` goes from 0 to 1. Returns { bars, yFor(open) } so the bars
 * can be tweened between two openings.
 */
export function castleGate(scene, r, { open = 0, ui = 1 } = {}) {
  const g = band(scene, r, 0xd6ecff);
  g.fillStyle(0xffffff, 0.9); cloud(g, r.x + r.w * 0.18, r.y + r.h * 0.25, ui * 0.7);
  const gw = Math.min(r.w * 0.34, 150 * ui), gh = r.h * 0.78, gx = r.x + (r.w - gw) / 2, gy = r.y + r.h - gh;
  const stone = 0xb8c4d4, dark = 0x8a94a6;
  // Towers and battlements either side of the arch.
  for (const tx of [gx - 34 * ui, gx + gw + 4 * ui]) {
    g.fillStyle(dark, 1); g.fillRect(tx - 2, gy - 8 * ui, 34 * ui, gh + 8 * ui);
    g.fillStyle(stone, 1); g.fillRect(tx, gy - 6 * ui, 30 * ui, gh + 6 * ui);
    g.fillStyle(dark, 1); for (let i = 0; i < 3; i++) g.fillRect(tx + i * 11 * ui, gy - 14 * ui, 7 * ui, 8 * ui);
    g.fillStyle(0x2d2a4a, 0.8); g.fillRoundedRect(tx + 11 * ui, gy + 14 * ui, 8 * ui, 12 * ui, 3);
  }
  // The archway, with the dark opening behind the portcullis.
  g.fillStyle(dark, 1); g.fillRect(gx - 4, gy + 10 * ui, gw + 8, gh - 10 * ui);
  g.fillStyle(stone, 1); g.fillRect(gx, gy + 14 * ui, gw, gh - 14 * ui);
  g.fillStyle(0x2d2a4a, 1); g.fillRoundedRect(gx + 14 * ui, gy + 24 * ui, gw - 28 * ui, gh - 24 * ui, { tl: 22 * ui, tr: 22 * ui, bl: 0, br: 0 });
  g.fillStyle(0x7ad36a, 1); g.fillRect(gx + 14 * ui, gy + gh - 6 * ui, gw - 28 * ui, 6 * ui);   // grass beyond
  const openH = gh - 24 * ui - 6 * ui;
  const yFor = (o) => gy + 24 * ui - openH * Math.max(0, Math.min(1, o));
  const bars = scene.add.container(gx + 14 * ui, yFor(open));
  const bg = scene.add.graphics();
  const bw = gw - 28 * ui;
  bg.fillStyle(0x625f7e, 1);
  for (let i = 0; i <= 4; i++) bg.fillRect((bw / 4) * i - 2 * ui, 0, 4 * ui, openH);
  for (let j = 0; j <= 3; j++) bg.fillRect(0, (openH / 3) * j - 2 * ui, bw, 4 * ui);
  bars.add(bg);
  // A mask keeps the raised bars inside the arch.
  const maskG = scene.make.graphics({ add: false });
  maskG.fillStyle(0xffffff, 1); maskG.fillRoundedRect(gx + 14 * ui, gy + 24 * ui, bw, openH + 6 * ui, { tl: 22 * ui, tr: 22 * ui, bl: 0, br: 0 });
  if (typeof maskG.createGeometryMask === 'function') bars.setMask(maskG.createGeometryMask());
  return { bars, yFor };
}

const SPINES = [0xff5c6c, 0x3d8bff, 0x2ec46a, 0xffc531, 0xff6fae, 0x8b5cf6, 0xff8f3f, 0x229c53];

/** A wooden shelf; every solved word stands on it as a book. Returns { books } (the last one is the newest). */
export function bookshelf(scene, r, { words = [], slots = 8, ui = 1 } = {}) {
  const g = band(scene, r, 0xfff0cc);
  const shelfY = r.y + r.h - 12 * ui;
  g.fillStyle(0x7a4a2a, 1); g.fillRoundedRect(r.x + 8, shelfY, r.w - 16, 10 * ui, 4);
  g.fillStyle(0xa06a3c, 1); g.fillRoundedRect(r.x + 8, shelfY - 4 * ui, r.w - 16, 6 * ui, 3);
  g.fillStyle(0xa06a3c, 0.4); g.fillRect(r.x + 8, r.y + 6, 8 * ui, r.h - 12); g.fillRect(r.x + r.w - 16 - 8 * ui + 8, r.y + 6, 8 * ui, r.h - 12);
  const bw = Math.min(30 * ui, (r.w - 60 * ui) / slots), bh = Math.min(r.h - 30 * ui, 54 * ui);
  const x0 = r.x + 24 * ui;
  const books = words.map((w, i) => {
    const c = scene.add.container(x0 + i * (bw + 4) + bw / 2, shelfY - 4 * ui - bh / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(THEME.ink, 0.15); bg.fillRoundedRect(-bw / 2 + 2, -bh / 2 + 3, bw, bh, 3);
    bg.fillStyle(SPINES[i % SPINES.length], 1); bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 3);
    bg.fillStyle(0xffffff, 0.35); bg.fillRect(-bw / 2 + 3, -bh / 2 + 5, bw - 6, 2); bg.fillRect(-bw / 2 + 3, bh / 2 - 7, bw - 6, 2);
    const t = scene.add.text(0, 0, String(w).toUpperCase(), { fontFamily: FONT, fontSize: Math.round(Math.min(10, bw * 0.34) * ui) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy }).setOrigin(0.5).setAngle(-90);
    c.add([bg, t]);
    return c;
  });
  return { books };
}

/** A green pasture with a wooden fold on the right; `inFold` sheep stand safely inside. Returns { sheep, foldX, laneY }. */
export function sheepFold(scene, r, { inFold = 0, total = 10, ui = 1 } = {}) {
  const g = band(scene, r, 0xdff1ff);
  g.fillStyle(0xffe08a, 1); g.fillCircle(r.x + 34 * ui, r.y + 26 * ui, 14 * ui);
  g.fillStyle(0xffffff, 0.9); cloud(g, r.x + r.w * 0.4, r.y + r.h * 0.24, ui * 0.7);
  const groundY = r.y + r.h * 0.5;
  g.fillStyle(0x7ad36a, 1); g.fillRoundedRect(r.x, groundY, r.w, r.h - (groundY - r.y), 16);
  g.fillStyle(0x5cc45a, 0.6); for (let i = 0; i < 6; i++) g.fillEllipse(r.x + 20 + ((i * 97) % Math.max(20, r.w * 0.55)), groundY + 12 + ((i * 31) % Math.max(10, r.h * 0.4)), 18 * ui, 5 * ui);
  const fw = Math.min(r.w * 0.42, 190 * ui), fx = r.x + r.w - fw - 10, fy = groundY + 2 * ui, fh = r.h - (groundY - r.y) - 8 * ui;
  g.fillStyle(0xa06a3c, 1);
  for (let x = fx; x <= fx + fw; x += fw / 5) g.fillRect(x - 2 * ui, fy, 4 * ui, fh);
  g.fillRect(fx, fy + fh * 0.3, fw, 3 * ui); g.fillRect(fx, fy + fh * 0.7, fw, 3 * ui);
  const laneY = fy + fh * 0.55;
  const sheep = [];
  if (scene.textures.exists('sheep')) {
    for (let i = 0; i < inFold; i++) {
      const sx = fx + 14 * ui + (i % 5) * ((fw - 28 * ui) / 4), sy = laneY - 6 * ui + Math.floor(i / 5) * 12 * ui;
      sheep.push(scene.add.sprite(sx, sy, 'sheep', 0).setDisplaySize(24 * ui, 24 * ui).setFlipX(i % 2 === 0));
    }
  }
  return { sheep, foldX: fx, laneY, startX: r.x + 30 * ui };
}

/** Oil lamps on a shelf at night; the first `lit` of `total` burn. Returns { flames } (one per lit lamp). */
export function lampRow(scene, r, { lit = 0, total = 10, ui = 1 } = {}) {
  const g = band(scene, r, 0x2d2a4a);
  g.fillStyle(0xffffff, 0.8); for (let i = 0; i < 12; i++) g.fillCircle(r.x + 12 + ((i * 83) % Math.max(20, r.w - 24)), r.y + 8 + ((i * 29) % Math.max(10, r.h * 0.45)), 1.2 * ui);
  const shelfY = r.y + r.h - 14 * ui;
  g.fillStyle(0x7a4a2a, 1); g.fillRoundedRect(r.x + 8, shelfY, r.w - 16, 8 * ui, 4);
  const gap = (r.w - 40 * ui) / Math.max(1, total - 1);
  const flames = [];
  for (let i = 0; i < total; i++) {
    const x = r.x + 20 * ui + i * gap, y = shelfY - 6 * ui;
    const on = i < lit;
    if (on) { g.fillStyle(0xffc531, 0.18); g.fillCircle(x, y - 14 * ui, 18 * ui); }
    g.fillStyle(on ? 0xd9a066 : 0x625f7e, 1); g.fillEllipse(x, y, 16 * ui, 8 * ui); g.fillRect(x - 3 * ui, y - 8 * ui, 6 * ui, 6 * ui);
    if (on) {
      const f = scene.add.graphics();
      f.fillStyle(0xff8f3f, 1); f.fillEllipse(0, 0, 8 * ui, 14 * ui);
      f.fillStyle(0xffe08a, 1); f.fillEllipse(0, 2 * ui, 4 * ui, 8 * ui);
      f.setPosition(x, y - 16 * ui);
      flames.push(f);
      scene.tweens.add({ targets: f, scaleX: 0.85, scaleY: 1.12, duration: 260 + (i % 3) * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }
  return { flames, xFor: (i) => r.x + 20 * ui + i * gap, shelfY };
}

const SAFARI = ['🦒', '🦓', '🐘', '🦁', '🦏', '🐆', '🦛', '🐒', '🦩', '🐊', '🦜', '🐢', '🦘', '🐃', '🦚'];
const BIBLE = ['🐑', '🕊️', '📜', '⭐', '🌿', '🐟', '🏺', '🌈', '🪔', '👑', '🎺', '🐪', '🌾', '🛶', '🏔️'];

/** A savanna (or holy land) trail; every matched pair adds a creature walking along it. Returns { stamps }. */
export function trail(scene, r, { count = 0, theme = 'safari', ui = 1 } = {}) {
  const bible = theme === 'bible';
  const g = band(scene, r, bible ? 0xeee6ff : 0xffe6c7);
  g.fillStyle(bible ? 0xffc531 : 0xff8f3f, 1); g.fillCircle(r.x + r.w - 40 * ui, r.y + 22 * ui, 14 * ui);
  const groundY = r.y + r.h * 0.55;
  g.fillStyle(bible ? 0xc9b98a : 0xe9c46a, 1); g.fillRoundedRect(r.x, groundY, r.w, r.h - (groundY - r.y), 16);
  g.fillStyle(bible ? 0x9c8f8a : 0x8a5a3c, 1);
  for (let i = 0; i < 3; i++) { const tx = r.x + 30 + i * (r.w / 3.2); g.fillRect(tx, groundY - 18 * ui, 3 * ui, 20 * ui); g.fillStyle(bible ? 0x7ad36a : 0x3f9a45, 1); g.fillEllipse(tx + 1.5 * ui, groundY - 20 * ui, 30 * ui, 10 * ui); g.fillStyle(bible ? 0x9c8f8a : 0x8a5a3c, 1); }
  const icons = bible ? BIBLE : SAFARI;
  const step = Math.min(30 * ui, (r.w - 40 * ui) / 15);
  const stamps = [];
  for (let i = 0; i < count; i++) stamps.push(scene.add.text(r.x + 22 * ui + i * step, groundY + 4 * ui, icons[i % icons.length], { fontSize: Math.round(18 * ui) + 'px' }).setOrigin(0.5));
  return { stamps, hex: hex(THEME.ink) };
}
