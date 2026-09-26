import { MinigameScene } from '../MinigameScene.js';
import { C } from '../../../constants.js';
import { generateSet } from '../../../generators/math/arithmetic.js';
import { TUNING } from '../../../data/grades.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { panel } from '../../../ui/Panel.js';
import { ProgressBar } from '../../../ui/ProgressBar.js';

/** Quick-fire arithmetic: 10 questions, 4 answer tiles, a timer per question. */
export class NumberDash extends MinigameScene {
  constructor() { super('MG_NumberDash'); }

  initState() {
    const tune = TUNING[this.payload.band];
    return {
      questions: generateSet(this.payload.grade, this.rng, tune.questions),
      idx: 0, correct: 0, locked: false, picked: null,
      qStart: Date.now(), timeLimit: tune.questionTimeMs, parTimeMs: tune.parTimeMs, missed: {}
    };
  }

  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.questions.length)} / ${this.state.questions.length}`; }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const q = s.questions[s.idx];
    if (!q) return;
    const promptH = Math.min(area.h * 0.38, 220 * ui);
    panel(this, area.x, area.y, area.w, promptH, { color: C.panelDark, stroke: C.blue });
    text(this, area.x + area.w / 2, area.y + promptH / 2 - 10 * ui, q.prompt, { ...T.big(this), fontSize: Math.round((q.prompt.length > 12 ? 34 : 46) * ui) + 'px' });
    this.timerBar = new ProgressBar(this, area.x + area.w / 2, area.y + promptH - 16 * ui, area.w - 40, 12 * ui, { color: C.lime, value: 1 });

    const gap = 12;
    const gridTop = area.y + promptH + gap;
    const cells = grid({ x: area.x, y: gridTop, w: area.w, h: Math.min(area.h - promptH - gap, 320 * ui) }, 2, 2, gap);
    this.choiceButtons = q.choices.map((choice, i) => {
      const c = cells[i];
      let color = C.blue;
      if (s.picked !== null) {
        if (choice === q.answer) color = C.lime;
        else if (i === s.picked) color = C.red;
        else color = C.dark;
      }
      return button(this, c.x, c.y, c.w, Math.min(c.h, 120 * ui), choice, { color, fontSize: 30, onClick: () => this.pick(i) });
    });
  }

  pick(i) {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx];
    s.locked = true; s.picked = i;
    const right = q.choices[i] === q.answer;
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    this.time.delayedCall(right ? 550 : 1100, () => this.next());
  }

  timeUp() {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx];
    s.locked = true; s.picked = -1;
    s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.wrongFeedback();
    this.rebuild();
    this.time.delayedCall(1100, () => this.next());
  }

  next() {
    const s = this.state;
    s.idx += 1;
    if (s.idx >= s.questions.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: s.parTimeMs, missedSkills });
    }
    s.locked = false; s.picked = null; s.qStart = Date.now();
    this.rebuild();
  }

  onResumed() { this.state.qStart = Date.now() - Math.min(Date.now() - this.state.qStart, this.state.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || !this.timerBar || !this.timerBar.active) return;
    const ratio = 1 - (Date.now() - s.qStart) / s.timeLimit;
    this.timerBar.set(ratio, ratio < 0.3 ? C.red : ratio < 0.6 ? C.orange : C.lime);
    if (ratio <= 0) this.timeUp();
  }
}
