import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds, fillBlank } from '../../../generators/english/grammar.js';
import { skillLabel } from '../../../data/skills.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { enter, shake } from '../../../ui/motion.js';
import { prioritiseWeak, weakSkills } from '../../../systems/Practice.js';
import { castleGate } from '../../../ui/Scenery.js';

const PAR_MS = 90000;

/** Grammar Gate: fill the blank in 10 sentences from 3 choices. */
export class GrammarGate extends MinigameScene {
  constructor() { super('MG_GrammarGate'); }

  initState() {
    const grade = this.payload.grade;
    const rounds = prioritiseWeak(generateRounds(grade, this.rng, 10), () => generateRounds(grade, this.rng, 12), weakSkills(this.profile));
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, missed: {}, introduced: {} };
  }

  /** A solved sentence of a skill the player has never met. */
  exampleFor(skill) {
    for (let i = 0; i < 40; i++) {
      const r = generateRounds(this.payload.grade, this.rng, 1)[0];
      if (r.skill === skill) return `${fillBlank(r.sentence, r.options[r.answer])}  ${this.explain({ ...r, answer: r.options[r.answer] })}`;
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
    // The gate above: every right answer raises the portcullis a little; the last one opens the way.
    const stripH = Math.min(112 * ui, area.h * 0.2);
    this.drawGate({ x: area.x, y: area.y, w: area.w, h: stripH });
    area = { x: area.x, y: area.y + stripH + 8, w: area.w, h: area.h - stripH - 8 };
    const gap = 12;
    const promptH = Math.min(area.h * 0.42, 260 * ui);
    const cx = area.x + area.w / 2;
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    text(this, cx, area.y + 30 * ui, `Which word fits? (${skillLabel(r.skill)})`, T.small(this, THEME.ink2));
    const shown = s.picked === null ? fillBlank(r.sentence) : fillBlank(r.sentence, r.options[r.answer]);
    const long = shown.length > 40;
    const sentence = readable(this, cx, area.y + promptH / 2 + 12 * ui, shown, T.at(this, long ? 22 : 28, s.picked === null ? THEME.ink : THEME.successDark), { width: area.w - 32 });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, sentence, { rate: this.speechRate });
    this.autoRead(sentence);
    enter(this, prompt, { from: 'up', distance: 12 });

    const top = area.y + promptH + gap;
    const rect = { x: area.x, y: top, w: area.w, h: Math.min(area.y + area.h - top, (this.portrait ? 260 : 130) * ui) };
    const cells = this.portrait ? grid(rect, 1, 3, gap) : grid(rect, 3, 1, gap);
    const made = r.options.map((opt, i) => {
      const c = cells[i];
      let variant = 'secondary', faded = false;
      if (s.picked !== null) { if (i === r.answer) variant = 'success'; else if (i === s.picked) variant = 'danger'; else faded = true; }
      const b = button(this, c.x, c.y, c.w, Math.max(56 * ui, Math.min(c.h, 96 * ui)), opt, { variant, fontSize: opt.length > 10 ? 20 : 26, wrap: true, onClick: () => this.pick(i) });
      if (faded) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'up', delay: 60, stagger: 40 });
    if (s.picked !== null && s.picked !== r.answer) this.explanationPanel(area, { ...r, prompt: fillBlank(r.sentence), answer: r.options[r.answer] }, () => this.next());
  }

  drawGate(rect) {
    const s = this.state, total = s.rounds.length;
    const justRight = s.picked !== null && s.picked === this.round.answer, justWrong = s.picked !== null && !justRight;
    const { bars, yFor } = castleGate(this, rect, { open: (s.correct - (justRight ? 1 : 0)) / total, ui: this.ui });
    if (justRight) this.tweens.add({ targets: bars, y: yFor(s.correct / total), duration: 450, ease: 'Sine.InOut' });
    else if (justWrong) shake(this, bars, 4);
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.locked = true; s.picked = i;
    const right = i === r.answer;
    this.logQuestion({ skill: r.skill, prompt: fillBlank(r.sentence), answer: r.options[r.answer], choices: r.options }, right);
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
