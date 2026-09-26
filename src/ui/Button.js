import Phaser from 'phaser';
import { THEME, hex, mix, textOn, subjectOf, drawShadow } from './theme.js';
import { Sfx } from '../systems/Audio.js';
import { uiScale } from '../systems/Layout.js';
import { FONT, WEIGHT } from './TextStyles.js';
import { canSpeak, speak } from '../systems/Speech.js';

const VARIANTS = {
  primary: () => ({ fill: THEME.primary, text: THEME.onAccent, stroke: null, shadow: 'sm' }),
  secondary: () => ({ fill: THEME.surface, text: THEME.ink, stroke: THEME.line, shadow: 'sm' }),
  ghost: () => ({ fill: null, text: THEME.ink2, stroke: null, shadow: 'none' }),
  danger: () => ({ fill: THEME.danger, text: THEME.onAccent, stroke: null, shadow: 'sm' }),
  success: () => ({ fill: THEME.success, text: THEME.onAccent, stroke: null, shadow: 'sm' }),
  warning: () => ({ fill: THEME.warning, text: THEME.ink, stroke: null, shadow: 'sm' }),
  brand: () => ({ fill: THEME.brand, text: THEME.onAccent, stroke: null, shadow: 'sm' }),
  subject: (o) => ({ fill: subjectOf(o.subject).accent, text: textOn(subjectOf(o.subject).accent), stroke: null, shadow: 'sm' }),
  soft: (o) => ({ fill: subjectOf(o.subject).soft, text: subjectOf(o.subject).dark, stroke: null, shadow: 'none' })
};

const stop = (ev) => { if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation(); };

/**
 * Flat rounded button with a soft shadow, a press "squish" and a click sound.
 * opts: variant (primary|secondary|ghost|danger|success|warning|brand|subject|soft), subject, color (custom fill),
 * textColor, onClick, fontSize (design px), radius, icon (texture key), emoji, sub (second line), disabled, wrap,
 * selected, selectedAccent. Keeps `.label` (a Text) so tests can find buttons by their label.
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, opts = {}) {
    super(scene, x, y);
    const {
      variant = opts.color !== undefined ? 'custom' : 'primary', color, textColor, onClick = null, fontSize = 17,
      radius = THEME.radius.md, icon = null, emoji = null, sub = null, disabled = false, wrap = false,
      selected = false, selectedAccent = THEME.primary, shadow
    } = opts;
    this.w = w; this.h = h; this.radius = Math.min(radius, Math.min(w, h) / 2);
    this.disabledState = disabled; this.onClick = onClick; this.selected = selected; this.selectedAccent = selectedAccent;
    const look = variant === 'custom'
      ? { fill: color, text: textColor ?? textOn(color), stroke: null, shadow: 'sm' }
      : (VARIANTS[variant] || VARIANTS.primary)(opts);
    if (textColor !== undefined) look.text = textColor;
    if (shadow) look.shadow = shadow;
    this.look = look; this.color = look.fill;
    this.shadow = scene.add.graphics();
    this.face = scene.add.graphics();
    this.add([this.shadow, this.face]);

    const s = uiScale(scene);
    const st = { fontFamily: FONT, fontSize: Math.round(fontSize * s) + 'px', color: hex(this.textColor()), fontStyle: WEIGHT.bold, align: 'center' };
    if (wrap) st.wordWrap = { width: w - 24 };
    let lx = 0;
    if (icon) {
      this.icon = scene.add.image(-w / 2 + 26 * s, 0, icon).setDisplaySize(24 * s, 24 * s);
      this.add(this.icon); lx = 12 * s;
    } else if (emoji) {
      this.emoji = scene.add.text(-w / 2 + 26 * s, 0, emoji, { fontSize: Math.round(fontSize * 1.15 * s) + 'px' }).setOrigin(0.5);
      this.add(this.emoji); lx = 12 * s;
    }
    this.label = scene.add.text(lx, sub ? -fontSize * 0.5 * s : 0, label, st).setOrigin(0.5);
    this.add(this.label);
    if (sub) {
      this.sub = scene.add.text(lx, fontSize * 0.65 * s, sub, { ...st, fontSize: Math.round(fontSize * 0.72 * s) + 'px', fontStyle: WEIGHT.normal }).setOrigin(0.5).setAlpha(0.85);
      this.add(this.sub);
    }
    this.drawFace(0);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p, lx2, ly2, ev) => {
      stop(ev);
      if (this.disabledState) return;
      this.pressed = true; this.drawFace(1);
      scene.tweens.add({ targets: this, scale: THEME.motion.press, duration: THEME.motion.fast, ease: 'Quad.Out' });
    });
    const release = () => {
      if (!this.pressed) return;
      this.pressed = false; this.drawFace(0);
      scene.tweens.add({ targets: this, scale: 1, duration: 200, ease: 'Back.Out' });
    };
    this.on('pointerout', release);
    this.on('pointerup', (p, lx2, ly2, ev) => {
      stop(ev);
      if (this.disabledState || !this.pressed) return;
      release(); Sfx.click();
      if (this.onClick) this.onClick(this);
    });
    if (disabled) this.setAlpha(0.45);
    scene.add.existing(this);
  }

  textColor() {
    if (this.selected) return mix(this.selectedAccent, THEME.ink, 0.35);
    return this.look.text;
  }

  drawFace(pressed) {
    const { w, h, radius: r, look } = this;
    this.shadow.clear(); this.face.clear();
    if (look.shadow !== 'none') {
      if (pressed) { this.shadow.fillStyle(THEME.shadow.color, 0.08); this.shadow.fillRoundedRect(-w / 2, -h / 2 + 1, w, h, r); }
      else drawShadow(this.shadow, -w / 2, -h / 2, w, h, r, look.shadow);
    }
    let fill = look.fill, stroke = look.stroke, strokeW = 2;
    if (this.selected) { fill = mix(this.selectedAccent, 0xffffff, 0.82); stroke = this.selectedAccent; strokeW = 3; }
    if (fill !== null) {
      this.face.fillStyle(pressed ? mix(fill, THEME.ink, 0.12) : fill, 1);
      this.face.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    } else if (pressed) {
      this.face.fillStyle(THEME.ink, 0.06);
      this.face.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    }
    if (stroke !== null) {
      this.face.lineStyle(strokeW, stroke, 1);
      this.face.strokeRoundedRect(-w / 2 + strokeW / 2, -h / 2 + strokeW / 2, w - strokeW, h - strokeW, Math.max(2, r - strokeW / 2));
    }
    if (this.label) this.label.setColor(hex(this.textColor()));
    if (this.sub) this.sub.setColor(hex(this.textColor()));
  }

  setLabel(str) { this.label.setText(str); return this; }
  setEnabled(on) { this.disabledState = !on; this.setAlpha(on ? 1 : 0.45); return this; }
  setColor(color, textColor) {
    this.look.fill = color; this.color = color;
    this.look.text = textColor ?? textOn(color);
    this.drawFace(0); return this;
  }
  setSelected(on) { this.selected = !!on; this.drawFace(0); return this; }
  setSub(str) { if (this.sub) this.sub.setText(str); return this; }
}

export function button(scene, x, y, w, h, label, opts) { return new Button(scene, x, y, w, h, label, opts); }

/** Round secondary button showing a single glyph (back arrow, pause, edit, menu). Returns a real Button so tests can find it by label. */
export function iconButton(scene, x, y, size, glyph, opts = {}) {
  const s = uiScale(scene);
  return new Button(scene, x, y, size, size, glyph, { variant: 'secondary', radius: size / 2, fontSize: (size / s) * 0.42, ...opts });
}

/**
 * Round 🔊 button that reads aloud. `source` is a ReadableText (its words light up as they are spoken),
 * a string, or a function returning either. Returns null (draws nothing) when the browser cannot speak.
 */
export function speakButton(scene, x, y, size, source, opts = {}) {
  if (!canSpeak()) return null;
  const { rate, ...rest } = opts;
  return iconButton(scene, x, y, size, '🔊', {
    variant: 'ghost', ...rest,
    onClick: () => { const s = typeof source === 'function' ? source() : source; if (s && typeof s.read === 'function') s.read({ rate }); else speak(s, { rate }); }
  });
}
