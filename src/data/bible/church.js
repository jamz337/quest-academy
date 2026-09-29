// Inside the Village Church (in tiles of TILE px): one nave with a back wall two tiles tall, side walls and the
// front wall with the door. Pews stand in rows either side of a carpeted aisle, the altar is at the back, and five
// stained-glass windows (one per lesson module) are the learning stations: stand below one and press to learn.
// The lectern by the altar holds the big Bible that explains how the church works. Pure data, tested in node.
import { MODULES } from './lessons.js';

export const CHURCH_W = 15, CHURCH_H = 13;
export const EXIT = { tx: 7, ty: 11 };            // the mat inside the door
export const SPAWN = { tx: 7.5, ty: 10.4 };       // just inside, facing the altar
export const ALTAR = { x: 6, y: 2, w: 3, h: 1 };
export const LECTERN = { x: 10, y: 3, w: 1, h: 1, at: { tx: 10, ty: 4 } };
export const PEWS = [5, 7, 9].flatMap((y) => [{ x: 2, y, w: 4, h: 1 }, { x: 9, y, w: 4, h: 1 }]);

/** One window per module: three in the back wall (the middle one over the altar), one in each side wall. */
const WINDOW_SPOTS = [
  { wall: 'back', tx: 2, ty: 0, at: { tx: 2, ty: 2 } },
  { wall: 'back', tx: 7, ty: 0, at: { tx: 7, ty: 3 } },
  { wall: 'back', tx: 12, ty: 0, at: { tx: 12, ty: 2 } },
  { wall: 'left', tx: 0, ty: 6, at: { tx: 1, ty: 6 } },
  { wall: 'right', tx: 14, ty: 6, at: { tx: 13, ty: 6 } }
];
export const STATIONS = MODULES.map((m, i) => ({ module: m.id, ...WINDOW_SPOTS[i] }));

const inRect = (r, tx, ty) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
export const isWall = (tx, ty) => tx <= 0 || tx >= CHURCH_W - 1 || ty <= 1 || (ty >= CHURCH_H - 1 && tx !== EXIT.tx);
export const isSolid = (tx, ty) => isWall(tx, ty) || inRect(ALTAR, tx, ty) || inRect(LECTERN, tx, ty) || PEWS.some((p) => inRect(p, tx, ty));
export const onExit = (tx, ty) => tx === EXIT.tx && ty === EXIT.ty;

/** Floor tiles reachable from the spawn (for tests: every station and the lectern can be walked to). */
export function reachableFloor() {
  const seen = new Set(), start = [Math.floor(SPAWN.tx), Math.floor(SPAWN.ty)];
  const stack = [start]; seen.add(start.join(','));
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= CHURCH_W || ny >= CHURCH_H || seen.has(k) || isSolid(nx, ny)) continue;
      seen.add(k); stack.push([nx, ny]);
    }
  }
  return seen;
}
