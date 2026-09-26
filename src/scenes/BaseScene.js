import Phaser from 'phaser';
import { viewport, uiScale } from '../systems/Layout.js';

/**
 * All screens extend this. Scenes keep their state in plain objects and implement build(),
 * which draws everything from that state. On resize (rotation, keyboard) the scene is rebuilt.
 */
export class BaseScene extends Phaser.Scene {
  create(data) {
    this.sceneData = data || {};
    this.rebuild();
    this.resizeTimer = null;
    const onResize = () => {
      if (this.resizeTimer) this.resizeTimer.remove(false);
      this.resizeTimer = this.time.delayedCall(80, () => this.rebuild());
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  /** Recreate all display objects from state. */
  rebuild() {
    if (this.beforeRebuild) this.beforeRebuild();
    this.tweens.killAll();
    this.children.list.slice().forEach((c) => c.destroy());
    this.vp = viewport(this);
    this.ui = uiScale(this);
    this.build();
  }

  build() {}

  /** Convenience: current viewport (refreshed on rebuild). */
  get w() { return this.scale.width; }
  get h() { return this.scale.height; }
  get portrait() { return this.scale.height >= this.scale.width; }
}
