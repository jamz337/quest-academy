import Phaser from 'phaser';
import { THEME } from './theme.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Pill progress bar. `set()` updates immediately, `animateTo()` eases to a new value. */
export class ProgressBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    this.w = w; this.h = h;
    this.color = opts.color ?? THEME.success;
    this.track = opts.track ?? THEME.line;
    this.bg = scene.add.graphics();
    this.fg = scene.add.graphics();
    this.add([this.bg, this.fg]);
    this.bg.fillStyle(this.track, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.ratio = clamp01(opts.value ?? 1);
    this.draw();
    scene.add.existing(this);
  }
  draw() {
    this.fg.clear();
    if (this.ratio > 0) {
      const fw = Math.max(this.h, this.w * this.ratio);
      this.fg.fillStyle(this.color, 1).fillRoundedRect(-this.w / 2, -this.h / 2, fw, this.h, this.h / 2);
    }
    return this;
  }
  set(ratio, color) {
    if (color !== undefined) this.color = color;
    this.ratio = clamp01(ratio);
    return this.draw();
  }
  animateTo(ratio, color, duration = THEME.motion.enter) {
    if (color !== undefined) this.color = color;
    this.scene.tweens.add({ targets: this, ratio: clamp01(ratio), duration, ease: 'Cubic.Out', onUpdate: () => this.draw(), onComplete: () => this.draw() });
    return this;
  }
}
