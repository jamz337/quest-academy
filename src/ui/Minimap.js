import Phaser from 'phaser';
import { THEME, hex } from './theme.js';
import { TID } from '../data/world/map.js';
import { isExplored } from '../data/world/explore.js';
import { FONT, WEIGHT } from './TextStyles.js';

// The map is painted as a little illustration: soft ground colours for each land, roads as rounded ribbons, water
// with rounded banks, trees as round tufts and every building as a small house in its land's colour.
const GROUND = {
  [TID.grass]: '#63c765', [TID.flower]: '#63c765', [TID.meadow]: '#c3e266', [TID.woods]: '#3f9d4a', [TID.cove]: '#f0dfae', [TID.village]: '#a3d66f', [TID.springs]: '#9fe6d9', [TID.quay]: '#d8d3c8'
};
const ZONE_GROUND = { math: GROUND[TID.meadow], words: GROUND[TID.woods], code: GROUND[TID.cove], bible: GROUND[TID.village], science: GROUND[TID.springs], history: GROUND[TID.quay] };
const ROOFS = { math: '#4c8df6', words: '#249762', code: '#e8623f', bible: '#8566ee', science: '#12a3b0', history: '#30589c', hub: '#ff6fae' };
const ROAD = '#f0d6a4', ROAD_EDGE = '#d2ae6c', WATER = '#58aef7', WATER_DEEP = '#3d8be0';
const FOG = '#2d2a4a';
/** Pixels of the map texture per tile. */
export const MAP_RES = 8;
export const MINIMAP_TEXTURE = 'minimap';

const zoneOf = (map, tx, ty) => { for (const z of map.zones || []) { const r = z.rect; if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return z.id; } return null; };
const isRoad = (id) => id === TID.path || id === TID.gateOpen || id === TID.gateLocked;

/**
 * Paint the map into a canvas texture (MAP_RES px per tile) with the unexplored parts under soft cloud. Redrawn
 * whenever the explored set changes.
 */
export function paintMinimap(scene, map, explored) {
  const key = MINIMAP_TEXTURE, R = MAP_RES, W = map.width * R, H = map.height * R;
  const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  if (!ctx || typeof ctx.beginPath !== 'function') return key;   // headless tests have no real canvas
  const at = (x, y) => (map.data[y] ? map.data[y][x] : undefined);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
  // Ground: each tile takes its own ground colour, or its land's where something stands on it.
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    ctx.fillStyle = GROUND[at(tx, ty)] || ZONE_GROUND[zoneOf(map, tx, ty)] || GROUND[TID.grass];
    ctx.fillRect(tx * R, ty * R, R, R);
  }
  // Water with rounded banks and a lighter middle.
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const water = [];
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) if (at(tx, ty) === TID.water) water.push([tx, ty]);
  ctx.fillStyle = WATER_DEEP; ctx.strokeStyle = WATER_DEEP; ctx.lineWidth = R * 0.5;
  for (const [tx, ty] of water) { ctx.fillRect(tx * R, ty * R, R, R); ctx.strokeRect(tx * R, ty * R, R, R); }
  ctx.fillStyle = WATER;
  for (const [tx, ty] of water) ctx.fillRect(tx * R - 0.5, ty * R - 0.5, R + 1, R + 1);
  // Roads: ribbons joining neighbouring road tiles (and the plinths the fountain stands on), edge first.
  const roadLike = (x, y) => isRoad(at(x, y)) || at(x, y) === TID.plinth || DOOR_IDS.has(at(x, y));
  for (const [colour, width] of [[ROAD_EDGE, R * 1.05], [ROAD, R * 0.78]]) {
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath();
    for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
      if (!roadLike(tx, ty)) continue;
      const cx = (tx + 0.5) * R, cy = (ty + 0.5) * R;
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy);
      if (roadLike(tx + 1, ty)) { ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); }
      if (roadLike(tx, ty + 1)) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + R); }
    }
    ctx.stroke();
  }
  // Open squares of road (the plaza, forecourts) are filled in, so the ribbons leave no gaps.
  ctx.fillStyle = ROAD;
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    if (!roadLike(tx, ty)) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => roadLike(tx + dx, ty + dy)).length;
    if (n >= 3) ctx.fillRect(tx * R - 0.5, ty * R - 0.5, R + 1, R + 1);
  }
  // Trees: round tufts with a highlight.
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    if (at(tx, ty) !== TID.tree) continue;
    const cx = (tx + 0.5) * R, cy = (ty + 0.5) * R;
    ctx.fillStyle = '#23803f'; ctx.beginPath(); ctx.arc(cx, cy + R * 0.06, R * 0.56, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#37a455'; ctx.beginPath(); ctx.arc(cx - R * 0.08, cy - R * 0.1, R * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // Buildings: a little house in the land's colour; castles in stone with a flag.
  for (const bld of map.buildings || []) {
    const x = bld.x * R, y = bld.y * R, w = bld.w * R, h = bld.h * R, castle = bld.style === 'castle';
    ctx.fillStyle = 'rgba(30,27,75,0.22)'; ctx.beginPath(); ctx.roundRect(x + R * 0.25, y + R * 0.45, w, h - R * 0.2, R * 0.5); ctx.fill();
    ctx.fillStyle = castle ? '#aab1c2' : '#fff6e6'; ctx.beginPath(); ctx.roundRect(x + R * 0.1, y + R * 0.2, w - R * 0.2, h - R * 0.3, R * 0.45); ctx.fill();
    ctx.fillStyle = castle ? '#7d869b' : ROOFS[bld.zone] || ROOFS.hub;
    ctx.beginPath(); ctx.roundRect(x + R * 0.1, y + R * 0.2, w - R * 0.2, h * 0.5, [R * 0.45, R * 0.45, 0, 0]); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.roundRect(x + w / 2 - R * 0.3, y + h - R * 0.95, R * 0.6, R * 0.85, R * 0.2); ctx.fill();
    if (castle) { ctx.fillStyle = ROOFS[bld.zone] || '#e8623f'; ctx.fillRect(x + w / 2 - R * 0.08, y - R * 0.5, R * 0.16, R * 0.9); ctx.beginPath(); ctx.moveTo(x + w / 2, y - R * 0.5); ctx.lineTo(x + w / 2 + R * 0.8, y - R * 0.2); ctx.lineTo(x + w / 2, y + R * 0.1); ctx.fill(); }
  }
  // The fountain in the plaza.
  if (map.fountain) {
    const f = map.fountain, cx = (f.tx + f.w / 2) * R, cy = (f.ty + f.h / 2) * R;
    ctx.fillStyle = '#dcd8e6'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = WATER; ctx.beginPath(); ctx.arc(cx, cy, R * 1.0, 0, Math.PI * 2); ctx.fill();
  }
  // Cloud over what has not been explored: soft rounded puffs, all one shade.
  const fog = fogCanvas(W, H), fx = fog.getContext('2d');
  fx.clearRect(0, 0, W, H); fx.fillStyle = FOG;
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    if (isExplored(explored, tx, ty)) continue;
    fx.beginPath(); fx.arc((tx + 0.5) * R, (ty + 0.5) * R, R * 0.95, 0, Math.PI * 2); fx.fill();
  }
  ctx.globalAlpha = 0.86; ctx.drawImage(fog, 0, 0); ctx.globalAlpha = 1;
  tex.refresh();
  return key;
}
const DOOR_IDS = new Set([TID.door, TID.doorMath, TID.doorWords, TID.doorCode, TID.doorBible, TID.doorScience, TID.doorHistory, TID.castleDoor]);
let fogScratch = null;
function fogCanvas(w, h) {
  if (!fogScratch) fogScratch = document.createElement('canvas');
  if (fogScratch.width !== w || fogScratch.height !== h) { fogScratch.width = w; fogScratch.height = h; }
  return fogScratch;
}

/**
 * The corner map: a framed image of the minimap texture with a player dot and markers on top.
 * opts: { scale (CSS px per tile), onTap }. Call update({ tx, ty, markers }) as the player moves;
 * markers: [{ tx, ty, kind: 'errand'|'boss'|'home'|'bossDone'|'church' }].
 */
export class Minimap extends Phaser.GameObjects.Container {
  constructor(scene, x, y, map, opts = {}) {
    super(scene, x, y);
    const { scale = 2, onTap = null } = opts;
    this.map = map; this.px = scale;
    const w = map.width * scale, h = map.height * scale;
    this.w = w; this.h = h;
    const frame = scene.add.graphics();
    frame.fillStyle(THEME.ink, 0.18); frame.fillRoundedRect(-4, -1, w + 8, h + 8, 10);
    frame.fillStyle(THEME.surface, 1); frame.fillRoundedRect(-4, -4, w + 8, h + 8, 10);
    this.image = scene.add.image(0, 0, MINIMAP_TEXTURE).setOrigin(0).setDisplaySize(w, h);
    this.markers = scene.add.container(0, 0);
    this.player = scene.add.circle(0, 0, Math.max(3, scale * 1.3), THEME.danger, 1).setStrokeStyle(Math.max(1.5, scale * 0.35), 0xffffff, 1);
    if (scene.tweens) scene.tweens.add({ targets: this.player, scale: 1.25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.label = scene.add.text(w - 3, h - 2, 'MAP', { fontFamily: FONT, fontSize: '8px', color: hex(THEME.onAccent), fontStyle: WEIGHT.heavy }).setOrigin(1, 1).setAlpha(0.8);
    this.add([frame, this.image, this.markers, this.player, this.label]);
    this.setSize(w + 8, h + 8);
    if (onTap) {
      const zone = scene.add.zone(w / 2, h / 2, w + 8, h + 8).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => onTap());
      this.add(zone);
    }
    scene.add.existing(this);
  }

  at(tx, ty) { return { x: (tx + 0.5) * this.px, y: (ty + 0.5) * this.px }; }

  /** Move the player dot, redraw the markers and, when the fog changed, repaint the texture. */
  update({ tx, ty, markers = [], repaint = false, explored = null } = {}) {
    if (!this.active) return;
    if (repaint && explored) { paintMinimap(this.scene, this.map, explored); this.image.setTexture(MINIMAP_TEXTURE).setDisplaySize(this.w, this.h); }
    if (Number.isFinite(tx) && Number.isFinite(ty)) { const p = this.at(tx, ty); this.player.setPosition(p.x, p.y); }
    const key = markers.map((m) => `${m.kind}${m.tx},${m.ty}`).join('|');
    if (key === this.markerKey) return;
    this.markerKey = key;
    this.markers.removeAll(true);
    for (const m of markers) {
      const p = this.at(m.tx, m.ty), s = this.scene;
      if (m.kind === 'errand') {
        const star = s.add.image(p.x, p.y, 'star').setDisplaySize(this.px * 4, this.px * 4);
        s.tweens.add({ targets: star, scale: star.scale * 1.35, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.markers.add(star);
      } else if (m.kind === 'boss' || m.kind === 'bossDone') {
        this.markers.add(s.add.star(p.x, p.y - this.px * 1.2, 5, this.px * 0.7, this.px * 1.5, m.kind === 'boss' ? THEME.danger : THEME.ink3, 1).setStrokeStyle(1, 0xffffff, 0.9));
      } else if (m.kind === 'home') {
        this.markers.add(s.add.circle(p.x, p.y, this.px, THEME.pink, 1).setStrokeStyle(1, 0xffffff, 0.9));
      } else if (m.kind === 'church') {
        this.markers.add(s.add.circle(p.x, p.y, this.px, THEME.brand, 1).setStrokeStyle(1, 0xffc531, 0.9));
      }
    }
  }
}
