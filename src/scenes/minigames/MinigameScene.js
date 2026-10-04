import { BaseScene } from '../BaseScene.js';
import { SCENES } from '../../constants.js';
import { THEME, subjectOf } from '../../ui/theme.js';
import { Rng } from '../../systems/Rng.js';
import * as Launcher from '../../systems/MinigameLauncher.js';
import { Sfx } from '../../systems/Audio.js';
import { stop as stopSpeech, rateFor } from '../../systems/Speech.js';
import * as Store from '../../systems/Store.js';
import { explainQuestion, explainSteps } from '../../data/explanations.js';
import { isNewSkill, markIntroduced, prioritiseWeak, weakSkills } from '../../systems/Practice.js';
import { rampTargets, rampFor, rampOrder } from '../../systems/Ramp.js';
import { dueReviews, recordReview } from '../../systems/Review.js';
import { grid } from '../../systems/Layout.js';
import { readable } from '../../ui/ReadableText.js';
import { answerSpeaker, readQuestionThenAnswers } from '../../ui/AnswerSpeech.js';
import { introState, skillIntro } from '../../ui/SkillIntro.js';
import { explainState, explainPanel } from '../../ui/Explain.js';
import { button, iconButton, speakButton } from '../../ui/Button.js';
import { card } from '../../ui/Card.js';
import { enter } from '../../ui/motion.js';
import { safeArea, pointerPos } from '../../systems/Layout.js';
import { buddy, newBuddyMood, setMood } from '../../ui/Buddy.js';
import { fxLayer } from '../FxScene.js';
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
    this.buddyMood = newBuddyMood();   // Mango's mood, kept across rebuilds (ui/Buddy.js)
    this.streakRun = 0;                // right answers in a row, for the big celebrations
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
    const reveal = this.reviewPicked === null || this.reviewPicked === -2 || this.answerRevealed(q);
    text(this, cx, area.y + 48 * ui, this.reviewPicked === null ? 'You missed this one last time. Try again!' : this.reviewPicked === -2 ? 'Yes! That one is sticking.' : reveal ? `The answer is ${q.answer}.` : "Not this time. Let's see why.", T.small(this, THEME.ink2));
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
      if (this.reviewPicked !== null) { if (choice === q.answer && reveal) variant = 'success'; else if (i === this.reviewPicked) variant = 'danger'; else faded = reveal; }
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

  /**
   * The interactive New Skill page in this game's look. The first time a round of a new skill comes up, `makeExample`
   * (skill -> { problem, steps, practice }) builds the page; it stays (in state.intro) until the child finishes or
   * skips it. Returns true while it is on screen, so buildGame can return straight after.
   */
  skillIntroFor(area, skill, makeExample, theme) {
    const s = this.state;
    s.introduced ||= {};
    if (!s.intro && !s.introduced[skill] && this.needsIntro(skill)) {
      s.introduced[skill] = true;
      const ex = makeExample(skill);
      s.intro = ex ? introState(skill, ex) : null;
    }
    if (!s.intro) return false;
    skillIntro(this, area, s.intro, theme, {
      change: () => this.rebuild(),
      done: () => {
        this.markIntroduced(s.intro.skill);
        s.intro = null;
        this.qStartAt = Date.now();
        if ('qStart' in s) s.qStart = Date.now();
        this.rebuild();
      }
    });
    return true;
  }
  markIntroduced(skill) { Store.updateProfile((p) => markIntroduced(p, skill)); }

  /** The game's look for its New Skill page and "Let's see why" panel (see ui/SkillIntro.js); null = the plain look. */
  get lessonTheme() { return null; }

  /**
   * After a wrong answer: "Let's see why" along the bottom of the play area, the working a step per tap and then the
   * child's own pick of the right answer (ui/Explain.js). Its progress survives a rebuild of the same question.
   */
  explanationPanel(area, q, onNext) {
    const key = this.explainKey(q);
    if (!this.explainIt || this.explainIt.key !== key) this.explainIt = explainState(key, this.steps(q), q);
    explainPanel(this, area, this.explainIt, this.lessonTheme, {
      next: () => { this.explainIt = null; onNext(); },
      solved: () => this.rebuild()   // the board can show the right answer now
    });
  }

  explainKey(q) { return `${this.inReview ? 'r' + this.reviewIdx : 'q' + (this.state && this.state.idx)}|${q.prompt}|${q.answer}`; }

  /**
   * After a wrong answer, may the board show the right one? Not while the child is still working it out in
   * "Let's see why" (they pick it themselves at the end); yes once they have, or when the panel has nothing to pick.
   * `q` is the question as given to explanationPanel.
   */
  answerRevealed(q) {
    const it = this.explainIt;
    if (it && it.key === this.explainKey(q)) return it.phase === 'done' || !it.choices;
    return !explainState('', [], q).choices;
  }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    fxLayer(this);   // start the celebration layer now, so it is ready by the first answer
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
    // Mango beside the pause button: he reacts to every answer.
    this.buddy = buddy(this, 12 + sa.left + 44 * ui + 26 * ui, cy + 22 * ui, 46 * ui, this.buddyMood);
    this.buddy.react();
    this.progressChip = chip(this, w - 12 - sa.right, cy, { text: this.inReview ? 'Review' : this.progressLabel(), originX: 1, color: this.inReview ? THEME.brandSoft : this.subject.soft, textColor: this.inReview ? THEME.brandDark : this.subject.dark, shadow: 'none' });
    // The title keeps clear of Mango on the left and the progress chip on the right.
    const title = text(this, w / 2, cy, this.payload.title, T.heading(this));
    const side = Math.max(12 + sa.left + 44 * ui + 52 * ui, 12 + sa.right + (this.progressChip.width || 70) + 8);
    const room = w - side * 2;
    if (title.width && title.width > room && room > 40) title.setScale(Math.max(0.6, room / title.width));
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
  get autoReads() { return Store.getProfile()?.readAloud === 'auto' || !!this.payload.early; }   // Pre-K and K hear everything

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
  /**
   * A right answer: the sound and flash, Mango cheers, stars fly from the answer to the score, and a streak of
   * 3, 5, 10, 15… brings a big "WOW!" with confetti.
   */
  correctFeedback() {
    Sfx.correct(); this.flash(THEME.success, 0.14);
    this.streakRun = (this.streakRun || 0) + 1;
    const run = this.streakRun, wow = run === 3 || (run >= 5 && run % 5 === 0);
    setMood(this.buddyMood || (this.buddyMood = newBuddyMood()), wow ? 'wow' : 'cheer');
    if (this.buddy && this.buddy.c && this.buddy.c.active) { const b = this.buddy; this.buddy = buddy(this, b.c.x, b.c.y, 46 * this.ui, this.buddyMood); b.c.destroy(); this.buddy.react(); }
    this.celebrate(wow, run);
  }

  /** A miss: the sound, flash and shake, the streak resets and Mango scratches his head. */
  wrongFeedback() {
    Sfx.wrong(); this.flash(THEME.danger, 0.14); this.cameras.main.shake(120, 0.004);
    this.streakRun = 0;
    setMood(this.buddyMood || (this.buddyMood = newBuddyMood()), 'oops');
    if (this.buddy && this.buddy.c && this.buddy.c.active) { const b = this.buddy; this.buddy = buddy(this, b.c.x, b.c.y, 46 * this.ui, this.buddyMood); b.c.destroy(); this.buddy.react(); }
  }

  /** Stars from where the child tapped (or the middle) to the progress chip; a streak adds the banner and confetti. */
  celebrate(wow, run) {
    const fx = fxLayer(this);
    if (!fx) return;
    const p = this.input && this.input.activePointer ? pointerPos(this, this.input.activePointer) : null;
    const from = p && (p.x || p.y) ? p : { x: this.w / 2, y: this.h / 2 };
    const chip = this.progressChip;
    const to = chip && chip.active ? { x: chip.x - (chip.width || 60) / 2, y: chip.y } : { x: this.w - 40, y: 30 };
    fx.starBurst(from.x, from.y, to.x, to.y, wow ? 8 : 5);
    if (wow) {
      this.time.delayedCall(250, () => Sfx.fanfare());
      fx.banner(run >= 5 ? `WOW! ${run} in a row! 🔥` : `${run} in a row! 🔥`, run >= 10 ? THEME.brand : THEME.warning);
      fx.confetti(run >= 10 ? 90 : 60);
    }
  }
}
