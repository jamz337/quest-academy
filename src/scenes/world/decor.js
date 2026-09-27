// Static dressing of the overworld: shoreline foam, path edges and building shadows baked into one texture,
// the hub signpost, the player's house name plate and the star rows above villagers' houses.
import { TILE } from '../../constants.js';
import * as Store from '../../systems/Store.js';
import { signpost } from '../../ui/Signpost.js';
import { TID, ROOF_TILES, WALL_TILES, DOOR_TILES } from '../../data/world/map.js';
import { NPCS } from '../../data/world/npcs.js';
import { houseStars } from '../../systems/Progression.js';

/**
 * One-off overlay baked into a RenderTexture: foam along shorelines, a soft inset edge around paths and
 * shadows cast by buildings. Cheap at runtime (a single texture) and keeps the tileset itself simple.
 */
export function drawDecor(w) {
  const { data, width: W, height: H } = w.map;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : data[y][x]);
  const PATHY = new Set([TID.path, ...DOOR_TILES, TID.gateLocked, TID.gateOpen]);
  const BUILDING = new Set([...WALL_TILES, ...ROOF_TILES, ...DOOR_TILES]);
  const g = w.make.graphics({ add: false });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = at(x, y), px = x * TILE, py = y * TILE;
    if (id === TID.water) {
      g.fillStyle(0xe4f6ff, 0.6);
      if (at(x, y - 1) !== TID.water) g.fillRect(px, py, TILE, 3);
      if (at(x - 1, y) !== TID.water) g.fillRect(px, py, 3, TILE);
      if (at(x + 1, y) !== TID.water) g.fillRect(px + TILE - 3, py, 3, TILE);
      g.fillStyle(0x0b4f8a, 0.3);
      if (at(x, y + 1) !== TID.water) g.fillRect(px, py + TILE - 3, TILE, 3);
    } else if (PATHY.has(id)) {
      g.fillStyle(0x000000, 0.13);
      if (!PATHY.has(at(x, y - 1))) g.fillRect(px, py, TILE, 3);
      if (!PATHY.has(at(x - 1, y))) g.fillRect(px, py, 2, TILE);
      if (!PATHY.has(at(x + 1, y))) g.fillRect(px + TILE - 2, py, 2, TILE);
      if (!PATHY.has(at(x, y + 1))) g.fillRect(px, py + TILE - 2, TILE, 2);
    } else if (BUILDING.has(id)) {
      g.fillStyle(0x000000, 0.22);
      if (!BUILDING.has(at(x + 1, y))) g.fillRect(px + TILE, py + 4, 4, TILE);
      if (!BUILDING.has(at(x, y + 1)) && !DOOR_TILES.includes(id)) g.fillRect(px + 4, py + TILE, TILE, 4);
    }
  }
  const rt = w.add.renderTexture(0, 0, W * TILE, H * TILE).setOrigin(0).setDepth(1);
  rt.draw(g);
  g.destroy();
}

/** The signpost beside Sam (with a post the player cannot walk through) and the name plate on the player's house. */
export function createLandmarks(w, profile) {
  const sign = w.map.signSpot;
  if (sign) {
    const sx = (sign.tx + 0.5) * TILE, sy = (sign.ty + 0.5) * TILE;
    w.signpost = signpost(w, sx, sy).setDepth(11);
    const post = w.add.rectangle(sx, sy - 3, 12, 8).setVisible(false);
    w.physics.add.existing(post, true);
    if (w.player) w.physics.add.collider(w.player, post);
  }
  const home = w.map.home;
  if (home) {
    const cx = (home.x + home.w / 2) * TILE, cy = (home.y - 0.35) * TILE;
    w.homePlate = w.add.text(cx, cy, `${profile.name}'s house`, { fontFamily: 'Fredoka, sans-serif', fontSize: '9px', color: '#2d2a4a', backgroundColor: '#fff8ef', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(4).setResolution(4);
  }
}

/** Three small stars above every villager's house, lit as the game's levels are passed. */
export function createHouseStars(w) {
  w.houseStarSprites = {};
  for (const npc of NPCS) {
    if (!npc.gameId) continue;
    const spot = w.map.npcSpots[npc.id];
    const b = spot && w.map.buildings.find((x) => x.door && x.door.tx === spot.tx && x.door.ty === spot.ty - 1);
    if (!b) continue;
    const cx = (b.x + b.w / 2) * TILE, cy = (b.y - 0.35) * TILE;
    w.houseStarSprites[npc.gameId] = [0, 1, 2].map((i) => w.add.image(cx + (i - 1) * 11, cy, 'star-off').setDisplaySize(10, 10).setDepth(4));
  }
  refreshHouseStars(w);
}

export function refreshHouseStars(w) {
  const p = Store.getProfile();
  if (!p) return;
  for (const [gameId, imgs] of Object.entries(w.houseStarSprites || {})) {
    const n = houseStars(p, gameId);
    imgs.forEach((img, i) => { if (img.active) img.setTexture(i < n ? 'star' : 'star-off'); });
  }
}
