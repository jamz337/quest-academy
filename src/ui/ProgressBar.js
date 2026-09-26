import Phaser from 'phaser';
import { C } from '../constants.js';

export class ProgressBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    this.w = w; this.h = h;
    this.color = opts.color ?? C.lime;
    this.bg = scene.add.graphics();
    this.fg = scene.add.graphics();
    this.add([this.bg, this.fg]);
    this.bg.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.set(opts.value ?? 1);
    scene.add.existing(this);
  }
  set(ratio, color) {
    if (color !== undefined) this.color = color;
    const r = Math.max(0, Math.min(1, ratio));
    this.fg.clear();
    if (r > 0) {
      const fw = Math.max(this.h, this.w * r);
      this.fg.fillStyle(this.color, 1).fillRoundedRect(-this.w / 2, -this.h / 2, fw, this.h, this.h / 2);
    }
    return this;
  }
}
