import Phaser from 'phaser';
import { SCENES, TILE } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Music from '../systems/Music.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { getGame } from '../data/minigames.js';
import { gradeLabel } from '../data/grades.js';
import { InputController } from '../systems/InputController.js';
import { viewport, dpr } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';
import { toast } from '../ui/Toast.js';
import { resolveLook } from '../data/avatars.js';
import { lookSpriteTexture, fitPlayer, IDLE_FRAMES, CHAR_WORLD_SCALE } from '../systems/Textures.js';
import { outfitOf, outfitId } from '../systems/Market.js';
import { gameGrade, gradeUps, nextHouseLevel, HOUSE_LEVELS } from '../systems/Progression.js';
import { HOSPITAL_W, HOSPITAL_H, PICTURE_PX, FLOOR, EXIT, SPAWN, STAFF, isFloor, onExit } from '../data/health/hospital.js';
import { sortSprite, addShadow } from './world/depth.js';

const SPEED = 110;
const USE_DIST = 30;
const HELLO_COINS = 2;
const FONT = 'Fredoka, sans-serif';
export const PICTURE_KEY = 'hospital-inside';

/**
 * Inside the Academy hospital, where Health Heights lives: the whole interior is one drawn picture (the lab, the
 * wards, the consulting rooms, the lobby and the emergency room) laid over a grid of squares that says where the
 * floor is. Four members of staff stand at their work; walk up and press to talk, and each offers their game: Dr
 * Dee's Body Map, Chef Camille's Plate Planner, Pharmacist Pat's Germ Zapper and Coach Fay's Feel Good. The mat
 * by the door goes back out to the hub. Like the house and the church, it is not rebuilt on resize; the Hud floats on top.
 */
export class HospitalScene extends Phaser.Scene {
  constructor() { super(SCENES.Hospital); }

  create() {
    const profile = Store.getProfile();
    if (!profile) return this.scene.start(SCENES.Profile);
    const W = HOSPITAL_W * TILE, H = HOSPITAL_H * TILE;
    this.cameras.main.setBackgroundColor('#dfe7ef');
    if (this.textures.exists(PICTURE_KEY)) this.add.image(0, 0, PICTURE_KEY).setOrigin(0).setScale(W / PICTURE_PX).setDepth(0);
    this.physics.world.setBounds(0, 0, W, H);
    this.createSolids();
    this.createPlayer(profile);
    this.createStaff();
    this.bubble = this.add.image(0, 0, 'bubble').setScale(0.75).setDepth(20).setVisible(false);
    this.add.text((EXIT.tx + 0.5) * TILE, (EXIT.ty + 0.95) * TILE, 'outside ▼', { fontFamily: FONT, fontSize: '7px', color: '#4a5561' }).setOrigin(0.5, 0).setDepth(3).setResolution(4);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();

    this.controls = new InputController(this);
    this.facing = 'up';
    this.wasBlocked = true;   // the step through the door must not count as a press
    this.leaving = false;
    this.launchHud();
    this.tickTimer = this.time.addEvent({ delay: 150, loop: true, callback: this.tick, callbackScope: this });
    Music.play('lounge');

    this.onResize = () => this.applyZoom();
    this.onResumeBound = () => { Music.play('lounge'); Music.duck(false); this.onResume(); };
    this.onPauseBound = () => { this.stopPlayer(); Music.duck(true); };
    this.scale.on('resize', this.onResize);
    this.events.on('resume', this.onResumeBound);
    this.events.on('pause', this.onPauseBound);
    this.onGameDone = () => this.refreshStaff();
    this.events.on('minigame:done', this.onGameDone);
    this.events.once('shutdown', () => this.cleanup());
    const hud = this.hud();
    if (hud) hud.banner('The Hospital', { accent: THEME.subjects.health.accent });
  }

  // ---- Setup ---------------------------------------------------------------------------------

  /** Invisible static bodies over every square that is not floor, merged into runs along each row. */
  createSolids() {
    this.solids = this.physics.add.staticGroup();
    const add = (cx, cy, w, h) => { const r = this.add.rectangle(cx, cy, w, h).setVisible(false); this.physics.add.existing(r, true); this.solids.add(r); };
    for (let ty = 0; ty < HOSPITAL_H; ty++) {
      let run = null;
      const flush = () => { if (run) add((run.x0 + run.n / 2) * TILE, (ty + 0.5) * TILE, run.n * TILE, TILE); run = null; };
      for (let tx = 0; tx < HOSPITAL_W; tx++) { if (!isFloor(tx, ty)) { if (run) run.n += 1; else run = { x0: tx, n: 1 }; } else flush(); }
      flush();
    }
    void FLOOR;
  }

  createPlayer(profile) {
    const key = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    this.player = fitPlayer(this.physics.add.sprite(SPAWN.tx * TILE, SPAWN.ty * TILE, key, IDLE_FRAMES.up)).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
    addShadow(this, this.player, 20); sortSprite(this.player);
  }

  /** The staff stand at their work, each with a plate naming their game and its stars. */
  createStaff() {
    this.staffGroup = this.physics.add.staticGroup();
    this.staff = [];
    for (const def of STAFF) {
      const key = this.textures.exists(def.sprite) ? def.sprite : 'npc0';
      const s = this.staffGroup.create((def.at.tx + 0.5) * TILE, (def.at.ty + 0.5) * TILE, key, IDLE_FRAMES.down);
      s.setScale(CHAR_WORLD_SCALE).setDepth(5).refreshBody();
      s.body.setSize(22, 22);
      s.def = def;
      addShadow(this, s, 18); sortSprite(s);
      const game = getGame(def.gameId);
      s.plate = this.add.text(s.x, s.y + 22, game ? `${game.icon} ${game.title}` : def.name, { fontFamily: FONT, fontSize: '6px', color: '#ffffff', backgroundColor: '#1e2a3a', padding: { x: 3, y: 1 } }).setOrigin(0.5, 0).setDepth(6).setResolution(4);
      s.stars = [0, 1, 2].map((i) => this.add.image(s.x + (i - 1) * 8, s.y + 34, 'star-off').setDisplaySize(7, 7).setDepth(6));
      this.staff.push(s);
    }
    this.physics.add.collider(this.player, this.staffGroup);
    this.refreshStaff();
  }

  /** Stars under each plate: the game's best stars so far. */
  refreshStaff() {
    const p = Store.getProfile();
    if (!p) return;
    for (const s of this.staff) {
      const best = (p.games && p.games[s.def.gameId] && p.games[s.def.gameId].bestStars) || 0;
      s.stars.forEach((img, i) => { if (img.active) img.setTexture(i < best ? 'star' : 'star-off'); });
    }
  }

  applyZoom() {
    const cam = this.cameras.main;
    if (!cam) return;
    const { min } = viewport(this);
    cam.setZoom(Math.max(2, Math.round((min < 600 ? 2 : 3) * dpr())));
  }

  // ---- Hud bridge ----------------------------------------------------------------------------

  hud() {
    const h = this.scene.get(SCENES.Hud);
    return h && h.state && (h.scene.isActive() || h.scene.isSleeping()) ? h : null;
  }

  launchHud() {
    const key = SCENES.Hud;
    if (!this.scene.get(key)) return;
    if (this.scene.isSleeping(key)) this.scene.wake(key);
    else if (!this.scene.isActive(key) && !this.scene.isPaused(key)) this.scene.launch(key);
    this.scene.bringToTop(key);
    const hud = this.hud(), p = Store.getProfile();
    if (hud && p) { hud.setCoins(p.coins); hud.setZone('The Hospital'); }
  }

  say(msg, opts) {
    const hud = this.hud();
    if (hud && hud.scene.isActive()) hud.notify(msg, opts); else toast(this, msg, opts);
  }

  // ---- Per-frame -----------------------------------------------------------------------------

  update(time) {
    if (!this.player || !this.player.body || this.leaving) return;
    const hud = this.hud();
    const inp = this.controls.read();
    if (hud && hud.blocking) {
      this.stopPlayer();
      if (hud.dialogOpen && inp.actionJustPressed) hud.confirmDialog();
      this.wasBlocked = true;
      this.bubble.setVisible(false);
      return;
    }
    const skipAction = this.wasBlocked;
    this.wasBlocked = false;
    const { dx, dy } = inp;
    this.player.setVelocity(dx * SPEED, dy * SPEED);
    if (dx !== 0 || dy !== 0) {
      const dir = Math.abs(dx) >= Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
      if (dir === 'side') this.player.setFlipX(dx > 0);
      this.facing = dir === 'side' ? (dx > 0 ? 'right' : 'left') : dir;
      this.player.anims.play(`${this.player.texture.key}-${dir}`, true);
      this.player.anims.timeScale = Math.max(0.5, Math.hypot(dx, dy));   // a gentle joystick walks slowly
    } else this.stopPlayer();
    sortSprite(this.player);

    let near = null, best = USE_DIST;
    for (const s of this.staff) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (d < best) { best = d; near = s; }
    }
    this.nearStaff = near;
    if (near) this.bubble.setVisible(true).setPosition(near.x, near.y - 22 + Math.sin(time / 150) * 2);
    else this.bubble.setVisible(false);
    if (inp.actionJustPressed && !skipAction && near) this.talk(near);
  }

  stopPlayer() {
    if (!this.player || !this.player.body) return;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    const f = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    this.player.setFrame(IDLE_FRAMES[f] ?? 0);
  }

  tick() {
    if (!this.player || this.leaving) return;
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
    const hud = this.hud(), p = Store.getProfile();
    if (hud && hud.state.zone !== 'The Hospital') hud.setZone('The Hospital');
    if (hud && p && hud.state.coins !== p.coins) hud.setCoins(p.coins);
    if (onExit(tx, ty) && !(hud && hud.blocking)) this.leave();
  }

  // ---- Interactions --------------------------------------------------------------------------

  /** Talk like a villager outside: hello coins the first time, their lines, and the offer of their game. */
  talk(sprite) {
    const def = sprite.def, hud = this.hud();
    this.stopPlayer();
    const dx = sprite.x - this.player.x, dy = sprite.y - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) { sprite.setFrame(IDLE_FRAMES.side); sprite.setFlipX(dx < 0); } else sprite.setFrame(dy > 0 ? IDLE_FRAMES.up : IDLE_FRAMES.down);
    Sfx.pop();
    let firstTalk = false;
    Store.updateProfile((p) => {
      p.world.npcsTalked ||= [];
      if (!p.world.npcsTalked.includes(def.id)) { p.world.npcsTalked.push(def.id); p.coins += HELLO_COINS; firstTalk = true; }
    });
    if (!hud) return;
    const profile = Store.getProfile();
    let prompt = def.playPrompt;
    if (def.gameId) {
      const lv = profile.games?.[def.gameId]?.levels || {};
      const passed = [1, 2, 3].filter((n) => (lv[n] || 0) >= 1).length, level = nextHouseLevel(profile, def.gameId);
      const at = gradeUps(profile, def.gameId) ? ` at ${gradeLabel(gameGrade(profile, def.gameId))}` : '';
      prompt = passed >= HOUSE_LEVELS ? `You have all ${HOUSE_LEVELS} stars here! Play level ${HOUSE_LEVELS} again?` : `${def.playPrompt} Level ${level} of ${HOUSE_LEVELS}${at}${passed ? ` (${passed} star${passed > 1 ? 's' : ''} so far)` : ''}`;
    }
    hud.showDialog({ name: def.name, voice: def.voice, pitch: def.pitch, rate: def.rate, speaker: def.id, lines: def.lines, prompt, onPlay: def.gameId ? () => this.playGame(def) : null });
    if (firstTalk) {
      hud.setCoins(Store.getProfile().coins);
      hud.awardCoins(HELLO_COINS);
      hud.notify(`+${HELLO_COINS} coins for saying hello!`, { icon: 'coin' });
    }
  }

  playGame(def) {
    const game = getGame(def.gameId);
    if (!game || !this.scene.get(game.sceneKey)) { this.say(`${game ? game.title : 'That game'} is coming soon!`, { accent: THEME.brand }); return; }
    this.stopPlayer();
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, def.gameId, { source: 'roam', context: { npcId: def.id, zoneId: 'health' } });
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.stopPlayer();
    Sfx.click();
    if (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud)) this.scene.stop(SCENES.Hud);
    this.scene.start(SCENES.World);
  }

  // ---- Lifecycle -----------------------------------------------------------------------------

  onResume() {
    this.launchHud();
    this.stopPlayer();
    this.wasBlocked = true;
    this.refreshStaff();
  }

  cleanup() {
    Music.stop();
    this.scale.off('resize', this.onResize);
    this.events.off('resume', this.onResumeBound);
    this.events.off('pause', this.onPauseBound);
    this.events.off('minigame:done', this.onGameDone);
    try { if (this.tickTimer) this.tickTimer.remove(false); } catch { /* clock gone */ }
    this.tickTimer = null;
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin gone */ }
    this.controls = null;
    if (this.scene.get(SCENES.Hud) && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    this.player = null; this.staff = []; this.nearStaff = null;
  }
}
