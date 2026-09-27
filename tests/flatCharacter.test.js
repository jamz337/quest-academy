import { describe, it, expect } from 'vitest';
import { PIXEL_FRAME, WORLD_SCALE, drawMonkey, pixelate, MONKEY_PALETTE, MONKEY_OUTLINE } from '../src/ui/FlatCharacter.js';

function fakeCtx() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls, fillStyle: null, strokeStyle: null, lineWidth: 1, lineCap: 'butt',
    save: rec('save'), restore: rec('restore'), translate: rec('translate'), scale: rec('scale'),
    beginPath: rec('beginPath'), closePath: rec('closePath'), moveTo: rec('moveTo'), lineTo: rec('lineTo'),
    arc: rec('arc'), arcTo: rec('arcTo'), ellipse: rec('ellipse'), quadraticCurveTo: rec('quadraticCurveTo'), roundRect: rec('roundRect'),
    fill: rec('fill'), stroke: rec('stroke'), fillRect: rec('fillRect'), clip: rec('clip')
  };
}

describe('Mango, drawn then pixelated', () => {
  it('snaps a soft drawing to the palette with an outline, and clears faint pixels', () => {
    // A 4x4 image: a 2x2 greenish blob in the middle with soft edges around it.
    const w = 4, h = 4, data = new Uint8ClampedArray(w * h * 4);
    const set = (x, y, r, g, b, a) => { const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, 120, 140, 60, (x >= 1 && x <= 2 && y >= 1 && y <= 2) ? 255 : 90);
    set(2, 2, 240, 220, 190, 255);   // a face-coloured pixel inside
    let put = null;
    const ctx = { getImageData: () => ({ data }), putImageData: (img) => { put = img.data; } };
    pixelate(ctx, w, h);
    expect(put).toBe(data);
    const px = (x, y) => Array.from(data.slice((y * w + x) * 4, (y * w + x) * 4 + 4));
    expect(px(0, 0)[3]).toBe(0);                        // faint edge pixels are cleared
    const out = [parseInt(MONKEY_OUTLINE.slice(1, 3), 16), parseInt(MONKEY_OUTLINE.slice(3, 5), 16), parseInt(MONKEY_OUTLINE.slice(5, 7), 16), 255];
    expect(px(1, 1)).toEqual(out);                      // every solid pixel here touches a cleared one, so it is outline
    expect(px(2, 2)).toEqual(out);
    expect(MONKEY_PALETTE).toContain('#7d8f3c');
  });

  it('draws both frames one tile tall in the world, with the arc fallback for old browsers', () => {
    expect(WORLD_SCALE * PIXEL_FRAME).toBe(32);
    for (const step of [0, 1]) { const m = fakeCtx(); drawMonkey(m, 0, 0, { step }); expect(m.calls.filter((c) => c[0] === 'fill').length).toBeGreaterThan(10); expect(m.calls.filter((c) => c[0] === 'save').length).toBe(m.calls.filter((c) => c[0] === 'restore').length); }
    const old = fakeCtx(); delete old.roundRect; drawMonkey(old, 0, 0, { step: 1 });
    expect(old.calls.some((c) => c[0] === 'arcTo')).toBe(true);
  });
});
