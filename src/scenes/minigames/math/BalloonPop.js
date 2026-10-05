import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { generateSet, generateQuestion } from '../../../generators/math/arithmetic.js';
import { tuningFor } from '../../../data/grades.js';
import { T, text, FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { readable } from '../../../ui/ReadableText.js';
import { speakButton } from '../../../ui/Button.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { prioritiseWeak, weakSkills } from '../../../systems/Practice.js';
import { byDifficulty } from '../../../systems/Ramp.js';
import { balloonIntro, introFor, introDone } from './BalloonIntro.js';
import { balloonExplain, explainParts } from './BalloonExplain.js';

const COLOURS = [0xff5c6c, 0x3d8bff, 0x2ec46a, 0xffc531, 0xff6fae, 0x8b5cf6];
const LANES = [0.16, 0.39, 0.61, 0.84];

/**
 * Balloon Pop: the four answers float up the sky on balloons; pop the right one before it drifts away.
 * The rise takes the question's time limit (balloons hover when timers are off). A wrong pop deflates that
 * balloon, lights the right one and explains the sum before moving on.
 */
export class BalloonPop extends MinigameScene {
  constructor() { super('MG_BalloonPop'); }

  initState() {
    const tune = tuningFor(this.payload);
    const grade = this.payload.grade;
    // Easy first, a little harder each question; a skill the child has never met starts at the bottom rung.
    const ramp = generateSet(grade, this.rng, tune.questions, { targets: this.rampTargets(tune.questions), isNew: (k) => this.needsIntro(k) });
    const questions = byDifficulty(prioritiseWeak(ramp, () => generateSet(grade, this.rng, 12), weakSkills(this.profile)));
    return {
      questions, idx: 0, correct: 0, locked: false, picked: null, right: null, missed: {}, introduced: {},
      timeLimit: tune.questionTimeMs, parTimeMs: tune.parTimeMs, balloons: this.launch(questions[0], 0, tune.questionTimeMs)
    };
  }

  /** Fresh balloons for a question: one per choice in shuffled lanes, starting just below the sky (or hovering when untimed). */
  launch(q, idx, timeLimit) {
    if (!q) return [];
    const lanes = this.rng.shuffle(LANES);
    const timed = Number.isFinite(timeLimit);
    return q.choices.map((choice, i) => ({
      choice, lane: lanes[i], y: timed ? -0.1 - i * 0.05 : 0.3 + (i % 2) * 0.25,
      colour: COLOURS[(i + idx) % COLOURS.length], phase: this.rng.float() * Math.PI * 2, state: 'up'
    }));
  }

  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.questions.length)} / ${this.state.questions.length}`; }
  progressRatio() { return this.state.idx / this.state.questions.length; }
  enterKey() { return `${this.state.idx}${this.state.explain ? 'x' : ''}`; }

  /** A solved question of this skill for the intro, preferring one small enough to walk on the number line. */
  exampleFor(skill) {
    let fallback = null;
    for (let i = 0; i < 60; i++) {
      const q = generateQuestion(this.payload.grade, this.rng, 0);   // the first example is the gentlest kind
      if (q.skill !== skill) continue;
      const it = introFor(q, this.steps(q));
      if (it.mode === 'line') return it;
      fallback ||= it;
    }
    return fallback;
  }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const q = s.questions[s.idx];
    this.balloonSprites = [];
    if (!q) return;
    if (!s.introduced[q.skill] && this.needsIntro(q.skill)) {
      s.introduced[q.skill] = true;
      s.intro = this.exampleFor(q.skill);
    }
    // The intro keeps its pops in state, so a rotation mid-example comes back to the same moment.
    if (s.intro) {
      return balloonIntro(this, area, s.intro, {
        onPop: () => { if (s.intro) { s.intro.popped += 1; if (introDone(s.intro)) Sfx.correct(); this.rebuild(); } },
        onReplay: () => { if (s.intro) { s.intro.popped = 0; this.rebuild(); } },
        onDone: () => { if (s.intro) this.markIntroduced(s.intro.skill); s.intro = null; this.qStartAt = Date.now(); this.rebuild(); }
      });
    }
    // After a miss (and a moment to see the right balloon glow): the working, one step at a time.
    if (s.explain) {
      const problem = q.prompt.replace('\n', ' ');
      return balloonExplain(this, area, { problem, parts: explainParts(this.steps(q)) }, s.explain, {
        onReveal: () => { s.explain += 1; this.rebuild(); },
        onDone: () => this.next()
      });
    }
    const cx = area.x + area.w / 2;
    const promptH = Math.min(area.h * (q.ask ? 0.3 : 0.22), (q.ask ? 170 : 120) * ui);
    // Sky first so the balloons sail behind the question card, not over it.
    this.sky = { x: area.x, y: area.y + promptH + 8, w: area.w, h: area.h - promptH - 8 };
    this.drawSky(this.sky);
    s.balloons.forEach((b, i) => { if (b.state !== 'popped') this.balloonSprites[i] = this.makeBalloon(b, i); });
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    prompt.setDepth(5);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui).setDepth(6);
    const colour = s.picked !== null ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    if (q.ask) {
      // A question for the youngest ("How many mangoes?" with the pictures): read aloud, pictures big and wrapped.
      const said = readable(this, cx, area.y + promptH / 2 - 4 * ui, q.prompt, T.at(this, 24, colour, { fontStyle: '700' }), { width: area.w - 70 * ui, align: 'center' }).setDepth(6);
      const sb = speakButton(this, area.x + area.w - 28 * ui, area.y + 24 * ui, 36 * ui, said, { rate: this.speechRate });
      if (sb) sb.setDepth(7);
      this.autoRead(said, s.picked === null ? q.choices : null);
    } else {
      const shown = `${q.prompt.replace('\n', '   ')} = ?`;
      text(this, cx, area.y + promptH / 2 + 4 * ui, shown, T.at(this, shown.length > 14 ? 26 : 36, colour, { fontStyle: '700' })).setDepth(6);
    }
    text(this, cx, area.y + promptH - 14 * ui, s.picked === null ? 'Pop the balloon with the answer!' : s.right ? 'Pop! Well done.' : `The answer was ${q.answer}.`, T.small(this, THEME.ink2)).setDepth(6);
    enter(this, prompt, { from: 'up', distance: 12 });
  }

  /** Let the child see the right balloon light up, then open the step-by-step explanation. */
  explainSoon() {
    const idx = this.state.idx;
    this.time.delayedCall(1100, () => {
      const s = this.state;
      if (s.idx !== idx || !s.locked || s.right || s.explain) return;
      s.explain = 1;
      this.rebuild();
    });
  }

  drawSky(r) {
    const g = this.add.graphics(), ui = this.ui;
    g.fillStyle(0xdff1ff, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 18);
    g.fillStyle(0xffffff, 0.9);
    const cloud = (x, y, s) => { g.fillEllipse(x, y, 60 * s, 24 * s); g.fillEllipse(x - 18 * s, y + 4 * s, 34 * s, 18 * s); g.fillEllipse(x + 20 * s, y + 5 * s, 38 * s, 20 * s); };
    cloud(r.x + r.w * 0.22, r.y + r.h * 0.18, ui); cloud(r.x + r.w * 0.72, r.y + r.h * 0.34, ui * 0.8); cloud(r.x + r.w * 0.5, r.y + r.h * 0.62, ui * 0.7);
    g.fillStyle(0x8fd48a, 1); g.fillEllipse(r.x + r.w * 0.3, r.y + r.h + 10, r.w * 0.9, 60 * ui);
    g.fillStyle(0x5cc45a, 1); g.fillEllipse(r.x + r.w * 0.8, r.y + r.h + 14, r.w * 0.8, 52 * ui);
    g.lineStyle(3, THEME.line, 1); g.strokeRoundedRect(r.x, r.y, r.w, r.h, 18);
  }

  /** One balloon: a shaded ellipse with a knot and a string, the answer written on it. Tappable while the question is open. */
  makeBalloon(b, i) {
    const s = this.state, ui = this.ui;
    const rx = Math.min(38 * ui, this.sky.w / 9.5), ry = rx * 1.2;
    const c = this.add.container(0, 0).setDepth(2);
    const g = this.add.graphics();
    const col = b.state === 'sad' ? 0xb4bcc4 : b.colour;
    g.fillStyle(THEME.ink, 0.1); g.fillEllipse(4, ry * 0.12 + 5, rx * 2, ry * 2);
    g.fillStyle(col, 1); g.fillEllipse(0, 0, rx * 2, ry * 2);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(-rx * 0.35, -ry * 0.4, rx * 0.5, ry * 0.45);
    g.fillStyle(col, 1); g.fillTriangle(-5 * ui, ry - 2, 5 * ui, ry - 2, 0, ry + 8 * ui);
    g.lineStyle(2, THEME.ink2, 0.55); g.lineBetween(0, ry + 8 * ui, 3 * ui, ry + 26 * ui); g.lineBetween(3 * ui, ry + 26 * ui, -2 * ui, ry + 44 * ui);
    if (b.state === 'glow') { g.lineStyle(5 * ui, THEME.success, 1); g.strokeEllipse(0, 0, rx * 2 + 8, ry * 2 + 8); }
    const label = this.add.text(0, -2 * ui, String(b.choice), { fontFamily: FONT, fontSize: Math.round((String(b.choice).length > 4 ? 17 : 24) * ui) + 'px', color: hex(0xffffff), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
    c.add([g, label]);
    c.setSize(rx * 2 + 10, ry * 2 + 10);
    c.rx = rx; c.ry = ry;
    if (b.state === 'sad') c.setScale(0.8);
    if (!s.locked) { c.setInteractive({ useHandCursor: true }); c.on('pointerdown', () => this.pick(i)); }
    this.placeBalloon(c, b, 0);
    return c;
  }

  placeBalloon(c, b, time) {
    c.x = this.sky.x + b.lane * this.sky.w + Math.sin(time / 700 + b.phase) * 9 * this.ui;
    c.y = this.sky.y + this.sky.h - b.y * this.sky.h - c.ry;
  }

  pick(i) {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx], b = s.balloons[i];
    if (b.flat) return;   // already deflated on the first try
    const right = String(b.choice) === String(q.answer);
    // The first miss gets a second try: that balloon deflates and the others keep floating.
    if (!right && this.secondChance(q)) { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; b.state = 'sad'; b.flat = true; this.rebuild(); return; }
    const second = this.onSecondTry(q);
    s.locked = true; s.picked = i; s.right = right;
    if (!second) this.logQuestion(q, right);
    if (right) {
      s.correct += 1; this.noteRight(q);
      b.state = 'popped';
      this.pop(this.balloonSprites[i], b.colour);
      this.correctFeedback();
      this.time.delayedCall(700, () => this.next());
      return;
    }
    if (!second) s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.settle(i);
    this.wrongFeedback();
    this.rebuild();
    this.explainSoon();
  }

  /** After a miss: the tapped balloon deflates, the right one lights up, and both hang high so the explanation has room. */
  settle(tapped) {
    const s = this.state, q = s.questions[s.idx];
    const keep = (y, lo) => Math.min(0.82, Math.max(y, lo));   // in view, clear of the explanation below
    s.balloons.forEach((b, j) => {
      if (String(b.choice) === String(q.answer)) { b.state = 'glow'; b.y = keep(b.y, 0.62); }
      else if (j === tapped) { b.state = 'sad'; b.y = keep(b.y, 0.55); }
      else b.state = 'popped';
    });
  }

  /** Burst a balloon into a shower of its own colour. */
  pop(sprite, colour) {
    if (!sprite || !sprite.active) return;
    Sfx.pop();
    if (this.add.particles && this.textures.exists('px')) {
      const em = this.add.particles(sprite.x, sprite.y, 'px', {
        speed: { min: 80, max: 260 }, angle: { min: 0, max: 360 }, scale: { start: 5 * this.ui, end: 0 }, alpha: { start: 1, end: 0 },
        lifespan: 600, gravityY: 300, tint: [colour, 0xffffff], emitting: false
      }).setDepth(4);
      em.explode(22, 0, 0);
      this.time.delayedCall(900, () => { if (em.active) em.destroy(); });
    }
    sprite.destroy();
  }

  timeUp() {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx];
    s.locked = true; s.picked = -1; s.right = false;
    this.logQuestion(q, false);
    s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.settle(-1);
    this.wrongFeedback();
    this.rebuild();
    this.explainSoon();
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: s.parTimeMs, missedSkills });
    }
    s.locked = false; s.picked = null; s.right = null; s.explain = 0;
    s.balloons = this.launch(s.questions[s.idx], s.idx, s.timeLimit);
    this.rebuild();
  }

  update(time, delta) {
    const s = this.state;
    if (this.finished || this.inReview || s.intro || !this.sky || !this.balloonSprites) return;
    const speed = Number.isFinite(s.timeLimit) ? 1.15 / s.timeLimit : 0;
    this.balloonSprites.forEach((c, i) => {
      const b = s.balloons[i];
      if (!c || !c.active || !b) return;
      if (b.state === 'up' && (!s.locked || s.right)) b.y += speed * delta;
      this.placeBalloon(c, b, time);
    });
    if (!s.locked && speed > 0) {
      const q = s.questions[s.idx];
      const rb = s.balloons.find((b) => String(b.choice) === String(q.answer));
      if (rb && rb.y > 1.08) this.timeUp();
    }
  }
}
