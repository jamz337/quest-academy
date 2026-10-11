// Drawn scenery for the world (public/sprites/world/<land>/): trees that replace the tile trees, and bushes, plants,
// flowers, rocks and mushrooms scattered over the grass. `w` is how wide each stands in tiles; `kind` groups them
// for the scatter. Pure data; scenes/world/props.js places them.

export const HUB_PROPS = [
  { key: 'tree-big', w: 2.1, kind: 'tree', weight: 3 },
  { key: 'tree-round', w: 1.7, kind: 'tree', weight: 5 },
  { key: 'tree-tall', w: 1.5, kind: 'tree', weight: 3 },
  { key: 'tree-young', w: 1.1, kind: 'tree', weight: 1 },
  { key: 'tree-bare', w: 1.6, kind: 'tree', weight: 0 },
  { key: 'bush-big', w: 1.9, kind: 'bush', weight: 3 },
  { key: 'bush-flowers', w: 1.6, kind: 'bush', weight: 3 },
  { key: 'bush-round', w: 1.3, kind: 'bush', weight: 3 },
  { key: 'plant-tropical', w: 1.3, kind: 'plant', weight: 3 },
  { key: 'fern', w: 1.1, kind: 'plant', weight: 3 },
  { key: 'flowers-pink', w: 0.9, kind: 'flowers', weight: 2 },
  { key: 'flowers-orange', w: 0.9, kind: 'flowers', weight: 2 },
  { key: 'flowers-yellow', w: 0.9, kind: 'flowers', weight: 2 },
  { key: 'flowers-red', w: 0.9, kind: 'flowers', weight: 2 },
  { key: 'flowers-blue', w: 0.9, kind: 'flowers', weight: 2 },
  { key: 'clover', w: 0.8, kind: 'flowers', weight: 1 },
  { key: 'wheat', w: 0.9, kind: 'grass', weight: 2 },
  { key: 'grass-1', w: 0.9, kind: 'grass', weight: 3 },
  { key: 'grass-2', w: 0.9, kind: 'grass', weight: 3 },
  { key: 'grass-3', w: 0.9, kind: 'grass', weight: 3 },
  { key: 'mushrooms-1', w: 0.7, kind: 'mushrooms', weight: 1 },
  { key: 'mushrooms-2', w: 0.7, kind: 'mushrooms', weight: 1 },
  { key: 'ivy', w: 0.9, kind: 'none', weight: 0 },
  { key: 'rocks-small', w: 0.9, kind: 'rock', weight: 2 },
  { key: 'rock-grey', w: 0.9, kind: 'rock', weight: 1 },
  { key: 'rock-brown', w: 0.9, kind: 'rock', weight: 1 },
  { key: 'rocks-pile', w: 1.1, kind: 'rock', weight: 1 },
  { key: 'rock-pebbles', w: 0.8, kind: 'rock', weight: 2 },
  { key: 'rock-tan', w: 0.8, kind: 'rock', weight: 1 },
  { key: 'rock-mossy-1', w: 1.0, kind: 'rock', weight: 1 },
  { key: 'rock-mossy-2', w: 1.0, kind: 'rock', weight: 1 }
];

/** Which lands have drawn scenery, and where its files live. */
export const PROP_SETS = { hub: { props: HUB_PROPS, folder: 'sprites/world/hub/' } };
export const propKey = (land, key) => `prop-${land}-${key}`;

/** How thickly each kind is scattered over a land's open grass (chance per grass square). */
export const SCATTER = [
  { kind: 'bush', chance: 0.05 },
  { kind: 'plant', chance: 0.03 },
  { kind: 'flowers', chance: 0.09 },
  { kind: 'grass', chance: 0.1 },
  { kind: 'rock', chance: 0.025 },
  { kind: 'mushrooms', chance: 0.015 }
];

/** A place-fixed number in [0, 1) for a square, so the scatter never changes between visits. */
export function hashAt(x, y, salt = 0) {
  let h = Math.imul(x + 11, 374761393) ^ Math.imul(y + 5, 668265263) ^ Math.imul(salt + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Pick one of the props of a kind by weight, from a number in [0, 1). */
export function pickProp(props, kind, r) {
  const pool = props.filter((p) => p.kind === kind && p.weight > 0);
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let acc = r * total;
  for (const p of pool) { acc -= p.weight; if (acc < 0) return p; }
  return pool[pool.length - 1] || null;
}
