import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex, darken } from '../../../ui/theme.js';
import { generateRounds, fillBlank, roundDifficulty } from '../../../generators/english/grammar.js';
import { skillLabel } from '../../../data/skills.js';
import { grid } from '../../../systems/Layout.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { enter, shake } from '../../../ui/motion.js';
import { CASTLE, drawCourtyard, gatehouse, noticeBoard, plank, shieldRow, castleIntroTheme } from './CastleScenery.js';

const PAR_MS = 90000;

/**
 * Grammar Gate: a castle at dusk, a cousin of Word Builder's rune glade. Every right word drops the iron portcullis
 * one notch until the gate is shut for the night. The sentence is on a notice board, the words to choose from are
 * wooden planks bound with iron, and a row of shields shows each sentence (gold right, cracked missed). 10 sentences.
 */
export class GrammarGate extends MinigameScene {
  constructor() { super('MG_GrammarGate'); }

  initState() {
    const grade = this.payload.grade;
    const rounds = this.rampedRounds((k) => generateRounds(grade, this.rng, k), 10, roundDifficulty, () => generateRounds(grade, this.rng, 12));
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, missed: {}, introduced: {}, marks: [] };
  }

  /** A solved sentence of a skill the player has never met, and a second one for the child to try. */
  exampleFor(skill) {
    const found = [];
    for (let i = 0; i < 80 && found.length < 2; i++) {
      const r = generateRounds(this.payload.grade, this.rng, 1)[0];
      if (r.skill === skill && !found.some((x) => x.sentence === r.sentence)) found.push(r);
    }
    const [r, t] = found;
    if (!r) return null;
    return {
      problem: fillBlank(r.sentence, r.options[r.answer]), steps: this.steps({ ...r, answer: r.options[r.answer] }),
      practice: t ? { prompt: fillBlank(t.sentence), choices: t.options, answer: t.options[t.answer], solved: fillBlank(t.sentence, t.options[t.answer]) } : null
    };
  }

  get lessonTheme() { return castleIntroTheme; }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }
  progressRatio() { return this.state.idx / this.state.rounds.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    if (this.skillIntroFor(area, r.skill, (k) => this.exampleFor(k), castleIntroTheme)) return;
    const cx = area.x + area.w / 2, total = s.rounds.length;
    const answered = s.picked !== null, rightNow = answered && s.picked === r.answer;
    const asked = { ...r, prompt: fillBlank(r.sentence), answer: r.options[r.answer] };
    // After a miss the right word stays hidden until the child has picked it in "Let's see why".
    const reveal = answered && (rightNow || this.answerRevealed(asked));
    // Shrink everything a little on short screens so the planks keep a comfortable size.
    const f = ui * Math.min(1, Math.max(0.72, area.h / (620 * ui)));

    // The castle: sky, wall and cobbles, with the gatehouse in the middle of the wall.
    const rowH = 30 * f;
    const gh = this.portrait ? Math.min(area.h * 0.3, 230 * f) : Math.min(area.h * 0.34, 250 * f);
    const gateTop = area.y + 12 * f + rowH + 8 * f + Math.max(8, gh * 0.08);   // clear of the shields, battlements included
    const gw = Math.min(area.w * (this.portrait ? 0.78 : 0.46), gh * 1.35);
    const baseY = gateTop + gh;
    drawCourtyard(this, area, baseY, gh * 0.42, f);
    const gate = this.gate = gatehouse(this, cx, baseY, gw, gh, (s.correct - (rightNow ? 1 : 0)) / total, f);
    gate.flames.forEach((fl, i) => this.tweens && this.tweens.add({ targets: fl, scaleY: 1.18, scaleX: 0.9, alpha: 0.85, duration: 260 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    if (rightNow) {
      // Clank: the portcullis drops a notch and the dust flies.
      this.tweens.add({ targets: gate.bars, y: gate.yFor(s.correct / total), duration: 520, ease: 'Bounce.Out', onComplete: () => { if (this.cameras && this.cameras.main) this.cameras.main.shake(90, 0.003); } });
      for (let i = 0; i < 6; i++) {
        const d = this.add.circle(gate.arch.x + gate.arch.w * (0.1 + 0.16 * i), baseY - 2, 3 * f, 0xd8cbb2, 0.8);
        this.tweens.add({ targets: d, y: baseY - (10 + (i % 3) * 6) * f, x: d.x + (i - 2.5) * 5 * f, alpha: 0, duration: 700, delay: 420 });
      }
    } else if (answered) shake(this, gate.bars, 4);
    // Progress: a shield per sentence over the gate, and how far the gate has closed.
    shieldRow(this, { x: area.x + 16 * ui, y: area.y + 10 * f, w: area.w - 32 * ui, h: rowH }, s.marks, total, s.idx, f);

    // The sentence on the notice board; once answered the right word is written into the blank.
    let y = baseY + 14 * f;
    const boardW = this.portrait ? area.w - 20 * ui : Math.min(area.w * 0.8, 720 * ui);
    const boardH = Math.min(150 * f, Math.max(104 * f, area.h * 0.2));
    const board = noticeBoard(this, cx, y + boardH / 2, boardW, boardH, f);
    const inner = board.inner;
    const label = this.add.text(inner.x + 4 * f, inner.y + 2 * f, `Which word fits?  (${skillLabel(r.skill)})`, { fontFamily: FONT, fontSize: Math.round(15 * f) + 'px', color: hex(darken(CASTLE.ink, 1.6)), fontStyle: WEIGHT.bold });
    const shown = reveal ? fillBlank(r.sentence, r.options[r.answer]) : fillBlank(r.sentence);
    const textTop = inner.y + (label.height || 16 * f) + 2 * f, textH = inner.y + inner.h - textTop;
    let sentence = null;
    for (const px of [30, 26, 22, 19, 17]) {
      if (sentence) sentence.destroy();
      const style = { fontFamily: FONT, fontSize: Math.round(px * f) + 'px', color: hex(reveal ? THEME.successDark : CASTLE.ink), fontStyle: WEIGHT.heavy, align: 'center' };
      sentence = readable(this, cx - 20 * f, textTop + textH / 2, shown, style, { width: inner.w - 70 * f, highlight: CASTLE.gold });
      if ((sentence.height || 0) <= textH - 4 * f) break;
    }
    speakButton(this, inner.x + inner.w - 22 * f, textTop + textH / 2, 40 * f, sentence, { rate: this.speechRate });
    this.autoRead(sentence, answered ? null : r.options);
    enter(this, [board.g, label, sentence], { from: 'up', distance: 10 });
    y += boardH + 20 * f;

    // The words to choose from, as wooden planks: a row on wide screens, a column on a phone.
    const n = r.options.length, gap = 12 * f;
    const cols = this.portrait ? 1 : n, rows = Math.ceil(n / cols);
    const blockW = this.portrait ? Math.min(area.w - 24 * ui, 460 * ui) : Math.min(area.w - 24 * ui, 900 * ui);
    const plankH = Math.max(54 * f, Math.min(88 * f, (area.y + area.h - y - 10 * f - gap * (rows - 1)) / rows));
    const cells = grid({ x: cx - blockW / 2, y, w: blockW, h: plankH * rows + gap * (rows - 1) }, cols, rows, gap);
    const made = r.options.map((opt, i) => {
      const c = cells[i];
      const state = !answered ? 'idle' : i === s.picked && !rightNow ? 'wrong' : !reveal ? 'idle' : i === r.answer ? 'right' : 'dim';
      const p = plank(this, c.x, c.y, c.w, plankH, opt, { state, seed: i + s.idx, ui: f, fontSize: opt.length <= 2 ? 44 : opt.length > 10 ? 22 : 28, onTap: s.locked ? null : () => this.pick(i) });
      this.answerSpeaker(p, c.w, plankH, opt);
      return p;
    });
    enter(this, made, { from: 'pop', delay: 60, stagger: 40 });
    if (answered && !rightNow) this.explanationPanel(area, asked, () => this.next());
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    const right = i === r.answer;
    const asked = { skill: r.skill, prompt: fillBlank(r.sentence), answer: r.options[r.answer], choices: r.options };
    // The first miss gets a second try; the explanation waits for a second miss.
    if (!right && this.secondChance(asked)) { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.rebuild(); return; }
    const second = this.onSecondTry(asked);
    s.locked = true; s.picked = i;
    if (!second) this.logQuestion(asked, right);
    s.marks[s.idx] = right;
    if (right) { s.correct += 1; this.noteRight(asked); this.correctFeedback(); }
    else { if (!second) s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
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
