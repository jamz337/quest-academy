import { BaseScene } from '../BaseScene.js';
import { SCENES } from '../../constants.js';
import { THEME, subjectOf } from '../../ui/theme.js';
import { Rng } from '../../systems/Rng.js';
import * as Launcher from '../../systems/MinigameLauncher.js';
import { Sfx } from '../../systems/Audio.js';
import { safeArea } from '../../systems/Layout.js';
import { T, text } from '../../ui/TextStyles.js';
import { iconButton } from '../../ui/Button.js';
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
    this.state = this.initState();
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
    const out = { timeMs: this.elapsedMs(), ...raw };
    this.time.delayedCall(raw.delay ?? 400, () => Launcher.complete(this, this.payload, out));
  }

  abort() { this.finished = true; Launcher.abort(this, this.payload); }

  /** Quick screen flash for right/wrong feedback. */
  flash(color, alpha = 0.14) {
    const r = this.add.rectangle(0, 0, this.w, this.h, color, alpha).setOrigin(0).setDepth(900);
    this.tweens.add({ targets: r, alpha: 0, duration: 350, onComplete: () => r.destroy() });
  }
  correctFeedback() { Sfx.correct(); this.flash(THEME.success, 0.14); }
  wrongFeedback() { Sfx.wrong(); this.flash(THEME.danger, 0.14); this.cameras.main.shake(120, 0.004); }
}
