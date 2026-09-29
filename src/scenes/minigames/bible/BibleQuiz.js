import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds, orderRounds } from '../../../generators/bible/quiz.js';
import { tuningFor } from '../../../data/grades.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { ProgressBar } from '../../../ui/ProgressBar.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { readingDifficulty } from '../../../generators/boss.js';
import { sheepFold, lampRow } from '../../../ui/Scenery.js';

const KIND = { 'bible-quiz': 'quiz', 'bible-verse': 'verse' };

/**
 * Bible Quiz and Verse Builder: 10 timed questions; the reference and an explanation follow each answer.
 * Bible Quiz mixes in "put the story in order" rounds, answered by tapping the events in sequence.
 */
export class BibleQuiz extends MinigameScene {
  constructor() { super('MG_BibleQuiz'); }

  initState() {
    const tune = tuningFor(this.payload);
    const kind = KIND[this.payload.gameId] || 'quiz';
    const grade = this.payload.grade;
    let questions = this.rampedRounds((k) => generateRounds(grade, this.rng, k, kind), tune.questions, readingDifficulty, () => generateRounds(grade, this.rng, 12, kind));
    if (kind === 'quiz') {
      // Two ordering rounds replace two questions, at positions 3 and 7 so they break up the multiple choice.
      const orders = orderRounds(grade, this.rng, 2);
      if (questions.length > 7 && orders.length === 2) { questions[3] = orders[0]; questions[7] = orders[1]; }
    }
    return {
      questions, idx: 0, correct: 0, locked: false, picked: null, right: null, sequence: [],
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
    // Above the question: the shepherd's fold fills with sheep (Bible Quiz) or the scribe's lamps light up (Verse Builder).
    const stripH = Math.min(90 * ui, area.h * 0.16);
    this.drawScene({ x: area.x, y: area.y, w: area.w, h: stripH });
    area = { x: area.x, y: area.y + stripH + 8, w: area.w, h: area.h - stripH - 8 };
    const cx = area.x + area.w / 2;
    const order = q.kind === 'order';
    const promptH = Math.min(area.h * (order ? 0.26 : 0.42), (order ? 130 : 230) * ui);
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const size = order ? 20 : q.prompt.length > 90 ? 17 : q.prompt.length > 50 ? 20 : 24;
    const question = readable(this, cx, area.y + promptH / 2 - 12 * ui, q.prompt, T.at(this, size, THEME.ink, { fontStyle: '700' }), { width: area.w - 48 });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, question, { rate: this.speechRate });
    this.autoRead(question);
    if (s.picked !== null && q.ref) text(this, cx, area.y + promptH - 34 * ui, q.ref, T.small(this, this.subject.dark));
    this.timerBar = new ProgressBar(this, cx, area.y + promptH - 16 * ui, area.w - 48, 8 * ui, { color: THEME.success, value: 1 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);

    const gap = 12;
    if (order) this.buildOrder(area, area.y + promptH + gap, q); else this.buildChoices(area, area.y + promptH + gap, q);
    enter(this, prompt, { from: 'up', distance: 12 });
    if (s.picked !== null && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  drawScene(rect) {
    const s = this.state, ui = this.ui, total = s.questions.length;
    const justRight = s.picked !== null && s.right;
    if (KIND[this.payload.gameId] === 'verse') {
      const { flames } = lampRow(this, rect, { lit: s.correct, total, ui });
      if (justRight && flames.length) { const f = flames[flames.length - 1]; f.setScale(0); this.tweens.add({ targets: f, scale: 1, duration: 420, ease: 'Back.Out' }); }
      return;
    }
    const { startX, foldX, laneY } = sheepFold(this, rect, { inFold: s.correct - (justRight ? 1 : 0), total, ui });
    if (justRight && this.textures.exists('sheep')) {
      const i = s.correct - 1;
      const target = foldX + 14 * ui + (i % 5) * ((Math.min(rect.w * 0.42, 190 * ui) - 28 * ui) / 4);
      const lamb = this.add.sprite(startX, laneY - 6 * ui + Math.floor(i / 5) * 12 * ui, 'sheep', 0).setDisplaySize(24 * ui, 24 * ui).setFlipX(true);
      if (this.anims.exists('sheep-walk')) lamb.play('sheep-walk', true);
      this.tweens.add({ targets: lamb, x: target, duration: 800, ease: 'Sine.InOut', onComplete: () => { if (lamb.active) { lamb.stop(); lamb.setFrame(0); } } });
    }
  }

  buildChoices(area, top, q) {
    const s = this.state, ui = this.ui, gap = 12;
    const cells = grid({ x: area.x, y: top, w: area.w, h: Math.min(area.h - (top - area.y), 280 * ui) }, 2, 2, gap);
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
    enter(this, this.choiceButtons, { from: 'up', delay: 60, stagger: 40 });
  }

  /** Ordering: one button per event; tapping numbers them 1, 2, 3, 4. Wrong picks show the right order. */
  buildOrder(area, top, q) {
    const s = this.state, ui = this.ui, gap = 8;
    const cells = grid({ x: area.x, y: top, w: area.w, h: Math.min(area.h - (top - area.y), 4 * 58 * ui) }, 1, q.shuffled.length, gap);
    const made = q.shuffled.map((step, i) => {
      const c = cells[i];
      const pos = s.sequence.indexOf(i);
      const correctPos = q.steps.indexOf(step);
      let variant = 'secondary', label = step;
      if (s.picked !== null) { variant = pos === correctPos ? 'success' : 'danger'; label = `${correctPos + 1}. ${step}`; }
      else if (pos >= 0) { variant = 'primary'; label = `${pos + 1}. ${step}`; }
      return button(this, c.x, c.y, c.w, Math.max(44 * ui, Math.min(c.h, 60 * ui)), label, { variant, fontSize: step.length > 34 ? 14 : 16, wrap: true, radius: THEME.radius.md, onClick: () => this.pickStep(i) });
    });
    enter(this, made, { from: 'up', delay: 60, stagger: 30 });
  }

  pickStep(i) {
    const s = this.state, q = s.questions[s.idx];
    if (s.locked || s.sequence.includes(i)) return;
    Sfx.click();
    s.sequence.push(i);
    if (s.sequence.length < q.shuffled.length) return this.rebuild();
    const right = s.sequence.every((si, pos) => q.shuffled[si] === q.steps[pos]);
    this.answer(q, right, -3);
  }

  pick(i) {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx];
    this.answer(q, q.choices[i] === q.answer, i);
  }

  answer(q, right, picked) {
    const s = this.state;
    s.locked = true; s.picked = picked; s.right = right;
    this.logQuestion(q, right);
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) this.time.delayedCall(1100, () => this.next());   // long enough to read the reference
  }

  timeUp() {
    const s = this.state;
    if (s.locked) return;
    this.answer(s.questions[s.idx], false, -1);
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: s.parTimeMs, missedSkills });
    }
    s.locked = false; s.picked = null; s.right = null; s.sequence = []; s.qStart = Date.now();
    this.rebuild();
  }

  onResumed() { this.state.qStart = Date.now() - Math.min(Date.now() - this.state.qStart, this.state.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || !Number.isFinite(s.timeLimit) || !this.timerBar || !this.timerBar.active) return;
    const ratio = 1 - (Date.now() - s.qStart) / s.timeLimit;
    this.timerBar.set(ratio, ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    if (ratio <= 0) this.timeUp();
  }
}
