import Phaser from 'phaser';
import { SCENES, TILE } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Music from '../systems/Music.js';
import { InputController } from '../systems/InputController.js';
import { viewport, dpr } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';
import { toast } from '../ui/Toast.js';
import { resolveLook } from '../data/avatars.js';
import { lookSpriteTexture, CHAR_WORLD_SCALE, IDLE_FRAMES } from '../systems/Textures.js';
import { outfitOf, outfitId } from '../systems/Market.js';
import { bandFor } from '../data/grades.js';
import { effectiveGrade } from '../systems/Progression.js';
import { getModule } from '../data/bible/lessons.js';
import { CHURCH_W, CHURCH_H, EXIT, SPAWN, ALTAR, LECTERN, PEWS, STATIONS, isWall, onExit } from '../data/bible/church.js';
import { moduleProgress, churchProgress } from '../systems/Church.js';

const SPEED = 110;
const USE_DIST = 26;
const FONT = 'Fredoka, sans-serif';

/**
 * Inside the Village Church, a cousin of the player's house: walk down the aisle between the pews. Each of the five
 * stained-glass windows is a lesson module (people, stories, places, books, memory verses); stand below one and press
 * to open its building blocks (ChurchLessonScene). Stars under each window show how much of it is learned, and a
 * window glows while it still has blocks to learn. The big Bible on the lectern explains it all. The door mat goes
 * back out to Bible Village. Like the house, it is not rebuilt on resize; the Hud floats on top.
 */
export class ChurchScene extends Phaser.Scene {
  constructor() { super(SCENES.Church); }

  create() {
    const profile = Store.getProfile();
    if (!profile) return this.scene.start(SCENES.Profile);
    this.band = bandFor(effectiveGrade(profile, 'bible'));
    this.drawInterior();
    this.physics.world.setBounds(0, 0, CHURCH_W * TILE, CHURCH_H * TILE);
    this.createSolids();
    this.createPlayer(profile);
    this.createSpots();
    this.bubble = this.add.image(0, 0, 'bubble').setScale(0.75).setDepth(20).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, CHURCH_W * TILE, CHURCH_H * TILE);
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
    this.onLessonDone = (e) => this.afterLesson(e);
    this.events.on('church:done', this.onLessonDone);
    this.events.once('shutdown', () => this.cleanup());
    const hud = this.hud();
    if (hud) hud.banner('The Village Church', { accent: THEME.brand });
  }

  // ---- Drawing --------------------------------------------------------------------------------

  /** Floor, walls, windows (with their light on the floor), the altar, lectern and pews, baked into one texture. */
  drawInterior() {
    const g = this.make.graphics({ add: false });
    const W = CHURCH_W * TILE, H = CHURCH_H * TILE, T = TILE;
    g.fillStyle(0x3b3346, 1); g.fillRect(0, 0, W, H);
    // Stone floor and the red carpet up the aisle.
    g.fillStyle(0xd8d3ca, 1); g.fillRect(T, 2 * T, W - 2 * T, H - 3 * T);
    g.fillStyle(0xc5beb2, 0.7);
    for (let y = 2; y < CHURCH_H - 1; y++) g.fillRect(T, y * T, W - 2 * T, 1);
    for (let x = 1; x < CHURCH_W - 1; x++) g.fillRect(x * T, 2 * T, 1, H - 3 * T);
    g.fillStyle(0xa8323e, 1); g.fillRect(6 * T + 6, 3 * T, 3 * T - 12, H - 4 * T);
    g.fillStyle(0xffc531, 0.8); g.fillRect(6 * T + 6, 3 * T, 2, H - 4 * T); g.fillRect(9 * T - 8, 3 * T, 2, H - 4 * T);
    // Back wall: warm plaster over a stone plinth; side and front walls are dark tops.
    g.fillStyle(0xefe6d6, 1); g.fillRect(T, 0, W - 2 * T, 2 * T);
    g.fillStyle(0x4a4036, 1); g.fillRect(T, 0, W - 2 * T, 3);
    g.fillStyle(0xc9bfae, 1); g.fillRect(T, 2 * T - 6, W - 2 * T, 6);
    for (let ty = 0; ty < CHURCH_H; ty++) for (let tx = 0; tx < CHURCH_W; tx++) {
      if (!isWall(tx, ty) || (ty <= 1 && tx > 0 && tx < CHURCH_W - 1)) continue;
      g.fillStyle(0x5a4e63, 1); g.fillRect(tx * T, ty * T, T, T);
      g.fillStyle(0xffffff, 0.06); g.fillRect(tx * T, ty * T, T, 2);
    }
    // Stained-glass windows and the coloured light they throw on the floor.
    for (const st of STATIONS) this.drawWindow(g, st, getModule(st.module).glass);
    // Altar with its cloth, cross and candles; the lectern with the open Bible; the pews.
    const ax = ALTAR.x * T, ay = ALTAR.y * T;
    g.fillStyle(0x6b4a2e, 1); g.fillRect(ax, ay + 6, ALTAR.w * T, T - 6);
    g.fillStyle(0xfff8ef, 1); g.fillRect(ax - 2, ay + 4, ALTAR.w * T + 4, 10);
    g.fillStyle(0xffc531, 1); g.fillRect(ax + ALTAR.w * T - 8, ay + 14, 4, T - 14);   // gold hem
    g.fillStyle(0xffc531, 1); g.fillRect(ax + (ALTAR.w * T) / 2 - 1, ay - 10, 3, 16); g.fillRect(ax + (ALTAR.w * T) / 2 - 5, ay - 5, 11, 3);
    g.fillStyle(0xfff8ef, 1); g.fillRect(ax + 8, ay - 4, 4, 10); g.fillRect(ax + ALTAR.w * T - 12, ay - 4, 4, 10);   // candles
    const lx = LECTERN.x * T, ly = LECTERN.y * T;
    g.fillStyle(0x6b4a2e, 1); g.fillRect(lx + 12, ly + 10, 8, T - 10); g.fillRect(lx + 6, ly + T - 5, 20, 5);
    g.fillStyle(0x8a6240, 1); g.fillTriangle(lx + 2, ly + 12, lx + T - 2, ly + 12, lx + T / 2, ly + 4);
    g.fillStyle(0xfff8ef, 1); g.fillRect(lx + 5, ly + 5, 10, 6); g.fillRect(lx + 17, ly + 5, 10, 6);
    g.fillStyle(0x7c5cff, 1); g.fillRect(lx + 15, ly + 5, 2, 7);
    for (const p of PEWS) {
      const px = p.x * T, py = p.y * T, pw = p.w * T;
      g.fillStyle(0x000000, 0.12); g.fillRect(px + 2, py + T - 6, pw, 6);
      g.fillStyle(0x7a4a2a, 1); g.fillRect(px, py + 4, pw, 8);                  // the back
      g.fillStyle(0xa06a3c, 1); g.fillRect(px, py + 12, pw, 12);                // the seat
      g.fillStyle(0x5a3620, 1); g.fillRect(px, py + 24, 4, 6); g.fillRect(px + pw - 4, py + 24, 4, 6);
      g.fillStyle(0xffffff, 0.12); g.fillRect(px, py + 12, pw, 2);
    }
    // The door mat.
    g.fillStyle(0x7c5cff, 1); g.fillRoundedRect(EXIT.tx * T + 3, EXIT.ty * T + 6, T - 6, T - 12, 4);
    g.fillStyle(0xfff1e8, 0.6); g.fillRect(EXIT.tx * T + 7, EXIT.ty * T + 11, T - 14, 2);
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(0);
    rt.draw(g);
    g.destroy();
    // Candle flames flicker; the module names hang under their windows.
    for (const fx of [ax + 10, ax + ALTAR.w * T - 10]) {
      const flame = this.add.ellipse(fx, ay - 7, 4, 6, 0xffc86b, 1).setDepth(2);
      this.tweens.add({ targets: flame, scaleY: 1.3, alpha: 0.7, duration: 300 + (fx % 7) * 40, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.add.text((EXIT.tx + 0.5) * TILE, EXIT.ty * TILE - 3, 'outside ▼', { fontFamily: FONT, fontSize: '7px', color: '#6e6357' }).setOrigin(0.5, 1).setDepth(3).setResolution(4);
  }

  /** An arched window of coloured panes in the module's colour, and its patch of coloured light on the floor. */
  drawWindow(g, st, colour) {
    const T = TILE;
    const light = Phaser.Display.Color.IntegerToColor(colour);
    const tint = (f) => Phaser.Display.Color.GetColor(Math.min(255, light.red * f), Math.min(255, light.green * f), Math.min(255, light.blue * f));
    if (st.wall === 'back') {
      const x = st.tx * T + 5, y = 4, w = T - 10, h = 2 * T - 14;
      g.fillStyle(0x2d2a4a, 1); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, { tl: w / 2 + 2, tr: w / 2 + 2, bl: 2, br: 2 });
      const panes = [[0, 0, 0.5, 0.5, 1.15], [0.5, 0, 0.5, 0.5, 0.8], [0, 0.5, 0.5, 0.5, 0.75], [0.5, 0.5, 0.5, 0.5, 1.05]];
      for (const [px, py, pw, ph, f] of panes) { g.fillStyle(tint(f), 1); g.fillRect(x + px * w, y + py * h, pw * w, ph * h); }
      g.fillStyle(0xfff1e8, 0.55); g.fillCircle(x + w / 2, y + h * 0.22, 3);
      g.lineStyle(1.5, 0x2d2a4a, 1); g.lineBetween(x + w / 2, y + 6, x + w / 2, y + h); g.lineBetween(x, y + h / 2, x + w, y + h / 2);
      // Coloured light falling on the floor below.
      g.fillStyle(colour, 0.14); g.fillPoints([{ x: x, y: 2 * T }, { x: x + w, y: 2 * T }, { x: x + w + 10, y: 4 * T }, { x: x - 10, y: 4 * T }], true);
    } else {
      const left = st.wall === 'left';
      const x = st.tx * T + (left ? 8 : 8), y = st.ty * T - 10, w = T - 16, h = T + 20;
      g.fillStyle(0x2d2a4a, 1); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, { tl: w / 2 + 2, tr: w / 2 + 2, bl: 2, br: 2 });
      g.fillStyle(tint(1.1), 1); g.fillRect(x, y, w, h / 2); g.fillStyle(tint(0.8), 1); g.fillRect(x, y + h / 2, w, h / 2);
      g.lineStyle(1.5, 0x2d2a4a, 1); g.lineBetween(x, y + h / 2, x + w, y + h / 2);
      const fx = left ? T : (CHURCH_W - 1) * T;
      g.fillStyle(colour, 0.14); g.fillPoints([{ x: fx, y: y + 6 }, { x: fx, y: y + h }, { x: fx + (left ? 2 : -2) * T, y: y + h + 16 }, { x: fx + (left ? 2 : -2) * T, y: y + 18 }], true);
    }
  }

  /** Invisible static bodies over the walls (merged into runs) and every piece of furniture. */
  createSolids() {
    this.solids = this.physics.add.staticGroup();
    const add = (cx, cy, w, h) => { const r = this.add.rectangle(cx, cy, w, h).setVisible(false); this.physics.add.existing(r, true); this.solids.add(r); };
    for (let ty = 0; ty < CHURCH_H; ty++) {
      let run = null;
      const flush = () => { if (run) add((run.x0 + run.n / 2) * TILE, (ty + 0.5) * TILE, run.n * TILE, TILE); run = null; };
      for (let tx = 0; tx < CHURCH_W; tx++) { if (isWall(tx, ty)) { if (run) run.n += 1; else run = { x0: tx, n: 1 }; } else flush(); }
      flush();
    }
    for (const f of [ALTAR, LECTERN, ...PEWS]) add((f.x + f.w / 2) * TILE, (f.y + f.h / 2) * TILE, f.w * TILE - 4, f.h * TILE - 4);
  }

  createPlayer(profile) {
    const key = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    this.player = this.physics.add.sprite(SPAWN.tx * TILE, SPAWN.ty * TILE, key, IDLE_FRAMES.up).setScale(CHAR_WORLD_SCALE).setDepth(10);
    this.player.body.setSize(28, 16).setOffset(18, 46);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
  }

  /** The five windows (each with a name plate, three stars and a glow while there is more to learn) and the lectern. */
  createSpots() {
    this.spots = [];
    for (const st of STATIONS) {
      const mod = getModule(st.module);
      const back = st.wall === 'back';
      const x = (st.tx + 0.5) * TILE, y = back ? 1.2 * TILE : (st.ty + 0.4) * TILE;
      const glow = this.add.circle(x, y, 18, mod.glass, 0.35).setDepth(1);
      this.tweens.add({ targets: glow, alpha: 0.08, scale: 1.3, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const plateY = back ? 2 * TILE - 3 : (st.ty + 1) * TILE + 12;
      const plateX = back ? x : st.wall === 'left' ? TILE + 26 : (CHURCH_W - 1) * TILE - 26;
      const plate = this.add.text(plateX, plateY, `${mod.icon} ${mod.title}`, { fontFamily: FONT, fontSize: '6px', color: '#fff8ef', backgroundColor: '#2d2a4a', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(6).setResolution(4);
      const stars = [0, 1, 2].map((i) => this.add.image(plateX + (i - 1) * 8, plateY + 8, 'star-off').setDisplaySize(7, 7).setDepth(6));
      this.spots.push({ kind: 'window', id: mod.id, x, y: back ? TILE : st.ty * TILE, at: st.at, glow, stars, plate });
    }
    this.spots.push({ kind: 'lectern', id: 'lectern', x: (LECTERN.x + 0.5) * TILE, y: LECTERN.y * TILE, at: LECTERN.at });
    this.refreshSpots();
  }

  /** Stars show the share of a module's blocks done (a third, two thirds, all); the glow stays until it is complete. */
  refreshSpots() {
    const p = Store.getProfile();
    if (!p) return;
    for (const s of this.spots) {
      if (s.kind !== 'window') continue;
      const prog = moduleProgress(p, s.id, this.band);
      const lit = prog.total ? Math.floor((3 * prog.done) / prog.total) : 0;
      s.stars.forEach((img, i) => img.setTexture(i < lit ? 'star' : 'star-off'));
      s.glow.setVisible(!prog.complete);
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
    if (hud && p) { hud.setCoins(p.coins); hud.setZone('Village Church'); }
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
      const dir = dx !== 0 ? 'side' : dy < 0 ? 'up' : 'down';
      if (dx !== 0) this.player.setFlipX(dx > 0);
      this.facing = dir === 'side' ? (dx > 0 ? 'right' : 'left') : dir;
      this.player.anims.play(`${this.player.texture.key}-${dir}`, true);
    } else this.stopPlayer();

    let near = null, best = USE_DIST;
    for (const s of this.spots) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, (s.at.tx + 0.5) * TILE, (s.at.ty + 0.5) * TILE);
      if (d < best) { best = d; near = s; }
    }
    this.nearSpot = near;
    if (near) this.bubble.setVisible(true).setPosition(near.x, near.y - 16 + Math.sin(time / 150) * 2);
    else this.bubble.setVisible(false);
    if (inp.actionJustPressed && !skipAction && near) this.use(near);
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
    if (hud && hud.state.zone !== 'Village Church') hud.setZone('Village Church');
    if (hud && p && hud.state.coins !== p.coins) hud.setCoins(p.coins);
    if (onExit(tx, ty) && !(hud && hud.blocking)) this.leave();
  }

  // ---- Interactions --------------------------------------------------------------------------

  use(s) {
    this.stopPlayer();
    Sfx.pop();
    if (s.kind === 'window') return this.openLesson(s.id);
    const hud = this.hud();
    if (!hud) return;
    const prog = churchProgress(Store.getProfile(), this.band);
    hud.showDialog({
      name: '📖 The big Bible', voice: 'female',
      lines: [
        'Welcome to the Village Church! Each coloured window teaches one part of the Bible.',
        `Stand under a window and press to learn it, block by block. Every block you learn helps you in the Bible games.`,
        prog.done ? `You have learned ${prog.done} of ${prog.total} blocks so far. Keep going!` : `There are ${prog.total} blocks to learn. Start with the purple window of Bible people!`
      ]
    });
  }

  /** Pause the church, sleep the Hud and open the module's building blocks on top. */
  openLesson(moduleId) {
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    this.scene.pause();
    this.scene.launch(SCENES.ChurchLesson, { moduleId, returnTo: SCENES.Church });
  }

  /** Back from a lesson: relight the stars and celebrate what was earned. */
  afterLesson(e) {
    this.refreshSpots();
    if (!e || !e.earned) return;
    const hud = this.hud(), mod = getModule(e.moduleId);
    if (e.earned.coins && hud) hud.awardCoins(e.earned.coins);
    if (e.earned.blocks) this.time.delayedCall(300, () => this.say(`🧱 ${e.earned.blocks} ${e.earned.blocks === 1 ? 'block' : 'blocks'} learned in ${mod ? mod.title : 'church'}!`, { icon: 'star', accent: THEME.brand }));
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
  }

  cleanup() {
    Music.stop();
    this.scale.off('resize', this.onResize);
    this.events.off('resume', this.onResumeBound);
    this.events.off('pause', this.onPauseBound);
    this.events.off('church:done', this.onLessonDone);
    try { if (this.tickTimer) this.tickTimer.remove(false); } catch { /* clock gone */ }
    this.tickTimer = null;
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin gone */ }
    this.controls = null;
    if (this.scene.get(SCENES.Hud) && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    this.player = null; this.spots = []; this.nearSpot = null;
  }
}
