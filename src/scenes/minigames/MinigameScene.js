import { BaseScene } from '../BaseScene.js';
import { SCENES } from '../../constants.js';
import { THEME, subjectOf } from '../../ui/theme.js';
import { Rng } from '../../systems/Rng.js';
import * as Launcher from '../../systems/MinigameLauncher.js';
import { Sfx } from '../../systems/Audio.js';
import { stop as stopSpeech, rateFor } from '../../systems/Speech.js';
import * as Store from '../../systems/Store.js';
import { explainQuestion } from '../../data/explanations.js';
import { skillLabel } from '../../data/skills.js';
import { isNewSkill, markIntroduced } from '../../systems/Practice.js';
import { readable } from '../../ui/ReadableText.js';
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
  }

  // ---- Learning helpers: explanations, worked examples, the question log --------------------

  get noTimers() { return this.payload.timers === false; }
  get profile() { return Store.getProfile(); }
  explain(q) { return explainQuestion(q, this.payload.subject); }

  /** Record an answered question for the log (skill, right, time, whether an explanation was shown). */
  logQuestion(q, right) {
    this.qlog.push({ skill: q.skill, right, ms: Date.now() - this.qStartAt, explained: !right, prompt: String(q.prompt || q.sentence || '').slice(0, 80), answer: String(q.answer ?? '').slice(0, 40) });
    this.qStartAt = Date.now();
  }

  /** Skills the player has never been introduced to get a worked example first. */
  needsIntro(skill) { return !!skill && isNewSkill(this.profile, skill); }
  markIntroduced(skill) { Store.updateProfile((p) => markIntroduced(p, skill)); }

  /** Worked-example card for a brand-new skill, filling the play area. `example` is a solved question's explanation. */
  introPanel(area, skill, example, onDone) {
    const { ui } = this;
    const cx = area.x + area.w / 2, h = Math.min(area.h, 320 * ui), cy = area.y + h / 2;
    const k = card(this, cx, cy, Math.min(area.w, 560 * ui), h, { stroke: this.subject.soft });
    text(this, cx, cy - h / 2 + 34 * ui, `New skill: ${skillLabel(skill)}`, T.heading(this, this.subject.dark));
    text(this, cx, cy - h / 2 + 62 * ui, 'Here is one worked out for you:', T.small(this, THEME.ink2));
    const body = readable(this, cx, cy - 6 * ui, example, T.at(this, 18, THEME.ink, { fontStyle: '600' }), { width: Math.min(area.w, 560 * ui) - 56 });
    speakButton(this, cx + Math.min(area.w, 560 * ui) / 2 - 30 * ui, cy - h / 2 + 34 * ui, 40 * ui, body, { rate: this.speechRate });
    this.autoRead(body);
    button(this, cx, cy + h / 2 - 40 * ui, Math.min(220 * ui, area.w - 48), 48 * ui, 'Got it!', { variant: 'primary', onClick: () => { Sfx.click(); this.markIntroduced(skill); this.qStartAt = Date.now(); onDone(); } });
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
    this.buildGame(this.area);
  }

  /** Transparent header: pause button, title, progress chip and an optional thin progress bar. Returns the play area rect below it. */
  createFrame() {
    const { w, h, ui } = this;
    const sa = safeArea();
    const barH = 56 * ui + sa.top, cy = sa.top + 28 * ui + 2;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, 'II', { fontSize: 15, onClick: () => this.openPause() });
    text(this, w / 2, cy, this.payload.title, T.heading(this));
    this.progressChip = chip(this, w - 12 - sa.right, cy, { text: this.progressLabel(), originX: 1, color: this.subject.soft, textColor: this.subject.dark, shadow: 'none' });
    const ratio = this.progressRatio();
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
      missedQuestions: this.qlog.filter((l) => !l.right && l.prompt).map(({ prompt, answer, skill }) => ({ prompt, answer, skill })),
      ...raw
    };
    this.time.delayedCall(raw.delay ?? 400, () => Launcher.complete(this, this.payload, out));
  }

  abort() { this.finished = true; stopSpeech(); Launcher.abort(this, this.payload); }

  /** Speaking rate for this player, and whether they asked for everything to be read automatically. */
  get speechRate() { return rateFor(this.payload.grade); }
  get autoReads() { return Store.getProfile()?.readAloud === 'auto'; }

  /** Games call this with their prompt (a ReadableText): in automatic mode it is read when the round changes. */
  autoRead(readableText) {
    if (!readableText || !this.animateEnter || !this.autoReads) return;
    this.time.delayedCall(350, () => { if (readableText.active) readableText.read({ rate: this.speechRate }); });
  }

  /** Quick screen flash for right/wrong feedback. */
  flash(color, alpha = 0.14) {
    const r = this.add.rectangle(0, 0, this.w, this.h, color, alpha).setOrigin(0).setDepth(900);
    this.tweens.add({ targets: r, alpha: 0, duration: 350, onComplete: () => r.destroy() });
  }
  correctFeedback() { Sfx.correct(); this.flash(THEME.success, 0.14); }
  wrongFeedback() { Sfx.wrong(); this.flash(THEME.danger, 0.14); this.cameras.main.shake(120, 0.004); }
}
