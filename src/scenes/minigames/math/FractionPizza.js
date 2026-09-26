import { MinigameScene } from '../MinigameScene.js';
import { C } from '../../../constants.js';
import { generateRounds } from '../../../generators/math/fractions.js';
import { grid } from '../../../systems/Layout.js';
import { Sfx } from '../../../systems/Audio.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { panel } from '../../../ui/Panel.js';

const TAU = Math.PI * 2;
const PAR_MS = 120000;

/** Fraction Pizza: shade slices, pick equivalents, compare pizzas, add fractions, convert. 8 rounds. */
export class FractionPizza extends MinigameScene {
  constructor() { super('MG_FractionPizza'); }

  initState() {
    const rounds = generateRounds(this.payload.grade, this.rng, 8);
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, result: null, shaded: this.freshShade(rounds[0]), missed: {} };
  }

  freshShade(r) { return r && r.slices ? new Array(r.slices).fill(false) : []; }
  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    const promptH = 64 * ui;
    panel(this, area.x, area.y, area.w, promptH, { color: C.panelDark, stroke: C.blue });
    text(this, area.x + area.w / 2, area.y + promptH / 2, r.prompt, { ...T.heading(this), wordWrap: { width: area.w - 20 } });
    const body = { x: area.x, y: area.y + promptH + 10, w: area.w, h: area.h - promptH - 10 };
    if (r.kind === 'compare') return this.buildCompare(body, r);

    const hasChoices = r.kind === 'equivalent' || r.kind === 'convert';
    const ctrlH = hasChoices ? Math.min(150 * ui, body.h * 0.4) : 64 * ui;
    let pz, ctrl;
    if (this.portrait) {
      pz = { x: body.x, y: body.y, w: body.w, h: body.h - ctrlH - 10 };
      ctrl = { x: body.x, y: body.y + body.h - ctrlH, w: body.w, h: ctrlH };
    } else {
      const pw = body.w * 0.55;
      pz = { x: body.x, y: body.y, w: pw, h: body.h };
      ctrl = { x: body.x + pw + 10, y: body.y + (body.h - ctrlH) / 2, w: body.w - pw - 10, h: ctrlH };
    }
    const radius = Math.max(40, Math.min(pz.w, pz.h) / 2 - 22 * ui);
    const cx = pz.x + pz.w / 2, cy = pz.y + pz.h / 2 - 8 * ui;
    this.drawPizza(cx, cy, radius, r.slices, s.shaded, s.result ? C.lime : C.orange);

    if (hasChoices) {
      const cells = grid(ctrl, 2, 2, 10);
      r.choices.forEach((ch, i) => {
        let color = C.blue;
        if (s.picked !== null) color = ch === r.answer ? C.lime : i === s.picked ? C.red : C.dark;
        button(this, cells[i].x, cells[i].y, cells[i].w, Math.max(48 * ui, cells[i].h), ch, { color, fontSize: 26, onClick: () => this.pick(i) });
      });
    } else {
      const count = s.shaded.filter(Boolean).length;
      const info = r.hint ? `${r.hint} · ${count} shaded` : `${count} of ${r.slices} shaded`;
      text(this, cx, cy + radius + 16 * ui, info, T.small(this, C.grey));
      if (!s.locked) {
        const zone = this.add.zone(cx, cy, radius * 2, radius * 2).setInteractive();
        zone.on('pointerup', (p) => this.tapSlice(p.x - cx, p.y - cy, radius));
      }
      button(this, ctrl.x + ctrl.w / 2, ctrl.y + ctrl.h / 2, Math.min(ctrl.w, 260 * ui), 56 * ui, 'Check',
        { color: C.lime, textColor: C.navy, fontSize: 22, onClick: () => this.check(), disabled: s.locked });
    }
  }

  buildCompare(body, r) {
    const s = this.state, ui = this.ui;
    const cells = grid(body, 2, 1, 16);
    const radius = Math.max(40, Math.min(cells[0].w, cells[0].h) / 2 - 30 * ui);
    r.pizzas.forEach((p, i) => {
      const c = cells[i];
      const shaded = Array.from({ length: p.den }, (_, k) => k < p.num);
      let ring = null;
      if (s.picked !== null) ring = i === r.answer ? C.lime : i === s.picked ? C.red : null;
      this.drawPizza(c.x, c.y - 12 * ui, radius, p.den, shaded, C.orange, ring);
      text(this, c.x, c.y + radius + 12 * ui, r.labels[i], T.number(this, ring === C.lime ? C.lime : C.white));
      if (!s.locked) {
        const zone = this.add.zone(c.x, c.y, radius * 2 + 20, radius * 2 + 60 * ui).setInteractive();
        zone.on('pointerup', () => this.pick(i));
      }
    });
  }

  /** Draws one pizza: crust, slices (shaded ones get a tint and pepperoni), cut lines and an optional result ring. */
  drawPizza(cx, cy, radius, n, shaded, shadeColor, ring = null) {
    const g = this.add.graphics(), ui = this.ui;
    if (ring !== null) { g.lineStyle(6 * ui, ring, 1); g.strokeCircle(cx, cy, radius + 8 * ui); }
    g.fillStyle(0x000000, 0.28); g.fillCircle(cx + 3 * ui, cy + 7 * ui, radius + 6 * ui);
    g.fillStyle(0x7a3a1e, 1); g.fillCircle(cx, cy, radius + 7 * ui);
    g.fillStyle(0xc2782a, 1); g.fillCircle(cx, cy, radius + 5 * ui);
    g.fillStyle(0xe0a050, 1); g.fillCircle(cx, cy, radius + 3 * ui);
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i * TAU) / n, a1 = a0 + TAU / n;
      g.fillStyle(shaded[i] ? shadeColor : C.peach, 1);
      g.slice(cx, cy, radius, a0, a1, false); g.fillPath();
      if (shaded[i] && n <= 12) {
        const am = (a0 + a1) / 2, d = radius * 0.6;
        g.fillStyle(C.red, 0.85); g.fillCircle(cx + Math.cos(am) * d, cy + Math.sin(am) * d, Math.max(4, radius * 0.09));
      }
    }
    g.lineStyle(Math.max(2, 3 * ui), C.navy, 1);
    g.strokeCircle(cx, cy, radius);
    if (n > 1) for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * TAU) / n;
      g.lineBetween(cx, cy, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
  }

  tapSlice(dx, dy, radius) {
    const s = this.state, r = this.round;
    if (s.locked || dx * dx + dy * dy > radius * radius) return;
    let a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += TAU;
    const i = Math.floor(a / (TAU / r.slices)) % r.slices;
    s.shaded[i] = !s.shaded[i];
    Sfx.pop();
    this.rebuild();
  }

  check() {
    const s = this.state, r = this.round;
    if (s.locked) return;
    const count = s.shaded.filter(Boolean).length;
    this.resolve(count === r.num, r);
    s.shaded = s.shaded.map((_, i) => i < r.num); // show the correct shading either way
    this.rebuild();
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.picked = i;
    const right = r.kind === 'compare' ? i === r.answer : r.choices[i] === r.answer;
    this.resolve(right, r);
    this.rebuild();
  }

  resolve(right, r) {
    const s = this.state;
    s.locked = true; s.result = right ? 'right' : 'wrong';
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
    this.time.delayedCall(right ? 600 : 1300, () => this.next());
  }

  next() {
    const s = this.state;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null; s.result = null; s.shaded = this.freshShade(this.round);
    this.rebuild();
  }
}
