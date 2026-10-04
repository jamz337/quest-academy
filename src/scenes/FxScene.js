import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { THEME, hex } from '../ui/theme.js';
import { fitCamera, viewport, uiScale } from '../systems/Layout.js';
import { FONT, WEIGHT } from '../ui/TextStyles.js';

const CONFETTI = [0xff5c6c, 0xffc531, 0x2ec46a, 0x3d8bff, 0x9b5cf6, 0xff6fae];

/**
 * A see-through layer above the mini-games for celebrations: stars that fly from an answer to the score, a big
 * "WOW!" banner and confetti. Games redraw themselves after every answer, which would cut these short, so they
 * live here instead. It has nothing interactive, so taps pass straight through to the game below.
 * Coordinates are the games' own (CSS pixels), since both scenes fit their cameras the same way.
 */
export class FxScene extends Phaser.Scene {
  constructor() { super(SCENES.Fx); }

  create() {
    fitCamera(this);
    this.onResize = () => fitCamera(this);
    this.scale.on('resize', this.onResize);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize));
  }

  get ui() { return uiScale(this); }

  /** n stars burst out of (x, y), then swoop to (tx, ty) one after another, popping as they land. */
  starBurst(x, y, tx, ty, n = 5) {
    const ui = this.ui;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const star = this.textures.exists('star') ? this.add.image(x, y, 'star').setDisplaySize(26 * ui, 26 * ui) : this.add.text(x, y, '⭐', { fontSize: Math.round(22 * ui) + 'px' }).setOrigin(0.5);
      const sx = x + Math.cos(a) * 46 * ui, sy = y + Math.sin(a) * 46 * ui;
      this.tweens.chain({
        targets: star,
        tweens: [
          { x: sx, y: sy, angle: 120, duration: 260, ease: 'Cubic.Out' },
          { x: tx, y: ty, scale: star.scale * 0.5, angle: 360, duration: 520, delay: i * 70, ease: 'Cubic.In' },
          { alpha: 0, scale: star.scale * 1.6, duration: 160, onComplete: () => star.destroy() }
        ]
      });
    }
  }

  /** A big pill of text that pops in at the top of the play area and floats away. */
  banner(str, colour = THEME.warning) {
    const { w, h } = viewport(this), ui = this.ui;
    const t = this.add.text(w / 2, h * 0.3, str, { fontFamily: FONT, fontSize: Math.round(34 * ui) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy, stroke: hex(0x2d2a4a), strokeThickness: Math.round(6 * ui) }).setOrigin(0.5).setDepth(2);
    const bw = t.width + 48 * ui, bh = t.height + 22 * ui;
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x2d2a4a, 0.25); g.fillRoundedRect(w / 2 - bw / 2 + 4, h * 0.3 - bh / 2 + 6, bw, bh, bh / 2);
    g.fillStyle(colour, 1); g.fillRoundedRect(w / 2 - bw / 2, h * 0.3 - bh / 2, bw, bh, bh / 2);
    g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(w / 2 - bw / 2 + 10, h * 0.3 - bh / 2 + 6, bw - 20, bh * 0.35, bh * 0.2);
    const parts = [g, t];
    for (const p of parts) { p.setScale(0.2); p.setAlpha(0); }
    this.tweens.add({ targets: parts, scale: 1, alpha: 1, duration: 320, ease: 'Back.Out' });
    this.tweens.add({ targets: parts, y: `-=${30 * ui}`, alpha: 0, delay: 1300, duration: 500, ease: 'Quad.In', onComplete: () => parts.forEach((p) => p.destroy()) });
  }

  /** Confetti raining down from the top of the screen. */
  confetti(n = 60) {
    const { w, h } = viewport(this), ui = this.ui;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w, c = CONFETTI[i % CONFETTI.length];
      const bit = this.add.rectangle(x, -20 - Math.random() * h * 0.3, (5 + Math.random() * 4) * ui, (9 + Math.random() * 6) * ui, c, 1).setAngle(Math.random() * 360);
      this.tweens.add({
        targets: bit, y: h + 30, x: x + (Math.random() - 0.5) * 140 * ui, angle: bit.angle + 360 + Math.random() * 360,
        duration: 1600 + Math.random() * 1200, delay: Math.random() * 400, ease: 'Quad.In', onComplete: () => bit.destroy()
      });
    }
  }
}

/** The running celebration layer for a scene, launching it if needed (null where there is none, e.g. in tests). */
export function fxLayer(scene) {
  const mgr = scene && scene.scene;
  if (!mgr || typeof mgr.get !== 'function') return null;
  const fx = mgr.get(SCENES.Fx);
  if (!fx) return null;
  if (!mgr.isActive(SCENES.Fx)) { mgr.launch(SCENES.Fx); return null; }   // ready from the next frame on
  mgr.bringToTop(SCENES.Fx);
  return fx.sys && fx.sys.isActive() && typeof fx.starBurst === 'function' ? fx : null;
}
