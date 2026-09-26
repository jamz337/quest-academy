import Phaser from 'phaser';
import { THEME, hex, textOn, drawShadow } from './theme.js';
import { Sfx } from '../systems/Audio.js';
import { FONT, WEIGHT } from './TextStyles.js';

/**
 * Centred rounded surface as a Container, so children can be added relative to its middle and it can scale on press.
 * opts: color, alpha, radius, stroke, strokeWidth, shadow ('none'|'sm'|'md'|'lg'), onTap, depth.
 * Never exposes `.label` (only Button does), so tests can tell buttons and cards apart.
 */
export class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    const { color = THEME.surface, alpha = 1, radius = THEME.radius.md, stroke = null, strokeWidth = 2, shadow = 'md', onTap = null, depth } = opts;
    this.w = w; this.h = h;
    this.look = { color, alpha, radius, stroke, strokeWidth, shadow };
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.draw();
    if (depth !== undefined) this.setDepth(depth);
    this.setSize(w, h);
    if (onTap) this.setTap(onTap);
    scene.add.existing(this);
  }

  draw() {
    const { w, h } = this, { color, alpha, radius, stroke, strokeWidth, shadow } = this.look;
    const r = Math.min(radius, Math.min(w, h) / 2);
    const g = this.bg;
    g.clear();
    if (alpha >= 0.9) drawShadow(g, -w / 2, -h / 2, w, h, r, shadow);
    g.fillStyle(color, alpha); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    if (stroke !== null) {
      g.lineStyle(strokeWidth, stroke, 1);
      g.strokeRoundedRect(-w / 2 + strokeWidth / 2, -h / 2 + strokeWidth / 2, w - strokeWidth, h - strokeWidth, Math.max(2, r - strokeWidth / 2));
    }
  }

  setLook(partial) { Object.assign(this.look, partial); this.draw(); return this; }

  setTap(fn) {
    this.onTap = fn;
    if (!fn) return this;
    if (!this.input) this.setInteractive({ useHandCursor: true });
    if (this.tapWired) return this;
    this.tapWired = true;
    this.on('pointerdown', () => {
      if (!this.onTap) return;
      this.pressed = true;
      this.scene.tweens.add({ targets: this, scale: 0.97, duration: THEME.motion.fast, ease: 'Quad.Out' });
    });
    const release = () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.scene.tweens.add({ targets: this, scale: 1, duration: 200, ease: 'Back.Out' });
    };
    this.on('pointerout', release);
    this.on('pointerup', () => { if (!this.pressed) return; release(); Sfx.click(); if (this.onTap) this.onTap(this); });
    return this;
  }
}

export function card(scene, x, y, w, h, opts) { return new Card(scene, x, y, w, h, opts); }

/**
 * Rectangular tile with one bold label in the middle (`.text`). `empty` draws a sunken slot instead.
 * opts: color, textColor, fontSize (px), empty, onTap, radius, stroke, shadow, weight.
 */
export function plank(scene, x, y, w, h, label, opts = {}) {
  const { color = THEME.surface, textColor, fontSize = Math.min(w, h) * 0.5, empty = false, onTap = null, radius = THEME.radius.sm, stroke, shadow, weight = WEIGHT.heavy } = opts;
  const c = new Card(scene, x, y, w, h, empty
    ? { color: THEME.sunken, stroke: stroke ?? THEME.lineStrong, shadow: 'none', radius }
    : { color, stroke: stroke ?? (color === THEME.surface ? THEME.line : null), shadow: shadow ?? 'sm', radius });
  if (onTap) c.setTap(onTap);
  const fill = empty ? THEME.sunken : color;
  c.text = scene.add.text(0, 0, label ?? '', { fontFamily: FONT, fontSize: Math.round(fontSize) + 'px', color: hex(textColor ?? (empty ? THEME.ink3 : textOn(fill))), fontStyle: weight, align: 'center' }).setOrigin(0.5);
  c.add(c.text);
  c.setText = (t) => { c.text.setText(t); return c; };
  return c;
}

/** Square tile (letters, numbers). */
export function tile(scene, x, y, size, label, opts = {}) { return plank(scene, x, y, size, size, label, opts); }
