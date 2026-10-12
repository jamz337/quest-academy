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
import { Sfx, Music as Synth } from '../systems/Audio.js';
import { toast } from '../ui/Toast.js';
import { resolveLook } from '../data/avatars.js';
import { lookSpriteTexture, fitPlayer, IDLE_FRAMES, CHAR_WORLD_SCALE } from '../systems/Textures.js';
import { villagerKey, VILLAGER_WORLD_HEIGHT, VILLAGER_CELL } from '../ui/Villagers.js';
import { outfitOf, outfitId } from '../systems/Market.js';
import { gameGrade, gradeUps, nextHouseLevel, HOUSE_LEVELS } from '../systems/Progression.js';
import { heartsOf, healHearts, HEARTS_MAX } from '../systems/Hearts.js';
import { dayKey } from '../data/world/encounters.js';
import { HOSPITAL_W, HOSPITAL_H, EXIT, SPAWN, ROOMS, LOBBY, FURNITURE, STATIONS, STAFF, isWall, isDoor, onExit } from '../data/health/hospital.js';
import { bakeSharp } from '../ui/Bake.js';
import { sortSprite, addShadow } from './world/depth.js';

const SPEED = 110;
const USE_DIST = 28;
const HELLO_COINS = 2;
const FONT = 'Fredoka, sans-serif';
// The clinic's palette: white walls and floor, teal trim, glass.
const FLOOR = 0xf4f8fa, FLOOR_LINE = 0xdde6ec, WALL_TOP = 0x8fb3bd, WALL_FACE = 0xffffff, WALL_EDGE = 0x5f8f9a, TRIM = 0x2fa3a8, TRIM_DARK = 0x1f7a7e, GLASS = 0xbfe3ec;
const WOOD = 0xd9b68a, WOOD_DARK = 0x9c7a4f, STEEL = 0xb8c2cc, STEEL_DARK = 0x6b7682, LINEN = 0xffffff, BLANKET = 0x7fcdd1, BLANKET_DARK = 0x3f9ea3, LEAF = 0x4caf6a, LEAF_DARK = 0x2e7d4a;

/**
 * Inside the Academy hospital, where Health Heights lives, drawn in code like the house and the church: a lobby with
 * Nurse Nia's desk, a corridor, and four rooms off it. Dr Dee's consulting room has the stethoscope (hear a heart and
 * lungs) and the couch for splinter surgery; the ward has beds that restore hearts and the X-ray machine (see the
 * bones); the pharmacy and the kitchen have Pat and Camille. Walk up to someone or something and press. The mat by
 * the door goes back out to the hub. Not rebuilt on resize; the Hud floats on top.
 */
export class HospitalScene extends Phaser.Scene {
  constructor() { super(SCENES.Hospital); }

  create() {
    const profile = Store.getProfile();
    if (!profile) return this.scene.start(SCENES.Profile);
    this.drawInterior();
    this.physics.world.setBounds(0, 0, HOSPITAL_W * TILE, HOSPITAL_H * TILE);
    this.createSolids();
    this.createPlayer(profile);
    this.createStaff();
    this.createStations();
    this.bubble = this.add.image(0, 0, 'bubble').setScale(0.75).setDepth(20).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, HOSPITAL_W * TILE, HOSPITAL_H * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();

    this.controls = new InputController(this);
    this.facing = 'up';
    this.wasBlocked = true;   // the step through the door must not count as a press
    this.leaving = false;
    this.overlay = null;
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

  // ---- Drawing --------------------------------------------------------------------------------

  /** Floor, walls, doors, trim and every piece of furniture, baked into one sharp picture. */
  drawInterior() {
    const g = this.make.graphics({ add: false });
    const W = HOSPITAL_W * TILE, H = HOSPITAL_H * TILE, T = TILE;
    g.fillStyle(0x3b4a52, 1); g.fillRect(0, 0, W, H);
    // The floor: white tiles with faint lines, and a teal line along every room's walls.
    g.fillStyle(FLOOR, 1); g.fillRect(T, T, W - 2 * T, H - 2 * T);
    g.fillStyle(FLOOR_LINE, 1);
    for (let y = 1; y < HOSPITAL_H - 1; y++) g.fillRect(T, y * T, W - 2 * T, 1);
    for (let x = 1; x < HOSPITAL_W - 1; x++) g.fillRect(x * T, T, 1, H - 3 * T);
    // The corridor and lobby in a slightly cooler tile.
    g.fillStyle(0xe8f1f5, 1); g.fillRect(7 * T, T, T, 9 * T); g.fillRect(LOBBY.x * T, LOBBY.y * T, LOBBY.w * T, LOBBY.h * T);
    g.fillStyle(TRIM, 0.35); g.fillRect(7 * T + 4, T, 2, 9 * T); g.fillRect(8 * T - 6, T, 2, 9 * T);   // guide lines down the corridor
    // Walls: a white face under a teal-grey top, with a dark edge; doors show as teal frames on the floor.
    for (let ty = 0; ty < HOSPITAL_H; ty++) for (let tx = 0; tx < HOSPITAL_W; tx++) {
      if (!isWall(tx, ty)) continue;
      const x = tx * T, y = ty * T, faceBelow = !isWall(tx, ty + 1) || ty === HOSPITAL_H - 1;
      g.fillStyle(WALL_TOP, 1); g.fillRect(x, y, T, T);
      if (faceBelow) {   // a wall's face shows only where it fronts the floor; a wall running on has a flat top
        g.fillStyle(WALL_FACE, 1); g.fillRect(x, y + 8, T, T - 8);
        g.fillStyle(WALL_EDGE, 1); g.fillRect(x, y + 6, T, 3); g.fillRect(x, y + T - 3, T, 3);
      } else { g.fillStyle(WALL_EDGE, 0.5); g.fillRect(x, y, 2, T); g.fillRect(x + T - 2, y, 2, T); }
      g.fillStyle(GLASS, 0.9); if (ty === 0 && tx % 3 === 1 && tx > 1 && tx < HOSPITAL_W - 2) g.fillRect(x + 6, y + 12, T - 12, 14);   // windows along the back
    }
    for (const r of ROOMS) {
      const d = r.door, x = d.tx * T, y = d.ty * T;
      g.fillStyle(TRIM, 1); g.fillRect(x, y, T, T);
      g.fillStyle(0xe8f1f5, 1); g.fillRect(x + 3, y + 3, T - 6, T - 6);
      g.fillStyle(TRIM_DARK, 1); g.fillRect(x, y, T, 3); g.fillRect(x, y + T - 3, T, 3);
    }
    // The lobby door mat.
    g.fillStyle(TRIM, 1); g.fillRoundedRect(EXIT.tx * T + 3, EXIT.ty * T + 6, T - 6, T - 12, 4);
    g.fillStyle(0xffffff, 0.6); g.fillRect(EXIT.tx * T + 7, EXIT.ty * T + 11, T - 14, 2);
    // Furniture.
    for (const f of FURNITURE) this.drawPiece(g, f);
    for (const s of STATIONS) this.drawPiece(g, s);
    bakeSharp(this, g, W, H, 0);
    g.destroy();
    // Name plates over each room's door, and the way out.
    for (const r of ROOMS) this.add.text((r.door.tx + 0.5) * T, r.door.ty * T - 4, r.name, { fontFamily: FONT, fontSize: '6px', color: '#ffffff', backgroundColor: '#1f7a7e', padding: { x: 3, y: 1 } }).setOrigin(0.5, 1).setDepth(6).setResolution(4);
    this.add.text((EXIT.tx + 0.5) * T, EXIT.ty * T - 3, 'outside ▼', { fontFamily: FONT, fontSize: '7px', color: '#4a5561' }).setOrigin(0.5, 1).setDepth(3).setResolution(4);
  }

  /** One piece of furniture or a station, drawn in its own colours with an outline in a darker shade. */
  drawPiece(g, f) {
    const T = TILE, x = f.x * T, y = f.y * T, w = f.w * T, h = f.h * T;
    const shadow = () => { g.fillStyle(0x1e2a3a, 0.12); g.fillRoundedRect(x + 3, y + 5, w - 2, h - 2, 4); };
    switch (f.id) {
      case 'desk': case 'lobby-desk': {
        shadow();
        g.fillStyle(WOOD_DARK, 1); g.fillRoundedRect(x + 1, y + 6, w - 2, h - 6, 4);
        g.fillStyle(WOOD, 1); g.fillRoundedRect(x + 1, y + 3, w - 2, h - 8, 4);
        g.fillStyle(0xffffff, 0.35); g.fillRect(x + 5, y + 6, w - 10, 2);
        g.fillStyle(0x1e2a3a, 1); g.fillRoundedRect(x + w - 16, y + 5, 11, 8, 2); g.fillStyle(GLASS, 1); g.fillRect(x + w - 15, y + 6, 9, 6);   // a screen
        if (f.id === 'lobby-desk') { g.fillStyle(0xe5383b, 1); g.fillRect(x + 8, y + 8, 8, 3); g.fillRect(x + 10.5, y + 5.5, 3, 8); }           // the red cross
        g.lineStyle(1.3, WOOD_DARK, 1); g.strokeRoundedRect(x + 1, y + 3, w - 2, h - 5, 4);
        break;
      }
      case 'shelves': {
        g.fillStyle(WOOD_DARK, 1); g.fillRect(x, y + 4, w, h - 6);
        g.fillStyle(WOOD, 1); g.fillRect(x + 1, y + 5, w - 2, h - 8);
        const cols = [0xe5383b, 0x3d7be0, 0xffd23f, 0x3fb24d, 0xff8fc8, 0xffffff];
        for (let i = 0; i < Math.floor(w / 8); i++) { const c = cols[i % cols.length]; g.fillStyle(c, 1); g.fillRoundedRect(x + 3 + i * 8, y + 9, 5, 12, 2); g.fillStyle(0x1e2a3a, 0.5); g.fillRect(x + 4 + i * 8, y + 8, 3, 3); }
        g.fillStyle(WOOD_DARK, 1); g.fillRect(x, y + 15, w, 2);
        g.lineStyle(1.2, 0x6b4e2e, 1); g.strokeRect(x, y + 4, w, h - 6);
        break;
      }
      case 'counter': {
        shadow();
        g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x + 1, y + 6, w - 2, h - 6, 3);
        g.fillStyle(STEEL, 1); g.fillRoundedRect(x + 1, y + 3, w - 2, h - 8, 3);
        // a hob with two rings, a pot, and a bowl of fruit
        g.fillStyle(0x2b3238, 1); g.fillRect(x + 8, y + 7, 30, 14);
        g.lineStyle(2, 0xe5383b, 1); g.strokeCircle(x + 16, y + 14, 4); g.strokeCircle(x + 30, y + 14, 4);
        g.fillStyle(0x6b7682, 1); g.fillRoundedRect(x + 50, y + 6, 20, 14, 3); g.fillStyle(0x9aa6b2, 1); g.fillRect(x + 48, y + 5, 24, 3);
        g.fillStyle(0xffffff, 1); g.fillEllipse(x + w - 24, y + 14, 26, 12); g.fillStyle(0xe5383b, 1); g.fillCircle(x + w - 30, y + 11, 4); g.fillStyle(0xffd23f, 1); g.fillCircle(x + w - 22, y + 10, 4); g.fillStyle(0x3fb24d, 1); g.fillCircle(x + w - 17, y + 13, 3.5);
        g.lineStyle(1.3, STEEL_DARK, 1); g.strokeRoundedRect(x + 1, y + 3, w - 2, h - 5, 3);
        break;
      }
      case 'bed': {
        shadow();
        g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x + 2, y + 2, w - 4, h - 2, 4);
        g.fillStyle(LINEN, 1); g.fillRoundedRect(x + 3, y + 3, w - 6, h - 5, 3);
        g.fillStyle(BLANKET, 1); g.fillRoundedRect(x + 3, y + 22, w - 6, h - 26, 3);
        g.fillStyle(BLANKET_DARK, 1); g.fillRect(x + 3, y + 22, w - 6, 3);
        g.fillStyle(0xeef3f7, 1); g.fillRoundedRect(x + 7, y + 7, w - 14, 10, 3);   // the pillow
        g.lineStyle(1.2, STEEL_DARK, 1); g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 5, 3);
        break;
      }
      case 'surgery': {
        shadow();
        g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x + 3, y + 6, w - 6, h - 8, 5);
        g.fillStyle(LINEN, 1); g.fillRoundedRect(x + 4, y + 4, w - 8, h - 10, 5);
        g.fillStyle(BLANKET, 1); g.fillRect(x + 4, y + 4, 12, h - 10);   // the headrest end
        g.fillStyle(STEEL_DARK, 1); g.fillRect(x + w - 10, y - 8, 2, 14); g.fillStyle(0xffd23f, 1); g.fillCircle(x + w - 9, y - 9, 5); g.fillStyle(0xfff6c0, 1); g.fillCircle(x + w - 9, y - 9, 2.5);   // the lamp
        g.fillStyle(0xffffff, 1); g.fillRoundedRect(x + w - 28, y + h - 12, 16, 6, 2); g.fillStyle(STEEL_DARK, 1); g.fillRect(x + w - 24, y + h - 10, 8, 1.5);   // a tray with tweezers
        g.lineStyle(1.2, STEEL_DARK, 1); g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 10, 5);
        break;
      }
      case 'xray': {
        shadow();
        g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 4);
        g.fillStyle(STEEL, 1); g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 4);
        g.fillStyle(0x0d1b2a, 1); g.fillRoundedRect(x + 6, y + 8, w - 12, 26, 3);   // the screen, with a little skeleton on it
        g.fillStyle(0xdfe9f0, 1); g.fillCircle(x + w / 2, y + 14, 3.5); g.fillRect(x + w / 2 - 1, y + 17, 2, 12); for (let i = 0; i < 3; i++) g.fillRect(x + w / 2 - 5, y + 20 + i * 3, 10, 1);
        g.fillStyle(0x3fb24d, 1); g.fillCircle(x + w - 9, y + h - 12, 2.5); g.fillStyle(0xe5383b, 1); g.fillCircle(x + w - 16, y + h - 12, 2.5);   // lights
        g.lineStyle(1.3, STEEL_DARK, 1); g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 4);
        break;
      }
      case 'stetho': {
        shadow();
        g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x + 4, y + 6, w - 8, h - 8, 3);
        g.fillStyle(0xffffff, 1); g.fillRoundedRect(x + 4, y + 3, w - 8, h - 8, 3);
        g.lineStyle(2, 0x2b3238, 1); g.beginPath(); g.moveTo(x + 10, y + 8); g.lineTo(x + 10, y + 16); g.lineTo(x + 16, y + 22); g.lineTo(x + 22, y + 16); g.lineTo(x + 22, y + 8); g.strokePath();   // the tube
        g.fillStyle(STEEL, 1); g.fillCircle(x + 16, y + 24, 3.5); g.lineStyle(1, 0x2b3238, 1); g.strokeCircle(x + 16, y + 24, 3.5);   // the chest piece
        g.lineStyle(1.2, STEEL_DARK, 1); g.strokeRoundedRect(x + 4, y + 3, w - 8, h - 5, 3);
        break;
      }
      case 'plant': {
        g.fillStyle(0x1e2a3a, 0.12); g.fillEllipse(x + T / 2 + 2, y + T - 4, 20, 6);
        g.fillStyle(0xc96f3b, 1); g.fillRoundedRect(x + 9, y + 16, 14, 12, 3); g.lineStyle(1.2, 0x8a4a22, 1); g.strokeRoundedRect(x + 9, y + 16, 14, 12, 3);
        g.fillStyle(LEAF, 1); for (const [dx, dy, r] of [[-7, -2, 7], [7, -3, 7], [0, -8, 8], [0, 2, 6]]) g.fillCircle(x + 16 + dx, y + 10 + dy, r);
        g.lineStyle(1.2, LEAF_DARK, 1); for (const [dx, dy, r] of [[-7, -2, 7], [7, -3, 7], [0, -8, 8]]) g.strokeCircle(x + 16 + dx, y + 10 + dy, r);
        break;
      }
      case 'chair': {
        g.fillStyle(0x1e2a3a, 0.12); g.fillEllipse(x + T / 2 + 2, y + T - 4, 22, 6);
        g.fillStyle(TRIM_DARK, 1); g.fillRoundedRect(x + 6, y + 6, 20, 10, 3);
        g.fillStyle(TRIM, 1); g.fillRoundedRect(x + 6, y + 14, 20, 10, 3);
        g.fillStyle(STEEL_DARK, 1); g.fillRect(x + 8, y + 24, 3, 5); g.fillRect(x + 21, y + 24, 3, 5);
        g.lineStyle(1.2, TRIM_DARK, 1); g.strokeRoundedRect(x + 6, y + 6, 20, 18, 3);
        break;
      }
      default: break;
    }
  }

  // ---- Setup ---------------------------------------------------------------------------------

  /** Invisible static bodies over the walls (merged into runs) and every piece of furniture and station. */
  createSolids() {
    this.solids = this.physics.add.staticGroup();
    const add = (cx, cy, w, h) => { const r = this.add.rectangle(cx, cy, w, h).setVisible(false); this.physics.add.existing(r, true); this.solids.add(r); };
    for (let ty = 0; ty < HOSPITAL_H; ty++) {
      let run = null;
      const flush = () => { if (run) add((run.x0 + run.n / 2) * TILE, (ty + 0.5) * TILE, run.n * TILE, TILE); run = null; };
      for (let tx = 0; tx < HOSPITAL_W; tx++) { if (isWall(tx, ty)) { if (run) run.n += 1; else run = { x0: tx, n: 1 }; } else flush(); }
      flush();
    }
    for (const f of [...FURNITURE, ...STATIONS]) add((f.x + f.w / 2) * TILE, (f.y + f.h / 2) * TILE, f.w * TILE - 4, f.h * TILE - 4);
    void isDoor;
  }

  createPlayer(profile) {
    const key = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    this.player = fitPlayer(this.physics.add.sprite(SPAWN.tx * TILE, SPAWN.ty * TILE, key, IDLE_FRAMES.up)).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
    addShadow(this, this.player, 20); sortSprite(this.player);
  }

  /** The staff stand at their work (walked past, never into), each with a plate naming their game and its stars. */
  createStaff() {
    this.staff = [];
    for (const def of STAFF) {
      const drawn = def.art && this.textures.exists(villagerKey(def.art)) ? villagerKey(def.art) : null;
      const key = drawn || (this.textures.exists(def.sprite) ? def.sprite : 'npc0');
      const s = this.add.sprite((def.at.tx + 0.5) * TILE, (def.at.ty + 0.5) * TILE - (drawn ? 4 : 0), key, IDLE_FRAMES.down);
      s.setScale(drawn ? VILLAGER_WORLD_HEIGHT / VILLAGER_CELL : CHAR_WORLD_SCALE).setDepth(5);
      s.def = def;
      const game = def.gameId ? getGame(def.gameId) : null;
      s.plate = this.add.text(s.x, s.y + 22, game ? `${game.icon} ${game.title}` : def.name, { fontFamily: FONT, fontSize: '6px', color: '#ffffff', backgroundColor: '#1f7a7e', padding: { x: 3, y: 1 } }).setOrigin(0.5, 0).setDepth(6).setResolution(4);
      s.stars = game ? [0, 1, 2].map((i) => this.add.image(s.x + (i - 1) * 8, s.y + 34, 'star-off').setDisplaySize(7, 7).setDepth(6)) : [];
      addShadow(this, s, 18); sortSprite(s);
      this.staff.push(s);
    }
    this.refreshStaff();
  }

  /** The stations: a glow on the floor where you stand to use each, and a name plate. */
  createStations() {
    this.stations = STATIONS.map((st) => {
      const x = (st.at.tx + 0.5) * TILE, y = (st.at.ty + 0.5) * TILE;
      const glow = this.add.circle(x, y, 12, TRIM, 0.22).setDepth(1);
      this.tweens.add({ targets: glow, alpha: 0.08, scale: 1.3, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const game = st.gameId ? getGame(st.gameId) : null;
      const plate = this.add.text((st.x + st.w / 2) * TILE, (st.y + st.h) * TILE + 2, game ? `${game.icon} ${game.title}` : st.title, { fontFamily: FONT, fontSize: '6px', color: '#1e2a3a', backgroundColor: '#ffffff', padding: { x: 3, y: 1 } }).setOrigin(0.5, 0).setDepth(6).setResolution(4);
      const stars = game ? [0, 1, 2].map((i) => this.add.image((st.x + st.w / 2) * TILE + (i - 1) * 8, (st.y + st.h) * TILE + 14, 'star-off').setDisplaySize(7, 7).setDepth(6)) : [];
      return { ...st, px: x, py: y, glow, plate, stars, objX: (st.x + st.w / 2) * TILE, objY: st.y * TILE };
    });
    this.refreshStaff();
  }

  /** Stars under each plate: the game's best stars so far. */
  refreshStaff() {
    const p = Store.getProfile();
    if (!p) return;
    const best = (id) => (p.games && p.games[id] && p.games[id].bestStars) || 0;
    for (const s of this.staff || []) if (s.def.gameId) { const b = best(s.def.gameId); s.stars.forEach((img, i) => { if (img.active) img.setTexture(i < b ? 'star' : 'star-off'); }); }
    for (const st of this.stations || []) if (st.gameId) { const b = best(st.gameId); st.stars.forEach((img, i) => { if (img.active) img.setTexture(i < b ? 'star' : 'star-off'); }); }
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
    else if (this.scene.isPaused(key)) this.scene.resume(key);
    else if (!this.scene.isActive(key)) this.scene.launch(key);
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
    if (this.overlay) {   // the X-ray or the stethoscope is up: any press puts it away
      this.stopPlayer();
      if (inp.actionJustPressed && !this.wasBlocked) this.closeOverlay();
      this.wasBlocked = false;
      return;
    }
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
      this.player.anims.timeScale = Math.max(0.5, Math.hypot(dx, dy));
    } else this.stopPlayer();
    sortSprite(this.player);

    // The nearest person or station, and the "!" bubble over it.
    let near = null, best = USE_DIST;
    for (const s of this.staff) { const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y); if (d < best) { best = d; near = { kind: 'staff', s, x: s.x, y: s.y - 22 }; } }
    for (const st of this.stations) { const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, st.px, st.py); if (d < best) { best = d; near = { kind: 'station', st, x: st.objX, y: st.objY - 10 }; } }
    this.near = near;
    if (near) this.bubble.setVisible(true).setPosition(near.x, near.y + Math.sin(time / 150) * 2);
    else this.bubble.setVisible(false);
    if (inp.actionJustPressed && !skipAction && near) { if (near.kind === 'staff') this.talk(near.s); else this.use(near.st); }
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
    if (onExit(tx, ty) && !(hud && hud.blocking) && !this.overlay) this.leave();
  }

  // ---- Talking -------------------------------------------------------------------------------

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
    hud.showDialog({ name: def.name, voice: def.voice, pitch: def.pitch, rate: def.rate, speaker: def.id, lines: def.lines, prompt, onPlay: def.gameId ? () => this.playGame(def.gameId, def.id) : null });
    if (firstTalk) {
      hud.setCoins(Store.getProfile().coins);
      hud.awardCoins(HELLO_COINS);
      hud.notify(`+${HELLO_COINS} coins for saying hello!`, { icon: 'coin' });
    }
  }

  playGame(gameId, who) {
    const game = getGame(gameId);
    if (!game || !this.scene.get(game.sceneKey)) { this.say(`${game ? game.title : 'That game'} is coming soon!`, { accent: THEME.brand }); return; }
    this.stopPlayer();
    const hud = this.hud();
    if (hud && hud.dialogOpen) hud.closeDialog();
    if (this.scene.isActive(SCENES.Hud)) this.scene.sleep(SCENES.Hud);
    Launcher.launch(this, gameId, { source: 'roam', context: { npcId: who, zoneId: 'health' } });
  }

  // ---- Stations ------------------------------------------------------------------------------

  use(st) {
    this.stopPlayer();
    Sfx.pop();
    if (st.id === 'surgery') return this.playGame(st.gameId, 'surgery');
    if (st.id === 'bed') return this.rest();
    if (st.id === 'xray') return this.showXray();
    if (st.id === 'stetho') return this.listen();
  }

  /** A rest in a ward bed fills the hearts, once a day. */
  rest() {
    const p = Store.getProfile(), today = dayKey();
    if (heartsOf(p) >= HEARTS_MAX) return this.say('♥ Your hearts are already full. You are full of beans!', { accent: THEME.brand });
    if (p.world && p.world.hospitalRest === today) return this.say('You have rested here today already. One good sleep a day!', { accent: THEME.ink3 });
    let healed = 0;
    Store.updateProfile((q) => { healed = healHearts(q, HEARTS_MAX); q.world.hospitalRest = today; });
    const hud = this.hud();
    if (hud && hud.refreshHearts) hud.refreshHearts();
    Sfx.correct ? Sfx.correct() : Sfx.pop();
    this.say(`😴 A good rest. ${healed === 1 ? 'A heart' : healed + ' hearts'} back!`, { icon: 'star', accent: THEME.brand });
  }

  /** The part of the room the camera shows, in world squares: overlays are drawn there, so the zoom suits them. */
  view() { const v = this.cameras.main.worldView; return { x: v.x, y: v.y, w: v.width, h: v.height }; }

  /** The X-ray machine: a see-through child with the bones named. Press again to put it away. */
  showXray() {
    const v = this.view();
    const c = this.add.container(0, 0).setDepth(900);
    const g = this.add.graphics();
    const pw = Math.min(v.w - 12, 230), ph = Math.min(v.h - 12, 236), px = v.x + (v.w - pw) / 2, py = v.y + (v.h - ph) / 2;
    g.fillStyle(0x000000, 0.55); g.fillRect(v.x, v.y, v.w, v.h);
    g.fillStyle(0x0d1b2a, 1); g.fillRoundedRect(px, py, pw, ph, 8);
    g.lineStyle(1.5, 0x3fb2c9, 1); g.strokeRoundedRect(px, py, pw, ph, 8);
    const cx = px + pw / 2 - 10, top = py + 22, S = Math.min((pw - 90) / 220, (ph - 40) / 400);
    // The body, faint, and the bones bright.
    g.fillStyle(0x1f3b55, 1);
    g.fillEllipse(cx, top + 40 * S, 70 * S, 80 * S);                                   // head
    g.fillRoundedRect(cx - 55 * S, top + 85 * S, 110 * S, 150 * S, 30 * S);             // body
    g.fillRoundedRect(cx - 95 * S, top + 90 * S, 38 * S, 120 * S, 16 * S); g.fillRoundedRect(cx + 57 * S, top + 90 * S, 38 * S, 120 * S, 16 * S);   // arms
    g.fillRoundedRect(cx - 48 * S, top + 225 * S, 40 * S, 150 * S, 16 * S); g.fillRoundedRect(cx + 8 * S, top + 225 * S, 40 * S, 150 * S, 16 * S);  // legs
    const bone = 0xeaf4ff;
    g.fillStyle(bone, 1);
    g.fillEllipse(cx, top + 36 * S, 50 * S, 58 * S); g.fillStyle(0x1f3b55, 1); g.fillEllipse(cx - 10 * S, top + 32 * S, 12 * S, 14 * S); g.fillEllipse(cx + 10 * S, top + 32 * S, 12 * S, 14 * S); g.fillRect(cx - 14 * S, top + 52 * S, 28 * S, 6 * S);   // skull, eyes, teeth line
    g.fillStyle(bone, 1);
    g.fillRect(cx - 4 * S, top + 66 * S, 8 * S, 170 * S);                                // spine
    for (let i = 0; i < 6; i++) { const ry = top + 100 * S + i * 18 * S, rw = (80 - i * 6) * S; g.fillRoundedRect(cx - rw / 2, ry, rw, 7 * S, 3 * S); }   // ribs
    g.fillRoundedRect(cx - 50 * S, top + 80 * S, 100 * S, 8 * S, 4 * S);               // collar bones
    for (const sx of [-1, 1]) {
      g.fillRoundedRect(cx + sx * 76 * S - 5 * S, top + 92 * S, 10 * S, 60 * S, 5 * S);    // upper arm
      g.fillRoundedRect(cx + sx * 76 * S - 5 * S, top + 156 * S, 10 * S, 55 * S, 5 * S);   // forearm
      g.fillEllipse(cx + sx * 76 * S, top + 218 * S, 18 * S, 12 * S);                        // hand
      g.fillRoundedRect(cx + sx * 28 * S - 6 * S, top + 240 * S, 12 * S, 70 * S, 6 * S);    // thigh bone
      g.fillRoundedRect(cx + sx * 28 * S - 5 * S, top + 314 * S, 10 * S, 60 * S, 5 * S);    // shin bone
      g.fillEllipse(cx + sx * 28 * S, top + 382 * S, 24 * S, 10 * S);                        // foot
    }
    g.fillRoundedRect(cx - 40 * S, top + 212 * S, 80 * S, 26 * S, 12 * S);              // pelvis
    c.add(g);
    const style = { fontFamily: FONT, fontSize: '6px', color: '#9fe3f0', fontStyle: '700' };
    const label = (t, lx, ly, align = 'left') => c.add(this.add.text(lx, ly, t, style).setOrigin(align === 'left' ? 0 : 1, 0.5).setResolution(4));
    label('skull', cx + 40 * S, top + 30 * S); label('ribs', cx + 50 * S, top + 130 * S); label('spine', cx + 12 * S, top + 190 * S);
    label('pelvis', cx + 46 * S, top + 225 * S); label('thigh bone', cx + 36 * S, top + 275 * S); label('shin bone', cx + 36 * S, top + 344 * S);
    label('collar bone', cx - 56 * S, top + 74 * S, 'right'); label('upper arm', cx - 86 * S, top + 122 * S, 'right'); label('forearm', cx - 86 * S, top + 184 * S, 'right'); label('hand', cx - 90 * S, top + 218 * S, 'right');
    c.add(this.add.text(px + pw / 2, py + 9, 'X-RAY  ·  206 bones hold you up', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', fontStyle: '800' }).setOrigin(0.5).setResolution(4));
    c.add(this.add.text(px + pw / 2, py + ph - 8, 'Press A or tap to put it away', { fontFamily: FONT, fontSize: '6px', color: '#9fe3f0' }).setOrigin(0.5).setResolution(4));
    this.openOverlay(c);
    Sfx.pop();
  }

  /** The stethoscope: a beating heart, breathing lungs, and the sounds of both. Press again to stop listening. */
  listen() {
    const v = this.view();
    const c = this.add.container(0, 0).setDepth(900);
    const g = this.add.graphics();
    const pw = Math.min(v.w - 12, 230), ph = Math.min(v.h - 12, 170), px = v.x + (v.w - pw) / 2, py = v.y + (v.h - ph) / 2, cx = px + pw / 2;
    g.fillStyle(0x000000, 0.55); g.fillRect(v.x, v.y, v.w, v.h);
    g.fillStyle(0xfff6f6, 1); g.fillRoundedRect(px, py, pw, ph, 8);
    g.lineStyle(1.5, 0xe0485c, 1); g.strokeRoundedRect(px, py, pw, ph, 8);
    c.add(g);
    const heart = this.add.text(cx - 46, py + ph / 2 - 8, '❤️', { fontSize: '36px' }).setOrigin(0.5).setResolution(2);
    const lungs = this.add.text(cx + 46, py + ph / 2 - 8, '🫁', { fontSize: '36px' }).setOrigin(0.5).setResolution(2);
    c.add([heart, lungs]);
    c.add(this.add.text(cx, py + 11, 'Listening…', { fontFamily: FONT, fontSize: '9px', color: '#b02a3d', fontStyle: '800' }).setOrigin(0.5).setResolution(4));
    const line = this.add.text(cx, py + ph - 30, 'lub-dub, lub-dub: about 72 beats a minute at rest', { fontFamily: FONT, fontSize: '6px', color: '#1e1b4b', wordWrap: { width: pw - 20 }, align: 'center' }).setOrigin(0.5).setResolution(4);
    c.add(line);
    c.add(this.add.text(cx, py + ph - 9, 'Press A or tap to stop listening', { fontFamily: FONT, fontSize: '6px', color: '#b02a3d' }).setOrigin(0.5).setResolution(4));
    this.openOverlay(c);
    // Lub-dub every 830 ms (72 a minute) with the heart squeezing, and a slow breath in and out every four seconds.
    const beat = this.time.addEvent({ delay: 830, loop: true, callback: () => {
      Synth.drum('boom', 0); Synth.drum('boom', 0.16);
      if (heart.active) this.tweens.add({ targets: heart, scale: 1.18, duration: 110, yoyo: true, ease: 'Quad.Out' });
    } });
    const breath = this.time.addEvent({ delay: 4000, loop: true, callback: () => {
      Synth.drum('shake', 0); Synth.drum('shake', 1.9);
      if (lungs.active) this.tweens.add({ targets: lungs, scale: 1.22, duration: 1800, yoyo: true, ease: 'Sine.InOut' });
      if (line.active) { line.setText('breathe in… and out: lungs fill with air about 16 times a minute'); this.time.delayedCall(2000, () => { if (line.active) line.setText('lub-dub, lub-dub: about 72 beats a minute at rest'); }); }
    } });
    beat.callback(); breath.callback();
    this.overlayTimers = [beat, breath];
  }

  openOverlay(c) {
    const v = this.view();
    this.overlay = c;
    this.wasBlocked = true;
    this.bubble.setVisible(false);
    const zone = this.add.zone(v.x, v.y, v.w, v.h).setOrigin(0).setDepth(899).setInteractive();
    zone.on('pointerup', () => this.closeOverlay());
    c.zone = zone;
  }

  closeOverlay() {
    if (!this.overlay) return;
    for (const t of this.overlayTimers || []) { try { t.remove(false); } catch { /* clock gone */ } }
    this.overlayTimers = null;
    if (this.overlay.zone) this.overlay.zone.destroy();
    this.overlay.destroy();
    this.overlay = null;
    this.wasBlocked = true;
    Sfx.click();
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
    this.closeOverlay();
    this.scale.off('resize', this.onResize);
    this.events.off('resume', this.onResumeBound);
    this.events.off('pause', this.onPauseBound);
    this.events.off('minigame:done', this.onGameDone);
    try { if (this.tickTimer) this.tickTimer.remove(false); } catch { /* clock gone */ }
    this.tickTimer = null;
    try { if (this.controls) this.controls.destroy(); } catch { /* keyboard plugin gone */ }
    this.controls = null;
    if (this.scene.get(SCENES.Hud) && (this.scene.isActive(SCENES.Hud) || this.scene.isSleeping(SCENES.Hud))) this.scene.stop(SCENES.Hud);
    this.player = null; this.staff = []; this.stations = []; this.near = null;
  }
}
