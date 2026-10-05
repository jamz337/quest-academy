import { MinigameScene } from '../MinigameScene.js';
import { hex } from '../../../ui/theme.js';
import { generateRounds, orderRounds } from '../../../generators/bible/quiz.js';
import { tuningFor } from '../../../data/grades.js';
import { grid } from '../../../systems/Layout.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { readingDifficulty } from '../../../generators/boss.js';
import { draggable, nearestTarget } from '../../../ui/Drag.js';
import { VILLAGE, drawBackdrop, drawVillage, glassPanel, answerCard, SegmentBar, statsBar, villageLessonTheme, bindLetterKeys } from './VillageScenery.js';

const KIND = { 'bible-quiz': 'quiz', 'bible-verse': 'verse' };
const LETTERS = 'ABCD';

/**
 * Bible Quiz and Verse Builder, "Bible Village" style: 10 timed questions under a night-time village street where
 * each right answer lights a window. The reference and an explanation follow each answer. Bible Quiz mixes in
 * "put the story in order" rounds, answered by dragging the events into order (or tapping two to swap). Answers can also be picked with
 * the A-D (or 1-4) keys.
 */
export class BibleQuiz extends MinigameScene {
  constructor() { super('MG_BibleQuiz'); }

  initState() {
    const tune = tuningFor(this.payload);
    const kind = KIND[this.payload.gameId] || 'quiz';
    const grade = this.payload.grade;
    let questions = this.rampedRounds((k) => generateRounds(grade, this.rng, k, kind), tune.questions, readingDifficulty, () => generateRounds(grade, this.rng, 12, kind));
    if (kind === 'quiz' && !this.payload.early) {
      // Two ordering rounds replace two questions, at positions 3 and 7 so they break up the multiple choice.
      const orders = orderRounds(grade, this.rng, 2);
      if (questions.length > 7 && orders.length === 2) { questions[3] = orders[0]; questions[7] = orders[1]; }
    }
    return {
      questions, idx: 0, correct: 0, streak: 0, locked: false, picked: null, right: null, arrangement: null, swapPick: null,
      qStart: Date.now(), timeLimit: tune.questionTimeMs + 6000, parTimeMs: tune.parTimeMs + 30000, missed: {}   // reading time
    };
  }

  create(data) {
    super.create(data);
    bindLetterKeys(this, (i) => this.onKey(i));
  }

  /** A-D or 1-4 picks an answer on a keyboard. */
  onKey(i) {
    const s = this.state;
    if (!s || this.finished || this.inReview || s.locked || s.intro) return;
    const q = s.questions[s.idx];
    if (q && q.kind !== 'order' && i < q.choices.length) this.pick(i);
  }

  get lessonTheme() { return villageLessonTheme; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.questions.length)} / ${this.state.questions.length}`; }
  progressRatio() { return this.state.idx / this.state.questions.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const q = s.questions[s.idx];
    if (!q) return;
    const f = ui * Math.min(1, Math.max(0.72, area.h / (640 * ui)));
    const wide = area.w / ui >= 600;
    const order = q.kind === 'order';
    drawBackdrop(this, area);

    // The village street; a window lights up for each right answer.
    const bannerH = this.portrait ? Math.min(area.h * 0.22, 170 * f) : Math.min(area.h * 0.32, 240 * f);
    const justRight = s.picked !== null && s.right;
    const { windows } = drawVillage(this, { x: area.x, y: area.y, w: area.w, h: bannerH }, f, s.correct - (justRight ? 1 : 0));
    const lit = windows[s.correct - 1];
    if (justRight && lit && this.tweens) {
      const win = this.add.rectangle(lit.x, lit.y, lit.ww, lit.wh, VILLAGE.window, 1);
      const halo = this.add.circle(lit.x, lit.y, lit.wh, VILLAGE.window, 0.5);
      win.setScale(0); this.tweens.add({ targets: win, scale: 1, duration: 380, ease: 'Back.Out' });
      this.tweens.add({ targets: halo, scale: 2.4, alpha: 0, duration: 700, onComplete: () => halo.destroy() });
    }

    // Stats along the bottom, the question panel overlapping the banner, and the answers between them.
    const statsH = 40 * f, statsY = area.y + area.h - statsH;
    const px = area.x + (wide ? 40 * f : 6 * f), pw = area.w - (px - area.x) * 2, cx = area.x + area.w / 2;
    const top = area.y + bannerH - 22 * f;
    const promptH = order ? 128 * f : q.prompt.length > 90 ? 196 * f : q.prompt.length > 50 ? 170 * f : 150 * f;
    const panel = glassPanel(this, px, top, pw, promptH, f);
    const timerH = Number.isFinite(s.timeLimit) ? 34 * f : 0;
    let question = null;
    for (const size of order ? [22, 19, 17] : [30, 26, 22, 19, 17]) {
      if (question) question.destroy();
      const style = { fontFamily: FONT, fontSize: Math.round(size * f) + 'px', color: hex(VILLAGE.question), fontStyle: WEIGHT.heavy, align: 'center' };
      question = readable(this, cx, top + (promptH - timerH - (s.picked !== null && q.ref ? 20 * f : 0)) / 2, q.prompt, style, { width: pw - 100 * f });
      if ((question.height || 0) <= promptH - timerH - 36 * f) break;
    }
    speakButton(this, px + pw - 30 * f, top + 30 * f, 40 * f, question, { rate: this.speechRate });
    this.autoRead(question, s.picked === null && !order ? q.choices : null);
    if (s.picked !== null && q.ref) {
      this.add.text(cx, top + promptH - timerH - 16 * f, q.ref, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.glowSoft), fontStyle: WEIGHT.bold }).setOrigin(0.5);
    }
    this.timerBar = new SegmentBar(this, px + 24 * f, top + promptH - 24 * f, pw - 48 * f, 10 * f, { f, segments: wide ? 16 : 10 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);
    enter(this, panel, { from: 'up', distance: 12 });

    const choicesTop = top + promptH + 18 * f;
    const room = { x: px, y: choicesTop, w: pw, h: statsY - 14 * f - choicesTop };
    if (order) this.buildOrder(room, q, f); else this.buildChoices(room, q, f, wide);

    const coins = (this.profile && this.profile.coins) || 0;
    statsBar(this, cx, statsY, Math.min(area.w - 16 * f, 540 * f), statsH, [`🔥 Streak: ${s.streak}`, `⭐ ${s.correct} / ${s.questions.length}`, `💰 ${coins}`], f);
    if (s.picked !== null && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  buildChoices(room, q, f, wide) {
    const s = this.state, gap = 14 * f;
    const cols = wide ? Math.min(4, q.choices.length) : 2, rows = Math.ceil(q.choices.length / cols);
    const h = Math.min(rows === 1 ? 124 * f : 104 * f, (room.h - gap * (rows - 1)) / rows);
    const cells = grid({ x: room.x, y: room.y, w: room.w, h: h * rows + gap * (rows - 1) }, cols, rows, gap);
    const reveal = s.picked !== null && (s.right || this.answerRevealed(q));   // hidden while the child works it out
    this.choiceButtons = q.choices.map((choice, i) => {
      const c = cells[i];
      let state = 'idle';
      if (s.picked !== null) {
        if (choice === q.answer && reveal) state = 'right';
        else if (i === s.picked) state = 'wrong';
        else if (reveal) state = 'dim';
      }
      const card = answerCard(this, c.x, c.y, c.w, c.h, choice, { state, letter: LETTERS[i], f, onTap: s.locked ? null : () => this.pick(i) });
      this.answerSpeaker(card, c.w, c.h, choice);
      if (state === 'right' && s.right) this.add.text(c.x, c.y + c.h / 2 + 14 * f, 'Correct!', { fontFamily: FONT, fontSize: Math.round(17 * f) + 'px', color: hex(VILLAGE.ok), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
      return card;
    });
    enter(this, this.choiceButtons, { from: 'up', delay: 60, stagger: 40 });
  }

  /**
   * Ordering: the events as a numbered column of cards. Drag a card up or down to move it (the others make room), or
   * tap one card and then another to swap them; "Check the order" answers. Afterwards each card shows if its place
   * was right.
   */
  buildOrder(room, q, f) {
    const s = this.state, gap = 10 * f, n = q.shuffled.length;
    if (!s.arrangement || s.arrangement.length !== n) s.arrangement = q.shuffled.map((_, i) => i);
    const done = s.picked !== null;
    const btnH = done ? 0 : 54 * f, hintH = done ? 0 : 22 * f;
    if (!done) this.add.text(room.x + room.w / 2, room.y + 8 * f, 'Drag the cards into the right order, then check', { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.glowSoft), fontStyle: WEIGHT.bold }).setOrigin(0.5);
    const top = room.y + hintH;
    const h = Math.max(44 * f, Math.min(64 * f, (room.h - hintH - btnH - 10 * f - gap * (n - 1)) / n));
    const cells = grid({ x: room.x, y: top, w: room.w, h: h * n + gap * (n - 1) }, 1, n, gap);
    const targets = cells.map((c) => ({ x: c.x, y: c.y }));
    const hover = this.add.graphics().setDepth(900);
    const showHover = (x, y) => {
      hover.clear();
      const to = nearestTarget(targets, cells[0].x, y, h * 1.2);
      if (to < 0) return;
      hover.lineStyle(3 * f, VILLAGE.glowSoft, 0.9); hover.strokeRoundedRect(cells[to].x - cells[to].w / 2 - 4, cells[to].y - h / 2 - 4, cells[to].w + 8, h + 8, 16 * f);
    };
    const made = s.arrangement.map((si, pos) => {
      const c = cells[pos], step = q.shuffled[si];
      let state = 'idle';
      if (done) state = step === q.steps[pos] ? 'right' : 'wrong';
      else if (s.swapPick === pos) state = 'chosen';
      const card = answerCard(this, c.x, c.y, c.w, h, step, { state, letter: String(pos + 1), f });
      this.answerSpeaker(card, c.w, h, step);
      if (!done && !s.locked) draggable(this, card, {
        onTap: () => this.tapOrder(pos), onMove: showHover, onCancel: () => hover.clear(),
        onDrop: (x, y) => { hover.clear(); const to = nearestTarget(targets, cells[0].x, y, h * 1.2); if (to < 0 || to === pos) return false; this.moveOrder(pos, to); return true; }
      });
      return card;
    });
    if (s.lastMoved === undefined || s.lastMoved === null) enter(this, made, { from: 'up', delay: 60, stagger: 30 });
    s.lastMoved = null;
    if (!done) button(this, room.x + room.w / 2, top + h * n + gap * (n - 1) + 14 * f + btnH / 2, Math.min(280 * f, room.w * 0.7), btnH - 6 * f, 'Check the order ✓', { variant: 'go', fontSize: 18 * (f / this.ui), onClick: () => this.submitOrder() });
  }

  /** Drag-and-drop: the card at `from` moves to `to`, the cards between shift along. */
  moveOrder(from, to) {
    const s = this.state;
    if (s.locked || !s.arrangement) return;
    const [card] = s.arrangement.splice(from, 1);
    s.arrangement.splice(to, 0, card);
    s.swapPick = null; s.lastMoved = to;
    Sfx.pop();
    this.rebuild();
  }

  /** Tap-to-swap: the first tap picks a card, the second swaps it with the one tapped (tapping it again lets go). */
  tapOrder(pos) {
    const s = this.state;
    if (s.locked || !s.arrangement) return;
    Sfx.click();
    if (s.swapPick === null || s.swapPick === undefined) { s.swapPick = pos; s.lastMoved = pos; return this.rebuild(); }
    if (s.swapPick !== pos) { const a = s.swapPick; [s.arrangement[a], s.arrangement[pos]] = [s.arrangement[pos], s.arrangement[a]]; }
    s.swapPick = null; s.lastMoved = pos;
    this.rebuild();
  }

  submitOrder() {
    const s = this.state, q = s.questions[s.idx];
    if (s.locked || !q || q.kind !== 'order' || !s.arrangement) return;
    const right = s.arrangement.every((si, pos) => q.shuffled[si] === q.steps[pos]);
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
    // The first miss gets a second try (not when the clock ran out); the explanation waits for a second miss.
    if (!right && picked >= 0 && this.secondChance(q)) { s.streak = 0; s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; if ('qStart' in s) s.qStart = Date.now(); this.rebuild(); return; }
    const second = this.onSecondTry(q);
    s.locked = true; s.picked = picked; s.right = right;
    s.streak = right ? s.streak + 1 : 0;
    if (!second) this.logQuestion(q, right);
    if (right) this.noteRight(q);
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { if (!second) s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
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
    s.locked = false; s.picked = null; s.right = null; s.arrangement = null; s.swapPick = null; s.qStart = Date.now();
    this.rebuild();
  }

  onResumed() { this.state.qStart = Date.now() - Math.min(Date.now() - this.state.qStart, this.state.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || !Number.isFinite(s.timeLimit) || !this.timerBar || !this.timerBar.active) return;
    const ratio = 1 - (Date.now() - s.qStart) / s.timeLimit;
    this.timerBar.set(ratio);
    if (ratio <= 0) this.timeUp();
  }
}
