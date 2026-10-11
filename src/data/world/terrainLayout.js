// How the world is layered for drawing (systems/Terrain.js paints the pieces): the ground everywhere, the roads and
// water as dual-grid pieces over it, and the buildings on a layer of their own above the roads, so a road can run
// right up to a door. Collision still uses the map's own squares. Pure: data in, layer grids out.
import { TID, ROOF_TILES, WALL_TILES, DOOR_TILES, groundUnder } from './map.js';
import { ROAD_KINDS, VARIANTS, roadTile, waterTile, cornerMask } from '../../systems/Terrain.js';

const ROADLIKE = new Set([TID.path, TID.plinth, TID.gateOpen, TID.gateLocked, ...DOOR_TILES]);
const STRUCTURE = new Set([...ROOF_TILES, ...WALL_TILES, ...DOOR_TILES]);
/** Squares whose own picture is replaced by the ground beneath them (the road, water, tree or building on top is drawn elsewhere). */
const UNDER = new Set([...ROADLIKE, TID.water, TID.tree, ...ROOF_TILES, ...WALL_TILES]);

const KIND_OF_GROUND = {
  [TID.meadow]: 'meadow', [TID.woods]: 'woods', [TID.springs]: 'springs', [TID.cove]: 'cove', [TID.village]: 'village',
  [TID.quay]: 'quay', [TID.quayStone]: 'quay'
};
const kindIndex = (groundId) => Math.max(0, ROAD_KINDS.findIndex((k) => k.id === (KIND_OF_GROUND[groundId] || 'grass')));

/** A square's place-fixed variant (0..VARIANTS-1), so neighbours differ but nothing changes between visits. */
export function variantAt(x, y) {
  let h = Math.imul(x + 7, 374761393) ^ Math.imul(y + 3, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) % VARIANTS;
}

/**
 * The layers for a map: `base` (H x W ground ids), `structures` (H x W building ids, -1 for none) and the dual grids
 * `road` and `water` ((H + 1) x (W + 1) terrain tile indices, -1 for none). Dual cell (i, j) has the map squares
 * (i - 1, j - 1), (i, j - 1), (i - 1, j) and (i, j) at its corners and is drawn half a square up and to the left.
 */
export function terrainLayers(map) {
  const { data, width: W, height: H } = map;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : data[y][x]);
  const ground = (x, y) => { const id = data[y][x]; return id === TID.quayStone ? TID.quay : UNDER.has(id) ? groundUnder(map, x, y) : id; };
  const base = data.map((row, y) => row.map((_, x) => ground(x, y)));
  const structures = data.map((row) => row.map((id) => (STRUCTURE.has(id) ? id : -1)));
  const road = [], water = [];
  for (let j = 0; j <= H; j++) {
    const rr = [], wr = [];
    for (let i = 0; i <= W; i++) {
      const corners = [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]];
      const ids = corners.map(([x, y]) => at(x, y));
      const v = variantAt(i, j);
      const rm = cornerMask(...ids.map((id) => ROADLIKE.has(id)));
      // The road's edge takes the look of the ground it runs across: the first corner that is not road.
      let k = 0;
      if (rm) {
        const other = corners.find(([x, y], n) => ids[n] !== -1 && !ROADLIKE.has(ids[n]));
        const [gx, gy] = other || corners.find(([x, y], n) => ids[n] !== -1) || [0, 0];
        k = kindIndex(base[Math.min(H - 1, Math.max(0, gy))][Math.min(W - 1, Math.max(0, gx))]);
      }
      rr.push(rm ? roadTile(k, v, rm) : -1);
      const wm = cornerMask(...ids.map((id) => id === TID.water));
      wr.push(wm ? waterTile(v, wm) : -1);
    }
    road.push(rr); water.push(wr);
  }
  return { base, structures, road, water };
}
