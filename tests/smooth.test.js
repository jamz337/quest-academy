import { describe, it, expect } from 'vitest';
import { scale2x, smoothPixels } from '../src/ui/Smooth.js';

const img = (rows, map) => ({ width: rows[0].length, height: rows.length, data: new Uint8ClampedArray(rows.join('').split('').flatMap((ch) => map[ch])) });
const A = [255, 0, 0, 255], B = [0, 0, 255, 255];
const at = (im, x, y) => Array.from(im.data.slice((y * im.width + x) * 4, (y * im.width + x) * 4 + 4));

describe('pixel-art smoothing', () => {
  it('doubles the size and keeps flat areas unchanged', () => {
    const out = scale2x(img(['aa', 'aa'], { a: A }));
    expect(out.width).toBe(4); expect(out.height).toBe(4);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) expect(at(out, x, y)).toEqual(A);
  });

  it('rounds a staircase diagonal: the corner between two matching neighbours takes their colour', () => {
    // b on the diagonal of an a field: the pixel at (1,0) has b to its left and b below... check a known corner.
    const out = scale2x(img(['ab', 'ba'], { a: A, b: B }));
    // Top-left pixel (a) has b to the right and b below: its bottom-right quarter becomes b.
    expect(at(out, 0, 0)).toEqual(A);
    expect(at(out, 1, 1)).toEqual(B);
    // No new colours are invented.
    for (let i = 0; i < out.data.length; i += 4) expect([A.join(), B.join()]).toContain(Array.from(out.data.slice(i, i + 4)).join());
  });

  it('runs twice for 4x', () => {
    const out = smoothPixels(img(['ab', 'ba'], { a: A, b: B }), 2);
    expect(out.width).toBe(8); expect(out.height).toBe(8);
  });
});
