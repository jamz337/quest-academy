// Drawn scenery in the world: in a land with a prop set (data/world/props.js), every tree square shows a drawn tree
// instead of its tile (the tile stays for collision, hidden), and the open grass gets bushes, plants, flowers, grass
// tufts, rocks and mushrooms scattered by a place-fixed hash, never on a road, a doorway or where someone stands.
// Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { TID, zoneAt, isWalkable } from '../../data/world/map.js';
import { PROP_SETS, SCATTER, hashAt, pickProp, propKey } from '../../data/world/props.js';

const GRASSY = new Set([TID.grass, TID.flower, 6, 29, 30, 31, 32, 33]);

/** Load every land's drawn scenery (from the Boot scene). */
export function loadProps(scene) {
  for (const [land, set] of Object.entries(PROP_SETS)) for (const p of set.props) scene.load.image(propKey(land, p.key), `${set.folder}${p.key}.png`);
}

export function createProps(w) {
  const map = w.map;
  const key = (x, y) => `${x},${y}`;
  const taken = new Set([...Object.values(map.npcSpots || {}), ...Object.values(map.bossSpots || {}), ...(map.trail || []), ...(map.coins || [])].map((s) => key(s.tx, s.ty)));
  for (const s of [map.fishSign, map.signSpot, map.bellSpot, map.questBoard, map.spawn]) if (s) taken.add(key(s.tx, s.ty));
  if (map.marketSpot) for (let y = map.marketSpot.ty; y < map.marketSpot.ty + map.marketSpot.h; y++) for (let x = map.marketSpot.tx; x < map.marketSpot.tx + map.marketSpot.w; x++) taken.add(key(x, y));
  const roadlike = (x, y) => { const id = map.data[y] && map.data[y][x]; return id === TID.path || id === TID.gateOpen || id === TID.plinth || id === TID.door; };
  w.props = [];
  // A tree on a land's border (the tree walls run between lands) takes the look of a drawn land beside it.
  const landFor = (tx, ty, tree) => {
    const own = zoneAt(map, tx, ty);
    if (!tree || PROP_SETS[own]) return own;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const z = zoneAt(map, tx + dx, ty + dy); if (PROP_SETS[z]) return z; }
    return own;
  };
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    const id = map.data[ty][tx], cx = (tx + 0.5) * TILE, bottom = (ty + 1) * TILE;
    const land = landFor(tx, ty, id === TID.tree), set = land && PROP_SETS[land];
    if (!set) continue;
    if (id === TID.tree) {
      // A drawn tree over the tile tree: the tile keeps the player out, the picture does the looking.
      const tile = w.treeLayer && w.treeLayer.getTileAt(tx, ty);
      if (tile) tile.setVisible(false);
      const p = pickProp(set.props, 'tree', hashAt(tx, ty, 1));
      if (p && w.textures.exists(propKey(land, p.key))) w.props.push(place(w, land, p, cx, bottom - 2, 2 + ty * 0.0005));
      continue;
    }
    if (!GRASSY.has(id) || !isWalkable(id) || taken.has(key(tx, ty))) continue;
    // Nothing right beside a road or a door, so the way stays clear to the eye.
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => roadlike(tx + dx, ty + dy) || taken.has(key(tx + dx, ty + dy)))) continue;
    const r = hashAt(tx, ty, 2);
    let acc = 0, kind = null;
    for (const s of SCATTER) { acc += s.chance; if (r < acc) { kind = s.kind; break; } }
    if (!kind) continue;
    const p = pickProp(set.props, kind, hashAt(tx, ty, 3));
    if (!p || !w.textures.exists(propKey(land, p.key))) continue;
    const jx = (hashAt(tx, ty, 4) - 0.5) * TILE * 0.5, jy = (hashAt(tx, ty, 5) - 0.5) * TILE * 0.3;
    w.props.push(place(w, land, p, cx + jx, bottom - 3 + jy, kind === 'bush' || kind === 'plant' ? 1.6 + ty * 0.0005 : 1.4));
  }
}

function place(w, land, p, x, bottom, depth) {
  const img = w.add.image(x, bottom, propKey(land, p.key)).setOrigin(0.5, 1).setDepth(depth);
  const src = w.textures.get(propKey(land, p.key)).getSourceImage();
  img.setScale((p.w * TILE) / Math.max(1, src.width));
  return img;
}
