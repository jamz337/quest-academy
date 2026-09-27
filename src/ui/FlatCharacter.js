// Mango the green monkey, drawn as pixel art straight onto a 64 px grid: the cell size of the Liberated Pixel
// Cup people, so he shares their pixel density, colour ramps and dark outline. Every part is filled on whole
// pixels (no anti-aliasing), gets a light rim towards the top-left and a dark rim towards the bottom-right, the
// coat is flecked for fur, and the finished silhouette is outlined, the way the LPC sheets are shaded. A friendly
// mascot: big pink-lined ears, a wide cream face with large eyes, a cream belly, a little gold headband, one hand
// up in a wave and a curly tail. Shown at 32 px in the world like the people.
export const PIXEL_FRAME = 64;
export const WORLD_SCALE = 32 / PIXEL_FRAME;

/** Palette letters used by the frames (LPC-style ramps: light, mid and dark for the coat). */
export const MONKEY_PALETTE = {
  l: '#aec46c', m: '#7f9a48', d: '#587031',   // coat
  c: '#f8e7c8', s: '#dcc29b',                 // face, belly, hands and feet
  h: '#4a3220', t: '#6a4a2c',                 // nose and toes
  p: '#f3a9bb', q: '#d9879a',                 // ear insides
  g: '#f2c14e', G: '#b8862b', y: '#f05a4a',   // headband and its gem
  e: '#2a2024', w: '#ffffff', r: '#c2606f', o: '#2b3320'
};
/** Frame numbers in the 'monkey' texture: waving, a hop mid-wave, both arms up, and a side view facing left. */
export const MONKEY_FRAMES = { stand: 0, hop: 1, cheer: 2, side: 3 };
/** The stand frame's head, a 40 px square, for portraits. */
export const MONKEY_FACE = { x: 12, y: 5, size: 40 };

const W = PIXEL_FRAME, H = PIXEL_FRAME;
const grid = () => Array.from({ length: H }, () => Array(W).fill('.'));
const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const ell = (cx, cy, rx, ry) => (x, y) => inEllipse(x + 0.5, y + 0.5, cx, cy, rx, ry);
const put = (g, x, y, ch) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };

/** A capsule of radius r along a polyline. */
function stroke(pts, r) {
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
      const qx = ax + t * dx, qy = ay + t * dy;
      if ((px - qx) ** 2 + (py - qy) ** 2 <= r * r) return true;
    }
    return false;
  };
}

/** Fill one part: `fill` inside, `light` along its top-left rim, `dark` along its bottom-right rim, `edge` all round. */
function part(g, test, { fill, light, dark, rim = true, edge = null }) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && test(x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    let ch = fill;
    if (rim) {
      const tl = !inside(x - 1, y) || !inside(x, y - 1) || !inside(x - 1, y - 1);
      const br = !inside(x + 1, y) || !inside(x, y + 1) || !inside(x + 1, y + 1);
      if (br && dark) ch = dark; else if (tl && light) ch = light;
    }
    if (edge && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) ch = edge;
    g[y][x] = ch;
  }
}

/** Fur: a fixed sprinkle of lighter and darker flecks over the mid coat colour. */
function fur(g) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== 'm') continue;
    const n = (x * 7 + y * 13 + ((x * y) & 5)) % 11;
    if (n === 0) g[y][x] = 'l'; else if (n === 6 && y > 30) g[y][x] = 'd';
  }
}

/** Every filled pixel touching an empty one becomes the outline colour. */
function outline(g) {
  const filled = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x] !== '.';
  const out = g.map((r) => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (filled(x, y) && (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1))) out[y][x] = 'o';
  }
  return out.map((r) => r.join(''));
}

const COAT = { fill: 'm', light: 'l', dark: 'd' };
const ARM = { ...COAT, edge: 'd' };           // arms keep a rim so they read against the body
const SKIN = { fill: 'c', light: 'c', dark: 's' };
const PINK = { fill: 'p', light: 'p', dark: 'q' };
const GOLD = { fill: 'g', light: 'g', dark: 'G' };

/** The gold headband with three points and a gem, along the top of a head centred at (cx, hy) with radius rx. */
function headband(g, cx, hy, rx, side = false) {
  const top = hy - 9;
  part(g, stroke([[cx - rx + 2, top + 4], [cx - rx / 2, top + 1], [cx, top], [cx + rx / 2, top + 1], [cx + rx - 2, top + 4]], 1.3), GOLD);
  for (const dx of side ? [-3, 1] : [-5, 0, 5]) { put(g, cx + dx, top - 2, 'g'); put(g, cx + dx, top - 1, 'g'); }
  put(g, cx + (side ? -3 : 0), top - 1, 'y'); put(g, cx + (side ? -3 : 0), top, 'y');
}

/**
 * One front-facing pose. `lift` raises him off the ground (a hop), `cheer` puts both hands up, otherwise the
 * right hand waves beside the head (`hand` nudges it for the hop).
 */
function pose({ lift = 0, cheer = false, hand = 0 } = {}) {
  const g = grid();
  const by = 44 - lift, hy = 24 - lift;   // body and head centres
  // tail: out from the right hip, curling up behind the shoulder, with a tuft
  part(g, stroke([[40, by + 8], [49, by + 6], [53, by - 2], [50, by - 10], [45, by - 11]], 1.7), COAT);
  part(g, ell(44, by - 11.5, 2.6, 2.2), { fill: 'l', light: 'l', dark: 'm' });
  // legs and feet
  const legs = lift ? 3 : 5;
  part(g, stroke([[27, by + 8], [26, by + 8 + legs]], 2.3), COAT); part(g, stroke([[37, by + 8], [38, by + 8 + legs]], 2.3), COAT);
  part(g, ell(25.5, by + 10.5 + legs, 4.2, 2), SKIN); part(g, ell(38.5, by + 10.5 + legs, 4.2, 2), SKIN);
  put(g, 24, by + 11 + legs, 't'); put(g, 26, by + 11 + legs, 't'); put(g, 38, by + 11 + legs, 't'); put(g, 40, by + 11 + legs, 't');
  // body and belly
  part(g, ell(32, by, 10, 11), COAT);
  part(g, ell(32, by + 2, 6.2, 7.4), SKIN);
  // the left arm hangs beside the body (the raised arms come after the head so the hands show)
  if (!cheer) { part(g, stroke([[23, by - 3], [20, by + 8]], 2), ARM); part(g, ell(19.5, by + 10, 2.8, 2.6), SKIN); }
  // ears, head and the cream face mask
  part(g, ell(17.5, hy + 1, 5.6, 5.8), COAT); part(g, ell(46.5, hy + 1, 5.6, 5.8), COAT);
  part(g, ell(17.5, hy + 1.5, 3.4, 3.8), PINK); part(g, ell(46.5, hy + 1.5, 3.4, 3.8), PINK);
  part(g, ell(32, hy, 13.5, 12.5), COAT);
  fur(g);
  part(g, ell(32, hy + 3.5, 10.6, 8.8), SKIN);
  part(g, ell(26.5, hy - 2.5, 5, 4.2), SKIN); part(g, ell(37.5, hy - 2.5, 5, 4.2), SKIN);   // brow bumps of the mask
  headband(g, 32, hy, 13.5);
  // big eyes with highlights
  for (const ex of [27.5, 36.5]) {
    part(g, ell(ex, hy + 1, 2.6, 3.1), { fill: 'e', rim: false });
    put(g, Math.floor(ex) - 1, hy - 1, 'w'); put(g, Math.floor(ex) - 1, hy, 'w'); put(g, Math.floor(ex) + 1, hy + 2, 'w');
  }
  // nose, smile and cheeks
  put(g, 30, hy + 6, 'h'); put(g, 33, hy + 6, 'h');
  for (const x of [29, 34]) put(g, x, hy + 7, 'r');
  for (const x of [30, 31, 32, 33]) put(g, x, hy + 8, 'r');
  put(g, 23, hy + 6, 'p'); put(g, 24, hy + 6, 'p'); put(g, 40, hy + 6, 'p'); put(g, 41, hy + 6, 'p');
  // raised arms: the right hand waves out beside the ear (both up for a cheer)
  const arm = (sx, dy) => { part(g, stroke([[32 + sx * 8, by - 4], [32 + sx * 16, by - 11 + dy]], 2), ARM); part(g, ell(32 + sx * 18, by - 13 + dy, 3, 3), SKIN); put(g, 32 + sx * 17, by - 16 + dy, 'c'); put(g, 32 + sx * 19, by - 16 + dy, 'c'); };
  arm(1, hand); if (cheer) arm(-1, 0);
  return outline(g);
}

/** Side view facing left, arms down, tail curling up behind: how he stands beside the player in a duel. */
function side() {
  const g = grid();
  const by = 44, hy = 24;
  part(g, stroke([[38, by + 7], [46, by + 5], [51, by - 3], [49, by - 11], [43, by - 12]], 1.7), COAT);   // tail
  part(g, ell(42, by - 12.5, 2.6, 2.2), { fill: 'l', light: 'l', dark: 'm' });
  part(g, stroke([[36, by - 2], [39, by + 7]], 1.9), { fill: 'd', light: 'm', dark: 'd' }); part(g, ell(39.5, by + 9, 2.6, 2.4), SKIN);   // far arm
  part(g, stroke([[29, by + 8], [28, by + 13]], 2.3), COAT); part(g, stroke([[35, by + 8], [36, by + 13]], 2.3), COAT);   // legs
  part(g, ell(27, by + 15.5, 4.4, 2), SKIN); part(g, ell(35.5, by + 15.5, 4.4, 2), SKIN);
  put(g, 24, by + 16, 't'); put(g, 26, by + 16, 't'); put(g, 33, by + 16, 't');
  part(g, ell(32, by, 9, 11), COAT);
  part(g, ell(28, by + 2, 5, 7), SKIN);   // belly
  part(g, stroke([[27, by - 3], [24, by + 7]], 1.9), ARM); part(g, ell(23.5, by + 9, 2.7, 2.5), SKIN);   // near arm
  part(g, ell(41.5, hy - 1, 5.2, 5.6), COAT); part(g, ell(42, hy - 0.5, 3, 3.5), PINK);   // ear at the back of the head
  part(g, ell(31, hy, 12.5, 12), COAT);
  fur(g);
  part(g, ell(24.5, hy + 3, 9.2, 8.8), SKIN);   // face
  part(g, ell(23, hy - 3, 5.5, 4.2), SKIN);      // brow
  headband(g, 31, hy, 12.5, true);
  part(g, ell(25.5, hy + 0.5, 2.8, 3.3), { fill: 'e', rim: false });
  put(g, 24, hy - 2, 'w'); put(g, 24, hy - 1, 'w'); put(g, 26, hy + 2, 'w');
  part(g, ell(19.5, hy + 6, 4.2, 3.2), SKIN);   // muzzle
  put(g, 17, hy + 5, 'h'); for (const x of [18, 19, 20, 21]) put(g, x, hy + 8, 'r'); put(g, 17, hy + 7, 'r');
  put(g, 29, hy + 7, 'p'); put(g, 30, hy + 7, 'p');
  return outline(g);
}

let cached = null;
/** The frames (stand, hop, cheer, side) as rows of palette letters, 64 x 64 each, '.' for empty. */
export function monkeyFrames() {
  if (!cached) cached = [pose(), pose({ lift: 4, hand: 3 }), pose({ cheer: true }), side()];
  return cached;
}

/** The stand frame cropped to Mango's face (rows of palette letters). */
export function monkeyFace() {
  const { x, y, size } = MONKEY_FACE;
  return monkeyFrames()[MONKEY_FRAMES.stand].slice(y, y + size).map((r) => r.slice(x, x + size));
}
