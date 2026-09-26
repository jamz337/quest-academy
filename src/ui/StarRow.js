import Phaser from 'phaser';

/** Three stars, lit up to `count`. */
export class StarRow extends Phaser.GameObjects.Container {
  constructor(scene, x, y, count = 0, size = 32) {
    super(scene, x, y);
    this.stars = [];
    for (let i = 0; i < 3; i++) {
      const img = scene.add.image((i - 1) * (size + 4), 0, 'star-off').setDisplaySize(size, size);
      this.stars.push(img); this.add(img);
    }
    this.set(count);
    scene.add.existing(this);
  }
  set(count) {
    this.stars.forEach((s, i) => s.setTexture(i < count ? 'star' : 'star-off'));
    return this;
  }
  /** Animate stars lighting one by one with a little pop and wobble. */
  reveal(count, scene, delay = 250) {
    this.set(0);
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(300 + i * delay, () => {
        const s = this.stars[i];
        if (!s.active) return;
        s.setTexture('star');
        const target = s.scaleX ?? s.scale;
        scene.tweens.add({ targets: s, scaleX: { from: 0, to: target }, scaleY: { from: 0, to: target }, angle: { from: -18, to: 0 }, duration: 320, ease: 'Back.Out' });
      });
    }
  }
}
