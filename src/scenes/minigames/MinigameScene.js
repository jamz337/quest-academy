import { BaseScene } from '../BaseScene.js';
import { C, SCENES, SUBJECTS } from '../../constants.js';
import { Rng } from '../../systems/Rng.js';
import * as Launcher from '../../systems/MinigameLauncher.js';
import { Sfx } from '../../systems/Audio.js';
import { T, text } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { background } from '../../ui/Panel.js';

/**
 * Base class for every mini-game.
 * Subclasses implement initState() -> plain object, and buildGame(area) which draws from this.state.
 * Call this.finish(raw) when done. Keep all progress in this.state so rotation (rebuild) never loses it.
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
  get subjectColor() { return SUBJECTS[this.payload.subject]?.color ?? C.blue; }

  build() {
    background(this, C.navy, C.panelDark, this.subjectColor);
    // Block pointer events from reaching the paused scene underneath.
    this.add.rectangle(0, 0, this.w, this.h, 0x000000, 0.001).setOrigin(0).setInteractive();
    this.area = this.createFrame();
    this.buildGame(this.area);
  }

  /** Top bar with pause button, title and a progress label. Returns the play area rect below it. */
  createFrame() {
    const { w, ui } = this;
    const barH = 52 * ui;
    this.add.rectangle(0, 0, w, barH, this.subjectColor, 1).setOrigin(0);
    this.add.rectangle(0, barH, w, 4, 0x000000, 0.25).setOrigin(0);
    button(this, 34 * ui, barH / 2, 52 * ui, 38 * ui, 'II', { color: C.panelDark, fontSize: 16, onClick: () => this.openPause() });
    text(this, w / 2, barH / 2, this.payload.title, T.heading(this, C.white));
    this.progressText = text(this, w - 16, barH / 2, this.progressLabel(), T.bodyBold(this, C.white)).setOrigin(1, 0.5);
    const pad = 12;
    return { x: pad, y: barH + pad, w: w - pad * 2, h: this.h - barH - pad * 2 };
  }

  /** Override to show e.g. "3 / 10". */
  progressLabel() { return ''; }
  refreshProgress() { if (this.progressText && this.progressText.active) this.progressText.setText(this.progressLabel()); }

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
  flash(color, alpha = 0.25) {
    const r = this.add.rectangle(0, 0, this.w, this.h, color, alpha).setOrigin(0).setDepth(900);
    this.tweens.add({ targets: r, alpha: 0, duration: 350, onComplete: () => r.destroy() });
  }
  correctFeedback() { Sfx.correct(); this.flash(C.lime, 0.18); }
  wrongFeedback() { Sfx.wrong(); this.flash(C.red, 0.18); this.cameras.main.shake(120, 0.004); }
}
