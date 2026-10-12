import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { Sfx } from '../../../systems/Audio.js';
import { pointerPos } from '../../../systems/Layout.js';

const ROUNDS = 3;
const SKIN = 0xd9a071, SKIN_DARK = 0xa86d45, WOUND = 0xf08a8a, WOUND_EDGE = 0xb43f4a, SPLINTER = 0x6b4423, STEEL = 0xaab4c0, STEEL_DARK = 0x5f6a78;
const PAR_MS = 60000;

/**
 * Splinter Surgery: a steady-hand game. A splinter sits at the end of a cut in the skin; drag the tweezers in along
 * the cut without touching the sides, pick the splinter up at the end and bring it back out the same way. Touch a
 * side and the patient says "ouch!", the tweezers slip and you start that trip again. Three splinters, each in a
 * narrower cut; a splinter out with at most two ouches counts as a clean operation.
 */
export class Splinter extends MinigameScene {
  constructor() { super('MG_Splinter'); }

  initState() {
    const rng = this.rng, items = [];
    for (let i = 0; i < ROUNDS; i++) {
      // A wiggly path across the play area in unit coordinates (0..1), left to right, that narrows each round.
      const n = 4 + i, pts = [];
      for (let k = 0; k <= n; k++) pts.push({ u: 0.08 + (0.84 * k) / n, v: k === 0 ? 0.5 : 0.25 + rng.float() * 0.5 });
      items.push({ pts, width: [0.18, 0.14, 0.11][i] });
    }
    return { items, idx: 0, phase: 'in', touches: 0, results: [], dragging: false, t: 0, flash: 0 };
  }

  create(data) {
    super.create(data);
    if (this.input && typeof this.input.on === 'function') {
      this.onDown = (p) => this.pointerDown(p); this.onMove = (p) => this.pointerMove(p); this.onUp = () => this.pointerUp();
      this.input.on('pointerdown', this.onDown); this.input.on('pointermove', this.onMove); this.input.on('pointerup', this.onUp);
      this.events.once('shutdown', () => { if (this.input) { this.input.off('pointerdown', this.onDown); this.input.off('pointermove', this.onMove); this.input.off('pointerup', this.onUp); } });
    }
  }

  get item() { return this.state.items[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, it = this.item;
    if (!it) return;
    const cx = area.x + area.w / 2;
    const cardH = Math.min(area.h - 70 * ui, 360 * ui);
    card(this, cx, area.y + cardH / 2, area.w, cardH, { stroke: this.subject.soft });
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    this.hint = text(this, cx, area.y + 30 * ui, this.hintText(), T.at(this, 15, THEME.ink, { fontStyle: '700', wordWrap: { width: area.w - 30 } }));
    // The play field: a patch of skin with the cut across it.
    const fx = area.x + 14 * ui, fy = area.y + 56 * ui, fw = area.w - 28 * ui, fh = cardH - 70 * ui;
    this.field = { x: fx, y: fy, w: fw, h: fh };
    this.path = it.pts.map((p) => ({ x: fx + p.u * fw, y: fy + p.v * fh }));
    this.halfWidth = (it.width * fh) / 2;
    this.skin = this.add.graphics();
    this.drawSkin();
    this.tool = this.add.graphics();
    this.drawTool(null);
    const by = area.y + cardH + 34 * ui;
    button(this, cx, by, Math.min(area.w - 32, 200 * ui), 48 * ui, 'Skip ▶', { variant: 'ghost', fontSize: 16, onClick: () => this.skipRound() });
  }

  hintText() {
    const s = this.state;
    if (s.phase === 'out') return 'Got it! Now bring the splinter back out the way you came.';
    if (s.phase === 'done') return 'Splinter out! Well done, Doctor.';
    return s.touches ? `Ouch! Start again from the opening. Touches: ${s.touches}` : 'Drag the tweezers along the cut to the splinter. Do not touch the sides!';
  }

  /** The skin, the cut (a soft band with dark edges), the opening and the splinter. */
  drawSkin() {
    const g = this.skin, f = this.field, s = this.state, p = this.path, w = this.halfWidth;
    if (!g || !g.active) return;
    g.clear();
    g.fillStyle(SKIN, 1); g.fillRoundedRect(f.x, f.y, f.w, f.h, 18);
    g.lineStyle(3, SKIN_DARK, 1); g.strokeRoundedRect(f.x, f.y, f.w, f.h, 18);
    const flash = s.flash > 0;
    g.lineStyle(w * 2 + 6, flash ? 0xe5383b : WOUND_EDGE, 1); this.strokePath(g, p);
    g.lineStyle(w * 2, WOUND, 1); this.strokePath(g, p);
    g.fillStyle(0xffffff, 0.35); g.fillCircle(p[0].x, p[0].y, w * 0.9);   // the opening
    if (s.phase === 'in') { const e = p[p.length - 1]; this.drawSplinter(g, e.x, e.y); }
    this.fieldText && this.fieldText.destroy();
    this.fieldText = text(this, p[0].x, p[0].y - w - 10, 'start here', T.at(this, 11, THEME.ink2, { fontStyle: '700' }));
  }

  drawSplinter(g, x, y) {
    g.fillStyle(SPLINTER, 1); g.fillTriangle(x - 10, y - 4, x + 12, y - 1, x - 8, y + 5);
    g.lineStyle(1, 0x3b2411, 1); g.strokeTriangle(x - 10, y - 4, x + 12, y - 1, x - 8, y + 5);
  }

  strokePath(g, pts) { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.strokePath(); }

  /** The tweezers follow the finger: two steel prongs meeting at the tip, carrying the splinter once it is caught. */
  drawTool(at) {
    const g = this.tool;
    if (!g || !g.active) return;
    g.clear();
    if (!at) return;
    const { x, y } = at, s = this.state;
    g.lineStyle(5, STEEL_DARK, 1); g.lineBetween(x, y, x - 14, y - 44); g.lineBetween(x, y, x + 8, y - 46);
    g.lineStyle(3, STEEL, 1); g.lineBetween(x, y, x - 14, y - 44); g.lineBetween(x, y, x + 8, y - 46);
    g.fillStyle(STEEL_DARK, 1); g.fillCircle(x, y, 2.5);
    if (s.phase === 'out') this.drawSplinter(g, x + 2, y + 2);
  }

  /** Nearest point on the cut to (x, y): its distance and how far along (0 at the opening, 1 at the splinter). */
  nearest(x, y) {
    const p = this.path;
    let best = { d: Infinity, t: 0 }, total = 0;
    const lens = [];
    for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); lens.push(l); total += l; }
    let acc = 0;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const u = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
      const px = a.x + u * dx, py = a.y + u * dy, d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { d, t: (acc + u * lens[i - 1]) / total };
      acc += lens[i - 1];
    }
    return best;
  }

  pointerDown(pointer) {
    const s = this.state;
    if (!this.path || s.phase === 'done') return;
    const { x, y } = pointerPos(this, pointer);
    const n = this.nearest(x, y);
    // Pick the tweezers up at the opening (or, carrying the splinter, anywhere on the cut).
    if (n.d <= this.halfWidth && (s.phase === 'out' || n.t < 0.12)) { s.dragging = true; this.drawTool({ x, y }); }
  }

  pointerMove(pointer) {
    const s = this.state;
    if (!s.dragging) return;
    const { x, y } = pointerPos(this, pointer);
    const n = this.nearest(x, y);
    this.drawTool({ x, y });
    if (n.d > this.halfWidth) return this.ouch();
    s.t = n.t;
    if (s.phase === 'in' && n.t > 0.96) { s.phase = 'out'; Sfx.pop(); if (this.hint && this.hint.active) this.hint.setText(this.hintText()); this.drawSkin(); this.drawTool({ x, y }); }
    else if (s.phase === 'out' && n.t < 0.05) this.roundDone();
  }

  pointerUp() {
    const s = this.state;
    if (!s.dragging) return;
    s.dragging = false;
    this.drawTool(null);
    if (s.phase === 'out') { s.phase = 'in'; if (this.hint && this.hint.active) this.hint.setText('It slipped back in! Go and get it again.'); this.drawSkin(); }
  }

  /** Touched a side: a buzz, a red flash, and the tweezers come out. */
  ouch() {
    const s = this.state;
    s.touches += 1; s.dragging = false; s.flash = 1;
    if (s.phase === 'out') s.phase = 'in';
    Sfx.wrong ? Sfx.wrong() : Sfx.pop();
    this.drawSkin(); this.drawTool(null);
    if (this.hint && this.hint.active) this.hint.setText(this.hintText());
    if (this.cameras && this.cameras.main && this.cameras.main.shake) this.cameras.main.shake(120, 0.004);
    this.time.delayedCall(220, () => { s.flash = 0; this.drawSkin(); });
  }

  roundDone() {
    const s = this.state;
    s.phase = 'done'; s.dragging = false;
    s.results.push({ touches: s.touches });
    Sfx.correct ? Sfx.correct() : Sfx.pop();
    this.correctFeedback && this.correctFeedback();
    if (this.hint && this.hint.active) this.hint.setText(this.hintText());
    this.drawSkin(); this.drawTool(null);
    this.time.delayedCall(900, () => this.next());
  }

  skipRound() { const s = this.state; if (s.phase !== 'done') s.results.push({ touches: 99, skipped: true }); this.next(); }

  next() {
    const s = this.state;
    s.idx += 1; s.phase = 'in'; s.touches = 0; s.dragging = false; s.t = 0;
    if (s.idx >= ROUNDS) {
      const correct = s.results.filter((r) => !r.skipped && r.touches <= 2).length;
      return this.finish({ correct, total: ROUNDS, parTimeMs: PAR_MS, missedSkills: correct < ROUNDS ? ['steady-hands'] : [] });
    }
    this.rebuild();
  }
}
