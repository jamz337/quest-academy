import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { generateRounds, fillBlank, roundDifficulty } from '../../../generators/english/grammar.js';
import { skillLabel } from '../../../data/skills.js';
import { grid } from '../../../systems/Layout.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { enter, shake } from '../../../ui/motion.js';
import { RUNE, drawGlade, scroll, plaque, runeSlab, tabletTrail, owl } from './RuneScenery.js';

const PAR_MS = 90000;

/**
 * Grammar Gate, in Word Builder's "ancient runes" look: the sentence is on a parchment scroll in the moonlit glade,
 * the three words to choose from are glowing rune slabs, and each sentence answered lights (or cracks) one of the
 * gate's rune tablets across the top. 10 sentences.
 */
export class GrammarGate extends MinigameScene {
  constructor() { super('MG_GrammarGate'); }

  initState() {
    const grade = this.payload.grade;
    const rounds = this.rampedRounds((k) => generateRounds(grade, this.rng, k), 10, roundDifficulty, () => generateRounds(grade, this.rng, 12));
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, missed: {}, introduced: {}, marks: [] };
  }

  /** A solved sentence of a skill the player has never met. */
  exampleFor(skill) {
    for (let i = 0; i < 40; i++) {
      const r = generateRounds(this.payload.grade, this.rng, 1)[0];
      if (r.skill === skill) return { problem: fillBlank(r.sentence, r.options[r.answer]), steps: this.steps({ ...r, answer: r.options[r.answer] }) };
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
    drawGlade(this, area, ui);
    const cx = area.x + area.w / 2, wide = area.w / ui >= 600;
    const answered = s.picked !== null, rightNow = answered && s.picked === r.answer;
    // Shrink everything a little on short screens so the slabs keep a comfortable size.
    const f = ui * Math.min(1, Math.max(0.72, area.h / (620 * ui)));

    // The gate's rune tablets: one per sentence, lit when answered right, cracked when missed.
    let y = area.y + 10 * f;
    const { tablets } = tabletTrail(this, { x: area.x + 16 * ui, y, w: area.w - 32 * ui, h: 34 * f }, s.correct, s.rounds.length, s.idx, f, s.marks);
    const lit = tablets[s.idx];
    if (rightNow && lit && this.tweens) {
      const spark = this.add.circle(lit.x, lit.y, 8 * f, RUNE.glow, 0.8);
      this.tweens.add({ targets: spark, scale: 3, alpha: 0, duration: 600, onComplete: () => spark.destroy() });
    }
    y += 34 * f + 12 * f;
    plaque(this, cx, y + 20 * f, `Which word fits?  (${skillLabel(r.skill)})`, f, 16);
    y += 50 * f;

    // The sentence on a parchment scroll; once answered the right word is written into the blank.
    const scrollW = wide ? Math.min(area.w * 0.8, 720 * ui) : area.w - 24 * ui;
    const scrollH = Math.min(150 * f, Math.max(96 * f, area.h * 0.22));
    const scrollCy = y + scrollH / 2;
    const paper = scroll(this, cx, scrollCy, scrollW, scrollH, f);
    const shown = answered ? fillBlank(r.sentence, r.options[r.answer]) : fillBlank(r.sentence);
    let sentence = null;
    for (const px of [30, 26, 22, 19, 17]) {
      if (sentence) sentence.destroy();
      const style = { fontFamily: FONT, fontSize: Math.round(px * f) + 'px', color: hex(answered ? THEME.successDark : RUNE.ink), fontStyle: WEIGHT.heavy, align: 'center' };
      sentence = readable(this, cx - 18 * f, scrollCy, shown, style, { width: scrollW - 130 * f, highlight: RUNE.reveal });
      if ((sentence.height || 0) <= scrollH - 26 * f) break;
    }
    speakButton(this, cx + scrollW / 2 - 52 * f, scrollCy, 40 * f, sentence, { rate: this.speechRate });
    this.autoRead(sentence, answered ? null : r.options);
    if (wide) owl(this, cx + scrollW / 2 - 30 * f, scrollCy - scrollH / 2 - 2 * f, 0.8 * f);
    enter(this, paper, { from: 'up', distance: 12 });
    if (answered && !rightNow) shake(this, paper, 5);
    y += scrollH + 24 * f;

    // The words to choose from, as glowing rune slabs: a row on wide screens, a column on a phone.
    const n = r.options.length, gap = 12 * f;
    const cols = this.portrait ? 1 : n, rows = Math.ceil(n / cols);
    const blockW = this.portrait ? Math.min(area.w - 24 * ui, 460 * ui) : Math.min(area.w - 24 * ui, 900 * ui);
    const slabH = Math.max(58 * f, Math.min(96 * f, (area.y + area.h - y - 12 * f - gap * (rows - 1)) / rows));
    const cells = grid({ x: cx - blockW / 2, y, w: blockW, h: slabH * rows + gap * (rows - 1) }, cols, rows, gap);
    const made = r.options.map((opt, i) => {
      const c = cells[i];
      let glow = RUNE.glow, halo = false, dim = false;
      if (answered) { if (i === r.answer) { glow = RUNE.right; halo = true; } else if (i === s.picked) { glow = RUNE.wrong; halo = true; } else dim = true; }
      const slab = runeSlab(this, c.x, c.y, c.w, slabH, opt, { glow, halo, dim, seed: i + s.idx, ui: f, fontSize: opt.length <= 2 ? 44 : opt.length > 10 ? 22 : 28, onTap: s.locked ? null : () => this.pick(i) });
      this.answerSpeaker(slab, c.w, slabH, opt);
      return slab;
    });
    enter(this, made, { from: 'pop', delay: 60, stagger: 40 });
    if (answered && !rightNow) this.explanationPanel(area, { ...r, prompt: fillBlank(r.sentence), answer: r.options[r.answer] }, () => this.next());
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.locked = true; s.picked = i;
    const right = i === r.answer;
    this.logQuestion({ skill: r.skill, prompt: fillBlank(r.sentence), answer: r.options[r.answer], choices: r.options }, right);
    s.marks[s.idx] = right;
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
