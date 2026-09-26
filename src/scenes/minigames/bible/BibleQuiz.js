import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds } from '../../../generators/bible/quiz.js';
import { tuningFor } from '../../../data/grades.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { ProgressBar } from '../../../ui/ProgressBar.js';
import { enter } from '../../../ui/motion.js';

const KIND = { 'bible-quiz': 'quiz', 'bible-verse': 'verse' };

/** Bible Quiz and Verse Builder: 10 timed multiple-choice questions; the reference is shown after each answer. */
export class BibleQuiz extends MinigameScene {
  constructor() { super('MG_BibleQuiz'); }

  initState() {
    const tune = tuningFor(this.payload);
    return {
      questions: generateRounds(this.payload.grade, this.rng, tune.questions, KIND[this.payload.gameId] || 'quiz'),
      idx: 0, correct: 0, locked: false, picked: null,
      qStart: Date.now(), timeLimit: tune.questionTimeMs + 6000, parTimeMs: tune.parTimeMs + 30000, missed: {}   // reading time
    };
  }

  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.questions.length)} / ${this.state.questions.length}`; }
  progressRatio() { return this.state.idx / this.state.questions.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const q = s.questions[s.idx];
    if (!q) return;
    const cx = area.x + area.w / 2;
    const promptH = Math.min(area.h * 0.42, 230 * ui);
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const size = q.prompt.length > 90 ? 17 : q.prompt.length > 50 ? 20 : 24;
    text(this, cx, area.y + promptH / 2 - 12 * ui, q.prompt, { ...T.at(this, size, THEME.ink, { fontStyle: '700' }), align: 'center', wordWrap: { width: area.w - 48 } });
    if (s.picked !== null && q.ref) text(this, cx, area.y + promptH - 34 * ui, q.ref, T.small(this, this.subject.dark));
    this.timerBar = new ProgressBar(this, cx, area.y + promptH - 16 * ui, area.w - 48, 8 * ui, { color: THEME.success, value: 1 });

    const gap = 12;
    const cells = grid({ x: area.x, y: area.y + promptH + gap, w: area.w, h: Math.min(area.h - promptH - gap, 280 * ui) }, 2, 2, gap);
    this.choiceButtons = q.choices.map((choice, i) => {
      const c = cells[i];
      const opts = { variant: 'secondary', fontSize: choice.length > 14 ? 16 : 20, radius: THEME.radius.lg, onClick: () => this.pick(i) };
      if (s.picked !== null) {
        if (choice === q.answer) opts.variant = 'success';
        else if (i === s.picked) opts.variant = 'danger';
      }
      const b = button(this, c.x, c.y, c.w, Math.min(c.h, 100 * ui), choice, opts);
      if (s.picked !== null && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, prompt, { from: 'up', distance: 12 });
    enter(this, this.choiceButtons, { from: 'up', delay: 60, stagger: 40 });
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
    this.time.delayedCall(right ? 1100 : 1600, () => this.next());   // long enough to read the reference
  }

  timeUp() {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx];
    s.locked = true; s.picked = -1;
    s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.wrongFeedback();
    this.rebuild();
    this.time.delayedCall(1600, () => this.next());
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
    this.timerBar.set(ratio, ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    if (ratio <= 0) this.timeUp();
  }
}
