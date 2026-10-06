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
import { lookSpriteTexture, fitPlayer, IDLE_FRAMES } from '../systems/Textures.js';
import { HOUSE_W, HOUSE_H, HOUSE_ROOMS, FURNITURE, EXHIBITS, SIGNS, WINDOWS, EXIT, SPAWN, wallTiles, roomAt, onExit } from '../data/social/house.js';
import { getRoom } from '../data/social/barbados.js';
import { TV_FACTS, FRIDGE_FACTS, BOOK_FACTS, pickFact } from '../data/social/facts.js';
import { roomRecord } from '../systems/Social.js';
import { outfitOf, outfitId, roomDecor } from '../systems/Market.js';
import { drawFurniture, drawExhibit } from './house/furniture.js';
import { bakeSharp } from '../ui/Bake.js';
import { drinkUp } from './world/drink.js';

const SPEED = 110;
const USE_DIST = 26;          // px from the centre of the tile you stand on to use something
const IDLE_FRAME = IDLE_FRAMES;
const FONT = 'Fredoka, sans-serif';

/**
 * Inside the player's house: a living room, bedroom, study, dining room, kitchen and hall, each with real
 * furniture. The same character walks from room to room. On each room's back wall hangs a Barbados exhibit
 * (the flag, the heroes' portraits, the map…) that opens that room's story and quiz (HouseRoomScene), and some
 * of the furniture can be used: the stove cooks Bajan dishes, the TV, fridge and bookshelves tell facts, the
 * bed rests, the wardrobe changes your look, the desk shows the quests and the trophy case the trophies.
 * Standing on the front-door mat goes back outside. Like the World, this is not rebuilt on resize: only the
 * camera zoom changes. The Hud floats on top.
 */
export class HouseScene extends Phaser.Scene {
  constructor() { super(SCENES.House); }

  create() {
    const profile = Store.getProfile();
    if (!profile) return this.scene.start(SCENES.Profile);
    this.walls = wallTiles();
    this.drawInterior();
    this.physics.world.setBounds(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);
    this.createSolids();
    this.createPlayer(profile);
    this.createSpots();
    this.bubble = this.add.image(0, 0, 'bubble').setScale(0.75).setDepth(20).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();

    this.controls = new InputController(this);
    this.facing = 'up';
    this.wasBlocked = true;   // the step through the door must not count as a press
    this.currentRoom = undefined;
    this.leaving = false;
    this.lastFact = {};
    this.launchHud();
    this.tickTimer = this.time.addEvent({ delay: 150, loop: true, callback: this.tick, callbackScope: this });
    this.tick();
    Music.play();

    this.onResize = () => this.applyZoom();
    this.onResumeBound = () => { Music.play('lounge'); Music.duck(false); this.onResume(); };   // back from a game, or a duel's battle music
    this.onPauseBound = () => { this.stopPlayer(); Music.duck(true); };
    this.scale.on('resize', this.onResize);
    this.events.on('resume', this.onResumeBound);
    this.events.on('pause', this.onPauseBound);
    this.onRoomDone = (e) => this.afterRoom(e);
    this.events.on('room:done', this.onRoomDone);
    this.onMarketDone = (d) => { this.refreshOutfit(); drinkUp(this, d); };
    this.events.on('market:done', this.onMarketDone);
    this.events.once('shutdown', () => this.cleanup());
    const hud = this.hud();
    if (hud) hud.banner(`${profile.name}'s house`, { accent: THEME.pink });
  }

  // ---- Drawing --------------------------------------------------------------------------------

  roomColour(room) { return room && room.exhibit ? getRoom(room.exhibit).colour : THEME.pink; }

  /** A room's floor style and wall colour: what was bought and applied at the market, else the room's own. */
  roomStyle(room) {
    const d = roomDecor(Store.getProfile(), room.id);
    return { floor: d.floor || room.floor, wall: d.wall !== undefined ? d.wall : room.wall };
  }

  /** Floors, walls, windows, rugs, furniture and exhibits baked into one texture; the signs sit on top as text. */
  drawInterior() {
    const g = this.make.graphics({ add: false });
    const W = HOUSE_W * TILE, H = HOUSE_H * TILE;
    g.fillStyle(0x6e6357, 1); g.fillRect(0, 0, W, H);   // wall tops, wherever there is no floor
    for (const r of HOUSE_ROOMS) this.drawFloor(g, r);
    this.drawWalls(g);
    for (const wx of WINDOWS) this.drawWindow(g, wx * TILE, 0);
    this.drawMat(g);
    for (const f of FURNITURE) drawFurniture(g, f.kind, f.x * TILE, f.y * TILE, f.w * TILE, f.h * TILE, this.roomColour(HOUSE_ROOMS.find((r) => r.id === f.room)));
    for (const ex of EXHIBITS) drawExhibit(g, ex.id, ex.tx * TILE, ex.ty * TILE);
    bakeSharp(this, g, W, H, 0);
    g.destroy();
    // Room name signs: a dark pill on the back wall, right of centre, clear of the exhibit and the windows.
    for (const s of SIGNS) {
      const label = this.add.text(s.tx * TILE, s.ty * TILE, s.name, { fontFamily: FONT, fontSize: '8px', color: '#fff8ef', fontStyle: '600' }).setOrigin(0.5).setDepth(5).setResolution(4);
      const bg = this.add.graphics().setDepth(4);
      const bw = label.width + 12, bh = 13;
      bg.fillStyle(0x2d2a4a, 0.92); bg.fillRoundedRect(s.tx * TILE - bw / 2, s.ty * TILE - bh / 2, bw, bh, 5);
      bg.fillStyle(this.roomColour(HOUSE_ROOMS.find((r) => r.id === s.room)), 1); bg.fillRoundedRect(s.tx * TILE - bw / 2, s.ty * TILE + bh / 2 - 2, bw, 2, 1);
    }
    this.add.text((EXIT.x + EXIT.w / 2) * TILE, EXIT.y * TILE - 5, 'outside ▼', { fontFamily: FONT, fontSize: '7px', color: '#6e6357' }).setOrigin(0.5, 1).setDepth(3).setResolution(4);
  }

  drawFloor(g, r) {
    const x0 = r.x * TILE, y0 = r.y * TILE, w = r.w * TILE, h = r.h * TILE, half = TILE / 2;
    const styles = {
      oak: [0xe9c9a0, 0xd9b285], walnut: [0xc79b6b, 0xa97f52], carpet: [0xf1d3da, 0xe8c2cb], stone: [0xd8d3ca, 0xc9c3b8],
      tiles: [0xe3ddf2, 0xd3cce8], parquet: [0xe6c79c, 0xd6b487], checker: [0xf6f1e8, 0x3b3550]
    };
    const [base, alt] = styles[this.roomStyle(r).floor] || styles.oak;
    g.fillStyle(base, 1); g.fillRect(x0, y0, w, h);
    const floorStyle = this.roomStyle(r).floor;
    if (floorStyle === 'oak' || floorStyle === 'walnut') {
      g.fillStyle(alt, 0.5);
      for (let row = 0; row < r.h * 2; row++) { g.fillRect(x0, y0 + row * half, w, 1); for (let col = row % 2; col < r.w * 2; col += 2) g.fillRect(x0 + col * half + (row % 2) * 8, y0 + row * half, 1, half); }
    } else if (floorStyle === 'carpet') {
      g.fillStyle(alt, 0.7); for (let y = 6; y < h; y += 12) for (let x = ((y / 12) % 2) * 6 + 4; x < w; x += 12) g.fillRect(x0 + x, y0 + y, 2, 2);
    } else if (floorStyle === 'stone' || floorStyle === 'tiles') {
      const t = floorStyle === 'stone' ? TILE : half;
      g.fillStyle(alt, 0.6); for (let y = 0; y < h; y += t) g.fillRect(x0, y0 + y, w, 1); for (let x = 0; x < w; x += t) g.fillRect(x0 + x, y0, 1, h);
    } else if (floorStyle === 'parquet') {
      g.fillStyle(alt, 0.55); for (let y = 0; y < r.h * 2; y++) for (let x = 0; x < r.w * 2; x++) if ((x + y) % 2) g.fillRect(x0 + x * half, y0 + y * half, half, half);
      g.fillStyle(0xffffff, 0.15); for (let y = 0; y < r.h * 2; y++) for (let x = 0; x < r.w * 2; x++) if ((x + y) % 2) g.fillRect(x0 + x * half, y0 + y * half, half, 1);
    } else if (floorStyle === 'checker') {
      g.fillStyle(alt, 0.85); for (let y = 0; y < r.h * 2; y++) for (let x = 0; x < r.w * 2; x++) if ((x + y) % 2) g.fillRect(x0 + x * half, y0 + y * half, half, half);
    }
    // A rug where there is open floor: the living room, bedroom, dining room and hall.
    const rug = { living: [1.5, 3, 2.5, 2.5], bedroom: [1.5, 3.5, 3, 2], dining: [1, 1, 4, 2.5], hall: [1, 0.6, 4, 2.6] }[r.id];
    if (rug) {
      const [rx, ry, rw, rh] = rug.map((v) => v * TILE);
      const c = this.roomColour(r);
      g.fillStyle(c, 0.28); g.fillRoundedRect(x0 + rx, y0 + ry, rw, rh, 8);
      g.lineStyle(2, c, 0.4); g.strokeRoundedRect(x0 + rx + 5, y0 + ry + 5, rw - 10, rh - 10, 6);
    }
  }

  /** Wall faces: the room's own plaster colour where a wall meets floor below it, a skirting and a dark top edge. */
  drawWalls(g) {
    for (let ty = 0; ty < HOUSE_H; ty++) for (let tx = 0; tx < HOUSE_W; tx++) {
      if (!this.walls.has(`${tx},${ty}`)) continue;
      const x = tx * TILE, y = ty * TILE;
      const below = ty + 1 < HOUSE_H && !this.walls.has(`${tx},${ty + 1}`) ? roomAt(tx, ty + 1) : null;
      if (below) {
        g.fillStyle(this.roomStyle(below).wall, 1); g.fillRect(x, y, TILE, TILE);
        g.fillStyle(0x4a4036, 1); g.fillRect(x, y, TILE, 3);
        g.fillStyle(0xffffff, 0.35); g.fillRect(x, y + 3, TILE, 2);
        g.fillStyle(0xd8cfc2, 1); g.fillRect(x, y + TILE - 5, TILE, 5);
        g.fillStyle(0x000000, 0.12); g.fillRect(x, y + TILE - 5, TILE, 1);
      } else {
        g.fillStyle(0x6e6357, 1); g.fillRect(x, y, TILE, TILE);
        g.fillStyle(0xffffff, 0.06); g.fillRect(x, y, TILE, 2);
      }
    }
    // Doorway frames: a lighter threshold across each gap in the long walls.
    for (let ty of [7, 10]) for (let tx = 1; tx <= 20; tx++) {
      if (this.walls.has(`${tx},${ty}`)) continue;
      g.fillStyle(0xbfb2a2, 1); g.fillRect(tx * TILE, ty * TILE + TILE - 4, TILE, 4);
    }
  }

  drawWindow(g, x, y) {
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(x + 3, y + 5, TILE - 6, 22, 3);
    g.fillStyle(0x9fdcff, 1); g.fillRect(x + 6, y + 8, TILE - 12, 10);
    g.fillStyle(0x3d8bff, 1); g.fillRect(x + 6, y + 18, TILE - 12, 6);
    g.fillStyle(0xffe08a, 1); g.fillCircle(x + TILE - 12, y + 12, 2.5);
    g.fillStyle(0xffffff, 1); g.fillRect(x + TILE / 2 - 1, y + 8, 2, 16);
  }

  drawMat(g) {
    const x = EXIT.x * TILE, y = EXIT.y * TILE, w = EXIT.w * TILE;
    g.fillStyle(0x000000, 0.1); g.fillRoundedRect(x + 6, y + 8, w - 12, TILE - 12, 4);
    g.fillStyle(0xc45a3c, 1); g.fillRoundedRect(x + 4, y + 6, w - 8, TILE - 12, 4);
    g.fillStyle(0xfff1e8, 0.6); g.fillRect(x + 10, y + 11, w - 20, 2); g.fillRect(x + 10, y + TILE - 11, w - 20, 2);
    g.fillStyle(0x4a4036, 1); g.fillRect(x, (EXIT.y + 1) * TILE - 2, w, 4);   // the door sill
  }

  /** Invisible static bodies over the wall tiles (merged into runs) and every piece of furniture. */
  createSolids() {
    this.solids = this.physics.add.staticGroup();
    const add = (cx, cy, w, h) => { const r = this.add.rectangle(cx, cy, w, h).setVisible(false); this.physics.add.existing(r, true); this.solids.add(r); };
    for (let ty = 0; ty < HOUSE_H; ty++) {
      let run = null;
      const flush = () => { if (run) add((run.x0 + run.n / 2) * TILE, (ty + 0.5) * TILE, run.n * TILE, TILE); run = null; };
      for (let tx = 0; tx < HOUSE_W; tx++) { if (this.walls.has(`${tx},${ty}`)) { if (run) run.n += 1; else run = { x0: tx, n: 1 }; } else flush(); }
      flush();
    }
    for (const f of FURNITURE) add((f.x + f.w / 2) * TILE, (f.y + f.h / 2) * TILE, f.w * TILE - 4, f.h * TILE - 4);
  }

  createPlayer(profile) {
    const key = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    this.player = fitPlayer(this.physics.add.sprite(SPAWN.tx * TILE, SPAWN.ty * TILE, key, IDLE_FRAME.up)).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
  }

  /** Everything that can be used: the exhibits (with their stars and an unread glow) and the usable furniture. */
  createSpots() {
    this.spots = [];
    for (const ex of EXHIBITS) {
      const x = ex.tx * TILE, y = ex.ty * TILE;
      const glow = this.add.circle(x, y + 2, 16, THEME.gold, 0.35).setDepth(3);
      const stars = [0, 1, 2].map((i) => this.add.image(x + (i - 1) * 10, y + 18, 'star-off').setDisplaySize(9, 9).setDepth(5));
      this.tweens.add({ targets: glow, alpha: 0.1, scale: 1.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.spots.push({ kind: 'exhibit', id: ex.id, def: ex, x, y, at: ex.front, glow, stars });
    }
    for (const f of FURNITURE) {
      if (!f.use) continue;
      this.spots.push({ kind: 'furniture', id: f.id, def: f, x: (f.x + f.w / 2) * TILE, y: f.y * TILE + 2, at: f.at, use: f.use });
    }
    this.refreshSpots();
  }

  refreshSpots() {
    const p = Store.getProfile();
    if (!p) return;
    for (const s of this.spots) {
      if (s.kind !== 'exhibit') continue;
      const rec = roomRecord(p, s.id);
      s.glow.setVisible(!rec.read);
      s.stars.forEach((img, i) => img.setTexture(i < (rec.best | 0) ? 'star' : 'star-off'));
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
    if (hud && p) { hud.setCoins(p.coins); hud.setZone('Your house'); }
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

    // The nearest usable thing: measured from the tile you stand on to use it.
    let near = null, best = USE_DIST;
    for (const s of this.spots) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, (s.at.tx + 0.5) * TILE, (s.at.ty + 0.5) * TILE);
      if (d < best) { best = d; near = s; }
    }
    this.nearSpot = near;
    if (near) this.bubble.setVisible(true).setPosition(near.x, near.y - 20 + Math.sin(time / 150) * 2);
    else this.bubble.setVisible(false);
    if (inp.actionJustPressed && !skipAction && near) this.use(near);
  }

  stopPlayer() {
    if (!this.player || !this.player.body) return;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    const f = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    this.player.setFrame(IDLE_FRAME[f] ?? 0);
  }

  /** Every 150ms: which room the player is in (for the Hud label) and the front-door mat. */
  tick() {
    if (!this.player || this.leaving) return;
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
    const room = roomAt(tx, ty);
    const id = room ? room.id : null;
    const hud = this.hud();
    const title = room ? room.name : 'Your house';
    if (id !== this.currentRoom || (hud && hud.state.zone !== title)) {   // the Hud may have been created after the first tick
      this.currentRoom = id;
      if (hud) hud.setZone(title);
    }
    const p = Store.getProfile();
    if (hud && p && hud.state.coins !== p.coins) hud.setCoins(p.coins);
    if (onExit(tx, ty) && !(hud && hud.blocking)) this.leave();
  }

  // ---- Interactions --------------------------------------------------------------------------

  use(s) {
    this.stopPlayer();
    Sfx.pop();
    if (s.kind === 'exhibit') return this.openRoom(s.id);
    const hud = this.hud();
    if (!hud) return;
    const fact = (pool, key) => { const f = pickFact(pool, Math.random, this.lastFact[key]); this.lastFact[key] = f; return f; };
    switch (s.use) {
      case 'cook': hud.showCooking(); break;
      case 'fridge': hud.showDialog({ name: '🧊 The fridge', lines: [fact(FRIDGE_FACTS, 'fridge')], voice: 'female' }); break;
      case 'tv': hud.showDialog({ name: '📺 Bajan TV', lines: [fact(TV_FACTS, 'tv')], voice: 'male' }); break;
      case 'books': hud.showDialog({ name: '📚 Bookshelf', lines: [fact(BOOK_FACTS, 'books')], voice: 'female' }); break;
      case 'bed': hud.showDialog({ name: '🛏️ Bed', lines: ['The bed looks comfy.'], prompt: 'Lie down for a moment?', playLabel: 'Rest', onPlay: () => this.rest() }); break;
      case 'wardrobe': hud.showDialog({ name: '👕 Wardrobe', lines: ['Your clothes are in here.'], prompt: 'Try on a new look?', playLabel: 'Change look', onPlay: () => this.changeLook() }); break;
      case 'desk': hud.openMenu('quests'); break;
      case 'trophy': hud.showHome(); break;
      default: break;
    }
  }

  /** A little lie-down: the lights dim and come back up. */
  rest() {
    const cam = this.cameras.main;
    this.wasBlocked = true;
    const z = this.add.text(this.player.x + 10, this.player.y - 18, 'z z z', { fontFamily: FONT, fontSize: '9px', color: '#2d2a4a' }).setOrigin(0.5).setDepth(21).setResolution(4);
    this.tweens.add({ targets: z, y: z.y - 14, alpha: 0, duration: 1500, ease: 'Sine.Out', onComplete: () => z.destroy() });
    if (cam && cam.fadeOut) {
      cam.fadeOut(500, 20, 16, 40);
      this.time.delayedCall(900, () => { cam.fadeIn(600, 20, 16, 40); this.say('☀️ You feel refreshed!', { accent: THEME.success }); });
    } else this.say('☀️ You feel refreshed!', { accent: THEME.success });
  }

  changeLook() {
    const p = Store.getProfile();
    if (!p) return;
    this.leaving = true;
    if (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud)) this.scene.stop(SCENES.Hud);
    this.scene.start(SCENES.Profile, { edit: p.id });
  }

  /** Redraw the player in the outfit they wear now (after the market). */
  refreshOutfit() {
    const p = Store.getProfile();
    if (!p || !this.player) return;
    const key = lookSpriteTexture(this, resolveLook(p), outfitOf(p), outfitId(p));
    if (this.player.texture.key !== key) { const f = this.player.frame.name; this.player.setTexture(key, f); fitPlayer(this.player); }
  }

  /** Pause the house, sleep the Hud and open the room's story and quiz on top. */
  openRoom(roomId) {
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    this.scene.pause();
    this.scene.launch(SCENES.HouseRoom, { roomId, returnTo: SCENES.House });
  }

  /** Back from a room: light its stars and celebrate. */
  afterRoom(e) {
    this.refreshSpots();
    const hud = this.hud();
    if (!e || !e.result) return;
    const room = getRoom(e.roomId);
    const r = e.result;
    if (r.coins && hud) hud.awardCoins(r.coins);
    if (r.stars >= 1) this.time.delayedCall(300, () => this.say(`⭐ ${r.stars} ${r.stars === 1 ? 'star' : 'stars'} in ${room ? room.title : 'the room'}!`, { icon: 'star', accent: THEME.warning }));
    let delay = 1600;
    for (const b of e.newBadges || []) { this.time.delayedCall(delay, () => { Sfx.unlock(); this.say(`New badge: ${b.title}`, { icon: 'star', accent: THEME.brand }); }); delay += 1400; }
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.stopPlayer();
    Sfx.click();
    // Stop the Hud now (immediately, outside the scene manager's queue) so the world's create finds none and
    // launches a fresh one; left to our shutdown it would be stopped a frame after the world checked.
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
    this.events.off('room:done', this.onRoomDone);
    this.events.off('market:done', this.onMarketDone);
    try { if (this.tickTimer) this.tickTimer.remove(false); } catch { /* clock gone */ }
    this.tickTimer = null;
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin gone */ }
    this.controls = null;
    if (this.scene.get(SCENES.Hud) && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    this.player = null; this.spots = []; this.nearSpot = null;
  }
}
