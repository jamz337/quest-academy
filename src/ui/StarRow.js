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
  /** Animate stars lighting one by one. */
  reveal(count, scene, delay = 250) {
    this.set(0);
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(300 + i * delay, () => {
        const s = this.stars[i];
        s.setTexture('star');
        scene.tweens.add({ targets: s, scale: { from: s.scale * 1.8, to: s.scale }, duration: 250, ease: 'Back.Out' });
      });
    }
  }
}
