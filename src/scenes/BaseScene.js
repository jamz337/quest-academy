import Phaser from 'phaser';
import { viewport, uiScale, fitCamera, dpr } from '../systems/Layout.js';
import { THEME } from '../ui/theme.js';

const FADE = [255, 248, 239];   // THEME.bg as r, g, b

/**
 * All screens extend this. Scenes keep their state in plain objects and implement build(),
 * which draws everything from that state. On resize (rotation, keyboard) the scene is rebuilt.
 *
 * Motion: `this.animateEnter` is true on the first build and whenever enterKey() changes (mini-games return the
 * round index), so ui/motion.enter() plays once per round and not on every answer highlight or resize.
 * Set `this.fade = true` in a full-screen scene to cross-fade on create and on go().
 */
export class BaseScene extends Phaser.Scene {
  create(data) {
    this.sceneData = data || {};
    this.leaving = false;
    this.buildCount = 0;
    this.lastEnterKey = undefined;
    this.rebuild();
    this.resizeTimer = null;
    const onResize = () => {
      if (this.resizeTimer) this.resizeTimer.remove(false);
      this.resizeTimer = this.time.delayedCall(80, () => this.rebuild());
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    const cam = this.cameras && this.cameras.main;
    if (this.fade && cam && typeof cam.fadeIn === 'function') cam.fadeIn(THEME.motion.base, ...FADE);
  }

  /** Recreate all display objects from state. */
  rebuild() {
    if (this.beforeRebuild) this.beforeRebuild();
    this.tweens.killAll();
    this.children.list.slice().forEach((c) => c.destroy());
    this.vp = viewport(this);
    this.ui = uiScale(this);
    fitCamera(this);
    this.buildCount = (this.buildCount || 0) + 1;
    const key = this.enterKey();
    this.animateEnter = this.buildCount === 1 || key !== this.lastEnterKey;
    this.lastEnterKey = key;
    this.build();
  }

  build() {}

  /** Override to return a value that changes when a new "round" starts (see animateEnter). */
  enterKey() { return null; }

  /** Start another scene with a short fade when this scene fades; falls back to an immediate start. */
  go(key, data) {
    if (this.leaving) return;
    this.leaving = true;
    const cam = this.cameras && this.cameras.main;
    let started = false;
    const start = () => { if (started) return; started = true; if (data === undefined) this.scene.start(key); else this.scene.start(key, data); };
    if (!this.fade || !cam || typeof cam.fadeOut !== 'function') { start(); return; }
    cam.fadeOut(THEME.motion.base, ...FADE, (c, progress) => { if (progress >= 1) start(); });
    // The fade runs on game frames; a throttled or struggling device can make it crawl (a 0.18 s fade taking seconds,
    // so a tap looks ignored). A real-time fallback makes the change happen on time regardless.
    setTimeout(() => { if (this.sys && this.sys.isActive()) start(); }, THEME.motion.base + 250);
  }

  /**
   * Let a list longer than the screen scroll (drag or mouse wheel): `scroller` is a container of the list, `area`
   * { top, h, w } the part of the screen it shows through, `maxScroll` how far it can go, `cards` the tappable things
   * in it (a drag cancels their press, and any button inside them, so letting go after a drag taps nothing).
   * `onScroll(y, max)` hears each move. Nothing happens when the list fits (or headless, without input).
   */
  makeScrollable(scroller, area, maxScroll, cards = [], onScroll = null) {
    this.scroll = { scroller, max: Math.max(0, maxScroll), cards, y: 0, startY: 0, startScroll: 0, moved: false, down: false, onScroll };
    if (this.scroll.max <= 0 || !this.input || !this.make) return;   // (the headless tests have no input or factory)
    const mask = this.make.graphics({ add: false });
    mask.fillRect(0, area.top - 4, area.w, area.h + 8);
    scroller.setMask(mask.createGeometryMask());
    if (this.scrollWired) return;
    this.scrollWired = true;
    const setScroll = (v) => { const s = this.scroll; s.y = Math.max(0, Math.min(s.max, v)); s.scroller.y = -s.y; if (s.onScroll) s.onScroll(s.y, s.max); };
    const cancel = (o) => { o.emit('pointerout'); (o.list || []).forEach((c) => { if (c && c.pressed) c.emit('pointerout'); }); };
    this.input.on('pointerdown', (p) => { const s = this.scroll; if (!s || s.max <= 0) return; s.down = true; s.moved = false; s.startY = p.y; s.startScroll = s.y; });
    this.input.on('pointermove', (p) => {
      const s = this.scroll;
      if (!s || !s.down || !p.isDown) return;
      const dy = p.y - s.startY;
      if (!s.moved && Math.abs(dy) > 8) { s.moved = true; s.cards.forEach(cancel); }
      if (s.moved) setScroll(s.startScroll - dy);
    });
    this.input.on('pointerup', () => { if (this.scroll) this.scroll.down = false; });
    this.input.on('wheel', (p, objs, dx, dy) => { if (this.scroll && this.scroll.max > 0) setScroll(this.scroll.y + dy * 0.6); });
  }

  /** Convenience: current viewport (refreshed on rebuild). */
  get w() { return this.scale.width / dpr(); }
  get h() { return this.scale.height / dpr(); }
  get portrait() { return this.scale.height >= this.scale.width; }
}
