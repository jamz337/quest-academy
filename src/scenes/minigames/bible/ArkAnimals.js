import { MinigameScene } from '../MinigameScene.js';
import { hex } from '../../../ui/theme.js';
import { bossQuestions, readingDifficulty } from '../../../generators/boss.js';
import { tuningFor } from '../../../data/grades.js';
import { grid } from '../../../systems/Layout.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { fireworks } from '../../../ui/Fireworks.js';
import { VILLAGE, drawBackdrop, drawVillage, glassPanel, answerCard, SegmentBar, statsBar, villageLessonTheme, bindLetterKeys } from './VillageScenery.js';

const ROUNDS = 8;
const ANIMALS = ['🦁', '🐘', '🦒', '🐒', '🐑', '🐄', '🦓', '🐰', '🦉', '🐢', '🐧', '🦘', '🐷', '🦊'];
const RAINBOW = [0xff5c6c, 0xff8f3f, 0xffc531, 0x2ec46a, 0x3d8bff, 0x7c5cff, 0xff6fae];
const HULL = 0x5b3f28, HULL_DARK = 0x3d2a1a, CABIN = 0x6e4b30, ROOF = 0x4a3322, TRIM = 0xffc86b;
const LETTERS = 'ABCD';

/**
 * All Aboard the Ark, in the Bible Village look: the ark is docked at the end of the night-time village street, and
 * every right answer sends the next pair of animals up the lamp-lit ramp (a cabin window lights for each pair aboard).
 * A wrong answer brings a rain cloud and the explanation. When the last question is answered the flood rises, the
 * ark floats and a rainbow appears. Questions mix stories, verses and people from the Bible banks; A-D picks on a keyboard.
 */
export class ArkAnimals extends MinigameScene {
  constructor() { super('MG_ArkAnimals'); }

  initState() {
    const tune = tuningFor(this.payload);
    const grade = this.payload.grade;
    const questions = this.rampedRounds((k) => bossQuestions('bible', grade, this.rng, k), ROUNDS, readingDifficulty, () => bossQuestions('bible', grade, this.rng, 10));
    return {
      questions, animals: this.rng.shuffle(ANIMALS).slice(0, ROUNDS), idx: 0, correct: 0, streak: 0, boarded: 0, locked: false, picked: null, right: null, missed: {}, finale: false,
      qStart: Date.now(), timeLimit: tune.questionTimeMs + 6000, parTimeMs: tune.parTimeMs + 30000
    };
  }

  create(data) {
    super.create(data);
    bindLetterKeys(this, (i) => {
      const s = this.state;
      if (!s || this.finished || this.inReview || s.finale || s.locked || s.intro) return;
      const q = s.questions[s.idx];
      if (q && i < q.choices.length) this.pick(i);
    });
  }

  get lessonTheme() { return villageLessonTheme; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return this.state.finale ? 'finale' : this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const f = ui * Math.min(1, Math.max(0.72, area.h / (680 * ui)));
    drawBackdrop(this, area);
    if (s.finale) return this.buildFinale(area, f);
    const q = s.questions[s.idx];
    if (!q) return;
    const wide = area.w / ui >= 600;
    const px = area.x + (wide ? 40 * f : 6 * f), pw = area.w - (px - area.x) * 2, cx = area.x + area.w / 2;

    // The question on dark glass, with the timer's segments along its top.
    const top = area.y + 8 * f;
    const panelH = q.prompt.length > 80 ? 150 * f : 124 * f;
    const panel = glassPanel(this, px, top, pw, panelH, f);
    const timed = Number.isFinite(s.timeLimit);
    const barW = wide ? pw * 0.56 : pw - 48 * f;
    this.timerBar = new SegmentBar(this, cx - barW / 2, top + 16 * f, barW, 10 * f, { f, segments: wide ? 12 : 8 });
    if (!timed) this.timerBar.setVisible(false);
    const refH = s.picked !== null && q.ref ? 20 * f : 0;
    const qTop = top + (timed ? 34 * f : 12 * f), qH = panelH - (qTop - top) - 10 * f - refH;
    let question = null;
    for (const size of [26, 23, 20, 18, 16]) {
      if (question) question.destroy();
      const style = { fontFamily: FONT, fontSize: Math.round(size * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy, align: 'center' };
      question = readable(this, cx, qTop + qH / 2, q.prompt, style, { width: pw - 110 * f });
      if ((question.height || 0) <= qH) break;
    }
    speakButton(this, px + pw - 32 * f, top + panelH / 2 + 6 * f, 42 * f, question, { rate: this.speechRate });
    this.autoRead(question, s.picked === null ? q.choices : null);
    if (refH) this.add.text(cx, top + panelH - 18 * f, q.ref, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.glowSoft), fontStyle: WEIGHT.bold }).setOrigin(0.5);
    enter(this, panel, { from: 'up', distance: 12 });

    // The street and the ark, then the answers and the stats.
    const statsH = 40 * f, statsY = area.y + area.h - statsH;
    const rows = Math.ceil(q.choices.length / 2), cardH = 74 * f, gap = 12 * f;
    const answersH = rows * cardH + (rows - 1) * gap;
    const sy = top + panelH + 12 * f;
    const sh = Math.max(110 * f, Math.min(area.h * 0.36, 270 * f, statsY - 16 * f - answersH - 14 * f - sy));
    this.drawScene({ x: px, y: sy, w: pw, h: sh }, f, s.picked !== null && !s.right);

    const aTop = sy + sh + 14 * f;
    const h = Math.min(100 * f, (statsY - 16 * f - aTop - gap * (rows - 1)) / rows);   // grow into any spare room
    const cells = grid({ x: px, y: aTop, w: pw, h: h * rows + gap * (rows - 1) }, 2, rows, gap);
    const reveal = s.picked !== null && (s.right || this.answerRevealed(q));   // hidden while the child works it out
    const made = q.choices.map((choice, i) => {
      const c = cells[i];
      let state = 'idle';
      if (s.picked !== null) {
        if (choice === q.answer && reveal) state = 'right';
        else if (i === s.picked) state = 'wrong';
        else if (reveal) state = 'dim';
      }
      const card = answerCard(this, c.x, c.y, c.w, c.h, choice, { state, letter: LETTERS[i], f, onTap: s.locked || this.struckChoice() === i ? null : () => this.pick(i) });
      if (this.struckChoice() === i && s.picked === null) card.setAlpha(0.35);   // ruled out on the first try
      this.answerSpeaker(card, c.w, c.h, choice);
      return card;
    });
    enter(this, made, { from: 'up', delay: 60, stagger: 40 });

    const coins = (this.profile && this.profile.coins) || 0;
    statsBar(this, cx, statsY, Math.min(area.w - 16 * f, 540 * f), statsH, [`🔥 Streak: ${s.streak}`, `⭐ ${s.correct} / ${ROUNDS}`, `💰 ${coins}`], f);
    if (s.picked !== null && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  /**
   * The village street (houses on the left only) with the ark docked on the right, its lamp-lit ramp, the animals
   * queueing on the road and the ones already aboard peeking over the rail. `rain` adds a storm cloud; `finale`
   * floods the street and leaves out the ramp and queue.
   */
  drawScene(r, f, rain = false, finale = false) {
    const s = this.state;
    drawVillage(this, r, f, 0, { sides: [-1] });
    const frame = this.add.graphics();
    frame.lineStyle(2, VILLAGE.panelEdge, 1); frame.strokeRoundedRect(r.x, r.y, r.w, r.h, 14);
    const groundY = r.y + r.h - 10 * f;
    if (finale) {
      const water = this.add.graphics();
      water.fillStyle(0x234f8a, 0.92); water.fillRect(r.x, groundY - r.h * 0.2, r.w, r.h * 0.2 + 10 * f);
      water.lineStyle(2 * f, 0x7fc0ff, 0.6);
      for (let i = 0; i < 3; i++) { const y = groundY - r.h * 0.16 + i * 9 * f; for (let x = r.x + 10; x < r.x + r.w - 20; x += 36 * f) water.lineBetween(x, y, x + 18 * f, y - 3 * f); }
    }

    // The ark lives in a container so the finale can rock it on the waves.
    const ark = this.add.container(0, 0);
    const ag = this.add.graphics();
    const aw = Math.min(r.w * 0.46, 420 * f, r.h * 1.8), ax = r.x + r.w - aw - 12 * f;   // keeps its shape in a short scene
    const ah = Math.min(r.h * 0.3, 72 * f), ay = groundY - ah - (finale ? r.h * 0.1 : 0);
    ag.fillStyle(0x000000, 0.3); ag.fillEllipse(ax + aw / 2, groundY + 2 * f, aw * 1.02, 12 * f);
    // Hull with an up-swept stern, planks, and the warm and cool trim lines of the mockup.
    const hull = [{ x: ax, y: ay }, { x: ax + aw * 0.94, y: ay - ah * 0.12 }, { x: ax + aw, y: ay - ah * 0.34 }, { x: ax + aw * 0.86, y: ay + ah }, { x: ax + aw * 0.12, y: ay + ah }];
    ag.fillStyle(HULL, 1); ag.fillPoints(hull, true);
    ag.lineStyle(2, HULL_DARK, 0.9);
    for (let i = 1; i < 4; i++) { const yy = ay + (ah * i) / 4, inset = (aw * 0.12 * i) / 4; ag.lineBetween(ax + inset, yy, ax + aw * 0.93 - inset * 0.6, yy); }
    ag.lineStyle(3 * f, TRIM, 0.9); ag.lineBetween(ax + 4 * f, ay + 6 * f, ax + aw * 0.94, ay - ah * 0.06);
    ag.lineStyle(2 * f, 0x9fd8ff, 0.45); ag.lineBetween(ax + aw * 0.1, ay + ah * 0.72, ax + aw * 0.88, ay + ah * 0.72);
    // Cabin: a window lights up for each pair aboard.
    const cw = aw * 0.6, chh = Math.min(r.h * 0.22, 50 * f), cxx = ax + aw * 0.16, cy = ay - chh + 2;
    ag.fillStyle(CABIN, 1); ag.fillRect(cxx, cy, cw, chh);
    ag.fillStyle(ROOF, 1); ag.fillRect(cxx - 6 * f, cy - 10 * f, cw + 12 * f, 12 * f);
    ag.lineStyle(2 * f, TRIM, 0.7); ag.lineBetween(cxx - 6 * f, cy - 10 * f, cxx + cw + 6 * f, cy - 10 * f);
    ag.fillStyle(0x2a1d15, 1); ag.fillRoundedRect(cxx + 6 * f, cy + chh - 26 * f, 18 * f, 26 * f, { tl: 6 * f, tr: 6 * f, bl: 0, br: 0 });   // the door
    const wins = 6, ww = Math.max(5 * f, (cw - 40 * f) / (wins * 1.8));
    for (let i = 0; i < wins; i++) {
      const on = i < s.boarded * wins / ROUNDS + (finale ? wins : 0);
      const wx = cxx + 32 * f + i * ((cw - 40 * f) / wins);
      if (on) { ag.fillStyle(TRIM, 0.2); ag.fillRoundedRect(wx - 3 * f, cy + chh * 0.25 - 3 * f, ww + 6 * f, chh * 0.35 + 6 * f, 3 * f); }
      ag.fillStyle(on ? TRIM : 0x1c1626, 1); ag.fillRoundedRect(wx, cy + chh * 0.25, ww, chh * 0.35, 2 * f);
    }
    ark.add(ag);
    // Animals already aboard peek over the rail.
    s.animals.slice(Math.max(0, s.boarded - 5), s.boarded).forEach((a, i, arr) => {
      ark.add(this.add.text(cxx + 8 * f + i * ((cw - 16 * f) / Math.max(1, arr.length)), cy - 22 * f, a, { fontSize: Math.round(16 * f) + 'px' }).setOrigin(0, 0.5));
    });
    this.ark = ark;
    this.door = { x: cxx + 15 * f, y: cy + chh - 12 * f };

    // Lamp-lit ramp from the road up to the door, and the queue of animals waiting on the road.
    this.frontPair = null;
    if (!finale) {
      const rg = this.add.graphics();
      const rampBase = { x: ax - 40 * f, y: groundY };
      const quad = [{ x: rampBase.x - 8 * f, y: rampBase.y }, { x: rampBase.x + 12 * f, y: rampBase.y }, { x: this.door.x + 9 * f, y: this.door.y + 12 * f }, { x: this.door.x - 7 * f, y: this.door.y + 12 * f }];
      rg.fillStyle(0x8a6240, 1); rg.fillPoints(quad, true);
      rg.lineStyle(2, HULL_DARK, 0.8);
      for (let i = 1; i < 6; i++) { const t = i / 6; rg.lineBetween(quad[0].x + (quad[3].x - quad[0].x) * t, quad[0].y + (quad[3].y - quad[0].y) * t, quad[1].x + (quad[2].x - quad[1].x) * t, quad[1].y + (quad[2].y - quad[1].y) * t); }
      rg.lineStyle(2 * f, TRIM, 0.8); rg.lineBetween(quad[0].x, quad[0].y, quad[3].x, quad[3].y); rg.lineBetween(quad[1].x, quad[1].y, quad[2].x, quad[2].y);
      this.rampBase = rampBase;
      const spacing = Math.min(64 * f, r.w * 0.14);
      s.animals.slice(s.boarded, s.boarded + 3).forEach((a, i) => {
        const c = this.add.container(rampBase.x - 30 * f - i * spacing, groundY - 12 * f);
        const size = Math.round((i === 0 ? 26 : 21) * f) + 'px';
        c.add([this.add.text(-11 * f, 0, a, { fontSize: size }).setOrigin(0.5), this.add.text(11 * f, 4 * f, a, { fontSize: size }).setOrigin(0.5)]);
        if (i > 0) c.setAlpha(0.8 - i * 0.2);
        if (i === 0) this.frontPair = c;
      });
    }
    if (rain) {
      const g = this.add.graphics();
      g.fillStyle(0x5a6378, 1); g.fillEllipse(r.x + r.w * 0.3, r.y + 30 * f, 110 * f, 34 * f); g.fillEllipse(r.x + r.w * 0.24, r.y + 38 * f, 60 * f, 26 * f); g.fillEllipse(r.x + r.w * 0.37, r.y + 38 * f, 70 * f, 26 * f);
      g.lineStyle(2 * f, 0x7fc0ff, 0.9);
      for (let i = 0; i < 9; i++) g.lineBetween(r.x + r.w * 0.2 + i * 12 * f, r.y + 54 * f, r.x + r.w * 0.2 + i * 12 * f - 5 * f, r.y + 72 * f);
    }

    // "Aboard" badge with a ring for the share of animals on the ark.
    const aboard = s.boarded * 2, total = ROUNDS * 2;
    const label = this.add.text(0, 0, `🐾 Aboard: ${aboard}/${total}`, { fontFamily: FONT, fontSize: Math.round(15 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy }).setOrigin(0, 0.5);
    const ringR = 13 * f, bw = (label.width || 120) + ringR * 2 + 36 * f, bh = 38 * f;
    const bx = r.x + r.w - bw - 10 * f, by = r.y + 10 * f;
    const b = this.add.graphics();
    b.fillStyle(VILLAGE.panelEdge, 1); b.fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 12 * f);
    b.fillStyle(VILLAGE.panel, 0.95); b.fillRoundedRect(bx, by, bw, bh, 11 * f);
    const rx = bx + bw - ringR - 10 * f, ry = by + bh / 2;
    b.lineStyle(4 * f, 0x3a4260, 1); b.strokeCircle(rx, ry, ringR);
    if (aboard > 0) { b.lineStyle(4 * f, VILLAGE.glowSoft, 1); b.beginPath(); b.arc(rx, ry, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * aboard) / total, false); b.strokePath(); }
    label.setPosition(bx + 12 * f, ry);
    if (this.children && typeof this.children.bringToTop === 'function') this.children.bringToTop(label);
  }

  /** The end: the flood rises, the ark floats, then a rainbow over the village. */
  buildFinale(area, f) {
    const s = this.state;
    const rect = { x: area.x + 6 * f, y: area.y + 10 * f, w: area.w - 12 * f, h: Math.min(area.h - 110 * f, 380 * f) };
    this.drawScene(rect, f, false, true);
    if (this.ark) this.tweens.add({ targets: this.ark, y: -6 * f, angle: 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (this.add.particles && this.textures.exists('px')) {
      const em = this.add.particles(rect.x + rect.w / 2, rect.y + 4, 'px', {
        x: { min: -rect.w / 2 + 10, max: rect.w / 2 - 10 }, speedY: { min: 260, max: 420 }, speedX: -20, scale: { start: 1.6 * f, end: 1.2 * f }, scaleX: 0.6,
        alpha: { start: 0.8, end: 0.2 }, lifespan: 700, tint: 0x7fc0ff, frequency: 24, quantity: 3
      }).setDepth(2);
      this.time.delayedCall(1500, () => { if (em.active) em.stop(); });
      this.time.delayedCall(2400, () => { if (em.active) em.destroy(); });
    }
    const bow = this.add.graphics().setAlpha(0).setDepth(1);
    const bx = rect.x + rect.w * 0.42, by = rect.y + rect.h * 0.62, br = Math.min(rect.w * 0.42, rect.h * 0.55);
    RAINBOW.forEach((col, i) => { bow.lineStyle(7 * f, col, 0.85); bow.beginPath(); bow.arc(bx, by, br - i * 7 * f, Math.PI, Math.PI * 2, false); bow.strokePath(); });
    this.tweens.add({ targets: bow, alpha: 1, delay: 1500, duration: 900 });
    const msg = this.add.text(area.x + area.w / 2, rect.y + rect.h + 44 * f, `All aboard! ${s.correct} of ${ROUNDS} right.\nThe rain came, and then the rainbow.`, {
      fontFamily: FONT, fontSize: Math.round(19 * f) + 'px', color: hex(VILLAGE.question), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: area.w - 24 }
    }).setOrigin(0.5);
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
    // The first miss gets a second try (not when the clock ran out); the explanation waits for a second miss.
    if (!right && picked >= 0 && this.secondChance(q, picked)) { s.streak = 0; s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; if ('qStart' in s) s.qStart = Date.now(); this.rebuild(); return; }
    const second = this.onSecondTry(q);
    s.locked = true; s.picked = picked; s.right = right;
    s.streak = right ? s.streak + 1 : 0;
    if (!second) this.logQuestion(q, right);
    if (right) this.noteRight(q);
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
    this.timerBar.set(ratio);
    if (ratio <= 0) this.timeUp();
  }
}
