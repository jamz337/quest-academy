import { MinigameScene } from '../MinigameScene.js';
import { C } from '../../../constants.js';
import { generateRounds } from '../../../generators/math/patterns.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { panel } from '../../../ui/Panel.js';

const PAR_MS = 90000;

/** Pattern Bridge: a row of numbered planks over water with one missing; pick the plank that fits. 8 bridges. */
export class PatternBridge extends MinigameScene {
  constructor() { super('MG_PatternBridge'); }

  initState() {
    return { rounds: generateRounds(this.payload.grade, this.rng, 8), idx: 0, correct: 0, locked: false, picked: null, missed: {} };
  }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    const promptH = 56 * ui;
    panel(this, area.x, area.y, area.w, promptH, { color: C.panelDark, stroke: C.blue });
    text(this, area.x + area.w / 2, area.y + promptH / 2, r.rule || 'Which number is missing from the bridge?',
      { ...T.heading(this), fontSize: Math.round(20 * ui) + 'px', wordWrap: { width: area.w - 20 } });

    const gap = 10;
    const sceneH = Math.min(area.h * 0.42, 240 * ui);
    const sceneRect = { x: area.x, y: area.y + promptH + gap, w: area.w, h: sceneH };
    this.drawBridge(sceneRect, r, s);

    const gridTop = sceneRect.y + sceneH + gap;
    const gridH = Math.min(area.y + area.h - gridTop, 300 * ui);
    const cells = grid({ x: area.x, y: gridTop, w: area.w, h: gridH }, this.portrait ? 2 : 4, this.portrait ? 2 : 1, gap);
    r.choices.forEach((choice, i) => {
      const c = cells[i];
      let color = C.blue;
      if (s.picked !== null) color = choice === r.answer ? C.lime : i === s.picked ? C.red : C.dark;
      button(this, c.x, c.y, c.w, Math.max(56 * ui, Math.min(c.h, 110 * ui)), choice, { color, fontSize: 28, onClick: () => this.pick(i) });
    });
  }

  /** Water, two posts, a rail and the plank row. The missing plank is a dashed gap with a "?" until answered. */
  drawBridge(rect, r, s) {
    const ui = this.ui, g = this.add.graphics();
    const n = r.terms.length;
    const waterTop = rect.y + rect.h * 0.55;
    g.fillStyle(C.blue, 0.35); g.fillRoundedRect(rect.x, waterTop, rect.w, rect.y + rect.h - waterTop, 12);
    g.fillStyle(C.white, 0.18);
    for (let i = 0; i < 6; i++) g.fillEllipse(rect.x + ((i * 173) % rect.w), waterTop + 18 + ((i * 41) % Math.max(20, rect.h * 0.3)), 34 * ui, 6 * ui);

    const gap = 8 * ui;
    const plankW = Math.min((rect.w - 24 * ui - gap * (n - 1)) / n, 96 * ui);
    const plankH = Math.min(56 * ui, rect.h * 0.3);
    const rowW = plankW * n + gap * (n - 1);
    const x0 = rect.x + (rect.w - rowW) / 2;
    const py = waterTop - plankH * 0.4;

    g.fillStyle(C.brown, 1);
    g.fillRect(x0 - 16 * ui, py - 30 * ui, 12 * ui, rect.y + rect.h - py + 20 * ui);
    g.fillRect(x0 + rowW + 4 * ui, py - 30 * ui, 12 * ui, rect.y + rect.h - py + 20 * ui);
    g.lineStyle(4 * ui, C.brown, 1); g.lineBetween(x0 - 10 * ui, py - 26 * ui, x0 + rowW + 10 * ui, py - 26 * ui);

    const fontSize = Math.round((n > 5 && plankW < 60 * ui ? 16 : 22) * ui) + 'px';
    r.terms.forEach((t, i) => {
      const x = x0 + i * (plankW + gap);
      if (i === r.missingIndex && s.picked === null) {
        g.lineStyle(3 * ui, C.yellow, 0.9); g.strokeRoundedRect(x, py, plankW, plankH, 10);
        text(this, x + plankW / 2, py + plankH / 2, '?', { ...T.heading(this, C.yellow), fontSize });
        return;
      }
      const isMissing = i === r.missingIndex;
      const right = isMissing && r.choices[s.picked] === r.answer;
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x, py + 4, plankW, plankH, 10);
      g.fillStyle(isMissing ? (right ? C.lime : C.red) : C.orange, 1); g.fillRoundedRect(x, py, plankW, plankH, 10);
      g.fillStyle(0xffffff, 0.2); g.fillRoundedRect(x + 4, py + 3, plankW - 8, plankH * 0.35, 6);
      text(this, x + plankW / 2, py + plankH / 2, String(t), { ...T.heading(this, C.navy), fontSize });
    });
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.locked = true; s.picked = i;
    const right = r.choices[i] === r.answer;
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    this.time.delayedCall(right ? 600 : 1200, () => this.next());
  }

  next() {
    const s = this.state;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null;
    this.rebuild();
  }
}
