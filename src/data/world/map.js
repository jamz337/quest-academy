// The overworld is generated in code from a handful of rectangles and paths so it stays tiny and
// deterministic. Tile ids follow TILE_IDS in systems/Textures.js.
import { mulberry32 } from '../../systems/Rng.js';

export const W = 48, H = 40;

// Tile ids (mirrors TILE_IDS; duplicated here so the map module has no Phaser/texture dependency).
export const TID = { grass: 0, path: 1, water: 2, tree: 3, wall: 4, door: 5, flower: 6, meadow: 7, woods: 8, cove: 9, gateLocked: 10, gateOpen: 11, roof: 12 };
export const SOLID = [TID.water, TID.tree, TID.wall, TID.roof, TID.gateLocked];
export const isWalkable = (id) => !SOLID.includes(id);

export const ZONE_NAMES = { hub: 'Academy Hub', math: 'Math Meadow', words: 'Word Woods', code: 'Code Cove' };

/** Fallback locked-gate wording; quests.js gateHint() gives the live version. */
export const GATE_HINTS = {
  words: 'Defeat the Math Meadow boss to open Word Woods',
  code: 'Defeat the Word Woods boss to open Code Cove'
};

function fillRect(data, x, y, w, h, id) {
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    if (ty >= 0 && ty < H && tx >= 0 && tx < W) data[ty][tx] = id;
  }
}
const hline = (data, x0, x1, y, id) => fillRect(data, Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, id);
const vline = (data, x, y0, y1, id) => fillRect(data, x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, id);

/** Sprinkle `id` over cells currently equal to `over` inside a rect with probability p. */
function sprinkle(data, rnd, rect, over, id, p) {
  for (let ty = rect.y; ty < rect.y + rect.h; ty++) for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
    if (data[ty][tx] === over && rnd() < p) data[ty][tx] = id;
  }
}

/** 3x3 house: a roof row over walls, with a door at the bottom centre. Returns the door tile. */
function house(data, x, y) {
  fillRect(data, x, y, 3, 1, TID.roof);
  fillRect(data, x, y + 1, 3, 2, TID.wall);
  data[y + 2][x + 1] = TID.door;
  return { tx: x + 1, ty: y + 2 };
}

/**
 * Build the world. Everything is placed in a fixed order: ground, scenery (random), then paths,
 * buildings and NPC spots which overwrite scenery so the path network is always contiguous.
 */
export function buildMap() {
  const rnd = mulberry32(2024);
  const data = Array.from({ length: H }, () => Array(W).fill(TID.grass));

  const zones = [
    { id: 'hub', name: ZONE_NAMES.hub, rect: { x: 16, y: 14, w: 16, h: 14 } },
    { id: 'math', name: ZONE_NAMES.math, rect: { x: 1, y: 3, w: 15, h: 25 } },
    { id: 'words', name: ZONE_NAMES.words, rect: { x: 30, y: 1, w: 17, h: 12 } },
    { id: 'code', name: ZONE_NAMES.code, rect: { x: 1, y: 29, w: 46, h: 10 } }
  ];
  const zone = (id) => zones.find((z) => z.id === id).rect;

  // Ground per region
  const m = zone('math'), wd = zone('words'), cv = zone('code');
  fillRect(data, m.x, m.y, m.w, m.h, TID.meadow);
  fillRect(data, wd.x, wd.y, wd.w, wd.h, TID.woods);
  fillRect(data, cv.x, cv.y, cv.w, cv.h, TID.cove);

  // Scenery: flowers on plain grass, a few trees in the meadow and grass, dense trees in the woods.
  sprinkle(data, rnd, { x: 0, y: 0, w: W, h: H }, TID.grass, TID.flower, 0.08);
  sprinkle(data, rnd, { x: 0, y: 0, w: W, h: H }, TID.grass, TID.tree, 0.05);
  sprinkle(data, rnd, m, TID.meadow, TID.tree, 0.03);
  sprinkle(data, rnd, wd, TID.woods, TID.tree, 0.14);
  sprinkle(data, rnd, { x: cv.x, y: cv.y, w: cv.w, h: 4 }, TID.cove, TID.tree, 0.05);

  // Water: a lake east of the hub and the sea along the bottom of the cove with a wobbly shoreline.
  fillRect(data, 37, 19, 8, 6, TID.water);
  data[19][37] = TID.grass; data[19][44] = TID.grass; data[24][37] = TID.grass; data[24][44] = TID.grass;
  for (let tx = 1; tx < W - 1; tx++) {
    const top = 35 + (rnd() < 0.35 ? -1 : 0);
    vline(data, tx, top, H - 2, TID.water);
  }

  // Walls of trees that seal off the locked regions (and the outer border).
  hline(data, 0, W - 1, 0, TID.tree); hline(data, 0, W - 1, H - 1, TID.tree);
  vline(data, 0, 0, H - 1, TID.tree); vline(data, W - 1, 0, H - 1, TID.tree);
  vline(data, 29, 1, 13, TID.tree);            // words: west wall
  hline(data, 29, W - 1, 13, TID.tree);        // words: south wall
  hline(data, 0, W - 1, 28, TID.tree);         // code: north wall

  // Hub plaza and the three roads out of it.
  fillRect(data, 21, 17, 7, 8, TID.path);
  hline(data, 4, 20, 20, TID.path);            // west to Math Meadow
  hline(data, 28, 36, 17, TID.path);           // east, then north to Word Woods
  vline(data, 36, 7, 16, TID.path);
  vline(data, 24, 25, 32, TID.path);           // south to Code Cove
  hline(data, 33, 43, 7, TID.path);            // woods lane
  vline(data, 39, 6, 7, TID.path); vline(data, 43, 5, 7, TID.path);
  hline(data, 12, 38, 33, TID.path);           // beach promenade
  vline(data, 4, 18, 20, TID.path); vline(data, 10, 17, 20, TID.path);   // meadow lanes
  vline(data, 7, 25, 26, TID.path); hline(data, 7, 15, 26, TID.path); vline(data, 15, 20, 26, TID.path);

  // Boss arenas: a paved clearing off the main roads in each zone, joined to the path network.
  fillRect(data, 5, 8, 5, 3, TID.path); vline(data, 7, 11, 19, TID.path);       // meadow: north of the lanes
  fillRect(data, 31, 9, 3, 3, TID.path); hline(data, 33, 36, 10, TID.path);     // woods: west of the road
  fillRect(data, 6, 30, 5, 3, TID.path); hline(data, 11, 13, 32, TID.path); vline(data, 13, 32, 33, TID.path);   // cove: west end of the beach
  const bossSpots = { math: { tx: 7, ty: 9 }, words: { tx: 32, ty: 10 }, code: { tx: 8, ty: 31 } };

  // Gates: the only way into Word Woods and Code Cove.
  const gates = [{ zone: 'words', tx: 36, ty: 13 }, { zone: 'code', tx: 24, ty: 28 }];
  for (const g of gates) data[g.ty][g.tx] = TID.gateLocked;

  // Buildings and the NPC who stands in front of each one.
  const buildings = [];
  const npcSpots = {};
  const place = (npcId, zoneId, x, y) => {
    const door = house(data, x, y);
    buildings.push({ zone: zoneId, x, y, w: 3, h: 3, door });
    const spot = { tx: door.tx, ty: door.ty + 1 };
    data[spot.ty][spot.tx] = TID.path;
    npcSpots[npcId] = spot;
  };
  place('prof-plus', 'math', 3, 15);
  place('chef-fraction', 'math', 9, 14);
  place('bridge-keeper', 'math', 6, 22);
  place('owl-librarian', 'words', 32, 4);
  place('gate-guard', 'words', 38, 3);
  place('safari-ranger', 'words', 42, 2);
  place('robo-mechanic', 'code', 17, 30);
  place('bug-catcher', 'code', 29, 30);
  place('fortune-teller', 'code', 35, 30);
  npcSpots.signpost = { tx: 24, ty: 18 };

  const spawn = { tx: 24, ty: 22 };

  // Collectible coins scattered along the roads.
  const coins = [
    { tx: 8, ty: 20 }, { tx: 14, ty: 20 }, { tx: 18, ty: 20 }, { tx: 11, ty: 26 },
    { tx: 22, ty: 18 }, { tx: 26, ty: 23 }, { tx: 31, ty: 17 }, { tx: 36, ty: 15 },
    { tx: 36, ty: 10 }, { tx: 24, ty: 31 }, { tx: 15, ty: 33 }, { tx: 33, ty: 33 },
    { tx: 35, ty: 7 }, { tx: 41, ty: 7 }, { tx: 7, ty: 13 }
  ];

  return { width: W, height: H, data, spawn, zones, gates, npcSpots, bossSpots, buildings, coins };
}

/** Ground tile shown beneath a tree (trees are drawn on an overlay layer so the local ground shows through). */
export function groundUnder(map, tx, ty) {
  const z = zoneAt(map, tx, ty);
  return z === 'math' ? TID.meadow : z === 'words' ? TID.woods : z === 'code' ? TID.cove : TID.grass;
}

/** Zone id containing a tile, or null for unnamed grassland between zones. */
export function zoneAt(map, tx, ty) {
  for (const z of map.zones) {
    const r = z.rect;
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return z.id;
  }
  return null;
}

/** Flood-fill from spawn over walkable tiles. Returns a Set of "tx,ty" keys. */
export function reachableFrom(map, start = map.spawn) {
  const seen = new Set();
  const key = (x, y) => `${x},${y}`;
  const stack = [[start.tx, start.ty]];
  seen.add(key(start.tx, start.ty));
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if (!isWalkable(map.data[ny][nx]) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny)); stack.push([nx, ny]);
    }
  }
  return seen;
}
