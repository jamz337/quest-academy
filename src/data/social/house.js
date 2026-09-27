// The inside of the player's house, in tiles: a living room, bedroom and study along the top, a corridor, and
// the dining room, entrance hall and kitchen at the bottom. Each room keeps one Barbados exhibit on its back
// wall (see barbados.js) and real furniture, some of which can be used. Pure data (no Phaser) so the layout can
// be tested: every exhibit and every usable piece of furniture must be reachable from the front door.
import { ROOMS } from './barbados.js';

export const HOUSE_W = 22, HOUSE_H = 16;

/** Rooms: floor rectangles (walls sit around them), a name for the sign, and which exhibit hangs inside. */
export const HOUSE_ROOMS = [
  { id: 'living', name: 'Living room', exhibit: 'flag', x: 1, y: 1, w: 6, h: 6, floor: 'oak', wall: 0xf3ebdf },
  { id: 'bedroom', name: 'Bedroom', exhibit: 'heroes', x: 8, y: 1, w: 6, h: 6, floor: 'carpet', wall: 0xf7e6ea },
  { id: 'study', name: 'Study', exhibit: 'parishes', x: 15, y: 1, w: 6, h: 6, floor: 'walnut', wall: 0xe6efe8 },
  { id: 'corridor', name: 'Corridor', x: 1, y: 8, w: 20, h: 2, floor: 'stone', wall: 0xece7df },
  { id: 'dining', name: 'Dining room', exhibit: 'symbols', x: 1, y: 11, w: 6, h: 4, floor: 'tiles', wall: 0xeee8f7 },
  { id: 'hall', name: 'Entrance hall', x: 8, y: 11, w: 6, h: 4, floor: 'parquet', wall: 0xf1ece4 },
  { id: 'kitchen', name: 'Kitchen', exhibit: 'culture', x: 15, y: 11, w: 6, h: 4, floor: 'checker', wall: 0xfdf1e3 }
];

/** Gaps in the long walls: one two-tile doorway into each room, and the whole hall opens onto the corridor. */
export const DOORWAYS = [
  { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 10, y: 7 }, { x: 11, y: 7 }, { x: 17, y: 7 }, { x: 18, y: 7 },
  { x: 5, y: 10 }, { x: 6, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 },
  { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }
];

/** Wall tiles: the outer ring, the room dividers and the two long walls, minus the doorways. */
export function wallTiles() {
  const solid = new Set();
  const add = (x, y) => solid.add(`${x},${y}`);
  for (let x = 0; x < HOUSE_W; x++) { add(x, 0); add(x, HOUSE_H - 1); }
  for (let y = 0; y < HOUSE_H; y++) { add(0, y); add(HOUSE_W - 1, y); }
  for (let y = 1; y <= 6; y++) { add(7, y); add(14, y); }
  for (let y = 11; y <= 14; y++) { add(7, y); add(14, y); }
  for (let x = 1; x <= 20; x++) { add(x, 7); add(x, 10); }
  for (const d of DOORWAYS) solid.delete(`${d.x},${d.y}`);
  return solid;
}

/** The front door mat: standing here leaves the house. The player arrives just above it. */
export const EXIT = { x: 10, y: 14, w: 2, h: 1 };
export const SPAWN = { tx: 10.5, ty: 13.4 };

/** Windows on the back wall of the top rooms (tile x). */
export const WINDOWS = [6, 13, 20];

/**
 * Furniture: kind (see scenes/house/furniture.js), top-left tile and size in tiles. Everything is solid; `use`
 * names what happens when the player walks up and presses A. `at` is the tile to stand on to use it.
 */
export const FURNITURE = [
  // Living room: TV on the back wall, sofa facing it, bookshelf, lamp.
  { id: 'tv', kind: 'tv', room: 'living', x: 4, y: 1, w: 2, h: 1, use: 'tv', at: { tx: 4, ty: 2 } },
  { id: 'bookshelf', kind: 'bookshelf', room: 'living', x: 1, y: 1, w: 1, h: 1, use: 'books', at: { tx: 1, ty: 2 } },
  { id: 'sofa', kind: 'sofa', room: 'living', x: 4, y: 4, w: 2, h: 1 },
  { id: 'coffee', kind: 'coffeeTable', room: 'living', x: 3, y: 3, w: 1, h: 1 },
  { id: 'lamp', kind: 'lamp', room: 'living', x: 6, y: 4, w: 1, h: 1 },
  // Bedroom: bed and nightstand on the back wall, wardrobe, plant.
  { id: 'bed', kind: 'bed', room: 'bedroom', x: 12, y: 1, w: 2, h: 2, use: 'bed', at: { tx: 12, ty: 3 } },
  { id: 'nightstand', kind: 'nightstand', room: 'bedroom', x: 11, y: 1, w: 1, h: 1 },
  { id: 'wardrobe', kind: 'wardrobe', room: 'bedroom', x: 8, y: 1, w: 1, h: 1, use: 'wardrobe', at: { tx: 8, ty: 2 } },
  { id: 'plant-bed', kind: 'plant', room: 'bedroom', x: 13, y: 5, w: 1, h: 1 },
  // Study: desk with the globe, chair, bookshelves.
  { id: 'desk', kind: 'desk', room: 'study', x: 18, y: 1, w: 2, h: 1, use: 'desk', at: { tx: 18, ty: 2 } },
  { id: 'shelf-1', kind: 'bookshelf', room: 'study', x: 20, y: 1, w: 1, h: 1, use: 'books', at: { tx: 20, ty: 2 } },
  { id: 'shelf-2', kind: 'bookshelf', room: 'study', x: 20, y: 3, w: 1, h: 1, use: 'books', at: { tx: 19, ty: 3 } },
  { id: 'plant-study', kind: 'plant', room: 'study', x: 15, y: 5, w: 1, h: 1 },
  // Dining room: the table with its chairs, a cabinet of plates.
  { id: 'table', kind: 'table', room: 'dining', x: 3, y: 12, w: 2, h: 2 },
  { id: 'cabinet', kind: 'cabinet', room: 'dining', x: 1, y: 14, w: 2, h: 1 },
  { id: 'plant-dining', kind: 'plant', room: 'dining', x: 6, y: 14, w: 1, h: 1 },
  // Entrance hall: the trophy case, a coat rack and plants by the door.
  { id: 'trophy', kind: 'trophyCase', room: 'hall', x: 12, y: 11, w: 2, h: 1, use: 'trophy', at: { tx: 12, ty: 12 } },
  { id: 'coats', kind: 'coatRack', room: 'hall', x: 8, y: 11, w: 1, h: 1 },
  { id: 'plant-hall-1', kind: 'plant', room: 'hall', x: 8, y: 14, w: 1, h: 1 },
  { id: 'plant-hall-2', kind: 'plant', room: 'hall', x: 13, y: 14, w: 1, h: 1 },
  // Kitchen: stove and counter along the back wall, fridge, a small table.
  { id: 'stove', kind: 'stove', room: 'kitchen', x: 20, y: 11, w: 1, h: 1, use: 'cook', at: { tx: 20, ty: 12 } },
  { id: 'counter', kind: 'counter', room: 'kitchen', x: 18, y: 11, w: 2, h: 1 },
  { id: 'fridge', kind: 'fridge', room: 'kitchen', x: 20, y: 13, w: 1, h: 1, use: 'fridge', at: { tx: 19, ty: 13 } },
  { id: 'kitchen-table', kind: 'smallTable', room: 'kitchen', x: 16, y: 13, w: 2, h: 1 }
];

/**
 * What hangs on the walls: one exhibit per Barbados room (opens the story and quiz). Each sits on its room's
 * back wall, to the left; the room's name sign hangs to the right. `front` is where the player stands to use it.
 */
export const EXHIBITS = ROOMS.map((r) => {
  const room = HOUSE_ROOMS.find((h) => h.exhibit === r.id);
  const tile = room.id === 'kitchen' ? 2 : 1;   // the kitchen's doorway is at its left, so the drum hangs further along
  const tx = room.x + tile + 0.5, ty = room.y - 0.35;
  return { id: r.id, kind: 'room', item: r.item, title: r.title, room: room.id, tx, ty, front: { tx: room.x + tile, ty: room.y } };
});

/** Where each room's name sign hangs: on the back wall, right of centre. */
export const SIGNS = HOUSE_ROOMS.filter((r) => r.id !== 'corridor').map((r) => ({ room: r.id, name: r.name, tx: r.x + r.w / 2 + (r.id === 'kitchen' ? 1.5 : 1), ty: r.y - 0.5 }));

export const roomAt = (tx, ty) => HOUSE_ROOMS.find((r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) || null;
export const furnitureAt = (tx, ty) => FURNITURE.find((f) => tx >= f.x && tx < f.x + f.w && ty >= f.y && ty < f.y + f.h) || null;
export const isFloor = (tx, ty, walls = wallTiles()) => tx >= 0 && ty >= 0 && tx < HOUSE_W && ty < HOUSE_H && !walls.has(`${tx},${ty}`) && !furnitureAt(tx, ty);
export const onExit = (tx, ty) => ty === EXIT.y && tx >= EXIT.x && tx < EXIT.x + EXIT.w;

/** Floor tiles reachable from the spawn (4-way, around the furniture), as "x,y" keys. */
export function reachableFloor() {
  const walls = wallTiles();
  const start = `${Math.floor(SPAWN.tx)},${Math.floor(SPAWN.ty)}`;
  const seen = new Set([start]), queue = [start];
  while (queue.length) {
    const [x, y] = queue.shift().split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && isFloor(nx, ny, walls)) { seen.add(k); queue.push(k); }
    }
  }
  return seen;
}
