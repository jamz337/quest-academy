// Cut Mango out of the reference images (served by the dev server from public/Mango), bring him back to his
// native pixel grid and save 64x64 sprite cells plus an 80x80 badge. Runs the image work inside Chrome.
const puppeteer = require('puppeteer-core');
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2] || 'D:/quest-academy/public/mango';
fs.mkdirSync(OUT, { recursive: true });
// The reference pictures live in art/mango-reference (not served), so they go in as data URLs.
const REF = 'D:/quest-academy/art/mango-reference/';
const dataUrl = (f, mime) => `data:${mime};base64,` + fs.readFileSync(REF + f).toString('base64');
const FRONT = dataUrl('Screenshot 2026-09-27 145457.png', 'image/png');
const SIDE = dataUrl('Gemini_Generated_Image_f7mxvnf7mxvnf7mx.jpg', 'image/jpeg');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('page:', m.text()));
  await page.goto('http://localhost:5173/icon.svg', { waitUntil: 'load' });
  const result = await page.evaluate(async ({ FRONT, SIDE, CELL, BADGE, args }) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const draw = (img, crop) => { const c = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'); c.width = crop.w; c.height = crop.h; const x = c.getContext('2d'); x.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h); return x.getImageData(0, 0, crop.w, crop.h); };
    const isGrass = (r, g, b) => g > r + 35 && g > b + 35 && g > 110;
    const isSky = (r, g, b) => b > r + 25 && b >= g - 5 && b > 170;
    const isSand = (r, g, b) => r > 190 && g > 160 && b > 100 && r > b + 40 && Math.abs(r - g) < 60;
    const isWhite = (r, g, b) => r > 205 && g > 215 && b > 215;
    const isBg = (r, g, b) => isGrass(r, g, b) || isSky(r, g, b) || isSand(r, g, b) || isWhite(r, g, b);

    function mask(id) {
      const { width: W, height: H, data } = id, m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) m[i] = data[i * 4 + 3] > 100 && !isBg(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) ? 1 : 0;
      return m;
    }
    /** Keep only the largest 4-connected component. */
    function largest(m, W, H) {
      const label = new Int32Array(W * H).fill(-1); const sizes = []; const stack = [];
      for (let s = 0; s < W * H; s++) {
        if (!m[s] || label[s] >= 0) continue;
        const id = sizes.length; sizes.push(0); stack.push(s); label[s] = id;
        while (stack.length) { const p = stack.pop(); sizes[id]++; const x = p % W, y = (p / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx; if (m[q] && label[q] < 0) { label[q] = id; stack.push(q); } } }
      }
      let best = 0; sizes.forEach((s, i) => { if (s > sizes[best]) best = i; });
      const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = label[i] === best ? 1 : 0;
      return out;
    }
    /** Fill enclosed holes (background pockets fully inside the sprite, e.g. between tail and body stay open only if they touch the border). */
    function fillHoles(m, W, H, maxHole = 400) {
      const outside = new Uint8Array(W * H); const stack = [];
      for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!m[y * W + x]) { outside[y * W + x] = 1; stack.push(y * W + x); }
      for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!m[y * W + x]) { outside[y * W + x] = 1; stack.push(y * W + x); }
      while (stack.length) { const p = stack.pop(); const x = p % W, y = (p / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx; if (!m[q] && !outside[q]) { outside[q] = 1; stack.push(q); } } }
      // holes = not masked and not reachable from outside; fill only the small ones
      const hole = new Int32Array(W * H).fill(-1); const hs = []; const st = [];
      for (let s0 = 0; s0 < W * H; s0++) { if (m[s0] || outside[s0] || hole[s0] >= 0) continue; const id = hs.length; hs.push(0); st.push(s0); hole[s0] = id;
        while (st.length) { const p = st.pop(); hs[id]++; const x = p % W, y = (p / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx; if (!m[q] && !outside[q] && hole[q] < 0) { hole[q] = id; st.push(q); } } } }
      const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = m[i] || (hole[i] >= 0 && hs[hole[i]] <= maxHole) ? 1 : 0;
      return out;
    }
    function bbox(m, W, H) { let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; }
    /** Estimate the source's pixel size from the period of colour edges inside the box. */
    function pixelSize(id, m, bb) {
      const { width: W, data } = id;
      const d = new Float64Array(bb.w);
      for (let y = bb.y0; y <= bb.y1; y++) for (let x = bb.x0; x < bb.x1; x++) { const i = (y * W + x) * 4, j = i + 4; if (!m[y * W + x] || !m[y * W + x + 1]) continue; d[x - bb.x0] += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]); }
      const mean = d.reduce((a, b) => a + b, 0) / d.length || 1;
      let best = { p: 4, score: -1 };
      for (let p = 3; p <= 16; p += 0.05) for (let ph = 0; ph < p; ph += 0.5) {
        let s = 0, n = 0; for (let x = ph; x < bb.w - 1; x += p) { const xi = Math.round(x); s += Math.max(d[xi], d[Math.min(bb.w - 1, xi + 1)]); n++; }
        const score = s / n / mean; if (score > best.score) best = { p, score };
      }
      return best.p;
    }
    /** Box-downsample the masked crop by factor `ps` to a native sprite: { w, h, rgba }. */
    function downsample(id, m, bb, ps, phaseX = 0, phaseY = 0) {
      const { width: W, data } = id;
      const nw = Math.ceil(bb.w / ps), nh = Math.ceil(bb.h / ps), out = new Uint8ClampedArray(nw * nh * 4);
      for (let ny = 0; ny < nh; ny++) for (let nx = 0; nx < nw; nx++) {
        let r = 0, g = 0, b = 0, n = 0, tot = 0;
        const xa = bb.x0 + phaseX + nx * ps, ya = bb.y0 + phaseY + ny * ps;
        for (let y = Math.floor(ya); y < ya + ps && y <= bb.y1; y++) for (let x = Math.floor(xa); x < xa + ps && x <= bb.x1; x++) { tot++; if (!m[y * W + x]) continue; const i = (y * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
        const o = (ny * nw + nx) * 4;
        if (tot && n / tot >= 0.5) { out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255; }
      }
      return { w: nw, h: nh, rgba: out };
    }
    /** Within-box colour variance for a sampling grid: lower means the boxes sit on the source's pixels. */
    function gridScore(id, m, bb, ps, phX, phY) {
      const { width: W, data } = id; let tot = 0, cnt = 0;
      for (let ya = bb.y0 + phY; ya < bb.y1; ya += ps) for (let xa = bb.x0 + phX; xa < bb.x1; xa += ps) {
        let r = 0, g = 0, b = 0, n = 0, rr = 0, gg = 0, bb2 = 0;
        for (let y = Math.floor(ya); y < ya + ps && y <= bb.y1; y++) for (let x = Math.floor(xa); x < xa + ps && x <= bb.x1; x++) { if (!m[y * W + x]) continue; const i = (y * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; rr += data[i] ** 2; gg += data[i + 1] ** 2; bb2 += data[i + 2] ** 2; n++; }
        if (n < 2) continue; tot += (rr - r * r / n) + (gg - g * g / n) + (bb2 - b * b / n); cnt += n;
      }
      return cnt ? tot / cnt : Infinity;
    }
    function alignGrid(id, m, bb, lo, hi) {
      let best = { ps: lo, phX: 0, phY: 0, score: Infinity };
      for (let ps = lo; ps <= hi + 1e-9; ps += 0.1) { const sc = gridScore(id, m, bb, ps, 0, 0); if (sc < best.score) best = { ps, phX: 0, phY: 0, score: sc }; }
      const ps = best.ps;
      for (let phX = 0; phX < ps; phX += 1) for (let phY = 0; phY < ps; phY += 1) { const sc = gridScore(id, m, bb, ps, phX, phY); if (sc < best.score) best = { ps, phX, phY, score: sc }; }
      return best;
    }
    /** Stretch contrast to the palette's range, boost saturation a little, and darken the rim with its darkest colour. */
    function matchPalette(sp, palette, { sat = 1.2 } = {}) {
      const px = []; for (let i = 0; i < sp.w * sp.h; i++) if (sp.rgba[i * 4 + 3]) px.push(i);
      const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
      // a gentle contrast lift around the sprite's own mid tone, plus a little more colour
      const mid = px.reduce((t, i) => t + lum(sp.rgba[i * 4], sp.rgba[i * 4 + 1], sp.rgba[i * 4 + 2]), 0) / Math.max(1, px.length);
      const contrast = 1.18;
      for (const i of px) {
        const o = i * 4; let r = sp.rgba[o], g = sp.rgba[o + 1], b = sp.rgba[o + 2];
        const l0 = lum(r, g, b), l1 = Math.max(0, Math.min(255, mid + (l0 - mid) * contrast)), k = l0 > 0 ? l1 / l0 : 1;
        r *= k; g *= k; b *= k;
        const l2 = lum(r, g, b); r = l2 + (r - l2) * sat; g = l2 + (g - l2) * sat; b = l2 + (b - l2) * sat;
        sp.rgba[o] = r; sp.rgba[o + 1] = g; sp.rgba[o + 2] = b;
      }
      const darkest = palette.reduce((a, c) => (lum(...c) < lum(...a) ? c : a));
      const solid = (x, y) => x >= 0 && y >= 0 && x < sp.w && y < sp.h && sp.rgba[(y * sp.w + x) * 4 + 3] > 0;
      for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { if (!solid(x, y)) continue; if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) { const o = (y * sp.w + x) * 4; sp.rgba[o] = darkest[0]; sp.rgba[o + 1] = darkest[1]; sp.rgba[o + 2] = darkest[2]; } }
    }
    /** Snap colours to k clusters (k-means seeded with the most distinct frequent colours). */
    function quantize(sp, k) {
      const px = []; for (let i = 0; i < sp.w * sp.h; i++) if (sp.rgba[i * 4 + 3]) px.push([sp.rgba[i * 4], sp.rgba[i * 4 + 1], sp.rgba[i * 4 + 2]]);
      const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      const centers = [px[0].slice()];
      while (centers.length < k) { let far = null, fd = -1; for (const p of px) { const d = Math.min(...centers.map((c) => dist(c, p))); if (d > fd) { fd = d; far = p; } } if (fd < 60) break; centers.push(far.slice()); }
      for (let it = 0; it < 12; it++) {
        const sum = centers.map(() => [0, 0, 0, 0]);
        for (const p of px) { let bi = 0, bd = Infinity; centers.forEach((c, i) => { const d = dist(c, p); if (d < bd) { bd = d; bi = i; } }); const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
        sum.forEach((s, i) => { if (s[3]) centers[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
      }
      for (let i = 0; i < sp.w * sp.h; i++) { if (!sp.rgba[i * 4 + 3]) continue; const p = [sp.rgba[i * 4], sp.rgba[i * 4 + 1], sp.rgba[i * 4 + 2]]; let bi = 0, bd = Infinity; centers.forEach((c, j) => { const d = dist(c, p); if (d < bd) { bd = d; bi = j; } }); sp.rgba[i * 4] = centers[bi][0]; sp.rgba[i * 4 + 1] = centers[bi][1]; sp.rgba[i * 4 + 2] = centers[bi][2]; }
      return centers.map((c) => c.map(Math.round));
    }
    function toCanvas(sp, cw, ch, ox, oy) {
      const c = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
      const id = x.createImageData(sp.w, sp.h); id.data.set(sp.rgba); x.putImageData(id, ox, oy); return c;
    }
    async function cut(src, crop, { targetH, k = 18, ps: forcePs, align = null, palette = null } = {}) {
      const img = await load(src);
      const id = draw(img, crop);
      let m = mask(id); m = largest(m, id.width, id.height); m = fillHoles(m, id.width, id.height);
      const bb = bbox(m, id.width, id.height);
      const est = pixelSize(id, m, bb);
      let ps = forcePs || (targetH ? bb.h / targetH : est), phX = 0, phY = 0;
      if (align) { const a = alignGrid(id, m, bb, align[0], align[1]); ps = a.ps; phX = a.phX; phY = a.phY; console.log(`${src.slice(0, 20)}: aligned grid ${ps.toFixed(2)} phase ${phX},${phY}`); }
      console.log(`${src.slice(0, 20)}: box ${bb.w}x${bb.h}, pixel size est ${est.toFixed(2)}, using ${ps.toFixed(2)} -> ${Math.ceil(bb.w / ps)}x${Math.ceil(bb.h / ps)}`);
      const sp = downsample(id, m, bb, ps, phX, phY);
      if (palette) matchPalette(sp, palette);
      const colours = quantize(sp, k);
      console.log(`${src.slice(0, 20)}: ${colours.length} colours`);
      sp.palette = colours;
      return sp;
    }
    const out = {};
    // Front view: the monkey on the grass in the screenshot.
    const front = await cut(FRONT, { x: 262, y: 120, w: 260, h: 350 }, args.front);
    out.front = toCanvas(front, CELL, CELL, Math.round((CELL - front.w) / 2), CELL - 2 - front.h).toDataURL();
    out.frontSize = [front.w, front.h];
    // Side view with the crown: the duel mock, left of the player.
    const side = await cut(SIDE, { x: 330, y: 370, w: args.sideW || 486, h: 650 }, { ...args.side, palette: front.palette });
    out.side = toCanvas(side, CELL, CELL, Math.round((CELL - side.w) / 2), CELL - 2 - side.h).toDataURL();
    out.sideSize = [side.w, side.h];
    // Badge: a green disc with the side view's head at 2x.
    const b = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'); b.width = BADGE; b.height = BADGE; const bx = b.getContext('2d');
    bx.fillStyle = '#9cc46f'; bx.beginPath(); bx.arc(BADGE / 2, BADGE / 2, BADGE / 2, 0, Math.PI * 2); bx.fill();
    bx.save(); bx.beginPath(); bx.arc(BADGE / 2, BADGE / 2, BADGE / 2 - 3, 0, Math.PI * 2); bx.clip();
    bx.fillStyle = '#bfe38f'; bx.fillRect(0, 0, BADGE, BADGE);
    bx.imageSmoothingEnabled = false;
    const bb2 = args.badge || { x0: 0.3, y0: 0, x1: 1, y1: 0.5 };
    const sx = Math.round(side.w * bb2.x0), sy = Math.round(side.h * bb2.y0), sw = Math.round(side.w * (bb2.x1 - bb2.x0)), sh = Math.round(side.h * (bb2.y1 - bb2.y0));
    const sc = Math.floor((BADGE * 0.9) / Math.max(sw, sh));
    const sideC = toCanvas(side, side.w, side.h, 0, 0);
    bx.drawImage(sideC, sx, sy, sw, sh, Math.round(BADGE / 2 - sw * sc / 2), Math.round(BADGE / 2 - sh * sc / 2) + 4, sw * sc, sh * sc);
    bx.restore();
    out.badge = b.toDataURL();
    const pv = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'); pv.width = 64 * 6 * 2 + 80 * 3 + 40; pv.height = 64 * 6; const px = pv.getContext('2d');
    px.fillStyle = '#c8dcaa'; px.fillRect(0, 0, pv.width, pv.height); px.imageSmoothingEnabled = false;
    const fc = toCanvas(front, CELL, CELL, Math.round((CELL - front.w) / 2), CELL - 2 - front.h), sc2 = toCanvas(side, CELL, CELL, Math.round((CELL - side.w) / 2), CELL - 2 - side.h);
    px.drawImage(fc, 0, 0, 64 * 6, 64 * 6); px.drawImage(sc2, 64 * 6 + 20, 0, 64 * 6, 64 * 6); px.drawImage(b, 64 * 12 + 40, 0, 240, 240);
    out.preview = pv.toDataURL();
    return out;
  }, { FRONT, SIDE, CELL: 64, BADGE: 80, args: JSON.parse(process.argv[3] || '{}') });
  for (const [name, key] of [['mango-front.png', 'front'], ['mango-side.png', 'side'], ['mango-face.png', 'badge'], ['preview.png', 'preview']]) {
    fs.writeFileSync(path.join(OUT, name), Buffer.from(result[key].split(',')[1], 'base64'));
  }
  console.log('sizes', result.frontSize, result.sideSize, 'written to', OUT);
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
