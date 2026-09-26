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
    const start = () => (data === undefined ? this.scene.start(key) : this.scene.start(key, data));
    if (!this.fade || !cam || typeof cam.fadeOut !== 'function') { start(); return; }
    cam.fadeOut(THEME.motion.base, ...FADE, (c, progress) => { if (progress >= 1) start(); });
  }

  /** Convenience: current viewport (refreshed on rebuild). */
  get w() { return this.scale.width / dpr(); }
  get h() { return this.scale.height / dpr(); }
  get portrait() { return this.scale.height >= this.scale.width; }
}
