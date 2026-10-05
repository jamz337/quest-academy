// Pixel-art smoothing for the character sprites (the "Scale2x" / EPX rule): each pixel becomes four, and a corner
// takes its neighbours' colour where two neighbours agree, which turns staircase diagonals into finer, rounder
// edges without inventing new colours. Run twice for 4x. Pure (plain arrays in and out), so it is unit-tested.

/**
 * Double an RGBA image. `src` is { data: Uint8ClampedArray | number[], width, height }; returns the same shape at
 * twice the size. Frames in a sprite sheet are separated by transparent pixels, so a whole sheet can go in at once.
 */
export function scale2x(src) {
  const w = src.width, h = src.height;
  const inp = new Uint32Array(new Uint8ClampedArray(src.data).buffer);
  const out = new Uint32Array(w * 2 * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = inp[y * w + x];
      const a = y > 0 ? inp[(y - 1) * w + x] : p;          // above
      const b = x < w - 1 ? inp[y * w + x + 1] : p;        // right
      const c = x > 0 ? inp[y * w + x - 1] : p;            // left
      const d = y < h - 1 ? inp[(y + 1) * w + x] : p;      // below
      const o = y * 2 * w * 2 + x * 2;
      out[o] = c === a && c !== d && a !== b ? a : p;
      out[o + 1] = a === b && a !== c && b !== d ? b : p;
      out[o + w * 2] = d === c && d !== b && c !== a ? c : p;
      out[o + w * 2 + 1] = b === d && b !== a && d !== c ? d : p;
    }
  }
  return { data: new Uint8ClampedArray(out.buffer), width: w * 2, height: h * 2 };
}

/** Apply scale2x `times` times (1 = 2x, 2 = 4x). */
export function smoothPixels(src, times = 2) {
  let img = src;
  for (let i = 0; i < times; i++) img = scale2x(img);
  return img;
}
