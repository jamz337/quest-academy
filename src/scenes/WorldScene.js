import Phaser from 'phaser';
import { SCENES, TILE } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { getGame } from '../data/minigames.js';
import { bandFor } from '../data/grades.js';
import { buildMap, zoneAt, isWalkable, groundUnder, TID, SOLID, ROOF_TILES, WALL_TILES, DOOR_TILES, ZONE_NAMES } from '../data/world/map.js';
import { NPCS } from '../data/world/npcs.js';
import { BOSSES } from '../data/world/bosses.js';
import { bossReady, bossDefeated, zoneQuests } from '../data/world/quests.js';
import { InputController } from '../systems/InputController.js';
import { viewport, dpr } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';
import { toast } from '../ui/Toast.js';
import { resolveLook } from '../data/avatars.js';
import { lookSpriteTexture } from '../systems/Textures.js';
import { sparkleSpots, grassSpots, daySeed, dayKey, rollEncounter, chestCoins, pickGift, GRASS, SURPRISE_CHANCE, SURPRISE_COOLDOWN_MS, QUIZ_REWARD, CRITTERS, CRITTER_MAX_PER_DAY } from '../data/world/encounters.js';
import { bossQuestions } from '../generators/boss.js';
import { effectiveGrade } from '../systems/Progression.js';
import { weakSkills } from '../systems/Practice.js';
import { Rng } from '../systems/Rng.js';
import { SUBJECTS } from '../constants.js';

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
    this.layer.setCollision(SOLID.filter((id) => id !== TID.tree));   // trees collide on their own layer
    this.drawDecor();
    this.treeLayer = tilemap.createBlankLayer('trees', tileset, 0, 0).setDepth(2);
    this.map.data.forEach((row, ty) => row.forEach((id, tx) => { if (id === TID.tree) this.treeLayer.putTileAt(TID.tree, tx, ty); }));
    this.treeLayer.setCollision([TID.tree]);
    this.tilemap = tilemap;
    this.physics.world.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);

    this.createPlayer(profile);
    this.createNpcs();
    this.createCoins(profile);
    this.createSparkles(profile);
    this.createCritters();
    this.bubble = this.add.image(0, 0, 'bubble').setScale(0.75).setDepth(20).setVisible(false);

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
    const key = lookSpriteTexture(this, resolveLook(profile));
    this.player = this.physics.add.sprite(x, y, key, 0).setScale(CHAR_SCALE).setDepth(10);
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
    // Bosses stand in their arenas and talk like villagers; `boss` marks them for talk().
    for (const boss of BOSSES) {
      const spot = this.map.bossSpots[boss.zone];
      if (!spot) continue;
      const s = this.npcGroup.create((spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE, lookSpriteTexture(this, boss.look), 0);
      s.setScale(CHAR_SCALE * (boss.scale || 1.3)).setDepth(5).refreshBody();
      s.body.setSize(26, 26);
      s.boss = boss;
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
      img.setScale(0.35).setDepth(3).refreshBody();   // coin texture is generated at 2x
      img.body.setSize(18, 18);
      img.setData('idx', i);
      this.tweens.add({ targets: img, y: img.y - 3, duration: 500 + (i % 4) * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => this.collectCoin(coin));
  }

  /** Today's sparkles: the ones not yet found glint on the grass and trigger an encounter when stepped on. */
  createSparkles(profile) {
    const day = dayKey();
    const rec = profile.world.sparkles;
    const found = rec && rec.day === day ? rec.found || [] : [];
    this.sparkleGroup = this.physics.add.staticGroup();
    sparkleSpots(this.map, daySeed(profile.id, day)).forEach((s, i) => {
      if (found.includes(i)) return;
      const img = this.sparkleGroup.create((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, 'sparkle');
      img.setScale(0.45).setDepth(3).refreshBody();
      img.body.setSize(14, 14);
      img.setData('idx', i);
      this.tweens.add({ targets: img, alpha: 0.35, scale: 0.3, duration: 600 + (i % 3) * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: img, angle: 360, duration: 6000, repeat: -1 });
    });
    this.physics.add.overlap(this.player, this.sparkleGroup, (_p, sp) => this.onSparkle(sp));
    this.nextSurprise = Date.now() + 15000;   // a little grace after arriving
    this.lastTile = null;
  }

  onSparkle(sp) {
    if (!sp.active) return;
    const hud = this.hud();
    if (hud && hud.blocking) return;
    const idx = sp.getData('idx');
    sp.destroy();
    const day = dayKey();
    Store.updateProfile((p) => {
      if (!p.world.sparkles || p.world.sparkles.day !== day) p.world.sparkles = { day, found: [] };
      if (!p.world.sparkles.found.includes(idx)) p.world.sparkles.found.push(idx);
    });
    Sfx.unlock();
    this.startEncounter(rollEncounter(() => Math.random()));
  }

  // ---- Wandering critters (a sheep and a bunny) ---------------------------------------------

  createCritters() {
    this.critters = [];
    this.critterTimer = this.time.addEvent({ delay: 400, loop: true, callback: this.crittersThink, callbackScope: this });
    for (const def of CRITTERS) this.spawnCritter(def);
  }

  /** Put a critter on a random grass tile well away from the player. */
  spawnCritter(def) {
    if (!this.player || !this.player.body) return;
    const far = grassSpots(this.map).filter((s) => Phaser.Math.Distance.Between((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, this.player.x, this.player.y) > 10 * TILE);
    const s = Phaser.Utils.Array.GetRandom(far.length ? far : grassSpots(this.map));
    if (!s) return;
    const c = this.physics.add.sprite((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, def.key, 0).setScale(CHAR_SCALE).setDepth(9);
    c.body.setSize(10, 8).setOffset(3, 7);
    c.setCollideWorldBounds(true);
    this.physics.add.collider(c, this.layer);
    this.physics.add.collider(c, this.treeLayer);
    this.physics.add.overlap(this.player, c, () => this.catchCritter(c));
    c.def = def; c.moveUntil = 0;
    this.critters.push(c);
  }

  /** Every 400ms: each critter bolts away from a nearby player, otherwise ambles about or rests. */
  crittersThink() {
    if (!this.player || !this.player.body) return;
    const hud = this.hud();
    for (const c of this.critters) {
      if (!c.body) continue;
      const def = c.def;
      if (hud && hud.blocking) { c.setVelocity(0, 0); c.anims.stop(); continue; }
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      let vx = 0, vy = 0;
      if (d < def.fleeDist) {
        const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, c.x, c.y);
        vx = Math.cos(a) * def.fleeSpeed; vy = Math.sin(a) * def.fleeSpeed;
        c.moveUntil = 0;
      } else if (Date.now() >= c.moveUntil) {
        if (Math.random() >= 0.4) { const a = Math.random() * Math.PI * 2; vx = Math.cos(a) * def.wanderSpeed; vy = Math.sin(a) * def.wanderSpeed; }
        c.moveUntil = Date.now() + 800 + Math.random() * 1200;
      } else continue;
      c.setVelocity(vx, vy);
      if (vx) c.setFlipX(vx > 0);
      if (vx || vy) c.anims.play(`${def.key}-walk`, true); else { c.anims.stop(); c.setFrame(0); }
    }
  }

  catchCritter(c) {
    if (!c || !c.active) return;
    const hud = this.hud();
    if (hud && hud.blocking) return;
    const def = c.def;
    this.critters = this.critters.filter((x) => x !== c);
    c.destroy();
    const day = dayKey();
    let coins = 0;
    Store.updateProfile((p) => {
      if (!p.world.critters || p.world.critters.day !== day) p.world.critters = { day, caught: 0 };
      if (p.world.critters.caught < CRITTER_MAX_PER_DAY) { p.world.critters.caught += 1; coins = def.coins; p.coins += coins; }
    });
    if (coins) { Sfx.coin(); this.say(`${def.cry} You caught the ${def.name}: +${coins} coins`, { icon: 'coin' }); }
    else { Sfx.pop(); this.say(`${def.cry} The critters are out of coins for today.`, { accent: THEME.ink3 }); }
    if (hud) hud.setCoins(Store.getProfile().coins);
    this.time.delayedCall(def.respawnMs, () => this.spawnCritter(def));
  }

  /** Called from tick(): now and then the tall grass springs a quiz on the walker. */
  maybeSurprise(tx, ty) {
    const tile = `${tx},${ty}`;
    if (tile === this.lastTile) return;
    this.lastTile = tile;
    const hud = this.hud();
    if (!hud || hud.blocking || Date.now() < this.nextSurprise) return;
    if (!GRASS.has(this.map.data[ty]?.[tx])) return;
    if (Math.random() >= SURPRISE_CHANCE) return;
    this.nextSurprise = Date.now() + SURPRISE_COOLDOWN_MS;
    Sfx.pop();
    this.startEncounter('quiz');
  }

  startEncounter(kind) {
    const hud = this.hud();
    if (!hud) return;
    this.stopPlayer();
    const profile = Store.getProfile();
    const rng = new Rng();
    if (kind === 'quiz') {
      const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
      const subject = zoneAt(this.map, tx, ty) || rng.pick(Object.keys(SUBJECTS));
      const sub = SUBJECTS[subject] ? subject : rng.pick(Object.keys(SUBJECTS));
      // A handful of candidates so a skill the player has been missing can be revisited (spaced practice).
      const weak = new Set(weakSkills(profile));
      const cands = bossQuestions(sub, effectiveGrade(profile, sub), rng, 8);
      const q = cands.find((c) => weak.has(c.skill)) || cands[0];
      hud.showEncounter({ kind, subject: sub, q, reward: QUIZ_REWARD, onAnswer: (right) => { if (right) this.reward(QUIZ_REWARD); } });
    } else if (kind === 'chest') {
      const coins = chestCoins(() => rng.float());
      this.reward({ coins });
      hud.showEncounter({ kind, coins });
    } else {
      const gift = pickGift(() => rng.float());
      if (gift.charm) Store.updateProfile((p) => { p.charms ||= {}; p.charms[gift.charm] = true; });
      else this.reward(gift);
      hud.showEncounter({ kind, gift });
    }
  }

  reward({ coins = 0, xp = 0 }) {
    Store.updateProfile((p) => { p.coins += coins; p.xp += xp; });
    if (coins) Sfx.coin();
    const hud = this.hud();
    if (hud) hud.setCoins(Store.getProfile().coins);
  }

  /**
   * One-off overlay baked into a RenderTexture: foam along shorelines, a soft inset edge around paths and
   * shadows cast by buildings. Cheap at runtime (a single texture) and keeps the tileset itself simple.
   */
  drawDecor() {
    const { data, width: W, height: H } = this.map;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : data[y][x]);
    const PATHY = new Set([TID.path, ...DOOR_TILES, TID.gateLocked, TID.gateOpen]);
    const BUILDING = new Set([...WALL_TILES, ...ROOF_TILES, ...DOOR_TILES]);
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
        if (!BUILDING.has(at(x, y + 1)) && !DOOR_TILES.includes(id)) g.fillRect(px + 4, py + TILE, TILE, 4);
      }
    }
    const rt = this.add.renderTexture(0, 0, W * TILE, H * TILE).setOrigin(0).setDepth(1);
    rt.draw(g);
    g.destroy();
  }

  applyZoom() {
    const cam = this.cameras.main;
    if (!cam) return;
    const { min } = viewport(this);
    cam.setZoom((min < 600 ? 2 : 3) * dpr());   // world zoom in CSS pixels, times the device pixel ratio
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
      if (hud) { hud.setZone(name, z); if (z && !hud.blocking) hud.banner(name); }
    }
    const p = Store.getProfile();
    if (hud && p && hud.state.coins !== p.coins) hud.setCoins(p.coins);
    this.maybeSurprise(tx, ty);
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
    hud.showDialog({
      name: npc.name, lines: npc.lines, prompt: npc.playPrompt,
      onPlay: npc.gameId ? () => this.playGame(npc) : null
    });
    if (firstTalk) {
      Sfx.coin();
      hud.setCoins(Store.getProfile().coins);
      hud.notify(`+${HELLO_COINS} coins for saying hello!`, { icon: 'coin' });
    }
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
      const left = zoneQuests(profile, boss.zone).filter((q) => !q.done && q.id !== 'boss').map((q) => `• ${q.title} (${q.count}/${q.total})`);
      hud.showDialog({ name: boss.name, lines: [...boss.locked, 'Still to do:\n' + left.join('\n')] });
      return;
    }
    hud.showDialog({
      name: boss.name, lines: beaten ? boss.beaten : boss.intro, prompt: beaten ? 'Rematch?' : 'Fight?', playLabel: 'Fight!',
      onPlay: () => this.fightBoss(boss)
    });
  }

  fightBoss(boss) {
    this.stopPlayer();
    this.savePosition();
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, boss.id, { source: 'roam', context: { bossId: boss.id, zoneId: boss.zone } });
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
    try { extra = npc.pickContext ? npc.pickContext(profile, bandFor(profile.grade)) || {} : {}; } catch { extra = {}; }
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
    this.savePosition();
    this.scale.off('resize', this.onResize);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    this.events.off('resume', this.onResumeBound);
    this.events.off('pause', this.onPauseBound);
    try { if (this.zoneTimer) this.zoneTimer.remove(false); } catch { /* clock already gone */ }
    try { if (this.critterTimer) this.critterTimer.remove(false); } catch { /* clock already gone */ }
    this.zoneTimer = null; this.critterTimer = null; this.critters = [];
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin already gone */ }
    this.controls = null;
    const hud = this.scene.get(SCENES.Hud);
    if (hud && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    this.player = null; this.npcs = []; this.nearNpc = null;
  }
}
