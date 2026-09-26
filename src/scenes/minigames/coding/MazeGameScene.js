// Shared base for the coding games: draws a maze from state, animates interpreter steps and hosts the
// BlockEditor. Subclasses supply level(), program(), palette(), maxBlocks() and react in onRunEnd().
// All progress lives in this.state so a rebuild (rotation) mid-run is safe: the run is cancelled and the
// robot goes back to the start.
import { MinigameScene } from '../MinigameScene.js';
import { C } from '../../../constants.js';
import { parseLevel, execute } from '../../../generators/coding/interpreter.js';
import { text, T } from '../../../ui/TextStyles.js';
import { panel } from '../../../ui/Panel.js';
import { toast } from '../../../ui/Toast.js';
import { Sfx } from '../../../systems/Audio.js';

const FLOOR = 0xf4ecd8, FLOOR_LINE = 0xd9cfb8, WALL = 0x1a2340, WALL_TOP = 0x2f3d6b;
const coinKey = (c) => c.x + ',' + c.y;

export class MazeGameScene extends MinigameScene {
  constructor(key) { super(key); this.runToken = 0; this.gen = null; }

  /** State slice for the robot on a level (spread into initState). */
  robotState(level) {
    const lv = parseLevel(level);
    return {
      robot: { x: lv.start.x, y: lv.start.y, dir: lv.dir }, coinsLeft: lv.coins.map(coinKey),
      running: false, stepping: false, busy: false, runningUid: null, status: 'idle'
    };
  }

  lv() { return parseLevel(this.level()); }
  level() { return null; }
  program() { return this.state.program; }
  palette() { return []; }
  maxBlocks() { return 12; }
  get speed() { return (this.state.editor && this.state.editor.speed) || 1; }
  get stepMs() { return 150 / this.speed; }

  /** Cancel any run when something else (resize) rebuilds the scene. */
  beforeRebuild() {
    if (this.suppressCancel) return;
    if (this.state.running || this.state.stepping || this.state.busy) this.resetRobot();
  }

  /** Rebuild that keeps the current run alive (used only when no tween is in flight). */
  refresh() { this.suppressCancel = true; try { this.rebuild(); } finally { this.suppressCancel = false; } }

  resetRobot() {
    const s = this.state, lv = this.lv();
    this.runToken += 1;
    this.gen = null;
    s.robot = { x: lv.start.x, y: lv.start.y, dir: lv.dir };
    s.coinsLeft = lv.coins.map(coinKey);
    s.running = false; s.stepping = false; s.busy = false; s.runningUid = null; s.status = 'idle';
  }

  // ───────────── layout ─────────────
  /** Split the play area into info, maze and editor rects for portrait / landscape. */
  layout(area, infoH = 46 * this.ui) {
    const gap = 10;
    if (this.portrait) {
      const mazeH = Math.min(area.w, (area.h - infoH - gap) * 0.44);
      return {
        infoRect: { x: area.x, y: area.y, w: area.w, h: infoH },
        mazeRect: { x: area.x, y: area.y + infoH, w: area.w, h: mazeH },
        editorRect: { x: area.x, y: area.y + infoH + mazeH + gap, w: area.w, h: area.h - infoH - mazeH - gap }
      };
    }
    const mazeW = Math.min(area.w * 0.46, area.h - infoH);
    return {
      infoRect: { x: area.x, y: area.y, w: mazeW, h: infoH },
      mazeRect: { x: area.x, y: area.y + infoH, w: mazeW, h: area.h - infoH },
      editorRect: { x: area.x + mazeW + gap, y: area.y, w: area.w - mazeW - gap, h: area.h }
    };
  }

  drawInfo(r, title, hint) {
    const { ui } = this;
    text(this, r.x + r.w / 2, r.y + 12 * ui, title, { ...T.bodyBold(this, C.yellow), fontSize: Math.round(17 * ui) + 'px' });
    if (hint) text(this, r.x + r.w / 2, r.y + 32 * ui, hint, { ...T.small(this, C.grey), fontSize: Math.round(12 * ui) + 'px', wordWrap: { width: r.w - 8 } }).setOrigin(0.5, 0.5);
  }

  // ───────────── maze ─────────────
  cellCenter(x, y) { return { x: this.mazeOrigin.x + (x + 0.5) * this.cell, y: this.mazeOrigin.y + (y + 0.5) * this.cell }; }

  cellAt(px, py) {
    const x = Math.floor((px - this.mazeOrigin.x) / this.cell), y = Math.floor((py - this.mazeOrigin.y) / this.cell);
    const lv = this.lv();
    if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) return null;
    return { x, y };
  }

  drawMaze(rect) {
    const lv = this.lv(), s = this.state;
    const cell = Math.floor(Math.min(rect.w / lv.w, rect.h / lv.h));
    this.cell = cell;
    this.mazeOrigin = { x: rect.x + (rect.w - cell * lv.w) / 2, y: rect.y + (rect.h - cell * lv.h) / 2 };
    const { x: ox, y: oy } = this.mazeOrigin;
    panel(this, ox - 4, oy - 4, cell * lv.w + 8, cell * lv.h + 8, { color: WALL, radius: 8 });
    const g = this.add.graphics();
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      const px = ox + x * cell, py = oy + y * cell;
      if (lv.walls[y][x]) {
        g.fillStyle(WALL, 1); g.fillRect(px, py, cell, cell);
        g.fillStyle(WALL_TOP, 1); g.fillRect(px + 2, py + 2, cell - 4, cell * 0.35);
      } else {
        g.fillStyle(FLOOR, 1); g.fillRect(px, py, cell, cell);
        g.lineStyle(1, FLOOR_LINE, 1); g.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      }
    }
    // start pad
    const sp = this.cellCenter(lv.start.x, lv.start.y);
    g.fillStyle(C.blue, 0.25); g.fillCircle(sp.x, sp.y, cell * 0.36);
    // goal flag
    if (lv.goal) {
      const gc = this.cellCenter(lv.goal.x, lv.goal.y);
      g.fillStyle(C.green, 0.25); g.fillRect(gc.x - cell / 2 + 2, gc.y - cell / 2 + 2, cell - 4, cell - 4);
      g.fillStyle(C.dark, 1); g.fillRect(gc.x - cell * 0.22, gc.y - cell * 0.36, cell * 0.08, cell * 0.72);
      g.fillStyle(C.lime, 1);
      g.fillTriangle(gc.x - cell * 0.14, gc.y - cell * 0.36, gc.x + cell * 0.32, gc.y - cell * 0.18, gc.x - cell * 0.14, gc.y);
    }
    // coins
    this.coinSprites = {};
    for (const c of lv.coins) {
      const k = coinKey(c);
      if (!s.coinsLeft.includes(k)) continue;
      const p = this.cellCenter(c.x, c.y);
      this.coinSprites[k] = this.add.image(p.x, p.y, 'coin').setDisplaySize(cell * 0.55, cell * 0.55);
    }
    // robot
    const rp = this.cellCenter(s.robot.x, s.robot.y);
    this.robotSprite = this.add.sprite(rp.x, rp.y, 'robot', 0).setDisplaySize(cell * 0.82, cell * 0.82).setAngle(s.robot.dir * 90);
    if (s.status === 'crashed') this.robotSprite.setTint(0xff8888);
  }

  // ───────────── running ─────────────
  /** Start (or continue) running the whole program. Each fresh start counts as an attempt. */
  startRun() {
    const s = this.state;
    if (s.busy || s.running || this.finished) return;
    if (!this.gen) {
      this.resetRobot();
      s.attempts = (s.attempts || 0) + 1;
      this.gen = execute(this.program(), this.lv());
    }
    s.stepping = false;
    s.running = true;
    this.refresh();
    this.advance();
  }

  /** Execute exactly one interpreter step. */
  stepOnce() {
    const s = this.state;
    if (s.busy || s.running || this.finished) return;
    if (!this.gen) {
      this.resetRobot();
      s.attempts = (s.attempts || 0) + 1;
      this.gen = execute(this.program(), this.lv());
      s.stepping = true;
      this.refresh();
    }
    s.stepping = true;
    this.advance();
  }

  advance() {
    const s = this.state;
    if (!this.gen) return;
    const token = this.runToken;
    const r = this.gen.next();
    if (r.done) {
      this.gen = null;
      s.running = false; s.stepping = false; s.busy = false; s.runningUid = null; s.status = 'stopped';
      this.onRunEnd({ solved: false, stopped: true });
      return;
    }
    this.applyStep(r.value, () => {
      if (token !== this.runToken) return;
      if (s.running) this.advance();
    });
  }

  applyStep(step, next) {
    const s = this.state, dur = this.stepMs;
    s.busy = true;
    s.runningUid = step.uid;
    if (this.editor) this.editor.highlight(step.uid);
    const sprite = this.robotSprite;
    const finish = () => { s.busy = false; next(); };
    switch (step.kind) {
      case 'move': {
        s.robot.x = step.to.x; s.robot.y = step.to.y;
        const p = this.cellCenter(step.to.x, step.to.y);
        Sfx.step();
        if (sprite && sprite.active) {
          sprite.play('robot-walk', true);
          this.tweens.add({ targets: sprite, x: p.x, y: p.y, duration: dur, onComplete: () => { if (sprite.active) { sprite.stop(); sprite.setFrame(0); } finish(); } });
        } else this.time.delayedCall(dur, finish);
        return;
      }
      case 'turn': {
        s.robot.dir = step.dir;
        if (sprite && sprite.active) {
          const from = sprite.angle, target = step.dir * 90;
          let delta = ((target - from) % 360 + 540) % 360 - 180;
          this.tweens.add({ targets: sprite, angle: from + delta, duration: dur, onComplete: () => { if (sprite.active) sprite.setAngle(target); finish(); } });
        } else this.time.delayedCall(dur, finish);
        return;
      }
      case 'pick': {
        if (!step.empty) {
          const k = step.at.x + ',' + step.at.y;
          s.coinsLeft = s.coinsLeft.filter((c) => c !== k);
          const img = this.coinSprites && this.coinSprites[k];
          if (img && img.active) {
            this.tweens.add({ targets: img, scale: img.scale * 1.6, alpha: 0, duration: 200, onComplete: () => img.destroy() });
          }
          Sfx.coin();
        }
        finish();
        return;
      }
      case 'crash': {
        Sfx.crash();
        this.cameras.main.shake(150, 0.006);
        s.status = 'crashed'; s.running = false; s.stepping = false;
        this.gen = null;
        if (sprite && sprite.active) {
          sprite.setTint(0xff8888);
          const d = step.dir ?? s.robot.dir, dx = [0, 1, 0, -1][d] * this.cell * 0.2, dy = [-1, 0, 1, 0][d] * this.cell * 0.2;
          this.tweens.add({ targets: sprite, x: sprite.x + dx, y: sprite.y + dy, duration: 80, yoyo: true });
        }
        const token = this.runToken;
        this.time.delayedCall(450, () => { if (token !== this.runToken) return; s.busy = false; this.onRunEnd({ solved: false, crashed: true, reason: step.reason }); });
        return;
      }
      case 'goal': {
        const solved = s.coinsLeft.length === 0;
        s.running = false; s.stepping = false; s.busy = false;
        this.gen = null;
        s.status = solved ? 'solved' : 'stopped';
        if (solved) Sfx.fanfare();
        this.onRunEnd({ solved, goal: true, coinsLeft: s.coinsLeft.length });
        return;
      }
      default:
        finish();
    }
  }

  /** Called when a run stops for any reason. outcome: { solved, crashed?, reason?, stopped?, goal?, coinsLeft? } */
  onRunEnd(outcome) {
    if (outcome.crashed) toast(this, outcome.reason === 'steps' ? 'Too many steps! Is there a loop?' : 'Bump! The robot hit a wall.', { bg: C.red });
    else if (!outcome.solved && outcome.goal) toast(this, 'Collect every coin before the flag!', { bg: C.orange });
    else if (!outcome.solved) toast(this, 'The program ended before the flag.', { bg: C.purple });
    this.rebuild();
  }

  // ───────────── editor callbacks ─────────────
  editorControls(extra = []) {
    const s = this.state;
    return {
      running: s.running || s.busy,
      onRun: () => this.startRun(),
      onStep: () => this.stepOnce(),
      onReset: () => { this.resetRobot(); this.rebuild(); },
      onClear: () => { if (s.running || s.busy) return; this.program().main.length = 0; if (this.program().functions) for (const k of Object.keys(this.program().functions)) this.program().functions[k].length = 0; s.editor.selectedUid = null; s.editor.containerUid = s.editor.view || 'main'; this.resetRobot(); this.rebuild(); },
      onSpeed: () => { s.editor.speed = s.editor.speed === 2 ? 1 : 2; this.rebuildSafe(); },
      extra
    };
  }

  /** Rebuild that does not cancel a run when only static UI (like the speed label) changed. */
  rebuildSafe() { if (this.state.running || this.state.busy) return; this.rebuild(); }

  onEditorChange() {
    const s = this.state;
    if (s.status !== 'idle') this.resetRobot();
    this.rebuild();
  }
}
