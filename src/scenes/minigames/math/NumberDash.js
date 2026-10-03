import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateSet, generateQuestion } from '../../../generators/math/arithmetic.js';
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
import { prioritiseWeak, weakSkills } from '../../../systems/Practice.js';
import { byDifficulty } from '../../../systems/Ramp.js';
import { raceTrack } from '../../../ui/Scenery.js';
import { shake } from '../../../ui/motion.js';
import { lookSpriteTexture } from '../../../systems/Textures.js';
import { outfitOf, outfitId } from '../../../systems/Market.js';
import { IDLE_FRAMES } from '../../../ui/LpcCharacter.js';
import { resolveLook } from '../../../data/avatars.js';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.'];

/** Number Dash's New Skill page: the race track with the runner on the start line, and a card with a finish-flag edge. */
const dashIntroTheme = {
  title: THEME.subjects.math.dark, ink: THEME.ink, ink2: THEME.ink2,
  button: { color: THEME.subjects.math.accent, textColor: 0xffffff },
  problemH: 80,
  backdrop(scene, area, f) {
    const h = Math.min(84 * f, area.h * 0.15);
    const key = lookSpriteTexture(scene, resolveLook(scene.profile), outfitOf(scene.profile), outfitId(scene.profile));
    raceTrack(scene, { x: area.x, y: area.y, w: area.w, h }, { progress: 0, total: 10, spriteKey: key, ui: f });
    return { x: area.x, y: area.y + h + 8, w: area.w, h: area.h - h - 8 };
  },
  card(scene, r, f) {
    const w = Math.min(r.w, 620 * f);
    card(scene, r.x + r.w / 2, r.y + r.h / 2, w, r.h, { stroke: THEME.subjects.math.soft });
    // A chequered finish-flag edge along the top.
    const g = scene.add.graphics(), sq = 8 * f, x0 = r.x + r.w / 2 - w / 2 + 14 * f, n = Math.floor((w - 28 * f) / sq);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle((i + j) % 2 ? 0xffffff : THEME.ink, 1); g.fillRect(x0 + i * sq, r.y + 8 * f + j * sq, sq, sq); }
    return { x: r.x + r.w / 2 - w / 2 + 14 * f, y: r.y + 30 * f, w: w - 28 * f, h: r.h - 38 * f };
  },
  choice(scene, x, y, w, h, label, { state, onTap }) {
    const variant = state === 'right' ? 'success' : state === 'wrong' ? 'danger' : 'secondary';
    const b = button(scene, x, y, w, h, label, { variant, fontSize: 30, radius: THEME.radius.lg, onClick: onTap || (() => {}) });
    if (state === 'dim') b.setAlpha(0.4);
    return b;
  }
};

/**
 * Quick-fire arithmetic: 10 questions with a timer each. Half are answered by tapping one of four tiles,
 * half by typing the number on a pad (recall, not just recognition). Weak skills come first; a brand-new
 * skill gets a worked example; a wrong answer shows why and waits for Next.
 */
export class NumberDash extends MinigameScene {
  constructor() { super('MG_NumberDash'); }

  initState() {
    const tune = tuningFor(this.payload);
    const grade = this.payload.grade;
    // Easy first, a little harder each question; a skill the child has never met starts at the bottom rung.
    let questions = generateSet(grade, this.rng, tune.questions, { targets: this.rampTargets(tune.questions), isNew: (k) => this.needsIntro(k) });
    questions = byDifficulty(prioritiseWeak(questions, () => generateSet(grade, this.rng, 12), weakSkills(this.profile)));
    return {
      questions, idx: 0, correct: 0, locked: false, picked: null, right: null, typed: '', introduced: {},
      qStart: Date.now(), timeLimit: tune.questionTimeMs, parTimeMs: tune.parTimeMs, missed: {}
    };
  }

  get lessonTheme() { return dashIntroTheme; }

  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.questions.length)} / ${this.state.questions.length}`; }
  progressRatio() { return this.state.idx / this.state.questions.length; }
  enterKey() { return this.state.idx; }
  /** Every other question is typed rather than picked. */
  typing() { return !this.payload.early && this.state.idx % 2 === 1; }   // Pre-K and K only tap

  /** A solved example of a skill the player has never met, and a second question of it for the child to try. */
  exampleFor(skill) {
    const found = [];
    for (let i = 0; i < 80 && found.length < 2; i++) {
      const q = generateQuestion(this.payload.grade, this.rng, 0);   // the first example is the gentlest kind
      if (q.skill === skill && !found.some((x) => x.prompt === q.prompt)) found.push(q);
    }
    const [q, t] = found;
    if (!q) return null;
    const line = (x) => x.prompt.replace('\n', ' ');
    // A question ("How many mangoes?") shows its answer after an arrow; a sum after an equals sign.
    const solved = (x) => (x.ask ? `${line(x)}  →  ${x.answer}` : `${line(x)} = ${x.answer}`);
    return {
      problem: solved(q), steps: this.steps(q),
      practice: t && t.choices ? { prompt: t.ask ? line(t) : `${line(t)} = ?`, choices: t.choices, answer: t.answer, solved: solved(t) } : null
    };
  }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const q = s.questions[s.idx];
    if (!q) return;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), dashIntroTheme)) return;
    // The race track along the top: the player's runner dashes one step nearer the finish per right answer.
    const stripH = Math.min(84 * ui, area.h * 0.17);
    this.drawTrack({ x: area.x, y: area.y, w: area.w, h: stripH });
    area = { x: area.x, y: area.y + stripH + 8, w: area.w, h: area.h - stripH - 8 };
    const promptH = Math.min(area.h * 0.34, 200 * ui);
    const cx = area.x + area.w / 2;
    const prompt = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const typing = this.typing();
    const shown = typing && s.picked === null ? `${q.prompt} = ${s.typed || '?'}` : q.prompt;
    const colour = s.picked !== null ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    if (q.ask) {
      // A question for the youngest: read aloud, the pictures big and wrapped.
      const said = readable(this, cx, area.y + promptH / 2 - 10 * ui, q.prompt, T.at(this, 26, colour, { fontStyle: '700' }), { width: area.w - 80 * ui, align: 'center' });
      speakButton(this, area.x + area.w - 30 * ui, area.y + 26 * ui, 40 * ui, said, { rate: this.speechRate });
      this.autoRead(said, s.picked === null ? q.choices : null);
    } else text(this, cx, area.y + promptH / 2 - 10 * ui, shown, T.at(this, shown.length > 12 ? 30 : 42, colour, { fontStyle: '700' }));
    if (s.picked !== null && typing) text(this, cx, area.y + promptH - 34 * ui, s.right ? 'Correct!' : this.answerRevealed(q) ? `You typed ${s.typed || 'nothing'}. It is ${q.answer}.` : `You typed ${s.typed || 'nothing'}. Let's see why.`, T.small(this, s.right ? THEME.successDark : THEME.danger));
    this.timerBar = new ProgressBar(this, cx, area.y + promptH - 18 * ui, area.w - 48, 10 * ui, { color: THEME.success, value: 1 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);

    const gap = 12;
    const gridTop = area.y + promptH + gap;
    if (typing) this.buildPad(area, gridTop, q); else this.buildChoices(area, gridTop, q);
    enter(this, prompt, { from: 'up', distance: 12 });
    if (s.picked !== null && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  drawTrack(r) {
    const s = this.state, ui = this.ui;
    const justRight = s.picked !== null && s.right, justWrong = s.picked !== null && !s.right;
    const key = lookSpriteTexture(this, resolveLook(this.profile), outfitOf(this.profile), outfitId(this.profile));
    const { runner, xFor } = raceTrack(this, r, { progress: s.correct - (justRight ? 1 : 0), total: s.questions.length, spriteKey: key, ui });
    if (!runner) return;
    if (justRight) {
      runner.play(`${key}-side`, true);
      this.tweens.add({ targets: runner, x: xFor(s.correct), duration: 420, ease: 'Sine.Out', onComplete: () => { if (runner.active) { runner.stop(); runner.setFrame(IDLE_FRAMES.side); } } });
      this.tweens.add({ targets: runner, y: runner.y - 6 * ui, duration: 140, yoyo: true, repeat: 1 });
    } else if (justWrong) shake(this, runner, 5);
  }

  buildChoices(area, gridTop, q) {
    const s = this.state, ui = this.ui, gap = 12;
    const cells = grid({ x: area.x, y: gridTop, w: area.w, h: Math.min(area.h - (gridTop - area.y), 320 * ui) }, 2, 2, gap);
    const reveal = s.picked !== null && (s.right || this.answerRevealed(q));   // hidden while the child works it out
    this.choiceButtons = q.choices.map((choice, i) => {
      const c = cells[i];
      const opts = { variant: 'secondary', fontSize: 30, radius: THEME.radius.lg, onClick: () => this.pick(i) };
      if (s.picked !== null) {
        if (choice === q.answer && reveal) opts.variant = 'success';
        else if (i === s.picked) opts.variant = 'danger';
      }
      const b = button(this, c.x, c.y, c.w, Math.min(c.h, 120 * ui), choice, opts);
      if (reveal && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, this.choiceButtons, { from: 'up', delay: 60, stagger: 40 });
  }

  /** Number pad: digits, minus (negative answers exist in grades 6-8), a decimal point, backspace and enter. */
  buildPad(area, gridTop, q) {
    const s = this.state, ui = this.ui, gap = 8;
    const padW = Math.min(area.w, 360 * ui), padH = Math.min(area.h - (gridTop - area.y), 300 * ui);
    const x0 = area.x + (area.w - padW) / 2;
    // Four rows of three keys, with backspace and a tall enter key in a fourth column.
    const cells = grid({ x: x0, y: gridTop, w: padW, h: padH }, 4, 4, gap);
    const keys = [];
    KEYS.forEach((k, i) => {
      const row = Math.floor(i / 3), col = i % 3;
      const c = cells[row * 4 + col];
      const disabled = s.picked !== null || (k === '−' && s.typed.length > 0) || (k === '.' && s.typed.includes('.'));
      keys.push(button(this, c.x, c.y, c.w, c.h, k, { variant: 'secondary', fontSize: 26, radius: THEME.radius.md, disabled, onClick: () => this.type(k) }));
    });
    const back = cells[3], go = cells[7], go2 = cells[15];
    keys.push(button(this, back.x, back.y, back.w, back.h, '⌫', { variant: 'ghost', fontSize: 24, disabled: s.picked !== null || !s.typed, onClick: () => this.type('⌫') }));
    keys.push(button(this, go.x, (go.y + go2.y) / 2, go.w, go2.y - go.y + go.h, '✓', { variant: 'primary', fontSize: 30, disabled: s.picked !== null || !s.typed, onClick: () => this.submit() }));
    enter(this, keys, { from: 'up', delay: 60, stagger: 15 });
  }

  type(k) {
    const s = this.state;
    if (s.locked) return;
    Sfx.click();
    if (k === '⌫') s.typed = s.typed.slice(0, -1);
    else if (s.typed.length < 8) s.typed += k;
    this.rebuild();
  }

  submit() {
    const s = this.state;
    if (s.locked || !s.typed) return;
    const q = s.questions[s.idx];
    const given = Number(s.typed.replace('−', '-')), want = Number(String(q.answer).replace('−', '-'));
    this.answer(q, Number.isFinite(given) && Math.abs(given - want) < 1e-9, -2);
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
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) this.time.delayedCall(550, () => this.next());   // wrong answers wait for "Next" after the explanation
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
    s.locked = false; s.picked = null; s.right = null; s.typed = ''; s.qStart = Date.now();
    this.rebuild();
  }

  onResumed() { this.state.qStart = Date.now() - Math.min(Date.now() - this.state.qStart, this.state.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || !Number.isFinite(s.timeLimit) || !this.timerBar || !this.timerBar.active) return;
    const ratio = 1 - (Date.now() - s.qStart) / s.timeLimit;
    this.timerBar.set(ratio, ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    if (ratio <= 0) this.timeUp();
  }
}
