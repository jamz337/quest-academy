// Fog of war for the minimap: which tiles the player has walked near. Stored compactly on the profile as
// one pair of 28-bit integers per map row (profile.world.explored), so a full map is under a kilobyte.
import { W, H } from './map.js';

export const REVEAL_RADIUS = 4;
const HALF = 28;   // bits per integer; two cover a 56-wide row

export const newExplored = () => Array.from({ length: H }, () => [0, 0]);

/** Make sure a profile has an explored grid of the right shape (older saves have none). */
export function ensureExplored(profile) {
  const w = profile.world || (profile.world = {});
  if (!Array.isArray(w.explored) || w.explored.length !== H || w.explored.some((r) => !Array.isArray(r) || r.length !== 2)) w.explored = newExplored();
  return w.explored;
}

export function isExplored(explored, tx, ty) {
  if (!explored || tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
  const row = explored[ty];
  return tx < HALF ? ((row[0] >>> tx) & 1) === 1 : ((row[1] >>> (tx - HALF)) & 1) === 1;
}

/** Reveal a disc of tiles around (tx, ty). Returns true when any tile was newly revealed. */
export function reveal(explored, tx, ty, radius = REVEAL_RADIUS) {
  let changed = false;
  for (let y = Math.max(0, ty - radius); y <= Math.min(H - 1, ty + radius); y++) {
    for (let x = Math.max(0, tx - radius); x <= Math.min(W - 1, tx + radius); x++) {
      const dx = x - tx, dy = y - ty;
      if (dx * dx + dy * dy > radius * radius + radius) continue;
      const i = x < HALF ? 0 : 1, bit = 1 << (x < HALF ? x : x - HALF);
      if ((explored[y][i] & bit) === 0) { explored[y][i] |= bit; changed = true; }
    }
  }
  return changed;
}

/** How many tiles are revealed, and the share of the whole map (0..1). */
export function exploredStats(explored) {
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isExplored(explored, x, y)) n++;
  return { tiles: n, share: n / (W * H) };
}
