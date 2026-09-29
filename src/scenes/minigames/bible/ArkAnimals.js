import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { bossQuestions, readingDifficulty } from '../../../generators/boss.js';
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
import { fireworks } from '../../../ui/Fireworks.js';

const ROUNDS = 8;
const ANIMALS = ['🦁', '🐘', '🦒', '🐒', '🐑', '🐄', '🦓', '🐰', '🦉', '🐢', '🐧', '🦘', '🐷', '🦊'];
const RAINBOW = [0xff5c6c, 0xff8f3f, 0xffc531, 0x2ec46a, 0x3d8bff, 0x7c5cff, 0xff6fae];
const HULL = 0xa06a3c, HULL_DARK = 0x7a4a2a, CABIN = 0xc98c55, ROOF = 0xb5443c;

/**
 * All Aboard the Ark: every right answer sends the next pair of animals up the ramp into the ark.
 * A wrong answer brings a rain cloud and the explanation. When the last question is answered the rain
 * falls, the ark floats and a rainbow appears. Questions mix stories, verses and people from the Bible banks.
 */
export class ArkAnimals extends MinigameScene {
  constructor() { super('MG_ArkAnimals'); }

  initState() {
    const tune = tuningFor(this.payload);
    const grade = this.payload.grade;
    const questions = this.rampedRounds((k) => bossQuestions('bible', grade, this.rng, k), ROUNDS, readingDifficulty, () => bossQuestions('bible', grade, this.rng, 10));
    return {
      questions, animals: this.rng.shuffle(ANIMALS).slice(0, ROUNDS), idx: 0, correct: 0, boarded: 0, locked: false, picked: null, right: null, missed: {}, finale: false,
      qStart: Date.now(), timeLimit: tune.questionTimeMs + 6000, parTimeMs: tune.parTimeMs + 30000
    };
  }

  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return this.state.finale ? 'finale' : this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    if (s.finale) return this.buildFinale(area);
    const q = s.questions[s.idx];
    if (!q) return;
    const cx = area.x + area.w / 2;
    const promptH = Math.min(area.h * 0.3, 170 * ui);
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const size = q.prompt.length > 90 ? 15 : q.prompt.length > 50 ? 17 : 21;
    const question = readable(this, cx, area.y + promptH / 2 - 8 * ui, q.prompt, T.at(this, size, THEME.ink, { fontStyle: '700' }), { width: area.w - 64 * ui });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, question, { rate: this.speechRate });
    this.autoRead(question, s.picked === null ? q.choices : null);
    if (s.picked !== null && q.ref) text(this, cx, area.y + promptH - 30 * ui, q.ref, T.small(this, this.subject.dark));
    this.timerBar = new ProgressBar(this, cx, area.y + promptH - 13 * ui, area.w - 48, 7 * ui, { color: THEME.success, value: 1 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);
    enter(this, prompt, { from: 'up', distance: 12 });

    const sceneH = Math.min(area.h * 0.3, 190 * ui);
    const sceneRect = { x: area.x, y: area.y + promptH + 8, w: area.w, h: sceneH };
    this.drawScene(sceneRect, s.picked !== null && !s.right);

    const top = sceneRect.y + sceneH + 10;
    const rows = Math.ceil(q.choices.length / 2);
    const cells = grid({ x: area.x, y: top, w: area.w, h: Math.min(area.y + area.h - top, rows * 72 * ui + 10) }, 2, rows, 10);
    const made = q.choices.map((choice, i) => {
      const c = cells[i];
      const opts = { variant: 'secondary', fontSize: choice.length > 14 ? 15 : 19, radius: THEME.radius.lg, wrap: true, onClick: () => this.pick(i) };
      if (s.picked !== null) { if (choice === q.answer) opts.variant = 'success'; else if (i === s.picked) opts.variant = 'danger'; }
      const bh = Math.max(52 * ui, Math.min(c.h, 84 * ui));
      const b = button(this, c.x, c.y, c.w, bh, choice, opts);
      this.answerSpeaker(b, c.w, bh, choice);
      if (s.picked !== null && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'up', delay: 60, stagger: 40 });
    if (s.picked !== null && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  /** Sky, hills, the ark with its ramp, the animals waiting in line and the ones already on deck. */
  drawScene(r, rain = false, finale = false) {
    const s = this.state, ui = this.ui, g = this.add.graphics();
    g.fillStyle(rain ? 0xc9d6e2 : 0xcfeaff, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 18);
    if (!rain) { g.fillStyle(0xffe08a, 1); g.fillCircle(r.x + 40 * ui, r.y + 34 * ui, 18 * ui); }
    g.fillStyle(0xffffff, rain ? 0.6 : 0.95);
    g.fillEllipse(r.x + r.w * 0.35, r.y + 30 * ui, 70 * ui, 22 * ui); g.fillEllipse(r.x + r.w * 0.3, r.y + 36 * ui, 46 * ui, 18 * ui);
    const groundY = r.y + r.h - 26 * ui;
    g.fillStyle(0x8fd48a, 1); g.fillEllipse(r.x + r.w * 0.25, groundY + 14 * ui, r.w * 0.8, 56 * ui);
    g.fillStyle(0x5cc45a, 1); g.fillRoundedRect(r.x, groundY, r.w, r.h - (groundY - r.y), 18);
    if (finale) { g.fillStyle(0x4aa8ff, 0.9); g.fillRoundedRect(r.x, groundY - 6 * ui, r.w, r.h - (groundY - r.y) + 6 * ui, 18); }

    // The ark lives in a container so the finale can rock it on the waves.
    const ark = this.add.container(0, 0);
    const ag = this.add.graphics();
    const ax = r.x + r.w * 0.56, aw = r.w * 0.4, ah = Math.min(r.h * 0.34, 64 * ui), ay = groundY - ah + 6 * ui;
    ag.fillStyle(THEME.ink, 0.12); ag.fillEllipse(ax + aw / 2, groundY + 8 * ui, aw * 1.05, 14 * ui);
    ag.fillStyle(HULL, 1); ag.fillPoints([{ x: ax, y: ay }, { x: ax + aw, y: ay }, { x: ax + aw * 0.86, y: ay + ah }, { x: ax + aw * 0.14, y: ay + ah }], true);
    ag.lineStyle(2, HULL_DARK, 0.8);
    for (let i = 1; i < 4; i++) { const yy = ay + (ah * i) / 4, inset = (aw * 0.14 * i) / 4; ag.lineBetween(ax + inset, yy, ax + aw - inset, yy); }
    const cw = aw * 0.62, chh = Math.min(r.h * 0.22, 44 * ui), cxx = ax + (aw - cw) / 2, cy = ay - chh + 2;
    ag.fillStyle(CABIN, 1); ag.fillRect(cxx, cy, cw, chh);
    ag.fillStyle(ROOF, 1); ag.fillRect(cxx - 6 * ui, cy - 10 * ui, cw + 12 * ui, 12 * ui);
    ag.fillStyle(HULL_DARK, 1); ag.fillRoundedRect(cxx + 6 * ui, cy + chh - 24 * ui, 16 * ui, 24 * ui, 4);   // the door
    ag.fillStyle(0xdff1ff, 1); ag.fillCircle(cxx + cw - 16 * ui, cy + chh / 2, 6 * ui);
    ag.lineStyle(2, HULL_DARK, 1); ag.strokeCircle(cxx + cw - 16 * ui, cy + chh / 2, 6 * ui);
    ark.add(ag);
    // Animals already aboard peek over the rail.
    const deckY = cy - 4 * ui;
    s.animals.slice(Math.max(0, s.boarded - 5), s.boarded).forEach((a, i, arr) => {
      const t = this.add.text(cxx + 8 * ui + i * ((cw - 16 * ui) / Math.max(1, arr.length)), deckY - 14 * ui, a, { fontSize: Math.round(16 * ui) + 'px' }).setOrigin(0, 0.5);
      ark.add(t);
    });
    this.ark = ark;
    this.door = { x: cxx + 14 * ui, y: cy + chh - 10 * ui };
    // Ramp from the ground up to the door.
    if (!finale) {
      const rg = this.add.graphics();
      const rampBase = { x: ax - 10 * ui, y: groundY + 2 };
      rg.fillStyle(0xc98c55, 1); rg.fillPoints([{ x: rampBase.x - 6 * ui, y: rampBase.y }, { x: rampBase.x + 10 * ui, y: rampBase.y }, { x: this.door.x + 8 * ui, y: this.door.y + 4 * ui }, { x: this.door.x - 6 * ui, y: this.door.y + 4 * ui }], true);
      rg.lineStyle(2, HULL_DARK, 0.7); for (let i = 1; i < 5; i++) { const t = i / 5; rg.lineBetween(rampBase.x - 4 * ui + (this.door.x - 4 * ui - rampBase.x) * t, rampBase.y + (this.door.y - rampBase.y) * t, rampBase.x + 8 * ui + (this.door.x + 6 * ui - rampBase.x - 8 * ui) * t, rampBase.y + (this.door.y - rampBase.y) * t); }
      this.rampBase = rampBase;
    }
    // The queue: the next pair at the foot of the ramp, a couple more waiting behind.
    this.frontPair = null;
    if (!finale) {
      const spacing = Math.min(64 * ui, r.w * 0.16);
      s.animals.slice(s.boarded, s.boarded + 3).forEach((a, i) => {
        const px = this.rampBase.x - 30 * ui - i * spacing, py = groundY - 8 * ui;
        const c = this.add.container(px, py);
        const size = Math.round((i === 0 ? 24 : 20) * ui) + 'px';
        c.add([this.add.text(-10 * ui, 0, a, { fontSize: size }).setOrigin(0.5), this.add.text(10 * ui, 4 * ui, a, { fontSize: size }).setOrigin(0.5)]);
        if (i > 0) c.setAlpha(0.75 - i * 0.2);
        if (i === 0) this.frontPair = c;
      });
    }
    if (rain) {
      g.fillStyle(0x8a94a6, 1); g.fillEllipse(r.x + r.w * 0.3, r.y + 34 * ui, 90 * ui, 30 * ui); g.fillEllipse(r.x + r.w * 0.24, r.y + 40 * ui, 50 * ui, 24 * ui);
      g.lineStyle(2, 0x4aa8ff, 0.9);
      for (let i = 0; i < 7; i++) g.lineBetween(r.x + r.w * 0.2 + i * 12 * ui, r.y + 52 * ui, r.x + r.w * 0.2 + i * 12 * ui - 4, r.y + 68 * ui);
    }
    text(this, r.x + r.w - 12, r.y + 14 * ui, `🐾 ${s.boarded * 2} of ${ROUNDS * 2} aboard`, T.small(this, THEME.ink2)).setOrigin(1, 0.5);
  }

  /** The end: rain, waves, the ark afloat, then a rainbow. */
  buildFinale(area) {
    const s = this.state, ui = this.ui;
    const rect = { x: area.x, y: area.y + 10, w: area.w, h: Math.min(area.h - 90 * ui, 360 * ui) };
    this.drawScene(rect, false, true);
    if (this.ark) this.tweens.add({ targets: this.ark, y: -6 * ui, angle: 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (this.add.particles && this.textures.exists('px')) {
      const em = this.add.particles(rect.x + rect.w / 2, rect.y + 4, 'px', {
        x: { min: -rect.w / 2 + 10, max: rect.w / 2 - 10 }, speedY: { min: 260, max: 420 }, speedX: -20, scale: { start: 1.6 * ui, end: 1.2 * ui }, scaleX: 0.6,
        alpha: { start: 0.8, end: 0.2 }, lifespan: 700, tint: 0x4aa8ff, frequency: 24, quantity: 3
      }).setDepth(2);
      this.time.delayedCall(1500, () => { if (em.active) em.stop(); });
      this.time.delayedCall(2400, () => { if (em.active) em.destroy(); });
    }
    const bow = this.add.graphics().setAlpha(0).setDepth(1);
    const bx = rect.x + rect.w * 0.42, by = rect.y + rect.h * 0.62, br = Math.min(rect.w * 0.42, rect.h * 0.55);
    RAINBOW.forEach((col, i) => { bow.lineStyle(7 * ui, col, 0.85); bow.beginPath(); bow.arc(bx, by, br - i * 7 * ui, Math.PI, Math.PI * 2, false); bow.strokePath(); });
    this.tweens.add({ targets: bow, alpha: 1, delay: 1500, duration: 900 });
    const msg = text(this, area.x + area.w / 2, rect.y + rect.h + 30 * ui, `All aboard! ${s.correct} of ${ROUNDS} right.\nThe rain came, and then the rainbow.`, { ...T.bodyBold(this), wordWrap: { width: area.w - 24 } });
    enter(this, msg, { from: 'up', delay: 1700 });
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
    const idx = s.idx;
    if (right) {
      s.correct += 1; this.correctFeedback();
      this.rebuild();
      const pair = this.frontPair;
      if (pair && pair.active && this.door) {
        this.tweens.add({ targets: pair, x: this.door.x, y: this.door.y - 6 * this.ui, duration: 900, ease: 'Sine.InOut' });
        this.tweens.add({ targets: pair, scale: 0.7, duration: 900, ease: 'Sine.In' });
        this.tweens.add({ targets: pair, alpha: 0, delay: 820, duration: 200 });
        this.time.delayedCall(880, () => Sfx.unlock());
      }
      this.time.delayedCall(1250, () => { if (s.idx === idx && s.locked) { s.boarded += 1; this.next(); } });
      return;
    }
    s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.wrongFeedback();
    this.cameras.main.shake(180, 0.006);
    this.rebuild();
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
      s.finale = true;
      this.rebuild();
      Sfx.fanfare();
      this.time.delayedCall(1800, () => fireworks(this, this.w / 2, this.h * 0.3, { bursts: 3, spread: this.w * 0.3 }));
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      this.time.delayedCall(3200, () => this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: s.parTimeMs, missedSkills, delay: 0 }));
      return;
    }
    s.locked = false; s.picked = null; s.right = null; s.qStart = Date.now();
    this.rebuild();
  }

  onResumed() { this.state.qStart = Date.now() - Math.min(Date.now() - this.state.qStart, this.state.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.finale || s.locked || this.inReview || !Number.isFinite(s.timeLimit) || !this.timerBar || !this.timerBar.active) return;
    const ratio = 1 - (Date.now() - s.qStart) / s.timeLimit;
    this.timerBar.set(ratio, ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    if (ratio <= 0) this.timeUp();
  }
}
