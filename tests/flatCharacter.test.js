import { describe, it, expect } from 'vitest';
import { PIXEL_FRAME, WORLD_SCALE, MONKEY_PALETTE, MONKEY_FRAMES, MONKEY_FACE, monkeyFrames, monkeyFace } from '../src/ui/FlatCharacter.js';

describe('Mango, pixel art on the LPC grid', () => {
  const frames = monkeyFrames();
  const at = (f, x, y) => frames[f][y][x];
  const where = (f, ch) => { const pts = []; for (let y = 0; y < PIXEL_FRAME; y++) for (let x = 0; x < PIXEL_FRAME; x++) if (at(f, x, y) === ch) pts.push([x, y]); return pts; };

  it('has stand, hop, cheer and side frames, each one LPC cell of palette letters', () => {
    expect(Object.values(MONKEY_FRAMES).sort()).toEqual([0, 1, 2, 3]);
    expect(frames).toHaveLength(4);
    expect(WORLD_SCALE * PIXEL_FRAME).toBe(32);
    for (const f of frames) {
      expect(f).toHaveLength(PIXEL_FRAME);
      for (const row of f) { expect(row).toHaveLength(PIXEL_FRAME); for (const ch of row) expect(ch === '.' || ch in MONKEY_PALETTE, ch).toBe(true); }
    }
    expect(monkeyFrames()).toBe(frames);   // cached
  });

  it('is outlined all round, shaded with the coat ramp and furred, wears the headband, and stands about as tall as a villager', () => {
    for (const f of frames) {
      const filled = (x, y) => x >= 0 && y >= 0 && x < PIXEL_FRAME && y < PIXEL_FRAME && f[y][x] !== '.';
      let top = PIXEL_FRAME, bottom = 0, left = PIXEL_FRAME, right = 0;
      const used = new Set();
      for (let y = 0; y < PIXEL_FRAME; y++) for (let x = 0; x < PIXEL_FRAME; x++) {
        if (!filled(x, y)) continue;
        used.add(f[y][x]);
        top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
        const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
        if (edge) expect(f[y][x]).toBe('o');
      }
      for (const ch of ['o', 'l', 'm', 'd', 'c', 's', 'h', 'e', 'w', 'p', 'r', 'g', 'y']) expect(used.has(ch), ch).toBe(true);
      expect(bottom - top).toBeGreaterThan(44); expect(bottom - top).toBeLessThan(58);   // next to 52 px people
      expect(bottom).toBeLessThanOrEqual(62);
    }
  });

  it('faces the screen with two big eyes, lifts off the ground when hopping, raises both hands to cheer, and looks left side-on', () => {
    const eyesX = (f) => where(f, 'e').map((p) => p[0]);
    for (const f of [MONKEY_FRAMES.stand, MONKEY_FRAMES.hop, MONKEY_FRAMES.cheer]) {
      expect(Math.min(...eyesX(f))).toBeLessThan(PIXEL_FRAME / 2 - 3); expect(Math.max(...eyesX(f))).toBeGreaterThan(PIXEL_FRAME / 2 + 3);
      expect(where(f, 'e').length).toBeGreaterThan(30);   // large eyes, not dots
    }
    const lowest = (f) => Math.max(...where(f, 'o').map((p) => p[1]));
    expect(lowest(MONKEY_FRAMES.hop)).toBeLessThan(lowest(MONKEY_FRAMES.stand));
    const hands = (f) => where(f, 'c').filter(([, y]) => y < 36);   // cream above the belly = raised hands and the face
    const leftUp = (f) => hands(f).some(([x]) => x < 18), rightUp = (f) => hands(f).some(([x]) => x > 46);
    expect(rightUp(MONKEY_FRAMES.stand)).toBe(true); expect(leftUp(MONKEY_FRAMES.stand)).toBe(false);
    expect(rightUp(MONKEY_FRAMES.cheer)).toBe(true); expect(leftUp(MONKEY_FRAMES.cheer)).toBe(true);
    expect(Math.max(...eyesX(MONKEY_FRAMES.side))).toBeLessThan(PIXEL_FRAME / 2);   // one eye, on the left
    expect(frames[MONKEY_FRAMES.stand]).not.toEqual(frames[MONKEY_FRAMES.hop]);
  });

  it('crops a square portrait around the face with both eyes, the ears and the headband in it', () => {
    const face = monkeyFace();
    expect(face).toHaveLength(MONKEY_FACE.size);
    for (const r of face) expect(r).toHaveLength(MONKEY_FACE.size);
    const all = face.join('');
    for (const ch of ['e', 'w', 'p', 'g', 'y', 'r']) expect(all.includes(ch), ch).toBe(true);
    const eyeCols = new Set(); face.forEach((r) => [...r].forEach((ch, x) => { if (ch === 'e') eyeCols.add(x); }));
    expect(Math.min(...eyeCols)).toBeLessThan(MONKEY_FACE.size / 2); expect(Math.max(...eyeCols)).toBeGreaterThan(MONKEY_FACE.size / 2);
  });
});
