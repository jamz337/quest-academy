import Phaser from 'phaser';
import { SCENES, TILE } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { getGame } from '../data/minigames.js';
import { bandFor, gradeLabel } from '../data/grades.js';
import * as Music from '../systems/Music.js';
import { buildMap, zoneAt, isWalkable, groundUnder, TID, SOLID, ZONE_NAMES } from '../data/world/map.js';
import { NPCS } from '../data/world/npcs.js';
import { BOSSES } from '../data/world/bosses.js';
import { bossReady, bossDefeated, zoneQuests } from '../data/world/quests.js';
import { duelFor, duelWon, duelId } from '../data/world/duels.js';
import { InputController } from '../systems/InputController.js';
import { viewport, dpr } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';
import { toast } from '../ui/Toast.js';
import { resolveLook } from '../data/avatars.js';
import { lookSpriteTexture, fitPlayer, CHAR_WORLD_SCALE, IDLE_FRAMES, TILE_RES, TILE_PAD, FLOWER_TILES, MEADOW_TILES, GRASS_TILES } from '../systems/Textures.js';
import { terrainTexture, TERRAIN_KEY } from '../systems/Terrain.js';
import { terrainLayers } from '../data/world/terrainLayout.js';
import { gameGrade, gradeUps, nextHouseLevel, HOUSE_LEVELS } from '../systems/Progression.js';
import { errandLine } from '../data/world/errands.js';
import { ensureExplored, reveal } from '../data/world/explore.js';
import { starPop, fireworks } from '../ui/Fireworks.js';
import * as Critters from './world/critters.js';
import * as Encounters from './world/encounters.js';
import * as Errands from './world/errands.js';
import * as Fishing from './world/fishing.js';
import * as Decor from './world/decor.js';
import * as Companion from './world/companion.js';
import { mentorLines, guideLines, signpostLine, startStory, bellPieces, claimFinale, finishTutorial, tutorialDone, CHAPTERS, MENTOR_ID } from '../data/world/story.js';
import { checkBadges } from '../systems/Progression.js';
import { outfitOf, outfitId } from '../systems/Market.js';
import { getBadge } from '../data/badges.js';
import { drinkUp } from './world/drink.js';
import { createTrail, trailTick } from './world/trail.js';
import * as Hub from './world/hub.js';
import { createProps } from './world/props.js';
import { heartsOf } from '../systems/Hearts.js';
import { villagerKey, VILLAGER_CELL, VILLAGER_WORLD_HEIGHT } from '../ui/Villagers.js';
import { refreshRequestBubbles, requestLine, requestAfterGame } from './world/requests.js';
import { createLamps, refreshLamps } from './world/lamps.js';
import { createGateways, refreshGateways, createGuide, retargetGuide, guideTick } from './world/guide.js';

const SPEED = 110;          // px/s
const TALK_DIST = 44;       // px between player and NPC centres
const CHAR_SCALE = CHAR_WORLD_SCALE;   // character frames are drawn large and shown one tile tall
const IDLE_FRAME = IDLE_FRAMES;
const HELLO_COINS = 5;

/**
 * Free-roam overworld. Unlike the menu scenes this is NOT rebuilt on resize: the tilemap and sprites
 * persist and only the camera zoom is recomputed. All UI lives in HudScene, which floats on top.
 * The world's features live in scenes/world/: critters, grass encounters, errands, fishing and decor.
 */
export class WorldScene extends Phaser.Scene {
  constructor() { super(SCENES.World); }

  create() {
    const profile = Store.getProfile();
    if (!profile) return this.scene.start(SCENES.Profile);

    this.map = buildMap();
    // Ground layer (trees replaced by the local ground) plus a transparent tree layer drawn above the decor.
    // Flower and daisy squares each take one of several looks (chosen from the square's place, so it never changes).
    const vary = (id, tx, ty) => {
      const set = id === TID.flower ? FLOWER_TILES : id === TID.meadow ? MEADOW_TILES : id === TID.grass ? GRASS_TILES : null;
      if (!set) return id;
      let h = Math.imul(tx + 1, 374761393) ^ Math.imul(ty + 1, 668265263);
      h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
      return set[(h >>> 0) % set.length];
    };
    // Drawn in layers (data/world/terrainLayout.js): the ground; roads and water as painted dual-grid pieces with
    // curved, outlined edges; then the buildings. The map's own squares, invisible, are what the player bumps into.
    const layers = terrainLayers(this.map);
    const ground = layers.base.map((row, ty) => row.map((id, tx) => vary(id, tx, ty)));
    // The tileset is painted at TILE_RES times the tile size (smooth shapes); the layers scale it back to TILE.
    const res = TILE * TILE_RES, mapW = this.map.width * TILE, mapH = this.map.height * TILE;
    const tilemap = this.make.tilemap({ data: ground, tileWidth: res, tileHeight: res });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', res, res, TILE_PAD, TILE_PAD * 2);
    this.groundLayer = tilemap.createLayer(0, tileset, 0, 0).setScale(1 / TILE_RES);
    terrainTexture(this, res, TILE_PAD);
    const dual = this.make.tilemap({ width: this.map.width + 1, height: this.map.height + 1, tileWidth: res, tileHeight: res });
    const terrainSet = dual.addTilesetImage(TERRAIN_KEY, TERRAIN_KEY, res, res, TILE_PAD, TILE_PAD * 2);
    for (const [name, grid, depth] of [['road', layers.road, 0.2], ['water', layers.water, 0.3]]) {
      const l = dual.createBlankLayer(name, terrainSet, -TILE / 2, -TILE / 2).setScale(1 / TILE_RES).setDepth(depth);
      grid.forEach((row, j) => row.forEach((t, i) => { if (t >= 0) l.putTileAt(t, i, j); }));
    }
    this.structureLayer = tilemap.createBlankLayer('structures', tileset, 0, 0).setScale(1 / TILE_RES).setDepth(0.5);
    layers.structures.forEach((row, ty) => row.forEach((id, tx) => { if (id >= 0) this.structureLayer.putTileAt(id, tx, ty); }));
    this.placeDrawnHouse();
    const solid = this.make.tilemap({ data: this.map.data, tileWidth: res, tileHeight: res });
    this.layer = solid.createLayer(0, solid.addTilesetImage('tiles', 'tiles', res, res, TILE_PAD, TILE_PAD * 2), 0, 0).setScale(1 / TILE_RES).setVisible(false);
    this.layer.setCollision(SOLID.filter((id) => id !== TID.tree));   // trees collide on their own layer
    Decor.drawDecor(this);
    Decor.createTrailNumbers(this);
    createTrail(this);
    this.treeLayer = tilemap.createBlankLayer('trees', tileset, 0, 0).setDepth(2).setScale(1 / TILE_RES);
    this.map.data.forEach((row, ty) => row.forEach((id, tx) => { if (id === TID.tree) this.treeLayer.putTileAt(TID.tree, tx, ty); }));
    this.treeLayer.setCollision([TID.tree]);
    this.tilemap = tilemap;
    this.mapW = mapW; this.mapH = mapH;
    this.physics.world.setBounds(0, 0, mapW, mapH);

    this.createPlayer(profile);
    this.createNpcs();
    this.createCoins(profile);
    Encounters.createSparkles(this, profile);
    Critters.createCritters(this);
    Decor.createHouseStars(this);
    Errands.createErrandItem(this, profile);
    Decor.createLandmarks(this, profile);
    Decor.createBellTower(this);
    Decor.createMarketStall(this);
    Decor.createChurch(this);
    Decor.createHarbour(this);
    Decor.createMarket(this);
    createProps(this);
    createGateways(this);
    Hub.createFountain(this);
    Hub.createQuestBoard(this);
    createLamps(this);
    createGuide(this);
    Companion.createCompanion(this);
    // Loading while standing in the doorway should not open the house until the player steps out and back in.
    this.atHomeDoor = !!this.map.home && Math.floor(this.player.x / TILE) === this.map.home.door.tx && Math.floor(this.player.y / TILE) === this.map.home.door.ty;
    this.atChurchDoor = !!this.map.church && Math.floor(this.player.x / TILE) === this.map.church.door.tx && Math.floor(this.player.y / TILE) === this.map.church.door.ty;
    this.bubble = this.add.image(0, 0, 'bubble').setScale(0.75).setDepth(20).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapW, this.mapH);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();

    this.controls = new InputController(this);
    this.facing = 'down';
    this.currentZone = undefined;
    this.wasBlocked = false;
    this.nearNpc = null;

    this.launchHud();
    this.zoneTimer = this.time.addEvent({ delay: 200, loop: true, callback: this.tick, callbackScope: this });
    this.tick();
    Music.play();   // relaxing lounge loop while exploring; ducked under games, stopped on leaving the world
    // The first time in the world, Headmistress Hope comes over with the tale of the Academy Bell, and Mango
    // then teaches the first steps; a save that stopped part-way through the lesson picks it up again.
    if (!profile.story || !profile.story.started) this.time.delayedCall(700, () => this.introSequence());
    else if (!tutorialDone(profile)) this.time.delayedCall(700, () => this.startLesson());

    // Lifecycle
    this.onResize = () => this.applyZoom();
    this.onVisibility = () => { if (typeof document !== 'undefined' && document.hidden) this.savePosition(); };
    this.onResumeBound = () => { Music.play('lounge'); Music.duck(false); this.onResume(); };   // back from a game, or a duel's battle music
    this.onPauseBound = () => { this.stopPlayer(); Music.duck(true); };
    this.scale.on('resize', this.onResize);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
    this.events.on('resume', this.onResumeBound);
    this.events.on('pause', this.onPauseBound);
    this.onGameDone = (e) => this.afterGame(e.payload, e.result);
    this.events.on('minigame:done', this.onGameDone);
    refreshRequestBubbles(this);   // today's orders float over the villagers who have one
    this.onMarketDone = (d) => { this.refreshOutfit(); drinkUp(this, d); };
    this.events.on('market:done', this.onMarketDone);
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
    const key = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    this.player = fitPlayer(this.physics.add.sprite(x, y, key, IDLE_FRAME.down)).setDepth(10);
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
      // The hub's hosts have smooth drawings of their own (ui/Villagers.js); everyone else is a pixel sheet.
      const drawn = def.art && this.textures.exists(villagerKey(def.art)) ? villagerKey(def.art) : null;
      const key = drawn || (this.textures.exists(def.sprite) ? def.sprite : 'npc0');
      const s = this.npcGroup.create((spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE - (drawn ? 4 : 0), key, IDLE_FRAME.down);
      s.setScale(drawn ? VILLAGER_WORLD_HEIGHT / VILLAGER_CELL : CHAR_SCALE).setDepth(5).refreshBody();
      s.body.setSize(22, 22);
      s.npc = def;
      this.npcs.push(s);
    }
    // Bosses stand in their arenas and talk like villagers; `boss` marks them for talk().
    for (const boss of BOSSES) {
      const spot = this.map.bossSpots[boss.zone];
      if (!spot) continue;
      const s = this.npcGroup.create((spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE, lookSpriteTexture(this, boss.look), IDLE_FRAME.down);
      s.setScale(CHAR_SCALE * (boss.scale || 1.3)).setDepth(5).refreshBody();
      s.body.setSize(26, 26);
      s.boss = boss;
      if (bossDefeated(Store.getProfile(), boss.zone)) this.poseDefeated(s);
      this.npcs.push(s);
      this.tweens.add({ targets: s, y: s.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.physics.add.collider(this.player, this.npcGroup);
  }

  createCoins(profile) {
    this.coinGroup = this.physics.add.staticGroup();
    const taken = new Set(profile.world.coinsCollected || []);
    this.map.coins.forEach((c, i) => {
      if (taken.has(i)) return;
      const img = this.coinGroup.create((c.tx + 0.5) * TILE, (c.ty + 0.5) * TILE, 'coin');
      img.setDisplaySize(17, 17).setDepth(3).refreshBody();   // the coin texture is painted large, to stay sharp
      img.body.setSize(18, 18);
      img.setData('idx', i);
      this.tweens.add({ targets: img, y: img.y - 3, duration: 500 + (i % 4) * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => this.collectCoin(coin));
  }

  /**
   * The player's house as one drawn picture (sprites/world/hub/house.png) over its three-by-three footprint: the
   * picture's walls are lined up with the footprint's width and its base with the footprint's bottom, so the roof
   * overhangs a little and the door stays where the map says. The footprint's own tiles come off the structure layer.
   */
  placeDrawnHouse() {
    const home = this.map.home;
    if (!home || !this.textures.exists('hub-house')) return;
    for (let y = home.y; y < home.y + home.h; y++) for (let x = home.x; x < home.x + home.w; x++) this.structureLayer.removeTileAt(x, y);
    const tex = this.textures.get('hub-house').getSourceImage();
    const note = (this.cache.json && this.cache.json.get('hub-house-note')) || { wallLeft: 0, wallRight: tex.width, width: tex.width, height: tex.height };
    const scale = (home.w * TILE) / Math.max(1, note.wallRight - note.wallLeft);
    const cx = (home.x + home.w / 2) * TILE + (note.width / 2 - (note.wallLeft + note.wallRight) / 2) * scale;
    this.drawnHouse = this.add.image(cx, (home.y + home.h) * TILE, 'hub-house').setOrigin(0.5, 1).setScale(scale).setDepth(1.1);
  }

  applyZoom() {
    const cam = this.cameras.main;
    if (!cam) return;
    const { min } = viewport(this);
    // World zoom in CSS pixels times the device pixel ratio, kept a whole number: a fractional zoom (3.75 on a
    // 125% Windows display) puts tile edges between device pixels and hairline seams show along every tile.
    cam.setZoom(Math.max(2, Math.round((min < 600 ? 2 : 3) * dpr())));
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

  /** Points of interest for the minimap: the errand in progress, every boss castle, home and the church. */
  mapMarkers(profile) {
    const out = [];
    const target = Errands.errandTarget(this.map, profile);
    if (target) out.push({ ...target, kind: 'errand' });
    for (const boss of BOSSES) { const s = this.map.bossSpots[boss.zone]; if (s) out.push({ tx: s.tx, ty: s.ty - 2, kind: bossDefeated(profile, boss.zone) ? 'bossDone' : 'boss' }); }
    if (this.map.home) out.push({ tx: this.map.home.x + 1, ty: this.map.home.y + 1, kind: 'home' });
    if (this.map.church) out.push({ tx: this.map.church.x + 1, ty: this.map.church.y + 1, kind: 'church' });
    return out;
  }

  // ---- Per-frame -----------------------------------------------------------------------------

  update(time) {
    if (!this.player || !this.player.body) return;
    const hud = this.hud();
    const inp = this.controls.read();
    if (this.introRunning) { this.stopPlayer(); this.wasBlocked = true; this.bubble.setVisible(false); return; }

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
    const board = !near && Hub.boardNear(this) ? this.questBoard : null;   // the quest board can be read like a villager
    const rim = !near && !board && Hub.fountainNear(this);                    // at the fountain, the action tosses a coin
    if (near) this.bubble.setVisible(true).setPosition(near.x, near.y - 26 + Math.sin(time / 150) * 2);
    else if (board) this.bubble.setVisible(true).setPosition(board.x, board.top - 12 + Math.sin(time / 150) * 2);
    else this.bubble.setVisible(false);

    if (inp.actionJustPressed && !skipAction) {
      if (near) this.talk(near);
      else if (board) Hub.readBoard(this);
      else if (rim) Hub.tossCoin(this);
      else Fishing.tryFishing(this);
    }
  }

  stopPlayer() {
    if (!this.player || !this.player.body) return;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    const f = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    this.player.setFrame(IDLE_FRAME[f] ?? 0);
  }

  /** Runs every 200ms: zone banner, the minimap, the fog of war, and keeping the Hud counters honest. */
  tick() {
    if (!this.player) return;
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
    this.lastPos = { x: this.player.x, y: this.player.y };
    const z = zoneAt(this.map, tx, ty);
    const hud = this.hud();
    if (z !== this.currentZone) {
      this.currentZone = z;
      const name = z ? ZONE_NAMES[z] : 'Grasslands';
      if (hud) { hud.setZone(name, z); if (z && !hud.blocking) hud.banner(name); }
    }
    const p = Store.getProfile();
    if (hud && p && hud.state.coins !== p.coins) hud.setCoins(p.coins);
    if (p) {
      // The explored grid lives on the live profile object; it is persisted with the next save of the position.
      const explored = ensureExplored(p);
      const repaint = reveal(explored, tx, ty);
      if (hud) hud.updateMinimap({ tx, ty, explored, repaint, markers: this.mapMarkers(p) });
    }
    Encounters.maybeSurprise(this, tx, ty);
    trailTick(this, tx, ty);
    Fishing.fishCueTick(this, tx, ty);
    guideTick(this, tx, ty);
    Hub.fountainTick(this); Hub.fountainCueTick(this);
    this.lessonTick();
    if (hud && p) { const line = errandLine(p); if (hud.state.carry !== line) hud.setCarry(line); }
    if (this.errandItem && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.errandItem.x, this.errandItem.y) < 22) Errands.pickUpItem(this);
    if ((this.tickCount = (this.tickCount | 0) + 1) % 5 === 0) { Companion.announceStory(this); if (!(hud && hud.blocking)) this.finaleIfReady(); }   // about once a second
    const atDoor = this.map.home && tx === this.map.home.door.tx && ty === this.map.home.door.ty;
    if (atDoor && !this.atHomeDoor && hud && !hud.blocking) this.enterHouse();
    this.atHomeDoor = atDoor;
    const atChurch = this.map.church && tx === this.map.church.door.tx && ty === this.map.church.door.ty;
    if (atChurch && !this.atChurchDoor && hud && !hud.blocking) this.enterChurch();
    this.atChurchDoor = atChurch;
  }

  /** Into the Village Church, the same way as the house: the world stops at the door and the church takes over. */
  enterChurch() {
    this.stopPlayer();
    Sfx.click();
    this.savePosition();
    if (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud)) this.scene.stop(SCENES.Hud);
    this.scene.start(SCENES.Church);
  }

  /** Through the front door: the world is stopped (saving the position at the door) and the house scene takes over. */
  enterHouse() {
    this.stopPlayer();
    Sfx.click();
    this.savePosition();
    // Stop the Hud now, not from our shutdown (which runs after the house has already looked for it).
    if (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud)) this.scene.stop(SCENES.Hud);
    this.scene.start(SCENES.House);
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
    if (sprite.boss) return this.talkBoss(sprite);
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
    if (Errands.errandTalk(this, npc, hud)) return;
    // Villagers run three levels of their game; the prompt says which is next and how many stars the house has.
    const profile = Store.getProfile();
    let prompt = npc.playPrompt;
    if (npc.gameId && !getGame(npc.gameId)?.usesLevels) {
      // Levels start over each time the game moves up a grade, so count passes at the current grade.
      const lv = profile.games?.[npc.gameId]?.levels || {};
      const passed = [1, 2, 3].filter((n) => (lv[n] || 0) >= 1).length, level = nextHouseLevel(profile, npc.gameId);
      const at = gradeUps(profile, npc.gameId) ? ` at ${gradeLabel(gameGrade(profile, npc.gameId))}` : '';
      prompt = passed >= HOUSE_LEVELS ? `You have all ${HOUSE_LEVELS} stars here! Play level ${HOUSE_LEVELS} again?` : `${npc.playPrompt} Level ${level} of ${HOUSE_LEVELS}${at}${passed ? ` (${passed} star${passed > 1 ? 's' : ''} so far)` : ''}`;
    }
    // Story lines: the Headmistress tells the tale, chapter guides open their chapter, Sam points at the next step.
    let lines = npc.lines;
    let onLater = null;
    if (npc.story === 'mentor') {
      const fresh = !profile.story || !profile.story.started;
      lines = mentorLines(profile);
      if (fresh) onLater = () => this.storyBegun();
    } else if (npc.id === 'signpost') lines = [signpostLine(profile), ...npc.lines.slice(1)];
    // Villagers with a game can also be duelled; they say so until they have been beaten.
    const duel = duelFor(npc.id);
    if (npc.market) prompt = 'Come and see what is for sale?';
    else if (duel && !duelWon(profile, npc.id)) lines = [...lines, duel.challenge];
    if (!npc.market) lines = [...guideLines({ ...profile, world: { ...profile.world, npcsTalked: (profile.world.npcsTalked || []).filter((id) => id !== npc.id || !firstTalk) } }, npc.id), ...npc.lines];
    const order = requestLine(npc.id);   // a villager with an order today opens with it
    if (order) lines = [order, ...lines];
    hud.showDialog({
      name: npc.name, voice: npc.voice, pitch: npc.pitch, rate: npc.rate, speaker: npc.id, lines, prompt, playLabel: npc.market ? 'Shop' : undefined,
      onPlay: npc.market ? () => this.openMarket() : npc.gameId ? () => this.playGame(npc) : null, onLater,
      secondary: duel && this.scene.get(Launcher.DUEL_SCENE) ? { label: duelWon(profile, npc.id) ? 'Duel again' : 'Duel', onClick: () => this.duelVillager(npc) } : null
    });
    if (firstTalk) {
      hud.setCoins(Store.getProfile().coins);
      hud.awardCoins(HELLO_COINS);
      hud.notify(`+${HELLO_COINS} coins for saying hello!`, { icon: 'coin' });
    }
  }

  /** Pause the world, sleep the Hud and open the market on top; 'market:done' brings us back. */
  openMarket() {
    this.stopPlayer();
    this.savePosition();
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    this.scene.pause();
    this.scene.launch(SCENES.Market, { returnTo: SCENES.World });
  }

  /** The player may have bought or changed a hat: redraw them in the outfit they wear now. */
  refreshOutfit() {
    const p = Store.getProfile();
    if (!p || !this.player) return;
    const key = lookSpriteTexture(this, resolveLook(p), outfitOf(p), outfitId(p));
    if (this.player.texture.key !== key) { const f = this.player.frame.name; this.player.setTexture(key, f); fitPlayer(this.player); }
  }

  /** The Headmistress has told the tale: the story is on, and Mango starts the first-steps lesson. */
  storyBegun() {
    Store.updateProfile((p) => startStory(p));
    this.startLesson();
  }

  // ---- First entry: the Headmistress comes over, then Mango's lesson --------------------------

  get hopeSprite() { return this.npcs.find((s) => s.npc && s.npc.id === MENTOR_ID) || null; }
  get touchDevice() { try { return !!this.sys.game.device.input.touch; } catch { return false; } }

  /** The camera finds the Headmistress, she walks over to the player (or simply appears if far away), and talks. */
  introSequence() {
    const hope = this.hopeSprite, hud = this.hud();
    if (!hope || !this.player || !hud) return;
    if (hud.blocking) { this.time.delayedCall(1000, () => this.introSequence()); return; }
    this.introRunning = true;
    this.stopPlayer();
    const cam = this.cameras.main;
    const tx = this.player.x - 34, ty = this.player.y + 2;
    const arrive = () => {
      hope.refreshBody(); this.hopeMoved = true;
      cam.startFollow(this.player, true, 0.12, 0.12);
      this.time.delayedCall(250, () => { this.introRunning = false; this.wasBlocked = true; this.talk(hope); });
    };
    if (Phaser.Math.Distance.Between(hope.x, hope.y, this.player.x, this.player.y) > 10 * TILE) {
      hope.setAlpha(0).setPosition(tx, ty);
      this.tweens.add({ targets: hope, alpha: 1, duration: 500, onComplete: arrive });
      return;
    }
    cam.stopFollow();
    cam.pan(hope.x, hope.y, 700, 'Sine.easeInOut');
    this.time.delayedCall(900, () => {
      if (!hope.active) return;
      hope.setFrame(IDLE_FRAME.side).setFlipX(tx > hope.x);
      this.tweens.add({ targets: hope, x: tx, y: ty, duration: 1300, ease: 'Sine.InOut', onComplete: arrive });
      cam.pan(this.player.x, this.player.y, 1300, 'Sine.easeInOut');
    });
  }

  /** Step one: walk. Step two: talk to Sam. The hint chip on the Hud says what to do; Mango cheers each step. */
  startLesson() {
    if (!this.player || tutorialDone(Store.getProfile())) return;
    this.lesson = 'move';
    this.lessonStart = { x: this.player.x, y: this.player.y };
    const hud = this.hud();
    if (hud) hud.setHint(this.touchDevice ? '👆 Drag anywhere on the screen to walk' : '⌨️ Walk with the arrow keys or W A S D');
    Companion.showCompanion(this, this.touchDevice ? 'First, let us walk! Put your finger on the screen and drag.' : 'First, let us walk! Use the arrow keys or W A S D.');
  }

  lessonTick() {
    if (!this.lesson || !this.player) return;
    const hud = this.hud(), p = Store.getProfile();
    if (hud && hud.blocking) return;
    if (this.lesson === 'move' && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lessonStart.x, this.lessonStart.y) > 48) {
      this.lesson = 'talk';
      if (hud) hud.setHint('🪧 Walk up to Signpost Sam and press A to talk');
      Companion.mangoVisit(this, 'Great walking! Now go to Sam by the signpost and press A to talk to him.', { accent: THEME.success });
    } else if (this.lesson === 'talk' && p && (p.world.npcsTalked || []).includes('signpost')) {
      this.lesson = null;
      Store.updateProfile((q) => finishTutorial(q));
      if (hud) hud.setHint(null);
      Companion.mangoVisit(this, 'You have got it! Off to Math Meadow, to the west.', { accent: THEME.success });
      this.hopeGoesHome();
    }
  }

  /** After the lesson the Headmistress walks back to her spot by the house. */
  hopeGoesHome() {
    const hope = this.hopeSprite, spot = this.map.npcSpots[MENTOR_ID];
    if (!hope || !spot || !this.hopeMoved) return;
    const hx = (spot.tx + 0.5) * TILE, hy = (spot.ty + 0.5) * TILE;
    hope.setFrame(IDLE_FRAME.side).setFlipX(hx > hope.x);
    this.tweens.add({ targets: hope, x: hx, y: hy, duration: 1400, ease: 'Sine.InOut', onComplete: () => { if (hope.active) { hope.setFrame(IDLE_FRAME.down); hope.refreshBody(); } this.hopeMoved = false; } });
  }

  /** Every piece is back: the Headmistress's finale, coins, the badge and the bell ringing. */
  finaleIfReady() {
    const p = Store.getProfile();
    if (!p || bellPieces(p).length < CHAPTERS.length || (p.story && p.story.finale)) return;
    const hud = this.hud();
    if (!hud) return;
    let badges = [];
    Store.updateProfile((q) => { claimFinale(q); badges = checkBadges(q); });
    Decor.refreshBell(this);
    hud.setCoins(Store.getProfile().coins);
    hud.showDialog({
      name: 'Headmistress Hope', voice: 'female', pitch: 1.0, rate: 0.95, speaker: MENTOR_ID,
      lines: ['You did it! Every piece of the Academy Bell is home.', 'Listen... it rings again, and the lands are friends once more.', 'Here are 100 coins, and a badge only a true hero of Quest Academy can wear.'],
      onLater: () => {
        Sfx.fanfare();
        const sc = hud.scene.isActive() ? hud : this;
        fireworks(sc, sc.w ? sc.w / 2 : this.player.x, sc.h ? sc.h * 0.3 : this.player.y, { bursts: 6, spread: 200 });
        hud.awardCoins(100);
        badges.forEach((id, i) => this.time.delayedCall(1500 + i * 1400, () => this.say(`New badge: ${getBadge(id)?.title || id}`, { icon: 'star', accent: THEME.brand })));
      }
    });
  }

  /** Bosses fight only once the zone's other quests are done; afterwards they offer a rematch. */
  talkBoss(sprite) {
    const boss = sprite.boss;
    const hud = this.hud();
    this.facePlayerTo(sprite);
    Sfx.pop();
    if (!hud) return;
    const profile = Store.getProfile();
    const beaten = bossDefeated(profile, boss.zone);
    if (!beaten && !bossReady(profile, boss.zone)) {
      const left = zoneQuests(profile, boss.zone).filter((q) => !q.done && q.id === 'duels').map((q) => `• ${q.title} (${q.count}/${q.total})`);
      hud.showDialog({ name: boss.name, voice: boss.voice, pitch: boss.pitch, rate: boss.rate, speaker: boss.id, lines: [...boss.locked, 'Still to do:\n' + left.join('\n')] });
      return;
    }
    hud.showDialog({
      name: boss.name, voice: boss.voice, pitch: boss.pitch, rate: boss.rate, speaker: boss.id, lines: beaten ? boss.beaten : boss.intro, prompt: beaten ? 'Rematch?' : 'Fight?', playLabel: 'Fight!',
      onPlay: () => this.fightBoss(boss)
    });
  }

  fightBoss(boss) {
    this.stopPlayer();
    this.savePosition();
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, boss.id, { source: 'roam', context: { bossId: boss.id, zoneId: boss.zone } });
  }

  /** Challenge a villager to a duel (see DuelScene); the world pauses like it does for a game. */
  duelVillager(npc) {
    if (!duelFor(npc.id)) return;
    if (heartsOf(Store.getProfile()) <= 0) {
      // Out of hearts: a drink from the market (or a new day) brings them back.
      this.say('♥ You are out of hearts! A drink from Auntie Vee will fill them up.', { accent: THEME.danger });
      return;
    }
    this.stopPlayer();
    this.savePosition();
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, duelId(npc.id), { source: 'roam', context: { npcId: npc.id, zoneId: npc.zone, duel: true } });
  }

  playGame(npc) {
    const game = getGame(npc.gameId);
    if (!game || !this.scene.get(game.sceneKey)) {
      this.say(`${game ? game.title : 'That game'} is coming soon!`, { accent: THEME.brand });
      return;
    }
    this.stopPlayer();
    this.savePosition();
    const profile = Store.getProfile();
    let extra = {};
    try { extra = npc.pickContext ? npc.pickContext(profile, bandFor(gameGrade(profile, npc.gameId))) || {} : {}; } catch { extra = {}; }
    const context = { npcId: npc.id, zoneId: npc.zone };
    for (const [k, v] of Object.entries(extra)) if (v !== undefined) context[k] = v;
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, npc.gameId, { source: 'roam', context });
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

  // ---- After a game --------------------------------------------------------------------------

  /** A beaten boss lies knocked over in front of its castle. */
  poseDefeated(sprite) { sprite.setAngle(90).setAlpha(0.7).setTint(0xb4bcc4); }

  /** Back from a game: pop the new star up to the house, topple a beaten boss, announce an errand. */
  afterGame(payload, result) {
    const hud = this.hud();
    if (hud && hud.refreshHearts) hud.refreshHearts();   // a duel may have cost hearts, even one that was run from
    if (!result || result.aborted) return;
    requestAfterGame(this, payload, result);
    if (payload.boss && result.won) {
      const s = this.npcs.find((x) => x.boss && x.boss.id === payload.boss.id);
      if (s) this.poseDefeated(s);
      this.time.delayedCall(300, () => { const sc = hud && hud.scene.isActive() ? hud : this; fireworks(sc, sc.w ? sc.w / 2 : this.player.x, sc.h ? sc.h * 0.35 : this.player.y, { bursts: 4, spread: 160 }); });
      this.time.delayedCall(1200, () => Decor.refreshBell(this));
      this.time.delayedCall(5000, () => this.finaleIfReady());
    }
    if (payload.duel) {
      const s = this.npcs.find((x) => x.npc && x.npc.id === payload.duel.npcId);
      if (result.won) {
        if (s) this.tweens.add({ targets: s, angle: 14, yoyo: true, repeat: 3, duration: 90 });
        this.time.delayedCall(300, () => this.say(`🏆 You won the duel with ${payload.duel.name}!`, { icon: 'star', accent: THEME.brand }));
        if (result.newDuelWin) this.time.delayedCall(1800, () => { const q = zoneQuests(Store.getProfile(), payload.duel.npcId && s ? s.npc.zone : 'math').find((x) => x.id === 'duels'); if (q) this.say(`⚔️ Duels won in this land: ${q.count} of ${q.total}`, { accent: THEME.brand }); });
      } else this.time.delayedCall(300, () => this.say(`${payload.duel.name} won this time. Have a snack and try again!`, { accent: THEME.ink3 }));
    }
    const slots = this.houseStarSprites && this.houseStarSprites[payload.gameId];
    if (result.newHouseStar && slots) {
      const npc = this.npcs.find((x) => x.npc && x.npc.gameId === payload.gameId);
      const slot = slots[Math.max(0, result.houseStars - 1)];
      if (npc && slot) {
        this.time.delayedCall(400, () => {
          Sfx.unlock();
          starPop(this, npc.x, npc.y - 22, slot.x, slot.y, 10, () => (Decor.refreshHouseStars(this), refreshGateways(this), retargetGuide(this), Hub.refreshFountain(this), refreshLamps(this)));
          const left = HOUSE_LEVELS - result.houseStars;
          this.say(left > 0 ? `⭐ Level ${result.level} passed! ${left} more to go` : `⭐ All ${HOUSE_LEVELS} levels passed here!`, { icon: 'star', accent: THEME.warning });
        });
      }
    } else (Decor.refreshHouseStars(this), refreshGateways(this), retargetGuide(this), Hub.refreshFountain(this), refreshLamps(this));
    if (result.gradeUp) this.time.delayedCall(2200, () => this.say(`📈 ${payload.title} moves up to ${gradeLabel(result.gradeUp.to)}!`, { icon: 'star', accent: THEME.brand }));
    if (result.errandUnlocked) {
      const giver = NPCS.find((n) => n.id === result.errandUnlocked.npc);
      this.time.delayedCall(2400, () => this.say(`📜 ${giver ? giver.name : 'A villager'} has an errand for you — talk to them!`, { accent: THEME.brand }));
    }
  }

  // ---- Lifecycle -----------------------------------------------------------------------------

  onResume() {
    const profile = Store.getProfile();
    if (!profile) return;
    this.launchHud();
    this.stopPlayer();
    this.wasBlocked = true;            // swallow the click/key that brought us back
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
    Music.stop();
    this.savePosition();
    this.scale.off('resize', this.onResize);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    this.events.off('resume', this.onResumeBound);
    this.events.off('pause', this.onPauseBound);
    this.events.off('minigame:done', this.onGameDone);
    this.events.off('market:done', this.onMarketDone);
    try { if (this.zoneTimer) this.zoneTimer.remove(false); } catch { /* clock already gone */ }
    try { if (this.critterTimer) this.critterTimer.remove(false); } catch { /* clock already gone */ }
    this.zoneTimer = null; this.critterTimer = null; this.critters = [];
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin already gone */ }
    this.controls = null;
    const hud = this.scene.get(SCENES.Hud);
    if (hud && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    Companion.destroyCompanion(this);
    this.player = null; this.npcs = []; this.nearNpc = null;
  }
}
