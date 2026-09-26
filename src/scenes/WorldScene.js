import Phaser from 'phaser';
import { C, SCENES, TILE } from '../constants.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { unlockedZones } from '../systems/Progression.js';
import { getGame } from '../data/minigames.js';
import { bandFor } from '../data/grades.js';
import { buildMap, zoneAt, isWalkable, groundUnder, TID, GATE_HINTS, ZONE_NAMES } from '../data/world/map.js';
import { NPCS } from '../data/world/npcs.js';
import { InputController } from '../systems/InputController.js';
import { Sfx } from '../systems/Audio.js';
import { toast } from '../ui/Toast.js';

const SPEED = 110;          // px/s
const TALK_DIST = 44;       // px between player and NPC centres
const CHAR_SCALE = 2;       // 16px sheets drawn at tile size
const IDLE_FRAME = { down: 0, up: 2, side: 4 };
const HELLO_COINS = 5;

/**
 * Free-roam overworld. Unlike the menu scenes this is NOT rebuilt on resize: the tilemap and sprites
 * persist and only the camera zoom is recomputed. All UI lives in HudScene, which floats on top.
 */
export class WorldScene extends Phaser.Scene {
  constructor() { super(SCENES.World); }

  create() {
    const profile = Store.getProfile();
    if (!profile) return this.scene.start(SCENES.Profile);

    this.map = buildMap();
    // Ground layer (trees replaced by the local ground) plus a transparent tree layer drawn above the decor.
    const ground = this.map.data.map((row, ty) => row.map((id, tx) => (id === TID.tree ? groundUnder(this.map, tx, ty) : id)));
    const tilemap = this.make.tilemap({ data: ground, tileWidth: TILE, tileHeight: TILE });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    this.layer = tilemap.createLayer(0, tileset, 0, 0);
    this.layer.setCollision([TID.water, TID.wall, TID.roof, TID.gateLocked]);
    this.drawDecor();
    this.treeLayer = tilemap.createBlankLayer('trees', tileset, 0, 0).setDepth(2);
    this.map.data.forEach((row, ty) => row.forEach((id, tx) => { if (id === TID.tree) this.treeLayer.putTileAt(TID.tree, tx, ty); }));
    this.treeLayer.setCollision([TID.tree]);
    this.tilemap = tilemap;
    this.physics.world.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);
    this.syncGates(profile, false);

    this.createPlayer(profile);
    this.createNpcs();
    this.createCoins(profile);
    this.bubble = this.add.image(0, 0, 'bubble').setScale(1.5).setDepth(20).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();

    this.controls = new InputController(this);
    this.facing = 'down';
    this.currentZone = undefined;
    this.wasBlocked = false;
    this.nearNpc = null;

    this.launchHud();
    this.zoneTimer = this.time.addEvent({ delay: 200, loop: true, callback: this.tick, callbackScope: this });

    // Lifecycle
    this.onResize = () => this.applyZoom();
    this.onVisibility = () => { if (typeof document !== 'undefined' && document.hidden) this.savePosition(); };
    this.onResumeBound = () => this.onResume();
    this.onPauseBound = () => this.stopPlayer();
    this.scale.on('resize', this.onResize);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
    this.events.on('resume', this.onResumeBound);
    this.events.on('pause', this.onPauseBound);
    this.events.once('shutdown', () => this.cleanup());
  }

  // ---- Setup ---------------------------------------------------------------------------------

  createPlayer(profile) {
    const { spawn } = this.map;
    let x = (spawn.tx + 0.5) * TILE, y = (spawn.ty + 0.5) * TILE;
    const w = profile.world || {};
    if (Number.isFinite(w.x) && Number.isFinite(w.y)) {
      const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
      const row = this.map.data[ty];
      if (row && row[tx] !== undefined && isWalkable(row[tx])) { x = w.x; y = w.y; }
    }
    const key = `char${Number.isInteger(profile.avatar) ? profile.avatar : 0}`;
    this.player = this.physics.add.sprite(x, y, this.textures.exists(key) ? key : 'char0', 0).setScale(CHAR_SCALE).setDepth(10);
    this.player.body.setSize(10, 8).setOffset(3, 8);   // feet-sized box so doors and gaps feel fair
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.player, this.treeLayer);
  }

  createNpcs() {
    this.npcGroup = this.physics.add.staticGroup();
    this.npcs = [];
    for (const def of NPCS) {
      const spot = this.map.npcSpots[def.id];
      if (!spot) continue;
      const key = this.textures.exists(def.sprite) ? def.sprite : 'npc0';
      const s = this.npcGroup.create((spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE, key, 0);
      s.setScale(CHAR_SCALE).setDepth(5).refreshBody();
      s.body.setSize(22, 22);
      s.npc = def;
      this.npcs.push(s);
    }
    this.physics.add.collider(this.player, this.npcGroup);
  }

  createCoins(profile) {
    this.coinGroup = this.physics.add.staticGroup();
    const taken = new Set(profile.world.coinsCollected || []);
    this.map.coins.forEach((c, i) => {
      if (taken.has(i)) return;
      const img = this.coinGroup.create((c.tx + 0.5) * TILE, (c.ty + 0.5) * TILE, 'coin');
      img.setScale(0.7).setDepth(3).refreshBody();
      img.body.setSize(18, 18);
      img.setData('idx', i);
      this.tweens.add({ targets: img, y: img.y - 3, duration: 500 + (i % 4) * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => this.collectCoin(coin));
  }

  /**
   * One-off overlay baked into a RenderTexture: foam along shorelines, a soft inset edge around paths and
   * shadows cast by buildings. Cheap at runtime (a single texture) and keeps the tileset itself simple.
   */
  drawDecor() {
    const { data, width: W, height: H } = this.map;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : data[y][x]);
    const PATHY = new Set([TID.path, TID.door, TID.gateLocked, TID.gateOpen]);
    const BUILDING = new Set([TID.wall, TID.roof, TID.door]);
    const g = this.make.graphics({ add: false });
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
        if (!BUILDING.has(at(x, y + 1)) && id !== TID.door) g.fillRect(px + 4, py + TILE, TILE, 4);
      }
    }
    const rt = this.add.renderTexture(0, 0, W * TILE, H * TILE).setOrigin(0).setDepth(1);
    rt.draw(g);
    g.destroy();
  }

  applyZoom() {
    const cam = this.cameras.main;
    if (!cam) return;
    cam.setZoom(Math.min(this.scale.width, this.scale.height) < 600 ? 2 : 3);
  }

  // ---- Hud bridge ----------------------------------------------------------------------------

  hud() {
    const h = this.scene.get(SCENES.Hud);
    return h && h.state && (h.scene.isActive() || h.scene.isSleeping()) ? h : null;
  }

  launchHud() {
    const key = SCENES.Hud;
    if (!this.scene.get(key)) { console.warn('HudScene is not registered; world runs without UI'); return; }
    if (this.scene.isSleeping(key)) this.scene.wake(key);
    else if (!this.scene.isActive(key) && !this.scene.isPaused(key)) this.scene.launch(key);
    this.scene.bringToTop(key);
  }

  /** Toast on the Hud so it is not affected by the camera zoom. */
  say(msg, opts) {
    const hud = this.hud();
    if (hud && hud.scene.isActive()) hud.notify(msg, opts); else toast(this, msg, opts);
  }

  // ---- Per-frame -----------------------------------------------------------------------------

  update(time) {
    if (!this.player || !this.player.body) return;
    const hud = this.hud();
    const inp = this.controls.read();

    if (hud && hud.blocking) {
      this.stopPlayer();
      if (hud.dialogOpen && inp.actionJustPressed) hud.confirmDialog();
      this.wasBlocked = true;
      this.bubble.setVisible(false);
      return;
    }
    const skipAction = this.wasBlocked;   // the press that closed a dialog must not re-open it
    this.wasBlocked = false;

    // Movement (4-way)
    const { dx, dy } = inp;
    this.player.setVelocity(dx * SPEED, dy * SPEED);
    if (dx !== 0 || dy !== 0) {
      const dir = dx !== 0 ? 'side' : dy < 0 ? 'up' : 'down';
      if (dx !== 0) this.player.setFlipX(dx > 0);
      this.facing = dir === 'side' ? (dx > 0 ? 'right' : 'left') : dir;
      this.player.anims.play(`${this.player.texture.key}-${dir}`, true);
    } else this.stopPlayer();

    // Nearest NPC and the "!" bubble
    let near = null, best = TALK_DIST;
    for (const s of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (d < best) { best = d; near = s; }
    }
    this.nearNpc = near;
    if (near) this.bubble.setVisible(true).setPosition(near.x, near.y - 26 + Math.sin(time / 150) * 2);
    else this.bubble.setVisible(false);

    if (inp.actionJustPressed && !skipAction) {
      if (near) this.talk(near);
      else this.inspectGate();
    }
  }

  stopPlayer() {
    if (!this.player || !this.player.body) return;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    const f = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    this.player.setFrame(IDLE_FRAME[f] ?? 0);
  }

  /** Runs every 200ms: zone banner and keeping the Hud counters honest. */
  tick() {
    if (!this.player) return;
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
    this.lastPos = { x: this.player.x, y: this.player.y };
    const z = zoneAt(this.map, tx, ty);
    const hud = this.hud();
    if (z !== this.currentZone) {
      this.currentZone = z;
      const name = z ? ZONE_NAMES[z] : 'Grasslands';
      if (hud) { hud.setZone(name); if (z && !hud.blocking) hud.banner(name); }
    }
    const p = Store.getProfile();
    if (hud && p && hud.state.coins !== p.coins) hud.setCoins(p.coins);
  }

  // ---- Interactions --------------------------------------------------------------------------

  facePlayerTo(target) {
    const dx = target.x - this.player.x, dy = target.y - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) { this.facing = dx > 0 ? 'right' : 'left'; this.player.setFlipX(dx > 0); }
    else this.facing = dy > 0 ? 'down' : 'up';
    this.stopPlayer();
    // NPC turns to face the player too
    if (Math.abs(dx) > Math.abs(dy)) { target.setFrame(IDLE_FRAME.side); target.setFlipX(dx < 0); }
    else target.setFrame(dy > 0 ? IDLE_FRAME.up : IDLE_FRAME.down);
  }

  talk(sprite) {
    const npc = sprite.npc;
    const hud = this.hud();
    this.facePlayerTo(sprite);
    Sfx.pop();
    let firstTalk = false;
    Store.updateProfile((p) => {
      p.world.npcsTalked ||= [];
      if (!p.world.npcsTalked.includes(npc.id)) { p.world.npcsTalked.push(npc.id); p.coins += HELLO_COINS; firstTalk = true; }
    });
    if (!hud) return;
    hud.showDialog({
      name: npc.name, lines: npc.lines, prompt: npc.playPrompt,
      onPlay: npc.gameId ? () => this.playGame(npc) : null
    });
    if (firstTalk) {
      Sfx.coin();
      hud.setCoins(Store.getProfile().coins);
      hud.notify(`+${HELLO_COINS} coins for saying hello!`, { bg: C.orange, icon: 'coin' });
    }
  }

  playGame(npc) {
    const game = getGame(npc.gameId);
    if (!game || !this.scene.get(game.sceneKey)) {
      this.say(`${game ? game.title : 'That game'} is coming soon!`, { bg: C.purple });
      return;
    }
    this.stopPlayer();
    this.savePosition();
    const profile = Store.getProfile();
    let extra = {};
    try { extra = npc.pickContext ? npc.pickContext(profile, bandFor(profile.grade)) || {} : {}; } catch { extra = {}; }
    const context = { npcId: npc.id, zoneId: npc.zone };
    for (const [k, v] of Object.entries(extra)) if (v !== undefined) context[k] = v;
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, npc.gameId, { source: 'roam', context });
  }

  /** Action pressed next to a locked gate: explain how to open it. */
  inspectGate() {
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
    for (const [ox, oy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const tile = this.layer.getTileAt(tx + ox, ty + oy);
      if (!tile || tile.index !== TID.gateLocked) continue;
      const gate = this.map.gates.find((g) => g.tx === tile.x && g.ty === tile.y);
      if (gate) { Sfx.pop(); this.say(GATE_HINTS[gate.zone] || 'This gate is locked.', { bg: C.dark, icon: 'star' }); return; }
    }
  }

  collectCoin(coin) {
    if (!coin.active) return;
    const idx = coin.getData('idx');
    coin.destroy();
    Sfx.coin();
    Store.updateProfile((p) => {
      p.coins += 1;
      p.world.coinsCollected ||= [];
      if (!p.world.coinsCollected.includes(idx)) p.world.coinsCollected.push(idx);
    });
    const hud = this.hud();
    if (hud) hud.setCoins(Store.getProfile().coins);
  }

  /** Open gates for every unlocked zone; with `announce`, celebrate the ones that just opened. */
  syncGates(profile, announce) {
    const open = unlockedZones(profile);
    for (const g of this.map.gates) {
      const tile = this.layer.getTileAt(g.tx, g.ty);
      const isOpen = tile && tile.index === TID.gateOpen;
      if (open.includes(g.zone) && !isOpen) {
        this.layer.putTileAt(TID.gateOpen, g.tx, g.ty);
        if (announce) { Sfx.unlock(); this.say(`${ZONE_NAMES[g.zone]} is open!`, { bg: C.green, icon: 'star' }); }
      }
    }
  }

  // ---- Lifecycle -----------------------------------------------------------------------------

  onResume() {
    const profile = Store.getProfile();
    if (!profile) return;
    this.launchHud();
    this.stopPlayer();
    this.wasBlocked = true;            // swallow the click/key that brought us back
    this.syncGates(profile, true);
    const hud = this.hud();
    if (hud) hud.setCoins(profile.coins);
  }

  savePosition() {
    // By the time our shutdown listener runs Phaser has already destroyed the sprite (its body is
    // gone) but its x/y survive, so read those rather than requiring a live body.
    const px = this.player ? this.player.x : NaN, py = this.player ? this.player.y : NaN;
    const pos = Number.isFinite(px) && Number.isFinite(py) ? { x: px, y: py } : this.lastPos;
    if (!pos) return;
    const x = Math.round(pos.x), y = Math.round(pos.y);
    this.lastPos = { x, y };
    Store.updateProfile((p) => { p.world ||= {}; p.world.x = x; p.world.y = y; });
  }

  cleanup() {
    this.savePosition();
    this.scale.off('resize', this.onResize);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    this.events.off('resume', this.onResumeBound);
    this.events.off('pause', this.onPauseBound);
    try { if (this.zoneTimer) this.zoneTimer.remove(false); } catch { /* clock already gone */ }
    this.zoneTimer = null;
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin already gone */ }
    this.controls = null;
    const hud = this.scene.get(SCENES.Hud);
    if (hud && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    this.player = null; this.npcs = []; this.nearNpc = null;
  }
}
