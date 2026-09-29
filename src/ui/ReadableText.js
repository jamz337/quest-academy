import Phaser from 'phaser';
import { THEME, hex } from './theme.js';
import { speakWords, canSpeak } from '../systems/Speech.js';

/**
 * A block of text laid out one word at a time so each word can light up as it is read aloud.
 * Behaves like a Text for placement: setOrigin(), width/height, and `style` is a normal Phaser text style.
 * opts: { width (wrap width), align: 'center'|'left', lineGap, highlight (colour number) }
 */
export class ReadableText extends Phaser.GameObjects.Container {
  constructor(scene, x, y, str, style, opts = {}) {
    super(scene, x, y);
    this.str = String(str || '');
    this.style = style;
    this.opts = { width: 400, align: 'center', lineGap: 4, highlight: THEME.gold, ...opts };
    this.ox = 0.5; this.oy = 0.5;   // origin, like a Text (Container's own originX is read-only)
    this.words = [];
    this.hl = scene.add.graphics();
    this.add(this.hl);
    this.layout();
    scene.add.existing(this);
  }

  /** Lay the words out line by line, wrapping at opts.width and honouring explicit newlines. */
  layout() {
    const { width, align, lineGap } = this.opts;
    this.words.forEach((w) => w.destroy());
    this.words = [];
    const lines = [];
    let lineH = 0;
    for (const para of this.str.split('\n')) {
      let line = [], lineW = 0;
      const tokens = para.split(/\s+/).filter(Boolean);
      if (!tokens.length) { lines.push([]); continue; }
      for (const tok of tokens) {
        const t = this.scene.add.text(0, 0, tok, this.style).setOrigin(0, 0);
        lineH = Math.max(lineH, t.height);
        const space = line.length ? lineH * 0.3 : 0;
        if (line.length && lineW + space + t.width > width) { lines.push(line); line = []; lineW = 0; }
        t.gap = line.length ? space : 0;
        line.push(t); lineW += t.gap + t.width;
        this.words.push(t); this.add(t);
      }
      lines.push(line);
    }
    const rowH = lineH + lineGap;
    const totalH = lines.length * rowH - lineGap;
    const totalW = Math.max(0, ...lines.map((l) => l.reduce((s, t) => s + t.gap + t.width, 0)));
    this.setSize(totalW, totalH);
    const ox = -this.ox * totalW, oy = -this.oy * totalH;
    lines.forEach((line, li) => {
      const lw = line.reduce((s, t) => s + t.gap + t.width, 0);
      let x = align === 'center' ? ox + (totalW - lw) / 2 : ox;
      for (const t of line) { x += t.gap; t.setPosition(x, oy + li * rowH); x += t.width; }
    });
  }

  setOrigin(ox, oy = ox) { this.ox = ox; this.oy = oy; this.layout(); return this; }
  get text() { return this.str; }
  get wordTexts() { return this.words.map((t) => t.text); }

  /** Light up word i (or clear with -1). */
  highlight(i) {
    if (!this.active || !this.hl || !this.hl.active) return;
    this.hl.clear();
    this.words.forEach((t, j) => { if (t.active) t.setColor(j === i ? hex(THEME.ink) : this.style.color || hex(THEME.ink)); });
    const t = this.words[i];
    if (!t || !t.active) return;
    this.hl.fillStyle(this.opts.highlight, 0.45);
    this.hl.fillRoundedRect(t.x - 4, t.y - 1, t.width + 8, t.height + 2, 6);
    this.bringToTop(t);
  }

  clear() { this.highlight(-1); }

  /** Read this text aloud with the words lighting up. Returns the speech handle or null. */
  read(opts = {}) {
    if (!canSpeak()) return null;
    const { onEnd, ...rest } = opts;
    return speakWords(this.wordTexts, { ...rest, onWord: (i) => this.highlight(i), onEnd: (cancelled) => { this.clear(); if (onEnd) onEnd(cancelled); } });
  }
}

export const readable = (scene, x, y, str, style, opts) => new ReadableText(scene, x, y, str, style, opts);
