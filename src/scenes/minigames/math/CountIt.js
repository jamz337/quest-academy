import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { earlySet, earlyQuestion } from '../../../generators/math/early.js';
import { numberWord } from '../../../data/early/pictures.js';
import { grid } from '../../../systems/Layout.js';
import { T, text, FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { enter, pulse } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { speak, canSpeak } from '../../../systems/Speech.js';
import { plainTheme } from '../../../ui/Explain.js';

const ROUNDS = 8;
const PAR_MS = 180000;
const BASKET = 0xc98b3c, BASKET_DARK = 0x8a5a24, STALL = 0xff9fb6, STALL_STRIPE = 0xffffff;

/**
 * Count It, for Pre-K to Grade 1: listen and tap. Count the mangoes (tap each one and hear its number), find the
 * number, spot which group has more, name the shape, add and take away with pictures. Every question is read
 * aloud, answers are big pictures or numbers with their own 🔊, and there is no clock. Each right answer drops a
 * mango into the market basket.
 */
export class CountIt extends MinigameScene {
  constructor() { super('MG_CountIt'); }

  get lessonTheme() { return plainTheme; }

  initState() {
    const questions = earlySet(this.payload.grade, this.rng, ROUNDS, this.rampTargets(ROUNDS));
    return { questions, idx: 0, correct: 0, locked: false, picked: null, right: null, tapped: [], missed: {} };
  }

  get round() { return this.state.questions[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return this.state.idx; }

  /** A solved example of a skill the child has never met, and another to try (for the New Skill page). */
  exampleFor(skill) {
    const found = [];
    for (let i = 0; i < 80 && found.length < 2; i++) {
      const q = earlyQuestion(this.payload.grade, this.rng, 0.2);
      if (q.skill === skill && !found.some((x) => x.prompt === q.prompt)) found.push(q);
    }
    const [q, t] = found;
    if (!q) return null;
    const line = (x) => x.prompt.replace('\n', '  ');
    return { problem: `${line(q)}  →  ${q.answer}`, steps: this.steps(q), practice: t ? { prompt: line(t), choices: t.choices, answer: t.answer, solved: `${line(t)}  →  ${t.answer}` } : null };
  }

  buildGame(area) {
    const s = this.state, ui = this.ui, q = this.round;
    if (!q) return;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), plainTheme)) return;
    const cx = area.x + area.w / 2;
    // The market stall along the top: its basket holds a mango for every right answer.
    const stripH = Math.min(84 * ui, area.h * 0.15);
    this.drawStall({ x: area.x, y: area.y, w: area.w, h: stripH });
    area = { x: area.x, y: area.y + stripH + 8, w: area.w, h: area.h - stripH - 8 };

    // The question, read aloud, with its pictures big underneath.
    const answered = s.picked !== null;
    const pics = q.pics || [];
    const picRows = pics.length ? Math.ceil(pics.length / Math.min(pics.length, 6)) : 0;
    const promptH = Math.min(area.h * 0.5, (pics.length ? 120 + picRows * 58 : 120) * ui);
    const k = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const colour = answered ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    const said = readable(this, cx, area.y + 40 * ui, q.text || q.prompt, T.at(this, q.text && q.text.length > 34 ? 20 : 24, colour, { fontStyle: '700' }), { width: area.w - 90 * ui, align: 'center' });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, said, { rate: this.speechRate });
    this.autoRead(said, answered ? null : q.choices);
    if (pics.length) this.drawPictures(q, { x: area.x + 12, y: area.y + 70 * ui, w: area.w - 24, h: promptH - 84 * ui });
    else if (q.prompt.includes('\n')) text(this, cx, area.y + promptH / 2 + 26 * ui, q.prompt.split('\n')[1], T.at(this, 34, THEME.ink, { fontStyle: '700' }));
    enter(this, k, { from: 'up', distance: 12 });

    // The answers: big buttons (pictures or numbers), each with its own 🔊.
    const top = area.y + promptH + 12;
    const n = q.choices.length, cols = n === 4 ? 2 : n, rows = Math.ceil(n / cols);
    const rect = { x: area.x, y: top, w: area.w, h: Math.min(area.y + area.h - top, rows * 110 * ui) };
    const cells = grid(rect, cols, rows, 12);
    const reveal = answered && (s.right || this.answerRevealed(q));
    const made = q.choices.map((choice, i) => {
      const c = cells[i];
      let variant = 'secondary';
      if (answered) { if (choice === q.answer && reveal) variant = 'success'; else if (i === s.picked) variant = 'danger'; }
      const bh = Math.max(64 * ui, Math.min(c.h, 104 * ui));
      const pic = /\p{Extended_Pictographic}/u.test(choice) && !/\d/.test(choice);
      const size = pic ? Math.min(40, 220 / Math.max(1, [...choice].length)) : 40;
      const b = button(this, c.x, c.y, c.w, bh, choice, { variant, fontSize: size, wrap: true, disabled: this.struckChoice() === i && s.picked === null, onClick: () => this.pick(i) });
      this.answerSpeaker(b, c.w, bh, choice);
      if (reveal && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'pop', delay: 80, stagger: 50 });
    if (answered && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  /** The pictures to count, in rows of up to six (fives for counting past ten, like a ten frame). Tap one to count it. */
  drawPictures(q, r) {
    const s = this.state, ui = this.ui;
    const pics = q.pics;
    const perRow = pics.length > 10 ? 5 : Math.min(pics.length, 6);
    const rows = Math.ceil(pics.length / perRow);
    const size = Math.max(26 * ui, Math.min(56 * ui, r.w / (perRow + 0.6), r.h / rows));
    const counting = q.skill === 'counting' && s.picked === null;
    pics.forEach((p, i) => {
      const row = Math.floor(i / perRow), col = i % perRow, inRow = Math.min(perRow, pics.length - row * perRow);
      const x = r.x + r.w / 2 + (col - (inRow - 1) / 2) * size * 1.05, y = r.y + row * size + size / 2;
      const t = this.add.text(x, y, p, { fontSize: Math.round(size * 0.82) + 'px' }).setOrigin(0.5);
      const at = s.tapped.indexOf(i);
      if (at >= 0) {
        // Its number, in the order the child counted it.
        this.add.circle(x + size * 0.32, y - size * 0.32, size * 0.2, THEME.primary);
        this.add.text(x + size * 0.32, y - size * 0.32, String(at + 1), { fontFamily: FONT, fontSize: Math.round(size * 0.24) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy }).setOrigin(0.5);
      }
      if (counting && at < 0) { t.setInteractive({ useHandCursor: true }); t.on('pointerdown', () => this.countOne(i, t)); }
    });
    if (counting) text(this, r.x + r.w / 2, r.y + r.h + 4 * ui, s.tapped.length ? `You have counted ${s.tapped.length}` : 'Tap each one to count it', T.small(this, THEME.ink2));
  }

  /** Tap a picture to count it: it gets the next number, said out loud. */
  countOne(i, t) {
    const s = this.state;
    if (s.picked !== null || s.tapped.includes(i) || i >= (this.round.pics || []).length) return;
    s.tapped.push(i);
    Sfx.pop();
    if (canSpeak()) speak(numberWord(s.tapped.length), { rate: this.speechRate });
    if (t && t.active) pulse(this, t, 1.25);
    this.time.delayedCall(180, () => { if (this.state === s) this.rebuild(); });
  }

  drawStall(r) {
    const s = this.state, ui = this.ui, g = this.add.graphics();
    // Striped awning, then the basket with a mango per right answer.
    const stripes = 10, sw = r.w / stripes;
    for (let i = 0; i < stripes; i++) { g.fillStyle(i % 2 ? STALL_STRIPE : STALL, 1); g.fillRect(r.x + i * sw, r.y, sw + 1, r.h * 0.32); }
    for (let i = 0; i < stripes; i++) { g.fillStyle(i % 2 ? STALL_STRIPE : STALL, 1); g.fillTriangle(r.x + i * sw, r.y + r.h * 0.32, r.x + (i + 1) * sw, r.y + r.h * 0.32, r.x + (i + 0.5) * sw, r.y + r.h * 0.46); }
    const bw = Math.min(r.w * 0.7, 360 * ui), bh = r.h * 0.42, bx = r.x + r.w / 2 - bw / 2, by = r.y + r.h - bh;
    g.fillStyle(BASKET_DARK, 1); g.fillRoundedRect(bx, by, bw, bh, { tl: 4, tr: 4, bl: 14, br: 14 });
    g.fillStyle(BASKET, 1); g.fillRoundedRect(bx + 3, by + 3, bw - 6, bh - 8, { tl: 3, tr: 3, bl: 12, br: 12 });
    g.lineStyle(2, BASKET_DARK, 0.6);
    for (let i = 1; i < 6; i++) g.lineBetween(bx + (bw * i) / 6, by + 4, bx + (bw * i) / 6, by + bh - 6);
    const justRight = s.picked !== null && s.right;
    const shown = s.correct - (justRight ? 1 : 0);
    const step = Math.min(30 * ui, (bw - 20) / ROUNDS);
    for (let i = 0; i < ROUNDS; i++) {
      const x = bx + 14 + step * (i + 0.5), y = by + 2;
      if (i < shown) this.add.text(x, y, '🥭', { fontSize: Math.round(step * 0.9) + 'px' }).setOrigin(0.5);
      else { g.fillStyle(0xffffff, 0.25); g.fillCircle(x, y + 2, step * 0.22); }
    }
    if (justRight) {
      const x = bx + 14 + step * (s.correct - 0.5);
      const m = this.add.text(x, r.y - 10, '🥭', { fontSize: Math.round(step * 0.9) + 'px' }).setOrigin(0.5);
      this.tweens.add({ targets: m, y: by + 2, duration: 450, ease: 'Bounce.Out' });
    }
  }

  pick(i) {
    const s = this.state, q = this.round;
    if (s.locked) return;
    const right = q.choices[i] === q.answer;
    // The first miss gets a second try; the explanation waits for a second miss.
    if (!right && this.secondChance(q, i)) { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.rebuild(); return; }
    const second = this.onSecondTry(q);
    s.locked = true; s.picked = i;
    s.right = right;
    if (!second) this.logQuestion(q, right);
    if (right) { s.correct += 1; this.noteRight(q); this.correctFeedback(); }
    else { if (!second) s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) this.time.delayedCall(900, () => this.next());
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null; s.right = null; s.tapped = [];
    this.rebuild();
  }
}


