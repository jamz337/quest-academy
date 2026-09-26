import Phaser from 'phaser';
import { C, hex } from '../constants.js';
import { Sfx } from '../systems/Audio.js';
import { uiScale } from '../systems/Layout.js';
import { FONT, WEIGHT } from './TextStyles.js';

function darken(color, f = 0.6) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(c.red * f, c.green * f, c.blue * f);
}

/** Rounded, chunky button with a drop shadow, outline, press feedback and click sound. */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, opts = {}) {
    super(scene, x, y);
    const { color = C.blue, textColor = C.white, onClick = null, fontSize = 20, radius = 14, icon = null, disabled = false, wrap = false } = opts;
    this.w = w; this.h = h; this.color = color; this.radius = radius; this.disabledState = disabled;
    this.shadow = scene.add.graphics();
    this.face = scene.add.graphics();
    this.add([this.shadow, this.face]);
    this.drawFace(0);
    const s = uiScale(scene);
    const st = { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: hex(textColor), fontStyle: WEIGHT.bold, align: 'center' };
    if (wrap) st.wordWrap = { width: w - 20 };
    if (icon) {
      this.icon = scene.add.image(-w / 2 + 28, 0, icon).setScale(0.6);
      this.add(this.icon);
    }
    this.label = scene.add.text(icon ? 14 : 0, 0, label, st).setOrigin(0.5);
    this.add(this.label);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => { if (this.disabledState) return; this.pressed = true; this.drawFace(1); });
    const release = () => { if (!this.pressed) return; this.pressed = false; this.drawFace(0); };
    this.on('pointerout', release);
    this.on('pointerup', () => {
      if (this.disabledState || !this.pressed) return;
      release(); Sfx.click();
      if (onClick) onClick(this);
    });
    if (disabled) this.setAlpha(0.45);
    scene.add.existing(this);
  }

  drawFace(pressedOffset) {
    const { w, h, radius } = this;
    const dy = pressedOffset ? 3 : 0;
    this.shadow.clear(); this.face.clear();
    this.shadow.fillStyle(0x000000, 0.25);
    this.shadow.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, radius);
    this.shadow.fillStyle(darken(this.color, 0.55), 1);
    this.shadow.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, radius);
    this.face.fillStyle(this.color, 1);
    this.face.fillRoundedRect(-w / 2, -h / 2 + dy, w, h - 2, radius);
    this.face.fillStyle(0xffffff, 0.2);
    this.face.fillRoundedRect(-w / 2 + 4, -h / 2 + dy + 3, w - 8, h * 0.38, Math.max(4, radius - 4));
    this.face.lineStyle(2, darken(this.color, 0.5), 0.9);
    this.face.strokeRoundedRect(-w / 2 + 1, -h / 2 + dy + 1, w - 2, h - 4, radius);
    if (this.label) this.label.y = dy;
    if (this.icon) this.icon.y = dy;
  }

  setLabel(str) { this.label.setText(str); return this; }
  setEnabled(on) { this.disabledState = !on; this.setAlpha(on ? 1 : 0.45); return this; }
  setColor(color) { this.color = color; this.drawFace(0); return this; }
}

export function button(scene, x, y, w, h, label, opts) { return new Button(scene, x, y, w, h, label, opts); }
