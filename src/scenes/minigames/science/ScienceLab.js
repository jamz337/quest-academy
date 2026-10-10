import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { scienceSet, scienceQuestion } from '../../../generators/science/questions.js';
import { tuningFor } from '../../../data/grades.js';
import { weakSkills, prioritiseWeak } from '../../../systems/Practice.js';
import { byDifficulty } from '../../../systems/Ramp.js';
import { grid } from '../../../systems/Layout.js';
import { T, text, FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { plainTheme } from '../../../ui/Explain.js';

const WATER = 0x5ec8e6, WATER_DARK = 0x2f9bc4, TUB = 0xe9f6f9, SOIL = 0x8a5a2b, POT = 0xc9714a, SKY = 0xe4f6f8;
const PLANT_STAGES = ['🌰', '🌱', '🌿', '🪴', '🌻', '🍎'];

/**
 * Science Springs' four games in one lab: Habitat Match, Plant Power, Sink or Float and States of Matter. Each is a
 * picture question with big answers, read aloud, a second try on a miss and an explanation; a "bench" along the top
 * shows the learning happening: animals settling into their habitats, a plant growing a stage per right answer,
 * things dropping into a tub and sinking or floating, items sorted into solid, liquid and gas.
 */
export class ScienceLab extends MinigameScene {
  constructor() { super('MG_ScienceLab'); }

  get lessonTheme() { return plainTheme; }
  get gameId() { return this.payload.gameId; }

  initState() {
    const tune = tuningFor(this.payload), n = tune.questions;
    const ramp = scienceSet(this.gameId, this.payload.grade, this.rng, n, this.rampTargets(n));
    const questions = byDifficulty(prioritiseWeak(ramp, () => scienceSet(this.gameId, this.payload.grade, this.rng, 12), weakSkills(this.profile)));
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
      const q = scienceQuestion(this.gameId, this.payload.grade, this.rng, 0.3);
      if (q.skill === skill && !found.some((x) => x.prompt === q.prompt)) found.push(q);
    }
    const [q, t] = found;
    if (!q) return null;
    const line = (x) => (x.text || x.prompt).replace('\n', '  ');
    return { problem: `${line(q)}  →  ${q.answer}`, steps: this.steps(q), practice: t ? { prompt: line(t), choices: t.choices, answer: t.answer, solved: `${line(t)}  →  ${t.answer}` } : null };
  }

  buildGame(area) {
    const s = this.state, ui = this.ui, q = this.round;
    if (!q) return;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), plainTheme)) return;
    const cx = area.x + area.w / 2;
    // The bench along the top shows what has been learned so far.
    const benchH = Math.min(96 * ui, area.h * 0.17);
    this.drawBench({ x: area.x, y: area.y, w: area.w, h: benchH });
    area = { x: area.x, y: area.y + benchH + 8, w: area.w, h: area.h - benchH - 8 };

    // The question, read aloud, with its picture big underneath.
    const answered = s.picked !== null;
    const pics = q.pics || [];
    const promptH = Math.min(area.h * 0.42, (pics.length ? 150 : 110) * ui);
    const k = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const colour = answered ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    const prompt = q.text || q.prompt;
    const said = readable(this, cx, area.y + (pics.length ? 36 : promptH / 2) * (pics.length ? ui : 1), prompt, T.at(this, prompt.length > 60 ? 17 : prompt.length > 34 ? 19 : 23, colour, { fontStyle: '700' }), { width: area.w - 90 * ui, align: 'center' });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, said, { rate: this.speechRate });
    this.autoRead(said, answered ? null : q.choices);
    if (pics.length) {
      const size = Math.min(64 * ui, promptH - 70 * ui);
      const pic = this.add.text(cx, area.y + promptH - size / 2 - 10 * ui, pics.join(' '), { fontSize: Math.round(size * 0.8) + 'px' }).setOrigin(0.5);
      this.picture = pic;
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
      const b = button(this, c.x, c.y, c.w, bh, choice, { variant, fontSize: size, wrap: true, disabled: this.struckChoice() === i && s.picked === null, onClick: () => this.pick(i) });
      this.answerSpeaker(b, c.w, bh, choice);
      if (reveal && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'pop', delay: 80, stagger: 50 });
    if (answered && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  /** The bench: a different little scene per game, filled by the right answers so far (`state.bench`). */
  drawBench(r) {
    const ui = this.ui, s = this.state, id = this.gameId;
    const g = this.add.graphics();
    g.fillStyle(SKY, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    g.lineStyle(2, this.subject.soft, 1); g.strokeRoundedRect(r.x, r.y, r.w, r.h, 16);
    const fs = (px) => ({ fontSize: Math.round(px) + 'px' });
    if (id === 'sci-float') {
      // A tub of water: floaters bob on top, sinkers lie on the bottom.
      const tx = r.x + 16 * ui, tw = r.w - 32 * ui, ty = r.y + 14 * ui, th = r.h - 22 * ui;
      g.fillStyle(TUB, 1); g.fillRoundedRect(tx, ty, tw, th, 10 * ui);
      g.fillStyle(WATER, 0.85); g.fillRoundedRect(tx + 4 * ui, ty + th * 0.3, tw - 8 * ui, th * 0.7 - 4 * ui, { tl: 2, tr: 2, bl: 8 * ui, br: 8 * ui });
      g.lineStyle(2 * ui, WATER_DARK, 0.6); g.lineBetween(tx + 6 * ui, ty + th * 0.3, tx + tw - 6 * ui, ty + th * 0.3);
      const floats = s.bench.filter((b) => b.floats), sinks = s.bench.filter((b) => !b.floats);
      const size = Math.min(24 * ui, tw / 12);
      floats.forEach((b, i) => { const t = this.add.text(tx + 14 * ui + i * size * 1.2, ty + th * 0.3 - 2 * ui, b.pic, fs(size)).setOrigin(0.5, 0.75); if (this.tweens) this.tweens.add({ targets: t, y: t.y - 3 * ui, duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); });
      sinks.forEach((b, i) => this.add.text(tx + 14 * ui + i * size * 1.2, ty + th - 10 * ui, b.pic, fs(size)).setOrigin(0.5, 0.8));
      this.tub = { x: tx, y: ty, w: tw, h: th, surface: ty + th * 0.3 };
    } else if (id === 'sci-plants') {
      // A plant that grows a stage with each right answer.
      const stage = Math.min(PLANT_STAGES.length - 1, Math.floor((s.bench.length / Math.max(1, this.total)) * (PLANT_STAGES.length - 1) + 0.001));
      const px = r.x + r.w / 2, base = r.y + r.h - 10 * ui;
      g.fillStyle(POT, 1); g.fillRoundedRect(px - 22 * ui, base - 18 * ui, 44 * ui, 18 * ui, { tl: 4, tr: 4, bl: 8, br: 8 });
      g.fillStyle(SOIL, 1); g.fillRect(px - 20 * ui, base - 20 * ui, 40 * ui, 5 * ui);
      this.add.text(px, base - 22 * ui, PLANT_STAGES[stage], fs(Math.min(44 * ui, r.h - 30 * ui))).setOrigin(0.5, 1);
      this.add.text(r.x + 16 * ui, r.y + r.h / 2, `🌞 ${s.bench.length} right`, { fontFamily: FONT, fontSize: Math.round(13 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0, 0.5);
      this.add.text(r.x + r.w - 16 * ui, r.y + r.h / 2, `${'💧'.repeat(Math.min(5, s.bench.length))}`, fs(14 * ui)).setOrigin(1, 0.5);
    } else if (id === 'sci-matter') {
      // Three jars: solid, liquid, gas.
      const names = [['solid', '🧊'], ['liquid', '💧'], ['gas', '💨']];
      const cells = grid({ x: r.x + 10 * ui, y: r.y + 8 * ui, w: r.w - 20 * ui, h: r.h - 16 * ui }, 3, 1, 8 * ui);
      names.forEach(([st, pic], i) => {
        const c = cells[i];
        g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 10 * ui);
        this.add.text(c.x, c.y - c.h / 2 + 10 * ui, `${pic} ${st}`, { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
        const mine = s.bench.filter((b) => b.state === st).slice(-5);
        mine.forEach((b, k) => this.add.text(c.x + (k - (mine.length - 1) / 2) * 20 * ui, c.y + c.h * 0.22, b.pic, fs(18 * ui)).setOrigin(0.5));
      });
    } else {
      // Habitats: a row of homes, each gathering the animals matched to it.
      const homes = ['🌊', '🏜️', '🌴', '❄️', '🌾', '🪷', '🌲', '🚜'];
      const cells = grid({ x: r.x + 8 * ui, y: r.y + 6 * ui, w: r.w - 16 * ui, h: r.h - 12 * ui }, homes.length, 1, 4 * ui);
      homes.forEach((h, i) => {
        const c = cells[i];
        g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 8 * ui);
        this.add.text(c.x, c.y - c.h / 2 + 4 * ui, h, fs(Math.min(18 * ui, c.w * 0.6))).setOrigin(0.5, 0);
        const mine = s.bench.filter((b) => b.homePic === h).slice(-3);
        mine.forEach((b, k) => this.add.text(c.x, c.y + c.h / 2 - 6 * ui - k * 12 * ui, b.pic, fs(Math.min(14 * ui, c.w * 0.5))).setOrigin(0.5, 1));
      });
    }
  }

  /** What a right answer adds to the bench. */
  benchItem(q) {
    const id = this.gameId, pic = (q.pics && q.pics[0]) || null;
    if (id === 'sci-float') { const floats = q.answer.includes('float') || (!q.answer.includes('sink') && /floats/.test(q.text || '')); return { pic: pic || q.answer.split(' ')[0], floats: q.skill === 'sink-float' ? (q.answer === '🛟 float' || /floats\?$/.test(q.text || '')) : floats }; }
    if (id === 'sci-matter') { const st = ['solid', 'liquid', 'gas'].find((x) => q.answer.includes(x)) || null; return { pic: pic || q.answer.split(' ')[0], state: st }; }
    if (id === 'sci-habitat') { const homePic = (q.answer.match(/\p{Extended_Pictographic}/u) || [])[0] || null; return { pic: pic || (q.answer.match(/\p{Extended_Pictographic}/u) || ['🐾'])[0], homePic: pic ? homePic : (q.pics && q.pics[0]) }; }
    return { pic: pic || '🌱' };
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
    if (right) { this.splash(q); this.time.delayedCall(1000, () => this.next()); }
  }

  /** Sink or Float's answer-by-doing: the object drops into the tub and sinks or bobs. */
  splash(q) {
    if (this.gameId !== 'sci-float' || !this.tub || !this.picture || !this.tweens) return;
    const floats = q.answer === '🛟 float' || (q.skill !== 'sink-float' && /floats/.test(q.text || ''));
    const t = this.add.text(this.picture.x, this.picture.y, (q.pics && q.pics[0]) || '🪨', { fontSize: this.picture.style ? this.picture.style.fontSize : '32px' }).setOrigin(0.5).setDepth(20);
    const endY = floats ? this.tub.surface - 2 * this.ui : this.tub.y + this.tub.h - 10 * this.ui;
    this.tweens.add({ targets: t, x: this.tub.x + this.tub.w / 2, y: this.tub.surface - 30 * this.ui, duration: 420, ease: 'Sine.In', onComplete: () => Sfx.gulp() });
    this.tweens.add({ targets: t, y: endY, scale: 0.6, duration: floats ? 500 : 420, delay: 420, ease: floats ? 'Bounce.Out' : 'Quad.In' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1000, duration: 150, onComplete: () => t.destroy() });
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

export { text };
