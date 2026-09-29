import { BaseScene } from '../BaseScene.js';
import { SCENES } from '../../constants.js';
import { THEME, subjectOf } from '../../ui/theme.js';
import { Rng } from '../../systems/Rng.js';
import * as Launcher from '../../systems/MinigameLauncher.js';
import { Sfx } from '../../systems/Audio.js';
import { stop as stopSpeech, rateFor } from '../../systems/Speech.js';
import * as Store from '../../systems/Store.js';
import { explainQuestion, explainSteps } from '../../data/explanations.js';
import { skillLabel } from '../../data/skills.js';
import { isNewSkill, markIntroduced, prioritiseWeak, weakSkills } from '../../systems/Practice.js';
import { rampTargets, rampFor, rampOrder } from '../../systems/Ramp.js';
import { dueReviews, recordReview } from '../../systems/Review.js';
import { grid } from '../../systems/Layout.js';
import { readable } from '../../ui/ReadableText.js';
import { answerSpeaker, readQuestionThenAnswers } from '../../ui/AnswerSpeech.js';
import { button, iconButton, speakButton } from '../../ui/Button.js';
import { card } from '../../ui/Card.js';
import { enter } from '../../ui/motion.js';
import { safeArea } from '../../systems/Layout.js';
import { T, text } from '../../ui/TextStyles.js';

import { background } from '../../ui/Panel.js';
import { chip } from '../../ui/Chip.js';
import { ProgressBar } from '../../ui/ProgressBar.js';

/**
 * Base class for every mini-game.
 * Subclasses implement initState() -> plain object, and buildGame(area) which draws from this.state.
 * Call this.finish(raw) when done. Keep all progress in this.state so rotation (rebuild) never loses it.
 * Override enterKey() to return the round index so ui/motion.enter() animates once per round.
 */
export class MinigameScene extends BaseScene {
  init(payload) {
    this.payload = payload;
    this.rng = new Rng(payload.seed ?? undefined);
    this.finished = false;
    this.startedAt = Date.now();
    this.pausedMs = 0;
    this.pauseStart = null;
    this.qlog = [];               // one entry per answered question: the learning log
    this.qStartAt = Date.now();
    this.state = this.initState();
    // Spaced review: a few questions missed in earlier games of this subject come back before this one starts.
    this.review = payload.boss || payload.duel || payload.noReview ? [] : dueReviews(this.profile, payload.subject);
    this.reviewIdx = 0; this.reviewPicked = null; this.reviewRight = 0;
    // Scenes are reused between launches, so the wrapper always goes around the class's own enterKey.
    delete this.enterKey;
    if (this.review.length) {
      const base = Object.getPrototypeOf(this).enterKey.bind(this);
      this.enterKey = () => (this.inReview ? `review${this.reviewIdx}${this.reviewPicked ?? ''}` : base());
    }
  }

  // ---- Quick review of earlier misses -----------------------------------------------------------

  get inReview() { return !!this.review && this.reviewIdx < this.review.length; }

  /** One missed question as multiple choice; a wrong answer shows the explanation before moving on. */
  buildReview(area) {
    const { ui } = this;
    const q = this.review[this.reviewIdx];
    const cx = area.x + area.w / 2;
    const lines = q.prompt.split('\n').length;
    const promptH = Math.min(area.h * 0.42, (lines > 2 ? 250 : 210) * ui);
    const k = card(this, cx, area.y + promptH / 2, area.w, promptH, { stroke: THEME.brandSoft });
    text(this, cx, area.y + 26 * ui, `Quick review  ·  ${this.reviewIdx + 1} of ${this.review.length}`, T.small(this, THEME.brandDark));
    text(this, cx, area.y + 48 * ui, this.reviewPicked === null ? 'You missed this one last time. Try again!' : this.reviewPicked === -2 ? 'Yes! That one is sticking.' : `The answer is ${q.answer}.`, T.small(this, THEME.ink2));
    const body = readable(this, cx, area.y + promptH / 2 + 18 * ui, q.prompt, T.at(this, q.prompt.length > 60 || lines > 2 ? 17 : 24, THEME.ink, { fontStyle: '700' }), { width: area.w - 56 * ui });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, body, { rate: this.speechRate });
    this.autoRead(body, this.reviewPicked === null ? q.choices : null);
    enter(this, k, { from: 'up', distance: 12 });
    const top = area.y + promptH + 12;
    const long = q.choices.some((c) => String(c).length > 14);
    const cols = long || this.portrait && q.choices.length > 2 ? (long ? 1 : 2) : 2, rows = Math.ceil(q.choices.length / cols);
    const cells = grid({ x: area.x, y: top, w: area.w, h: Math.min(area.h - (top - area.y), rows * 72 * ui + (rows - 1) * 10) }, cols, rows, 10);
    const made = q.choices.map((choice, i) => {
      const c = cells[i];
      let variant = 'secondary', faded = false;
      if (this.reviewPicked !== null) { if (choice === q.answer) variant = 'success'; else if (i === this.reviewPicked) variant = 'danger'; else faded = true; }
      const bh = Math.max(52 * ui, Math.min(c.h, 84 * ui));
      const b = button(this, c.x, c.y, c.w, bh, String(choice), { variant, fontSize: long ? 16 : 22, wrap: true, onClick: () => this.pickReview(i) });
      this.answerSpeaker(b, c.w, bh, choice);
      if (faded) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'up', delay: 60, stagger: 40 });
    if (this.reviewPicked !== null && this.reviewPicked !== -2 && q.choices[this.reviewPicked] !== q.answer) this.explanationPanel(area, q, () => this.nextReview());
  }

  pickReview(i) {
    if (this.reviewPicked !== null) return;
    const q = this.review[this.reviewIdx];
    const right = q.choices[i] === q.answer;
    this.reviewPicked = right ? -2 : i;
    Store.updateProfile((p) => recordReview(p, q, right));
    if (right) { this.reviewRight += 1; this.correctFeedback(); } else this.wrongFeedback();
    this.rebuild();
    if (right) this.time.delayedCall(700, () => this.nextReview());
  }

  nextReview() {
    if (!this.inReview) return;
    this.reviewIdx += 1; this.reviewPicked = null;
    if (!this.inReview) {
      // The game proper starts now: its clocks (and any per-question timer the subclass keeps) restart.
      this.startedAt = Date.now(); this.qStartAt = Date.now();
      if (this.state && typeof this.state === 'object' && 'qStart' in this.state) this.state.qStart = Date.now();
    }
    this.rebuild();
  }

  // ---- Learning helpers: explanations, worked examples, the question log --------------------

  get noTimers() { return this.payload.timers === false; }
  get profile() { return Store.getProfile(); }
  explain(q) { return explainQuestion(q, this.payload.subject); }
  steps(q) { return explainSteps(q, this.payload.subject); }

  /** Record an answered question for the log (skill, right, time, whether an explanation was shown). */
  logQuestion(q, right) {
    const choices = Array.isArray(q.choices) && q.choices.length >= 2 ? q.choices.slice(0, 4).map((c) => String(c).slice(0, 40)) : undefined;
    // A miss keeps its explanation so the quick review (days later, without the generator's round) can show the same working.
    let explain;
    if (!right && choices) { try { explain = String(this.explain(q) || '').slice(0, 200) || undefined; } catch { explain = undefined; } }
    this.qlog.push({ skill: q.skill, right, ms: Date.now() - this.qStartAt, explained: !right, prompt: String(q.prompt || q.sentence || '').slice(0, 120), answer: String(q.answer ?? '').slice(0, 40), choices, explain });
    this.qStartAt = Date.now();
  }

  // ---- Difficulty ramp: easy first, a little harder each question (systems/Ramp.js) ---------------

  /** How hard each of n questions should be, 0..1, easiest first, for this launch and this child. */
  rampTargets(n) { return rampTargets(n, rampFor(this.payload, this.profile)); }

  /**
   * n questions climbing from easy to hard. `make(k)` returns k candidate questions, `score(q)` any number where
   * bigger is harder. Weak skills still get their extra questions (from `makeMore`, when given), slotted in by score.
   */
  rampedRounds(make, n, score, makeMore = null) {
    let list = rampOrder(make(Math.max(n * 3, n + 6)), this.rampTargets(n), score);
    if (list.length < n) list = make(n);
    if (makeMore) list = prioritiseWeak(list, makeMore, weakSkills(this.profile));
    return list.map((q, i) => ({ q, i, s: Number(score(q)) || 0 })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.q);
  }

  /** Skills the player has never been introduced to get a worked example first. */
  needsIntro(skill) { return !!skill && isNewSkill(this.profile, skill); }
  markIntroduced(skill) { Store.updateProfile((p) => markIntroduced(p, skill)); }

  /**
   * Worked-example card for a brand-new skill, filling the play area. `example` is { problem, steps } (a solved
   * question and its working, one short step per line) or a plain string.
   */
  introPanel(area, skill, example, onDone) {
    const { ui } = this;
    const ex = typeof example === 'string' ? { problem: '', steps: [example] } : example;
    const steps = (ex.steps || []).filter(Boolean);
    const w = Math.min(area.w, 560 * ui), cx = area.x + area.w / 2;
    const headH = 76 * ui, problemH = ex.problem ? 50 * ui : 0, footH = 76 * ui;
    // Lay the steps out first so the card can be sized to fit them (smaller type when they would not fit).
    const numbered = steps.map((st, i) => `${i + 1}.  ${st}`).join('\n');
    const room = area.h - headH - problemH - footH - 8 * ui;
    let body = null;
    for (const size of [16, 15, 14, 13]) {
      if (body) body.destroy();
      body = readable(this, 0, 0, numbered, T.at(this, size, THEME.ink, { fontStyle: '600' }), { width: w - 56, align: 'left', lineGap: 9 }).setOrigin(0, 0);
      if (body.height <= room) break;
    }
    const h = Math.min(area.h, headH + problemH + body.height + footH);
    const cy = area.y + h / 2, top = cy - h / 2;
    const k = card(this, cx, cy, w, h, { stroke: this.subject.soft });
    if (this.children && typeof this.children.bringToTop === 'function') this.children.bringToTop(body);   // above the card (the test mock has no display list)
    const title = text(this, cx, top + 30 * ui, `New skill: ${skillLabel(skill)}`, T.heading(this, this.subject.dark));
    if (title.width > w - 110 * ui) title.setFontSize(Math.round(17 * ui));
    text(this, cx, top + 56 * ui, 'Watch how this one is done:', T.small(this, THEME.ink2));
    if (ex.problem) {
      const c = chip(this, cx, top + headH + problemH / 2, { text: ex.problem, originX: 0.5, color: this.subject.soft, textColor: this.subject.dark, fontSize: 20, height: 36 * ui, shadow: 'none' });
      const cw = c.width || (c.text ? c.text.width + 32 : 0);
      if (cw > w - 32) c.setScale((w - 32) / cw);
    }
    body.setPosition(cx - w / 2 + 28, top + headH + problemH);
    speakButton(this, cx + w / 2 - 30 * ui, top + 30 * ui, 40 * ui, body, { rate: this.speechRate });
    this.autoRead(body);
    button(this, cx, top + h - 40 * ui, Math.min(220 * ui, area.w - 48), 48 * ui, 'Got it!', { variant: 'primary', onClick: () => { Sfx.click(); this.markIntroduced(skill); this.qStartAt = Date.now(); onDone(); } });
    enter(this, k, { from: 'up', distance: 12 });
  }

  /** After a wrong answer: the explanation along the bottom of the play area with a Next button. */
  explanationPanel(area, q, onNext) {
    const { ui } = this;
    const h = Math.min(150 * ui, area.h * 0.38), cy = area.y + area.h - h / 2, cx = area.x + area.w / 2;
    const bw = Math.min(150 * ui, area.w * 0.3);
    card(this, cx, cy, area.w, h, { stroke: THEME.warning, shadow: 'lg' });
    const body = readable(this, area.x + 16, cy, this.explain(q), T.at(this, 15, THEME.ink, { fontStyle: '600' }), { width: area.w - bw - 48 - 44 * ui, align: 'left' }).setOrigin(0, 0.5);
    speakButton(this, area.x + area.w - bw - 36 * ui, cy, 40 * ui, body, { rate: this.speechRate });
    button(this, area.x + area.w - 12 - bw / 2, cy, bw, 48 * ui, 'Next ▶', { variant: 'primary', fontSize: 17, onClick: () => { Sfx.click(); onNext(); } });
    this.autoRead(body);
  }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    this.events.on('pause', () => { this.pauseStart = Date.now(); });
    this.events.on('resume', () => {
      if (this.pauseStart) this.pausedMs += Date.now() - this.pauseStart;
      this.pauseStart = null;
      if (this.onResumed) this.onResumed();
    });
  }

  initState() { return {}; }
  buildGame() {}

  elapsedMs() { return Date.now() - this.startedAt - this.pausedMs; }
  get subject() { return subjectOf(this.payload.subject); }
  get subjectColor() { return this.subject.accent; }

  build() {
    background(this, { accent: this.subject.accent, accent2: this.subject.soft, dots: false });
    // Block pointer events from reaching the paused scene underneath.
    this.add.rectangle(0, 0, this.w, this.h, 0x000000, 0.001).setOrigin(0).setInteractive();
    this.area = this.createFrame();
    if (this.inReview) this.buildReview(this.area); else this.buildGame(this.area);
  }

  /** Transparent header: pause button, title, progress chip and an optional thin progress bar. Returns the play area rect below it. */
  createFrame() {
    const { w, h, ui } = this;
    const sa = safeArea();
    const barH = 56 * ui + sa.top, cy = sa.top + 28 * ui + 2;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, 'II', { fontSize: 15, onClick: () => this.openPause() });
    text(this, w / 2, cy, this.payload.title, T.heading(this));
    this.progressChip = chip(this, w - 12 - sa.right, cy, { text: this.inReview ? 'Review' : this.progressLabel(), originX: 1, color: this.inReview ? THEME.brandSoft : this.subject.soft, textColor: this.inReview ? THEME.brandDark : this.subject.dark, shadow: 'none' });
    const ratio = this.inReview ? null : this.progressRatio();
    let top = barH;
    if (ratio !== null) {
      this.progressBar = new ProgressBar(this, w / 2, barH + 4 * ui, w - 32 - sa.left - sa.right, 6 * ui, { value: ratio, color: this.subject.accent });
      top = barH + 12 * ui;
    }
    const pad = 14;
    return { x: pad + sa.left, y: top + pad, w: w - pad * 2 - sa.left - sa.right, h: h - top - pad * 2 - sa.bottom };
  }

  /** Override to show e.g. "3 / 10". */
  progressLabel() { return ''; }
  /** Override to return 0..1 for the thin bar under the header, or null for none. */
  progressRatio() { return null; }
  refreshProgress() {
    if (this.progressChip && this.progressChip.active) this.progressChip.setText(this.progressLabel());
    const r = this.progressRatio();
    if (r !== null && this.progressBar && this.progressBar.active) this.progressBar.animateTo(r);
  }

  openPause() {
    Sfx.click();
    this.scene.launch(SCENES.Pause, { caller: this.scene.key });
    this.scene.pause();
  }

  /** raw: { correct, total, stars?, levelId?, ... } see Progression.applyResult */
  finish(raw) {
    if (this.finished) return;
    this.finished = true;
    stopSpeech();
    const questions = this.qlog.map(({ skill, right, ms, explained }) => ({ skill, right, ms, explained }));
    const out = {
      timeMs: this.elapsedMs(), questions, seenSkills: [...new Set(this.qlog.map((l) => l.skill).filter(Boolean))],
      missedQuestions: this.qlog.filter((l) => !l.right && l.prompt).map(({ prompt, answer, skill, choices, explain }) => (choices ? { prompt, answer, skill, choices, ...(explain ? { explain } : {}) } : { prompt, answer, skill })),
      reviewed: this.review && this.review.length ? { right: this.reviewRight, total: this.review.length } : undefined,
      ...raw
    };
    this.time.delayedCall(raw.delay ?? 400, () => Launcher.complete(this, this.payload, out));
  }

  abort() { this.finished = true; stopSpeech(); Launcher.abort(this, this.payload); }

  /** Speaking rate for this player, and whether they asked for everything to be read automatically. */
  get speechRate() { return rateFor(this.payload.grade); }
  get autoReads() { return Store.getProfile()?.readAloud === 'auto'; }

  /**
   * Games call this with their prompt (a ReadableText): in automatic mode it is read when the round changes, and
   * then the answers (`choices`) are read too, unless the player turned READ ANSWERS off.
   */
  autoRead(readableText, choices = null) {
    if (!readableText || !this.animateEnter || !this.autoReads) return;
    readQuestionThenAnswers(this, readableText, choices, { rate: this.speechRate });
  }

  /** A small 🔊 in the corner of an answer (w x h, centred on `host`) that reads just that answer. */
  answerSpeaker(host, w, h, words) { return answerSpeaker(this, host, w, h, words, { rate: this.speechRate }); }

  /** Quick screen flash for right/wrong feedback. */
  flash(color, alpha = 0.14) {
    const r = this.add.rectangle(0, 0, this.w, this.h, color, alpha).setOrigin(0).setDepth(900);
    this.tweens.add({ targets: r, alpha: 0, duration: 350, onComplete: () => r.destroy() });
  }
  correctFeedback() { Sfx.correct(); this.flash(THEME.success, 0.14); }
  wrongFeedback() { Sfx.wrong(); this.flash(THEME.danger, 0.14); this.cameras.main.shake(120, 0.004); }
}
