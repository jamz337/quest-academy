import Phaser from 'phaser';
import { THEME, METALS, hex, mix, lighten, darken, textOn, subjectOf, drawShadow, shadeRoundedRect } from './theme.js';
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
  soft: (o) => ({ fill: subjectOf(o.subject).soft, text: subjectOf(o.subject).dark, stroke: null, shadow: 'none' }),
  // The two controls every game shares, the same everywhere so children learn them once:
  // go = the step forward (Next, Got it!, Check), always green; helper = a side action (help, start over, back, skip).
  go: () => ({ fill: THEME.success, text: THEME.onAccent, stroke: THEME.successDark, shadow: 'md' }),
  helper: () => ({ fill: METALS.silver[1], text: METALS.silver[4], stroke: null, shadow: 'sm', metal: 'silver' }),
  // Brushed-metal finishes (see METALS): opts.variant 'silver' | 'bronze' | 'gunmetal' | 'steel'.
  silver: () => ({ fill: METALS.silver[1], text: METALS.silver[4], stroke: null, shadow: 'sm', metal: 'silver' }),
  bronze: () => ({ fill: METALS.bronze[1], text: METALS.bronze[4], stroke: null, shadow: 'sm', metal: 'bronze' }),
  gunmetal: () => ({ fill: METALS.gunmetal[1], text: METALS.gunmetal[4], stroke: null, shadow: 'sm', metal: 'gunmetal' }),
  steel: () => ({ fill: METALS.steel[1], text: METALS.steel[4], stroke: null, shadow: 'sm', metal: 'steel' })
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
      selected = false, selectedAccent = THEME.primary, shadow, compact = false
    } = opts;
    // Never shorter than a child's fingertip needs, except in a `compact` grid whose rows are sized to fit the screen.
    if (!compact) h = Math.max(h, 40 * uiScale(scene));
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
    const metal = !this.selected && look.metal ? METALS[look.metal] : null;
    // Coloured buttons are glossy: shaded top to bottom, a thin light inner edge and a glow in their own colour.
    const glossy = !metal && !this.selected && fill !== null && fill !== THEME.surface && look.gloss !== false;
    if (metal || glossy) {
      const g = this.face, x = -w / 2, y = -h / 2;
      const base = pressed ? darken(fill, 0.9) : fill;
      if (glossy && look.shadow !== 'none') {
        this.shadow.clear();
        const spread = pressed ? 1 : 3;
        this.shadow.fillStyle(fill, 0.16); this.shadow.fillRoundedRect(x - spread, y - spread + (pressed ? 2 : 6), w + spread * 2, h + spread * 2, r + spread);
        this.shadow.fillStyle(fill, 0.22); this.shadow.fillRoundedRect(x - 1, y - 1 + (pressed ? 1 : 3), w + 2, h + 2, r + 1);
      }
      if (metal) { g.fillStyle(metal[3], 1); g.fillRoundedRect(x, y, w, h, r); shadeRoundedRect(g, x + 2, y + 2, w - 4, h - 4, Math.max(2, r - 2), pressed ? [metal[1], metal[1], metal[2]] : [metal[0], metal[1], metal[2]]); }
      else shadeRoundedRect(g, x, y, w, h, r, [lighten(base, 0.14), darken(base, 0.86)]);
      g.fillStyle(0xffffff, metal ? 0.5 : 0.28); g.fillRoundedRect(x + r * 0.6, y + (metal ? 3 : 2), w - r * 1.2, 2, 1);   // the light catching the top edge
      if (!metal) { g.lineStyle(1.5, 0xffffff, 0.5); g.strokeRoundedRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, Math.max(2, r - 0.75)); }
    } else if (fill !== null) {
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
  size = Math.max(size, 40 * s);   // round buttons (pause, read aloud) stay big enough to hit
  return new Button(scene, x, y, size, size, glyph, { variant: 'secondary', radius: size / 2, fontSize: (size / s) * 0.42, ...opts });
}

/**
 * Round 🔊 button that reads aloud. `source` is a ReadableText (its words light up as they are spoken),
 * a string, or a function returning either. Returns null (draws nothing) when the browser cannot speak.
 */
export function speakButton(scene, x, y, size, source, opts = {}) {
  if (!canSpeak()) return null;
  const { rate, voice, speaker, pitch, ...rest } = opts;
  const how = { rate, ...(voice ? { voice } : {}), ...(speaker ? { speaker } : {}), ...(pitch ? { pitch } : {}) };
  return iconButton(scene, x, y, size, '🔊', {
    variant: 'ghost', ...rest,
    onClick: () => { const s = typeof source === 'function' ? source() : source; if (s && typeof s.read === 'function') s.read(how); else speak(s, how); }
  });
}
