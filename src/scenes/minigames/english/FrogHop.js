import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { wordsQuestion } from '../../../generators/boss.js';
import { T, text, FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { prioritiseWeak, weakSkills } from '../../../systems/Practice.js';

const ROUNDS = 10;
const PAR_MS = 110000;
const WATER = 0x5cc0ff, WATER_DEEP = 0x3a9be0, PAD = 0x4fb35a, PAD_RIM = 0x2f8a3a, PAD_LIGHT = 0x8fe07c, LOG = 0xa06a3c;

/**
 * Frog Hop: Hopper the frog must cross the pond. Each round a sentence or word puzzle appears and the lily
 * pads carry the possible answers; hop to the right pad and it holds, hop to a wrong one and it sinks (splash!)
 * before the explanation. Questions mix grammar, word pairs and unscrambling from the English banks.
 */
export class FrogHop extends MinigameScene {
  constructor() { super('MG_FrogHop'); }

  makeRounds(n) {
    const out = [], seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < n * 10) {
      const q = wordsQuestion(this.payload.grade, this.rng);
      if (seen.has(q.prompt)) continue;
      seen.add(q.prompt); out.push(q);
    }
    return out;
  }

  initState() {
    const rounds = prioritiseWeak(this.makeRounds(ROUNDS), () => this.makeRounds(12), weakSkills(this.profile));
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, right: null, missed: {} };
  }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, q = this.round;
    if (!q) return;
    const cx = area.x + area.w / 2;
    const lines = q.prompt.split('\n').length;
    const promptH = Math.min(area.h * 0.34, (lines > 1 ? 200 : 170) * ui);
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    text(this, cx, area.y + 28 * ui, s.picked === null ? 'Hop to the lily pad with the right answer' : s.right ? 'Safe and dry!' : `Splash! The answer was ${q.answer}.`, T.small(this, s.picked === null ? THEME.ink2 : s.right ? THEME.successDark : THEME.danger));
    const body = readable(this, cx, area.y + promptH / 2 + 14 * ui, q.prompt, T.at(this, q.prompt.length > 60 || lines > 1 ? 17 : 22, THEME.ink, { fontStyle: '700' }), { width: area.w - 64 * ui });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, body, { rate: this.speechRate });
    this.autoRead(body);
    enter(this, prompt, { from: 'up', distance: 12 });

    const pond = { x: area.x, y: area.y + promptH + 10, w: area.w, h: area.h - promptH - 10 };
    this.pond = pond;
    this.drawPond(pond);
    this.padSprites = q.choices.map((choice, i) => this.makePad(pond, q, choice, i));
    enter(this, this.padSprites, { from: 'pop', delay: 80, stagger: 50 });
    const logY = pond.y + pond.h - 34 * ui;
    const g = this.add.graphics();
    g.fillStyle(THEME.ink, 0.12); g.fillEllipse(cx, logY + 12 * ui, 110 * ui, 18 * ui);
    g.fillStyle(LOG, 1); g.fillRoundedRect(cx - 52 * ui, logY - 12 * ui, 104 * ui, 24 * ui, 12 * ui);
    g.fillStyle(0x7a4a2a, 1); g.fillEllipse(cx - 52 * ui, logY, 10 * ui, 24 * ui);
    const at = s.picked !== null && s.right ? this.padCentre(s.picked) : { x: cx, y: logY - 14 * ui };
    // After a splash the frog is still climbing out, so the explanation has the bottom of the pond to itself.
    this.frog = s.picked !== null && !s.right ? null : this.makeFrog(at.x, at.y);
    if (s.picked !== null && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  drawPond(r) {
    const g = this.add.graphics(), ui = this.ui;
    g.fillStyle(WATER_DEEP, 1); g.fillRoundedRect(r.x, r.y + 4, r.w, r.h - 4, 20);
    g.fillStyle(WATER, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h - 6, 20);
    g.lineStyle(2, 0xc5e8ff, 0.7);
    for (let i = 0; i < 7; i++) {
      const x = r.x + 30 + ((i * 131) % Math.max(40, r.w - 60)), y = r.y + 24 + ((i * 67) % Math.max(20, r.h - 48));
      g.strokeEllipse(x, y, 40 * ui, 10 * ui); g.strokeEllipse(x, y, 20 * ui, 5 * ui);
    }
    // Reeds in the corners.
    g.lineStyle(3, PAD_RIM, 1);
    for (const [x0, lean] of [[r.x + 14, 1], [r.x + 26, -1], [r.x + r.w - 16, -1], [r.x + r.w - 30, 1]]) {
      g.lineBetween(x0, r.y + r.h - 6, x0 + lean * 6, r.y + r.h - 46 * ui);
      g.fillStyle(0x7a4a2a, 1); g.fillEllipse(x0 + lean * 6, r.y + r.h - 50 * ui, 6, 14 * ui);
    }
  }

  padCentre(i) {
    const n = this.round.choices.length, ui = this.ui, r = this.pond;
    const gap = 10 * ui;
    const w = Math.min((r.w - 20 - gap * (n - 1)) / n, 150 * ui);
    const x0 = r.x + (r.w - (w * n + gap * (n - 1))) / 2;
    return { x: x0 + i * (w + gap) + w / 2, y: r.y + r.h * 0.3, w, h: Math.min(w * 0.62, 72 * this.ui) };
  }

  /** A lily pad with a word on it. Colours follow the round's state: held (green), sunk (faded) or the right one glowing. */
  makePad(pond, q, choice, i) {
    const s = this.state, ui = this.ui;
    const p = this.padCentre(i);
    const c = this.add.container(p.x, p.y);
    const g = this.add.graphics();
    const isAnswer = String(choice) === String(q.answer);
    const sunk = s.picked !== null && s.picked === i && !s.right;
    const held = s.picked !== null && s.picked === i && s.right;
    g.fillStyle(THEME.ink, 0.12); g.fillEllipse(3, 6, p.w, p.h);
    g.fillStyle(held ? THEME.success : PAD_RIM, 1); g.fillEllipse(0, 0, p.w, p.h);
    g.fillStyle(held ? 0x6fdc8f : PAD, 1); g.fillEllipse(0, -2, p.w - 8, p.h - 8);
    g.fillStyle(PAD_LIGHT, 0.5); g.fillEllipse(-p.w * 0.18, -p.h * 0.22, p.w * 0.3, p.h * 0.25);
    g.fillStyle(WATER, 1); g.fillTriangle(0, 0, p.w / 2 + 2, -p.h * 0.22, p.w / 2 + 2, p.h * 0.1);   // the notch every lily pad has
    if (s.picked !== null && isAnswer && !held) { g.lineStyle(4 * ui, THEME.success, 1); g.strokeEllipse(0, 0, p.w + 6, p.h + 6); }
    const str = String(choice);
    const size = Math.round((str.length > 12 ? 12 : str.length > 8 ? 14 : str.length > 5 ? 17 : 20) * ui);
    const label = this.add.text(-4, 0, str, { fontFamily: FONT, fontSize: size + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: p.w - 14 } }).setOrigin(0.5);
    c.add([g, label]);
    c.setSize(p.w, p.h);
    if (sunk) { c.setAlpha(0.35); c.y += 8 * ui; }
    if (!s.locked) { c.setInteractive({ useHandCursor: true }); c.on('pointerdown', () => this.pick(i)); }
    return c;
  }

  /** Hopper: a round green frog with big eyes, drawn from shapes so it scales crisply. */
  makeFrog(x, y) {
    const ui = this.ui, c = this.add.container(x, y).setDepth(3);
    const g = this.add.graphics();
    g.fillStyle(THEME.ink, 0.15); g.fillEllipse(0, 16 * ui, 46 * ui, 12 * ui);
    g.fillStyle(0x3f9a45, 1); g.fillEllipse(-18 * ui, 10 * ui, 18 * ui, 10 * ui); g.fillEllipse(18 * ui, 10 * ui, 18 * ui, 10 * ui);
    g.fillStyle(0x5cc45a, 1); g.fillEllipse(0, 0, 44 * ui, 32 * ui);
    g.fillStyle(0xb6f0a4, 1); g.fillEllipse(0, 6 * ui, 26 * ui, 14 * ui);
    for (const ex of [-10, 10]) {
      g.fillStyle(0x3f9a45, 1); g.fillCircle(ex * ui, -14 * ui, 9 * ui);
      g.fillStyle(0xffffff, 1); g.fillCircle(ex * ui, -14 * ui, 7 * ui);
      g.fillStyle(THEME.ink, 1); g.fillCircle(ex * ui + 1.5, -13 * ui, 3.5 * ui);
      g.fillStyle(0xffffff, 1); g.fillCircle(ex * ui + 3, -15 * ui, 1.2 * ui);
    }
    g.lineStyle(2 * ui, 0x2f8a3a, 1); g.lineBetween(-8 * ui, 1 * ui, 8 * ui, 1 * ui);
    g.fillStyle(0xff8fa8, 0.7); g.fillCircle(-15 * ui, 2 * ui, 3 * ui); g.fillCircle(15 * ui, 2 * ui, 3 * ui);
    c.add(g);
    return c;
  }

  pick(i) {
    const s = this.state, q = this.round;
    if (s.locked) return;
    const right = String(q.choices[i]) === String(q.answer);
    s.locked = true; s.picked = i; s.right = right;
    this.logQuestion(q, right);
    if (right) s.correct += 1; else s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    Sfx.pop();
    const frog = this.frog, pad = this.padSprites[i], p = this.padCentre(i);
    const idx = s.idx;
    // Time events survive a rebuild, so the round always moves on even if the hop is interrupted by a resize.
    if (right) this.time.delayedCall(1150, () => { if (s.idx === idx && s.locked) this.next(); });
    else this.time.delayedCall(1000, () => { if (s.idx === idx && s.picked === i && this.frog) this.rebuild(); });
    if (!frog || !frog.active) return;
    this.tweens.add({ targets: frog, x: p.x, y: p.y - 10 * this.ui, duration: 520, ease: 'Sine.InOut' });
    this.tweens.add({ targets: frog, scale: 1.35, duration: 260, yoyo: true, ease: 'Quad.Out' });
    this.time.delayedCall(540, () => {
      if (s.idx !== idx || !frog.active) return;
      if (right) {
        this.correctFeedback();
        if (pad && pad.active) this.tweens.add({ targets: pad, y: pad.y + 4, duration: 120, yoyo: true });
        return;
      }
      this.wrongFeedback();
      this.splash(p.x, p.y);
      if (pad && pad.active) this.tweens.add({ targets: pad, y: pad.y + 12, alpha: 0.3, duration: 320 });
      this.tweens.add({ targets: frog, y: frog.y + 30, alpha: 0, angle: 25, duration: 380, delay: 80 });
    });
  }

  splash(x, y) {
    if (!this.add.particles || !this.textures.exists('px')) return;
    const em = this.add.particles(x, y, 'px', {
      speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 }, scale: { start: 3 * this.ui, end: 0 }, alpha: { start: 0.9, end: 0 },
      lifespan: 520, gravityY: 500, tint: [0xffffff, 0xc5e8ff], emitting: false
    }).setDepth(4);
    em.explode(20, 0, 0);
    this.time.delayedCall(800, () => { if (em.active) em.destroy(); });
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null; s.right = null;
    this.rebuild();
  }
}
