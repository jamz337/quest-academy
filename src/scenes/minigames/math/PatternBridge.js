import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds } from '../../../generators/math/patterns.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { card, plank } from '../../../ui/Card.js';
import { enter } from '../../../ui/motion.js';
import { prioritiseWeak, weakSkills } from '../../../systems/Practice.js';

const PAR_MS = 90000;
const WOOD = 0xf0b36b, POST = 0xc99a6b;

/** Pattern Bridge: a row of numbered planks over water with one missing; pick the plank that fits. 8 bridges. */
export class PatternBridge extends MinigameScene {
  constructor() { super('MG_PatternBridge'); }

  initState() {
    const grade = this.payload.grade;
    const rounds = prioritiseWeak(generateRounds(grade, this.rng, 8), () => generateRounds(grade, this.rng, 10), weakSkills(this.profile));
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, missed: {}, introduced: {} };
  }

  /** A solved bridge of a pattern skill the player has never met. */
  exampleFor(skill) {
    for (let i = 0; i < 40; i++) {
      const r = generateRounds(this.payload.grade, this.rng, 1)[0];
      if (r.skill === skill) return { problem: r.terms.map((t, j) => (j === r.missingIndex ? `[${t}]` : t)).join(', '), steps: this.steps(r) };
    }
    return null;
  }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }
  progressRatio() { return this.state.idx / this.state.rounds.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    if (!s.introduced[r.skill] && this.needsIntro(r.skill)) {
      const example = this.exampleFor(r.skill);
      s.introduced[r.skill] = true;
      if (example) return this.introPanel(area, r.skill, example, () => this.rebuild());
    }
    const promptH = 56 * ui;
    const prompt = card(this, area.x + area.w / 2, area.y + promptH / 2, area.w, promptH);
    text(this, area.x + area.w / 2, area.y + promptH / 2, r.rule || 'Which number is missing from the bridge?',
      T.at(this, 20, THEME.ink, { wordWrap: { width: area.w - 20 } }));
    enter(this, prompt, { from: 'up', distance: 12 });

    const gap = 10;
    const sceneH = Math.min(area.h * 0.42, 240 * ui);
    const sceneRect = { x: area.x, y: area.y + promptH + gap, w: area.w, h: sceneH };
    const planks = this.drawBridge(sceneRect, r, s);
    enter(this, planks, { from: 'pop', delay: 80, stagger: 40 });

    const gridTop = sceneRect.y + sceneH + gap;
    const gridH = Math.min(area.y + area.h - gridTop, 300 * ui);
    const cells = grid({ x: area.x, y: gridTop, w: area.w, h: gridH }, this.portrait ? 2 : 4, this.portrait ? 2 : 1, gap);
    const made = r.choices.map((choice, i) => {
      const c = cells[i];
      let variant = 'secondary', faded = false;
      if (s.picked !== null) { if (choice === r.answer) variant = 'success'; else if (i === s.picked) variant = 'danger'; else faded = true; }
      const b = button(this, c.x, c.y, c.w, Math.max(56 * ui, Math.min(c.h, 110 * ui)), choice, { variant, fontSize: 28, onClick: () => this.pick(i) });
      if (faded) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'up', delay: 200, stagger: 40 });
    if (s.picked !== null && r.choices[s.picked] !== r.answer) this.explanationPanel(area, { ...r, prompt: r.terms.map((t, j) => (j === r.missingIndex ? '?' : t)).join(', ') }, () => this.next());
  }

  /** Water, two posts, a rail and the plank row. The missing plank is a sunken slot with a "?" until answered. Returns the planks. */
  drawBridge(rect, r, s) {
    const ui = this.ui, g = this.add.graphics();
    const n = r.terms.length;
    const waterTop = rect.y + rect.h * 0.55;
    g.fillStyle(THEME.subjects.math.soft, 1); g.fillRoundedRect(rect.x, waterTop, rect.w, rect.y + rect.h - waterTop, 16);
    g.fillStyle(THEME.primary, 0.22);
    for (let i = 0; i < 6; i++) g.fillEllipse(rect.x + 20 + ((i * 173) % (rect.w - 40)), waterTop + 18 + ((i * 41) % Math.max(20, rect.h * 0.3)), 34 * ui, 6 * ui);

    const gap = 8 * ui;
    const plankW = Math.min((rect.w - 24 * ui - gap * (n - 1)) / n, 96 * ui);
    const plankH = Math.min(56 * ui, rect.h * 0.3);
    const rowW = plankW * n + gap * (n - 1);
    const x0 = rect.x + (rect.w - rowW) / 2;
    const py = waterTop - plankH * 0.4;

    g.fillStyle(POST, 1);
    g.fillRoundedRect(x0 - 16 * ui, py - 30 * ui, 12 * ui, rect.y + rect.h - py + 14 * ui, 4);
    g.fillRoundedRect(x0 + rowW + 4 * ui, py - 30 * ui, 12 * ui, rect.y + rect.h - py + 14 * ui, 4);
    g.lineStyle(4 * ui, POST, 1); g.lineBetween(x0 - 10 * ui, py - 26 * ui, x0 + rowW + 10 * ui, py - 26 * ui);

    const fontSize = Math.round((n > 5 && plankW < 60 * ui ? 16 : 22) * ui);
    return r.terms.map((t, i) => {
      const x = x0 + i * (plankW + gap) + plankW / 2, y = py + plankH / 2;
      if (i === r.missingIndex && s.picked === null) {
        return plank(this, x, y, plankW, plankH, '?', { empty: true, stroke: THEME.warning, textColor: THEME.warningDark, fontSize });
      }
      const isMissing = i === r.missingIndex;
      const right = isMissing && r.choices[s.picked] === r.answer;
      const color = isMissing ? (right ? THEME.success : THEME.danger) : WOOD;
      return plank(this, x, y, plankW, plankH, String(t), { color, fontSize, radius: 10, textColor: isMissing ? THEME.onAccent : THEME.ink });
    });
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.locked = true; s.picked = i;
    const right = r.choices[i] === r.answer;
    this.logQuestion({ skill: r.skill, prompt: (r.rule ? r.rule + '\n' : '') + r.terms.map((t, j) => (j === r.missingIndex ? '?' : t)).join(', '), answer: r.answer, choices: r.choices }, right);
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) this.time.delayedCall(600, () => this.next());   // wrong answers wait for "Next" after the explanation
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null;
    this.rebuild();
  }
}
