import Phaser from 'phaser';
import { THEME, hex } from './theme.js';
import { TID } from '../data/world/map.js';
import { isExplored } from '../data/world/explore.js';
import { FONT, WEIGHT } from './TextStyles.js';

// One colour per tile id. Buildings take their neighbourhood's roof colour so the lands read at a glance.
const TILE_COLOUR = {
  [TID.grass]: '#5cc45a', [TID.flower]: '#6fd06a', [TID.meadow]: '#7ad36a', [TID.woods]: '#3f9a45', [TID.cove]: '#e9d8a6', [TID.village]: '#9ad06a',
  [TID.path]: '#d9b98a', [TID.water]: '#4aa8ff', [TID.tree]: '#2f7a36', [TID.gateLocked]: '#8a5a3c', [TID.gateOpen]: '#d9b98a',
  [TID.roof]: '#b5443c', [TID.wall]: '#e8d9b5', [TID.door]: '#5a3a22',
  [TID.roofMath]: '#d9a066', [TID.wallMath]: '#f1e2c2', [TID.doorMath]: '#5a3a22',
  [TID.roofWords]: '#8a5a3c', [TID.wallWords]: '#b27c4e', [TID.doorWords]: '#5a3a22',
  [TID.roofCode]: '#7c8ca0', [TID.wallCode]: '#b8c4d4', [TID.doorCode]: '#2d2a4a',
  [TID.roofBible]: '#9c8f8a', [TID.wallBible]: '#d6cfc4', [TID.doorBible]: '#5a3a22',
  [TID.castleTop]: '#8a94a6', [TID.castleWall]: '#a9b1bf', [TID.castleDoor]: '#2d2a4a'
};
const FOG = 'rgba(45,42,74,0.88)';
export const MINIMAP_TEXTURE = 'minimap';

/**
 * Paint the map into a canvas texture, one pixel per tile, with unexplored tiles fogged. Cheap enough to
 * redraw whenever the explored set changes (a few thousand 1px fills).
 */
export function paintMinimap(scene, map, explored) {
  const key = MINIMAP_TEXTURE;
  const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, map.width, map.height);
  const ctx = tex.getContext();
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    ctx.fillStyle = TILE_COLOUR[map.data[ty][tx]] || '#5cc45a';
    ctx.fillRect(tx, ty, 1, 1);
    if (!isExplored(explored, tx, ty)) { ctx.fillStyle = FOG; ctx.fillRect(tx, ty, 1, 1); }
  }
  tex.refresh();
  if (typeof tex.setFilter === 'function') tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
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
    frame.fillStyle(THEME.ink, 0.18); frame.fillRoundedRect(-4, -1, w + 8, h + 8, 8);
    frame.fillStyle(THEME.surface, 1); frame.fillRoundedRect(-4, -4, w + 8, h + 8, 8);
    this.image = scene.add.image(0, 0, MINIMAP_TEXTURE).setOrigin(0).setDisplaySize(w, h);
    this.markers = scene.add.container(0, 0);
    this.player = scene.add.circle(0, 0, Math.max(2.5, scale * 1.2), THEME.danger, 1).setStrokeStyle(1.5, 0xffffff, 1);
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
        this.markers.add(s.add.rectangle(p.x, p.y, this.px * 2.2, this.px * 2.2, m.kind === 'boss' ? THEME.danger : THEME.ink3, 1).setStrokeStyle(1, 0xffffff, 0.9));
      } else if (m.kind === 'home') {
        this.markers.add(s.add.circle(p.x, p.y, this.px, THEME.pink, 1).setStrokeStyle(1, 0xffffff, 0.9));
      } else if (m.kind === 'church') {
        this.markers.add(s.add.circle(p.x, p.y, this.px, THEME.brand, 1).setStrokeStyle(1, 0xffc531, 0.9));
      }
    }
  }
}
