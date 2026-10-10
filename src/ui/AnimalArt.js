// Animal faces for the Pre-K ark. Most come from Kenney's Animal Pack (public/sprites/animals, CC0); the lion is not
// in that pack, so it is drawn here in the same round, outlined, flat style. Pure canvas, no Phaser.
import { ARK_ANIMALS } from '../data/early/animals.js';

export const ANIMAL_BASE = 'sprites/animals/';
/** Texture key of an animal's face. */
export const animalKey = (key) => `animal-${key}`;
/** The animals whose faces are picture files (every ark animal but the lion). */
export const ANIMAL_FILES = ARK_ANIMALS.map((a) => a.key).filter((k) => k !== 'lion');
export const ANIMAL_CELL = 192;

const INK = '#2b2b2b', LW = 7;

/** A lion's face, Kenney-style: mane, round head, ears, muzzle, big eyes, a small smile. Fills `size` x `size`. */
export function drawLion(ctx, size = ANIMAL_CELL) {
  const s = size / 200;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const outlined = (fill, path) => { ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(path); ctx.fillStyle = fill; ctx.fill(path); };
  const circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; };
  // Mane: a ring of soft bumps.
  const mane = new Path2D();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 86, bx = 100 + Math.cos(a) * r, by = 104 + Math.sin(a) * r;
    mane.moveTo(bx + 24, by); mane.arc(bx, by, 24, 0, Math.PI * 2);
  }
  mane.moveTo(190, 104); mane.arc(100, 104, 90, 0, Math.PI * 2);
  outlined('#c0661f', mane);
  ctx.fillStyle = '#c0661f'; ctx.fill(circle(100, 104, 86));   // cover the inner outlines of the bumps
  // Ears, then the head over them.
  outlined('#f0a04b', circle(48, 54, 20)); outlined('#f0a04b', circle(152, 54, 20));
  ctx.fillStyle = '#d97b2e'; ctx.fill(circle(48, 54, 10)); ctx.fill(circle(152, 54, 10));
  outlined('#f0a04b', circle(100, 108, 64));
  // Muzzle, nose and smile.
  const muzzle = new Path2D(); muzzle.ellipse(100, 132, 34, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd9a8'; ctx.fill(muzzle);
  const nose = new Path2D(); nose.moveTo(86, 116); nose.lineTo(114, 116); nose.lineTo(100, 132); nose.closePath();
  ctx.fillStyle = INK; ctx.fill(nose);
  ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(100, 132); ctx.lineTo(100, 142); ctx.stroke();
  ctx.beginPath(); ctx.arc(88, 142, 12, 0, Math.PI * 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(112, 142, 12, Math.PI * 0.1, Math.PI); ctx.stroke();
  // Eyes.
  for (const ex of [74, 126]) {
    ctx.fillStyle = '#ffffff'; ctx.fill(circle(ex, 96, 14));
    ctx.fillStyle = INK; ctx.fill(circle(ex + 2, 98, 7));
    ctx.fillStyle = '#ffffff'; ctx.fill(circle(ex + 5, 94, 2.5));
  }
  // Whisker dots.
  ctx.fillStyle = INK;
  for (const [wx, wy] of [[78, 136], [72, 128], [122, 136], [128, 128]]) ctx.fill(circle(wx, wy, 2.4));
  ctx.restore();
}

/** Create the lion's texture (the other faces are loaded from files at boot). */
export function lionTexture(scene) {
  const key = animalKey('lion');
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, ANIMAL_CELL, ANIMAL_CELL);
  drawLion(tex.getContext(), ANIMAL_CELL);
  tex.refresh();
  return key;
}
