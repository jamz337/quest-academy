// Floating touch joystick drawn with the 'joy-base' / 'joy-thumb' textures. Appears where the finger
// lands, tracks that one pointer only, so a second finger can press the action button at the same time.
import { uiScale } from './Layout.js';

export class VirtualJoystick {
  /**
   * opts.zone(x, y) -> boolean: where a touch may start the stick (default: left 60%, below top 15%).
   * opts.enabled() -> boolean: extra gate (e.g. no stick while a dialog is open).
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    const ui = uiScale(scene);
    this.radius = (opts.radius ?? 56) * ui;
    this.deadzone = opts.deadzone ?? 0.25;
    this.zone = opts.zone || ((x, y) => x < scene.scale.width * 0.6 && y > scene.scale.height * 0.15);
    this.enabled = opts.enabled || (() => true);
    this.pointer = null;
    this.vector = { x: 0, y: 0 };
    this.base = scene.add.image(0, 0, 'joy-base').setScale(ui).setAlpha(0).setDepth(400).setScrollFactor(0);
    this.thumb = scene.add.image(0, 0, 'joy-thumb').setScale(ui).setAlpha(0).setDepth(401).setScrollFactor(0);
    this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
    this.onGameOut = () => this.release();      // 'gameout' passes (timeStamp, event), not a pointer
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    scene.input.on('gameout', this.onGameOut);
    this.destroyed = false;
  }

  onDown(pointer, over) {
    if (this.pointer || this.destroyed) return;
    if (!this.enabled() || !this.zone(pointer.x, pointer.y)) return;
    if (over && over.length) return;              // a button under the finger owns this touch
    this.pointer = pointer;
    this.origin = { x: pointer.x, y: pointer.y };
    this.base.setPosition(pointer.x, pointer.y).setAlpha(1);
    this.thumb.setPosition(pointer.x, pointer.y).setAlpha(1);
    this.vector = { x: 0, y: 0 };
  }

  onMove(pointer) {
    if (pointer !== this.pointer) return;
    let dx = pointer.x - this.origin.x, dy = pointer.y - this.origin.y;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) { dx *= this.radius / len; dy *= this.radius / len; }
    this.thumb.setPosition(this.origin.x + dx, this.origin.y + dy);
    const nx = dx / this.radius, ny = dy / this.radius, mag = Math.hypot(nx, ny);
    this.vector = mag < this.deadzone ? { x: 0, y: 0 } : { x: nx, y: ny };
  }

  onUp(pointer) {
    if (pointer && pointer !== this.pointer) return;
    this.release();
  }

  release() {
    this.pointer = null;
    this.vector = { x: 0, y: 0 };
    if (this.base.active) this.base.setAlpha(0);
    if (this.thumb.active) this.thumb.setAlpha(0);
  }

  get active() { return !!this.pointer; }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const inp = this.scene.input;
    if (inp) {
      inp.off('pointerdown', this.onDown); inp.off('pointermove', this.onMove);
      inp.off('pointerup', this.onUp); inp.off('pointerupoutside', this.onUp); inp.off('gameout', this.onGameOut);
    }
    this.pointer = null; this.vector = { x: 0, y: 0 };
    if (this.base.active) this.base.destroy();
    if (this.thumb.active) this.thumb.destroy();
  }
}
