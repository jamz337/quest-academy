// The overworld is generated in code from a handful of rectangles and paths so it stays tiny and
// deterministic. Tile ids follow TILE_IDS in systems/Textures.js.
//
// The first four lands and the hub were laid out on a 56 x 40 grid. Science Springs was added later as a strip
// of OY rows above them: the old world is still built exactly as it was (so every tree and flower stays where
// players know it) and then pasted OY rows down, and its coordinates are shifted the same way. History Harbor
// came next, as HS rows below the cove's sea, reached by a pier.
import { mulberry32 } from '../../systems/Rng.js';

export const OY = 14;                      // rows added above the original world
export const HS = 10;                      // rows added below it for History Harbor
export const W = 56, H0 = 40, H1 = H0 + OY, H = H1 + HS;

// Tile ids (mirrors TILE_IDS; duplicated here so the map module has no Phaser/texture dependency).
export const TID = {
  grass: 0, path: 1, water: 2, tree: 3, wall: 4, door: 5, flower: 6, meadow: 7, woods: 8, cove: 9, gateLocked: 10, gateOpen: 11, roof: 12,
  roofMath: 13, wallMath: 14, doorMath: 15, roofWords: 16, wallWords: 17, doorWords: 18, roofCode: 19, wallCode: 20, doorCode: 21,
  roofBible: 22, wallBible: 23, doorBible: 24, castleTop: 25, castleWall: 26, castleDoor: 27, village: 28,
  plinth: 41,   // paving that something stands on (the fountain, the quest board): looks like path, cannot be walked on
  springs: 42, roofScience: 43, wallScience: 44, doorScience: 45,  // Science Springs: its bright ground and glass-house buildings
  // History Harbor: its cobbled quay, chattel houses in three colours, and the fort's coral stone
  quay: 46, roofHistory: 47, wallHistory: 48, doorHistory: 49, wallHistory2: 50, doorHistory2: 51, wallHistory3: 52, doorHistory3: 53,
  fortTop: 54, fortWall: 55, fortDoor: 56,
  quayStone: 57,  // quay paving something stands on (the lighthouse): looks like the quay, cannot be walked on
  fair: 61, roofMusic: 62, wallMusic: 63, doorMusic: 64,  // Melody Market: fairground grass and striped market stalls (58-60 are grass looks)
  clay: 65, cliff: 66   // Studio Summit: its flagstone floor and its rock, both under the summit's drawn picture
};
export const ROOF_TILES = [TID.roof, TID.roofMath, TID.roofWords, TID.roofCode, TID.roofBible, TID.castleTop, TID.roofScience, TID.roofHistory, TID.fortTop, TID.roofMusic];
export const WALL_TILES = [TID.wall, TID.wallMath, TID.wallWords, TID.wallCode, TID.wallBible, TID.castleWall, TID.wallScience, TID.wallHistory, TID.wallHistory2, TID.wallHistory3, TID.fortWall, TID.wallMusic];
export const DOOR_TILES = [TID.door, TID.doorMath, TID.doorWords, TID.doorCode, TID.doorBible, TID.castleDoor, TID.doorScience, TID.doorHistory, TID.doorHistory2, TID.doorHistory3, TID.fortDoor, TID.doorMusic];
export const SOLID = [TID.water, TID.tree, TID.gateLocked, TID.plinth, TID.quayStone, TID.cliff, ...ROOF_TILES, ...WALL_TILES];
export const isWalkable = (id) => !SOLID.includes(id);

/** Each neighbourhood builds in its own style; bosses get a castle. */
export const BUILDING_STYLES = {
  math: { roof: TID.roofMath, wall: TID.wallMath, door: TID.doorMath },
  words: { roof: TID.roofWords, wall: TID.wallWords, door: TID.doorWords },
  code: { roof: TID.roofCode, wall: TID.wallCode, door: TID.doorCode },
  bible: { roof: TID.roofBible, wall: TID.wallBible, door: TID.doorBible },
  science: { roof: TID.roofScience, wall: TID.wallScience, door: TID.doorScience },
  history: { roof: TID.roofHistory, wall: TID.wallHistory, door: TID.doorHistory },      // mint
  history2: { roof: TID.roofHistory, wall: TID.wallHistory2, door: TID.doorHistory2 },   // pink
  history3: { roof: TID.roofHistory, wall: TID.wallHistory3, door: TID.doorHistory3 },   // yellow
  music: { roof: TID.roofMusic, wall: TID.wallMusic, door: TID.doorMusic },
  castle: { roof: TID.castleTop, wall: TID.castleWall, door: TID.castleDoor },
  fort: { roof: TID.fortTop, wall: TID.fortWall, door: TID.fortDoor },
  hall: { roof: TID.roof, wall: TID.wall, door: TID.door }   // the market hall: red tiles and plaster, like the hub's houses
};

export const ZONE_NAMES = { hub: 'Academy Hub', math: 'Math Meadow', words: 'Word Woods', code: 'Code Cove', bible: 'Bible Village', science: 'Science Springs', history: 'History Harbor', music: 'Melody Market', studio: 'Studio Summit' };
/** The ground tile of each land. */
const GROUND_OF = { math: TID.meadow, words: TID.woods, code: TID.cove, bible: TID.village, science: TID.springs, history: TID.quay, music: TID.fair, studio: TID.clay };

function fillRect(data, x, y, w, h, id) {
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    if (ty >= 0 && ty < data.length && tx >= 0 && tx < data[ty].length) data[ty][tx] = id;
  }
}
const hline = (data, x0, x1, y, id) => fillRect(data, Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, id);
const vline = (data, x, y0, y1, id) => fillRect(data, x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, id);

/** Sprinkle `id` over cells currently equal to `over` inside a rect with probability p; `placed` records the cells. */
function sprinkle(data, rnd, rect, over, id, p, placed = null) {
  for (let ty = rect.y; ty < rect.y + rect.h; ty++) for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
    if (data[ty][tx] === over && rnd() < p) { data[ty][tx] = id; if (placed) placed.add(`${tx},${ty}`); }
  }
}

/** w x h building in a style: a roof row over walls, with a door at the bottom centre. Returns the door tile. */
function building(data, x, y, w, h, style) {
  fillRect(data, x, y, w, 1, style.roof);
  fillRect(data, x, y + 1, w, h - 1, style.wall);
  const door = { tx: x + Math.floor(w / 2), ty: y + h - 1 };
  data[door.ty][door.tx] = style.door;
  return door;
}

const BUILT = new Set([TID.path, TID.gateOpen, ...ROOF_TILES, ...WALL_TILES, ...DOOR_TILES]);
/** Clear scenery trees that ended up touching a road, doorway, building or villager, so nothing is boxed in. */
function clearBoxedTrees(data, scenery, walls, zones) {
  const groundAt = (tx, ty) => { const z = zones.find((zn) => tx >= zn.rect.x && tx < zn.rect.x + zn.rect.w && ty >= zn.rect.y && ty < zn.rect.y + zn.rect.h); return z ? GROUND_OF[z.id] ?? TID.grass : TID.grass; };
  for (const k of scenery) {
    const [tx, ty] = k.split(',').map(Number);
    if (data[ty][tx] !== TID.tree || walls.has(k)) continue;
    let touching = false;
    for (let dy = -1; dy <= 1 && !touching; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = data[ty + dy]?.[tx + dx];
      if (t !== undefined && BUILT.has(t) && !walls.has(`${tx + dx},${ty + dy}`)) { touching = true; break; }
    }
    if (touching) data[ty][tx] = groundAt(tx, ty);
  }
}

/** The Number Trail's stepping stones, 1 to 10, in walking order from the hub to the Number Fort. */
export const TRAIL_STONES = [[14, 20], [13, 23], [11, 26], [8, 26], [4, 26], [3, 22], [3, 19], [5, 18], [7, 15], [7, 9]].map(([tx, ty], i) => ({ n: i + 1, tx, ty: ty + OY }));
/** Where the trail crosses the river on a plank bridge (path tiles over the water). */
export const TRAIL_BRIDGE = { tx: 7, ty: 11 + OY, h: 2 };

/**
 * The original world (the hub and its four lands) on its own 56 x 40 grid, exactly as first laid out: ground,
 * scenery (random), then paths, buildings and NPC spots which overwrite scenery so the path network is always
 * contiguous. Coordinates here are in the old grid; buildMap() shifts them down by OY.
 */
function buildOldWorld() {
  const rnd = mulberry32(2024);
  const data = Array.from({ length: H0 }, () => Array(W).fill(TID.grass));

  const zones = [
    { id: 'hub', name: ZONE_NAMES.hub, rect: { x: 16, y: 8, w: 16, h: 20 } },   // reaches up over the grass above the player's house, where the hospital stands
    { id: 'math', name: ZONE_NAMES.math, rect: { x: 1, y: 3, w: 15, h: 25 } },
    { id: 'words', name: ZONE_NAMES.words, rect: { x: 30, y: 1, w: 17, h: 12 } },
    { id: 'code', name: ZONE_NAMES.code, rect: { x: 1, y: 29, w: W - 2, h: 10 } },
    { id: 'bible', name: ZONE_NAMES.bible, rect: { x: 38, y: 14, w: W - 39, h: 14 } }
  ];
  const zone = (id) => zones.find((z) => z.id === id).rect;

  // Ground per region
  const m = zone('math'), wd = zone('words'), cv = zone('code'), bv = zone('bible');
  fillRect(data, m.x, m.y, m.w, m.h, TID.meadow);
  fillRect(data, wd.x, wd.y, wd.w, wd.h, TID.woods);
  fillRect(data, cv.x, cv.y, cv.w, cv.h, TID.cove);
  fillRect(data, bv.x, bv.y, bv.w, bv.h, TID.village);

  // Scenery: flowers on plain grass, a few trees in the meadow and grass, dense trees in the woods.
  // Scenery trees are remembered so the ones that land against roads or houses can be cleared at the end.
  const scenery = new Set();
  sprinkle(data, rnd, { x: 0, y: 0, w: W, h: H0 }, TID.grass, TID.flower, 0.08);
  sprinkle(data, rnd, { x: 0, y: 0, w: W, h: H0 }, TID.grass, TID.tree, 0.05, scenery);
  sprinkle(data, rnd, m, TID.meadow, TID.tree, 0.03, scenery);
  sprinkle(data, rnd, wd, TID.woods, TID.tree, 0.14, scenery);
  sprinkle(data, rnd, { x: cv.x, y: cv.y, w: cv.w, h: 4 }, TID.cove, TID.tree, 0.05, scenery);

  // Water: a pond in the village and the sea along the bottom of the cove with a wobbly shoreline.
  fillRect(data, 40, 21, 3, 3, TID.water);
  fillRect(data, 1, 11, 14, 2, TID.water);     // the meadow's river, below the Number Fort (the trail bridges it)
  for (let tx = 1; tx < W - 1; tx++) {
    const top = 35 + (rnd() < 0.35 ? -1 : 0);
    vline(data, tx, top, H0 - 2, TID.water);
  }

  // Walls of trees that seal off each village (and the outer border). These are deliberate and never cleared.
  const walls = new Set();
  const wallRect = (x, y, w, h) => { fillRect(data, x, y, w, h, TID.tree); for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) walls.add(`${tx},${ty}`); };
  wallRect(0, 0, W, 1); wallRect(0, H0 - 1, W, 1); wallRect(0, 0, 1, H0); wallRect(W - 1, 0, 1, H0);
  wallRect(29, 1, 1, 13);                      // words: west wall
  wallRect(29, 13, W - 29, 1);                 // words and village: shared wall
  wallRect(47, 1, W - 48, 12);                 // deep forest east of the woods
  wallRect(0, 28, W, 1);                       // code: north wall
  wallRect(37, 14, 1, 14);                     // village: west wall

  // Hub plaza and the roads out of it.
  fillRect(data, 21, 17, 7, 8, TID.path);
  hline(data, 13, 20, 20, TID.path);           // west to Math Meadow, where the Number Trail begins
  hline(data, 28, 36, 17, TID.path);           // east, then north to Word Woods
  vline(data, 36, 7, 16, TID.path);
  vline(data, 24, 25, 32, TID.path);           // south to Code Cove
  hline(data, 33, 43, 7, TID.path);            // woods lane
  vline(data, 39, 6, 7, TID.path); vline(data, 43, 5, 7, TID.path);
  hline(data, 6, 38, 33, TID.path);            // beach promenade
  // The Number Trail: one winding path through Math Meadow, from the hub road past every game, over the river
  // and up to the Number Fort. Numbered stepping stones (TRAIL_STONES) count the way along it.
  vline(data, 13, 20, 26, TID.path); hline(data, 3, 13, 26, TID.path); vline(data, 3, 18, 26, TID.path); hline(data, 3, 10, 18, TID.path);
  hline(data, 37, 50, 17, TID.path);           // village high street, east from the Word Woods road
  vline(data, 45, 17, 25, TID.path); hline(data, 45, 50, 25, TID.path);

  // Boss castles with a paved forecourt in front, joined to the path network.
  const buildings = [];
  const castle = (zoneId, x, y) => {
    const door = building(data, x, y, 5, 4, BUILDING_STYLES.castle);
    buildings.push({ zone: zoneId, style: 'castle', x, y, w: 5, h: 4, door });
    return { tx: door.tx, ty: door.ty + 1 };
  };
  const bossSpots = {};
  bossSpots.math = castle('math', 5, 4); fillRect(data, 5, 8, 5, 3, TID.path); vline(data, 7, 11, 18, TID.path);   // the forecourt, the bridge and the trail's last stretch
  bossSpots.words = castle('words', 30, 8); hline(data, 30, 36, 12, TID.path);
  bossSpots.code = castle('code', 6, 29); fillRect(data, 6, 33, 5, 1, TID.path);
  bossSpots.bible = castle('bible', 48, 20); fillRect(data, 48, 24, 5, 2, TID.path);
  // Room to walk around the Code Cove boss: nothing is locked, so the sand below him runs on over the water's edge
  // (the other bosses already stand beside their forecourts rather than across the only way).
  data[34][7] = data[34][8] = TID.cove;

  // Archways into Word Woods, Code Cove and Bible Village: always open, every village can be explored.
  const gates = [{ zone: 'words', tx: 36, ty: 13 }, { zone: 'code', tx: 24, ty: 28 }, { zone: 'bible', tx: 37, ty: 17 }];
  for (const g of gates) data[g.ty][g.tx] = TID.gateOpen;

  // Houses in the neighbourhood's style and the villager who stands in front of each one.
  const npcSpots = {};
  const place = (npcId, zoneId, x, y) => {
    const door = building(data, x, y, 3, 3, BUILDING_STYLES[zoneId]);
    buildings.push({ zone: zoneId, style: zoneId, x, y, w: 3, h: 3, door });
    const spot = { tx: door.tx, ty: door.ty + 1 };
    data[spot.ty][spot.tx] = TID.path;
    npcSpots[npcId] = spot;
  };
  // Math Meadow's houses stand beside the Number Trail, each villager one step off it so nobody blocks the way.
  place('prof-plus', 'math', 9, 22);
  place('chef-fraction', 'math', 9, 14);
  place('bridge-keeper', 'math', 2, 14);
  place('owl-librarian', 'words', 32, 4);
  place('gate-guard', 'words', 38, 3);
  place('safari-ranger', 'words', 42, 2);
  place('robo-mechanic', 'code', 17, 30);
  place('bug-catcher', 'code', 29, 30);
  place('fortune-teller', 'code', 35, 30);
  place('shepherd', 'bible', 39, 14);
  place('scribe', 'bible', 43, 14);
  place('fisherman', 'bible', 47, 14);
  // The newer villagers: one more house in each land, tucked off the main lanes.
  place('balloon-seller', 'math', 5, 22);
  place('frog-friend', 'words', 40, 9);
  place('dj-bot', 'code', 44, 30);
  place('ark-builder', 'bible', 42, 18);
  npcSpots.signpost = { tx: 24, ty: 18 };
  const signSpot = { tx: 24, ty: 17 };   // the wooden signpost right behind Sam, at the top of the plaza
  // Headmistress Hope waits on the path by the player's front door; the bell tower stands at the top of the plaza.
  npcSpots.hope = { tx: 21, ty: 19 }; data[19][21] = TID.path;
  const bellSpot = { tx: 28, ty: 17 }; data[17][28] = TID.path; data[16][28] = TID.grass;
  // Auntie Vee's market stall just off the plaza's east edge; she stands on the path in front of it.
  npcSpots.vendor = { tx: 27, ty: 21 }; data[21][27] = TID.path;
  const marketSpot = { tx: 28, ty: 20, w: 2, h: 2 };
  for (let y = 20; y <= 21; y++) for (let x = 28; x <= 29; x++) data[y][x] = TID.grass;

  // The player's own house in the hub, in the classic red-roof style, with a path to the plaza.
  const homeDoor = building(data, 18, 15, 3, 3, { roof: TID.roof, wall: TID.wall, door: TID.door });
  buildings.push({ zone: 'hub', style: 'home', x: 18, y: 15, w: 3, h: 3, door: homeDoor });
  hline(data, homeDoor.tx, 21, homeDoor.ty + 1, TID.path);
  const home = { door: homeDoor, front: { tx: homeDoor.tx, ty: homeDoor.ty + 1 }, x: 18, y: 15, w: 3, h: 3 };

  // The Village Church in Bible Village's north-east corner, where the Bible lessons are taught; the high street
  // runs on to its door. Its steeple and rose window are drawn over the building (scenes/world/decor.js).
  const churchDoor = building(data, 51, 14, 3, 3, BUILDING_STYLES.bible);
  buildings.push({ zone: 'bible', style: 'church', x: 51, y: 14, w: 3, h: 3, door: churchDoor });
  hline(data, 50, churchDoor.tx, churchDoor.ty + 1, TID.path);
  const church = { door: churchDoor, front: { tx: churchDoor.tx, ty: churchDoor.ty + 1 }, x: 51, y: 14, w: 3, h: 3 };

  clearBoxedTrees(data, scenery, walls, zones);

  // The Star Fountain in the middle of the plaza and the quest board beside Signpost Sam (scenes/world/hub.js).
  const fountain = { tx: 23, ty: 20, w: 3, h: 3 }, questBoard = { tx: 26, ty: 17 };
  fillRect(data, fountain.tx, fountain.ty, fountain.w, fountain.h, TID.plinth);
  data[questBoard.ty][questBoard.tx] = TID.plinth;

  const spawn = { tx: 24, ty: 23 };   // just south of the fountain, facing it

  // Collectible coins scattered along the roads.
  const coins = [
    { tx: 13, ty: 25 }, { tx: 9, ty: 26 }, { tx: 18, ty: 20 }, { tx: 3, ty: 24 },
    { tx: 22, ty: 18 }, { tx: 26, ty: 23 }, { tx: 31, ty: 17 }, { tx: 36, ty: 15 },
    { tx: 36, ty: 10 }, { tx: 24, ty: 31 }, { tx: 15, ty: 33 }, { tx: 33, ty: 33 },
    { tx: 35, ty: 7 }, { tx: 41, ty: 7 }, { tx: 7, ty: 13 },
    { tx: 42, ty: 17 }, { tx: 45, ty: 22 }, { tx: 50, ty: 25 }
  ];

  return { data, zones, gates, npcSpots, bossSpots, buildings, coins, signSpot, bellSpot, marketSpot, home, church, fountain, questBoard, spawn, fishSign: { tx: 5, ty: 13 } };
}

/** Build the world: the original lands shifted down, with Science Springs along the top. */
export function buildMap() {
  const old = buildOldWorld();
  const down = (p) => ({ ...p, ty: p.ty + OY });
  const downRect = (r) => ({ ...r, y: r.y + OY });
  const data = Array.from({ length: H }, () => Array(W).fill(TID.grass));
  for (let y = 0; y < H0; y++) data[y + OY] = old.data[y];

  const zones = old.zones.map((z) => ({ ...z, rect: downRect(z.rect) }));
  const gates = old.gates.map(down);
  const npcSpots = Object.fromEntries(Object.entries(old.npcSpots).map(([k, s]) => [k, down(s)]));
  const bossSpots = Object.fromEntries(Object.entries(old.bossSpots).map(([k, s]) => [k, down(s)]));
  const buildings = old.buildings.map((b) => ({ ...b, y: b.y + OY, door: down(b.door) }));
  const coins = old.coins.map(down);
  const home = { ...old.home, y: old.home.y + OY, door: down(old.home.door), front: down(old.home.front) };
  const church = { ...old.church, y: old.church.y + OY, door: down(old.church.door), front: down(old.church.front) };

  // ---- Science Springs: a bright strip of springs, greenhouses and a water lab above Math Meadow -------------
  const rnd = mulberry32(2026);   // its own random stream, so nothing in the old world moves
  const sci = { x: 1, y: 1, w: 22, h: OY - 1 };
  zones.push({ id: 'science', name: ZONE_NAMES.science, rect: sci });
  const scenery = new Set(), walls = new Set();
  const wallRect = (x, y, w, h) => { fillRect(data, x, y, w, h, TID.tree); for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) walls.add(`${tx},${ty}`); };
  fillRect(data, sci.x, sci.y, sci.w, sci.h, TID.springs);
  sprinkle(data, rnd, sci, TID.springs, TID.tree, 0.04, scenery);
  fillRect(data, 8, 1, 2, OY - 1, TID.water);                 // the spring's stream, running down the land (fishable)
  wallRect(0, 0, W, 1); wallRect(0, 0, 1, OY); wallRect(W - 1, 0, 1, OY);
  wallRect(23, 1, W - 24, OY - 1);                            // the pine forest east of the springs
  hline(data, 2, 22, 9, TID.path); vline(data, 22, 9, OY - 1, TID.path);   // the high street, fording the stream, and the lane to the archway
  bossSpots.science = (() => { const door = building(data, 2, 2, 5, 4, BUILDING_STYLES.castle); buildings.push({ zone: 'science', style: 'castle', x: 2, y: 2, w: 5, h: 4, door }); return { tx: door.tx, ty: door.ty + 1 }; })();
  fillRect(data, 2, 6, 5, 3, TID.path);                       // the castle's forecourt, down to the street
  const place = (npcId, x, y) => {
    const door = building(data, x, y, 3, 3, BUILDING_STYLES.science);
    buildings.push({ zone: 'science', style: 'science', x, y, w: 3, h: 3, door });
    const spot = { tx: door.tx, ty: door.ty + 1 };
    data[spot.ty][spot.tx] = TID.path;
    npcSpots[npcId] = spot;
  };
  place('botanist', 11, 6); place('ranger-rio', 15, 6); place('captain-cork', 19, 6);   // three greenhouses along the street
  place('dr-misty', 13, 10); vline(data, 16, 10, 13, TID.path); hline(data, 14, 16, 13, TID.path);   // the water lab, on a lane of its own
  data[OY][22] = TID.gateOpen; gates.push({ zone: 'science', tx: 22, ty: OY });   // the archway, in the old top border
  vline(data, 22, OY + 1, OY + 16, TID.path);                 // the road from the archway down to the plaza
  clearBoxedTrees(data, scenery, walls, zones);
  coins.push({ tx: 10, ty: 9 }, { tx: 18, ty: 9 }, { tx: 22, ty: 11 });   // appended: saves keep coins by index

  // ---- History Harbor: an island in the bay south of Code Cove, reached by a pier -----------------------------
  // The sea fills the bottom rows; the quay is an island with a row of chattel houses, a lighthouse and a fort at
  // its east end. A wooden pier runs from the beach promenade over the sea (through the old bottom border) onto
  // the quay, and a little jetty of the harbour's own sticks out on the west side for the fishing boats.
  const har = { x: 1, y: H1, w: W - 2, h: HS - 1 };
  zones.push({ id: 'history', name: ZONE_NAMES.history, rect: har });
  fillRect(data, 0, H1, W, HS, TID.water);
  const island = { x: 10, y: H1 + 1, w: 36, h: 7 };
  fillRect(data, island.x, island.y, island.w, island.h, TID.quay);
  const pier = { tx: 24, y0: OY + 34, y1: H1 };
  vline(data, pier.tx, pier.y0, H1 - 2, TID.path);           // the pier, from the beach out over the sea
  data[H1 - 1][pier.tx] = TID.gateOpen; gates.push({ zone: 'history', tx: pier.tx, ty: H1 - 1 });   // through the old bottom border
  vline(data, pier.tx, H1, H1 + 5, TID.path);                // and across the bay onto the quay
  hline(data, 11, 43, H1 + 5, TID.path);                     // the quay road, the chattel houses along it
  const jetty = { x0: 5, x1: 9, ty: H1 + 5 };
  hline(data, jetty.x0, 11, jetty.ty, TID.path);             // the west jetty
  const hplace = (npcId, x, y, style) => {
    const door = building(data, x, y, 3, 3, style);
    buildings.push({ zone: 'history', style: 'history', x, y, w: 3, h: 3, door });
    const spot = { tx: door.tx, ty: door.ty + 1 };
    data[spot.ty][spot.tx] = TID.path;
    npcSpots[npcId] = spot;
  };
  hplace('captain-compass', 12, H1 + 2, BUILDING_STYLES.history); hplace('mayor-marigold', 18, H1 + 2, BUILDING_STYLES.history2);
  hplace('flora', 28, H1 + 2, BUILDING_STYLES.history3); hplace('old-tom', 34, H1 + 2, BUILDING_STYLES.history);
  const lighthouse = { tx: 38, ty: H1 + 3 };                 // on paving beside Old Tom's house (drawn in scenes/world/decor.js)
  data[H1 + 2][lighthouse.tx] = data[H1 + 3][lighthouse.tx] = TID.quayStone;
  bossSpots.history = (() => { const door = building(data, 40, H1 + 1, 5, 4, BUILDING_STYLES.fort); buildings.push({ zone: 'history', style: 'fort', x: 40, y: H1 + 1, w: 5, h: 4, door }); return { tx: door.tx, ty: door.ty + 1 }; })();
  data[H1 + 7][16] = data[H1 + 7][31] = TID.tree;            // two palms on the south quay
  coins.push({ tx: 22, ty: H1 + 5 }, { tx: 32, ty: H1 + 5 }, { tx: pier.tx, ty: H1 + 2 });

  // ---- Melody Market: a festival square carved out of the forest east of the springs, above Word Woods --------
  // A market hall at the top (the boss's), four striped stalls round a paved square, and an archway down through
  // the old top border into Word Woods, where a lane runs south to the woods' own road.
  const mkt = { x: 24, y: 1, w: 15, h: 13 };
  zones.push({ id: 'music', name: ZONE_NAMES.music, rect: mkt });
  fillRect(data, mkt.x, mkt.y, mkt.w, mkt.h, TID.fair);                 // the forest's tree walls stay either side (columns 23 and 39)
  const mrnd = mulberry32(2028), mscenery = new Set();
  sprinkle(data, mrnd, mkt, TID.fair, TID.tree, 0.05, mscenery);
  fillRect(data, 29, 7, 7, 4, TID.path);                                 // the market square
  hline(data, 26, 37, 6, TID.path);                                      // the lane along the top of the square, past the hall's door
  hline(data, 26, 28, 10, TID.path); hline(data, 35, 37, 10, TID.path);  // and out to the two lower stalls
  vline(data, 36, 11, OY - 1, TID.path);                                 // down to the archway
  data[OY][36] = TID.gateOpen; gates.push({ zone: 'music', tx: 36, ty: OY });
  vline(data, 36, OY + 1, OY + 6, TID.path);                             // through Word Woods to its lane
  bossSpots.music = (() => { const door = building(data, 30, 2, 5, 4, BUILDING_STYLES.hall); buildings.push({ zone: 'music', style: 'hall', x: 30, y: 2, w: 5, h: 4, door }); return { tx: door.tx, ty: door.ty + 1 }; })();
  const mplace = (npcId, x, y) => {
    const door = building(data, x, y, 3, 3, BUILDING_STYLES.music);
    buildings.push({ zone: 'music', style: 'music', x, y, w: 3, h: 3, door });
    const spot = { tx: door.tx, ty: door.ty + 1 };
    data[spot.ty][spot.tx] = TID.path;
    npcSpots[npcId] = spot;
  };
  mplace('note-seller', 25, 2); mplace('singer', 36, 2); mplace('drummer', 25, 7); mplace('luthier', 36, 7);
  vline(data, 26, 5, 6, TID.path); vline(data, 37, 5, 6, TID.path);     // from the two top stalls down to the lane
  clearBoxedTrees(data, mscenery, new Set(), zones);
  coins.push({ tx: 33, ty: 8 }, { tx: 28, ty: 10 }, { tx: 36, ty: 12 });
  const market = { square: { x: 29, y: 7, w: 7, h: 4 } };

  // ---- Studio Summit: an artists' plateau in the forest east of the market, drawn as one picture ------------------
  // The whole land is a single drawn picture (public/sprites/world/studio/summit.png) laid over fifteen by fifteen
  // squares, columns 40 to 54 and rows 0 to 14; the map only says where its floor can be walked. 'o' is floor, '#'
  // rock, building, easel or fence under the picture, 'T' forest in the picture's corners, 'c' a coin on the floor and
  // 'g' the gate at the foot of the stairs, which lead down into Word Woods.
  const SUMMIT = {
    x: 40, y: 0, w: 15, h: 15,
    rows: [
      'TTTTTTTT###TTTT',
      'TTT##T#####TTTT',
      'TT##########TTT',
      'TT##########TTT',
      'T###co#######TT',
      'T###oo#######TT',
      '#####o#########',
      '#####o#########',
      '###o#o#ooo#####',
      '##ooocoooo#####',
      '####ooooo######',
      '###oooooc######',
      '####oo#########',
      'T###oo########T',
      'TT##og#####TTTT'
    ]
  };
  const studio = { x: SUMMIT.x, y: 1, w: SUMMIT.w, h: 13 };
  zones.push({ id: 'studio', name: ZONE_NAMES.studio, rect: studio });
  SUMMIT.rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const tx = SUMMIT.x + c, ty = SUMMIT.y + r;
    data[ty][tx] = ch === 'o' ? TID.clay : ch === 'c' ? TID.path : ch === 'g' ? TID.gateOpen : ch === 'T' ? TID.tree : TID.cliff;
    if (ch === 'c') coins.push({ tx, ty });
    if (ch === 'g') gates.push({ zone: 'studio', tx, ty });
  }));
  vline(data, 45, OY + 1, OY + 6, TID.path); hline(data, 43, 45, OY + 7, TID.path);   // down through Word Woods to its lane
  npcSpots.painter = { tx: 43, ty: 8 }; npcSpots.sculptor = { tx: 49, ty: 9 }; npcSpots['mirror-mia'] = { tx: 43, ty: 11 }; npcSpots.curator = { tx: 46, ty: 11 };
  bossSpots.studio = { tx: 47, ty: 8 };   // in front of the studio's door
  const summit = { x: SUMMIT.x, y: SUMMIT.y, w: SUMMIT.w, h: SUMMIT.h };

  // ---- The hospital: on the grass above the player's house, its path joining the road up to the springs -----------
  const hospitalDoor = building(data, 16, 23, 5, 4, BUILDING_STYLES.hall);
  buildings.push({ zone: 'hub', style: 'hospital', x: 16, y: 23, w: 5, h: 4, door: hospitalDoor });
  const hospital = { door: hospitalDoor, front: { tx: hospitalDoor.tx, ty: hospitalDoor.ty + 1 }, x: 16, y: 23, w: 5, h: 4 };
  hline(data, hospitalDoor.tx, 22, hospitalDoor.ty + 1, TID.path);         // from the door across to the springs road
  npcSpots.nurse = { tx: hospitalDoor.tx + 1, ty: hospitalDoor.ty + 1 };  // the nurse waits beside the door

  return {
    width: W, height: H, data, spawn: down(old.spawn), zones, gates, npcSpots, bossSpots, buildings, coins,
    signSpot: down(old.signSpot), bellSpot: down(old.bellSpot), marketSpot: down(old.marketSpot), home, church,
    trail: TRAIL_STONES, bridge: TRAIL_BRIDGE, fishSign: down(old.fishSign), fountain: down(old.fountain), questBoard: down(old.questBoard),
    island, pier, jetty, lighthouse, market, hospital, summit
  };
}

/** Ground tile shown beneath a tree (trees are drawn on an overlay layer so the local ground shows through). */
export function groundUnder(map, tx, ty) {
  const z = zoneAt(map, tx, ty);
  return (z && GROUND_OF[z]) ?? TID.grass;
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
