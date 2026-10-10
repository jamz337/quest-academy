import { MinigameScene } from './MinigameScene.js';
import { THEME } from '../../ui/theme.js';
import { tuningFor } from '../../data/grades.js';
import { weakSkills, prioritiseWeak } from '../../systems/Practice.js';
import { byDifficulty } from '../../systems/Ramp.js';
import { grid } from '../../systems/Layout.js';
import { T } from '../../ui/TextStyles.js';
import { button, speakButton } from '../../ui/Button.js';
import { readable } from '../../ui/ReadableText.js';
import { card } from '../../ui/Card.js';
import { stripe } from '../../ui/Panel.js';
import { enter } from '../../ui/motion.js';
import { plainTheme } from '../../ui/Explain.js';

/**
 * A picture quiz: ten questions with big answer buttons, each read aloud, a second try on a miss and an
 * explanation on a second miss, and (if the subject wants one) a "bench" along the top that fills with what has
 * been learned. A subject extends it with its generators, `makeSet(n, targets)` and `makeOne(d)`, and the hooks:
 * `hasBench`/`drawBench(rect)`/`benchItem(q)`, `afterRight(q)`, `promptHeight(area, q)`, `drawPicture(cx, y, size, q)`,
 * `answerButton(cell, h, choice, i, q, opts)` and `choiceWords(q, choice)` (what the answer's 🔊 says; null for none).
 */
export class PictureQuiz extends MinigameScene {
  get lessonTheme() { return plainTheme; }
  get gameId() { return this.payload.gameId; }
  get hasBench() { return false; }
  makeSet() { return []; }
  makeOne() { return null; }

  initState() {
    const tune = tuningFor(this.payload), n = tune.questions;
    const ramp = this.makeSet(n, this.rampTargets(n));
    const questions = byDifficulty(prioritiseWeak(ramp, () => this.makeSet(12, null), weakSkills(this.profile)));
    return { questions, idx: 0, correct: 0, locked: false, picked: null, right: null, missed: {}, bench: [], parTimeMs: tune.parTimeMs };
  }

  get round() { return this.state.questions[this.state.idx]; }
  get total() { return this.state.questions.length; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.total)} / ${this.total}`; }
  progressRatio() { return this.state.idx / this.total; }
  enterKey() { return this.state.idx; }

  /** A solved example of a skill the child has never met, and another to try (for the New Skill page). */
  exampleFor(skill) {
    const found = [];
    for (let i = 0; i < 80 && found.length < 2; i++) {
      const q = this.makeOne(0.3);
      if (q && q.skill === skill && !found.some((x) => x.prompt === q.prompt)) found.push(q);
    }
    const [q, t] = found;
    if (!q) return null;
    const line = (x) => (x.text || x.prompt).replace('\n', '  ');
    return { problem: `${line(q)}  →  ${q.answer}`, steps: this.steps(q), practice: t ? { prompt: line(t), choices: t.choices, answer: t.answer, solved: `${line(t)}  →  ${t.answer}` } : null };
  }

  promptHeight(area, q) { return Math.min(area.h * 0.42, ((q.pics || []).length ? 150 : 110) * this.ui); }
  /** The question's picture (its emoji, by default), centred on (cx, y) and about `size` tall. */
  drawPicture(cx, y, size, q) { return this.add.text(cx, y, (q.pics || []).join(' '), { fontSize: Math.round(size * 0.8) + 'px', align: 'center' }).setOrigin(0.5); }
  answerButton(c, bh, choice, i, q, opts) { return button(this, c.x, c.y, c.w, bh, choice, opts); }
  choiceWords(q, choice) { return choice; }
  drawBench() {}
  benchItem(q) { return { pic: (q.pics && q.pics[0]) || null }; }
  afterRight() {}

  buildGame(area) {
    const s = this.state, ui = this.ui, q = this.round;
    if (!q) return;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), plainTheme)) return;
    const cx = area.x + area.w / 2;
    if (this.hasBench) {
      // The bench along the top shows what has been learned so far.
      const benchH = Math.min(96 * ui, area.h * 0.17);
      this.drawBench({ x: area.x, y: area.y, w: area.w, h: benchH });
      area = { x: area.x, y: area.y + benchH + 8, w: area.w, h: area.h - benchH - 8 };
    }

    // The question, read aloud, with its picture big underneath.
    const answered = s.picked !== null;
    const pics = q.pics || [];
    const promptH = this.promptHeight(area, q);
    const k = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const colour = answered ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    const prompt = q.text || q.prompt;
    const said = readable(this, cx, area.y + (pics.length ? 36 : promptH / 2) * (pics.length ? ui : 1), prompt, T.at(this, prompt.length > 60 ? 17 : prompt.length > 34 ? 19 : 23, colour, { fontStyle: '700' }), { width: area.w - 90 * ui, align: 'center' });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, said, { rate: this.speechRate });
    this.autoRead(said, answered || q.flagChoices ? null : q.choices);
    if (pics.length) {
      const size = Math.min(64 * ui, promptH - 70 * ui);
      this.picture = this.drawPicture(cx, area.y + promptH - size / 2 - 10 * ui, size, q);
    }
    enter(this, k, { from: 'up', distance: 12 });

    // The answers: big buttons, each with its own 🔊.
    const top = area.y + promptH + 12;
    const n = q.choices.length, cols = n === 4 ? 2 : n, rows = Math.ceil(n / cols);
    const longest = Math.max(...q.choices.map((c) => c.length));
    const rect = { x: area.x, y: top, w: area.w, h: Math.min(area.y + area.h - top, rows * (longest > 28 ? 92 : 100) * ui) };
    const cells = grid(rect, cols, rows, 12);
    const reveal = answered && (s.right || this.answerRevealed(q));
    const made = q.choices.map((choice, i) => {
      const c = cells[i];
      let variant = 'secondary';
      if (answered) { if (choice === q.answer && reveal) variant = 'success'; else if (i === s.picked) variant = 'danger'; }
      const bh = Math.max(60 * ui, Math.min(c.h, 100 * ui));
      const size = longest > 40 ? 13 : longest > 24 ? 15 : longest > 14 ? 17 : 20;
      const b = this.answerButton(c, bh, choice, i, q, { variant, fontSize: size, wrap: true, disabled: this.struckChoice() === i && s.picked === null, onClick: () => this.pick(i) });
      const words = this.choiceWords(q, choice);
      if (words) this.answerSpeaker(b, c.w, bh, words);
      if (reveal && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'pop', delay: 80, stagger: 50 });
    if (answered && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  pick(i) {
    const s = this.state, q = this.round;
    if (s.locked || !q) return;
    const right = q.choices[i] === q.answer;
    if (!right && this.secondChance(q, i)) { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.rebuild(); return; }
    const second = this.onSecondTry(q);
    s.locked = true; s.picked = i; s.right = right;
    if (!second) this.logQuestion(q, right);
    if (right) { s.correct += 1; this.noteRight(q); this.correctFeedback(); s.bench.push(this.benchItem(q)); }
    else { if (!second) s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) { this.afterRight(q); this.time.delayedCall(1000, () => this.next()); }
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: s.parTimeMs, missedSkills });
    }
    s.locked = false; s.picked = null; s.right = null;
    this.rebuild();
  }
}
