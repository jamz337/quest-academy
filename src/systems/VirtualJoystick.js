// Floating touch joystick drawn with the 'joy-base' / 'joy-thumb' textures. Appears wherever the finger
// lands, tracks that one pointer only, so a second finger can press the action button at the same time.
import { uiScale, viewport, pointerPos } from './Layout.js';

export class VirtualJoystick {
  /**
   * opts.zone(x, y) -> boolean: where a touch may start the stick (default: anywhere below the top 15%; buttons
   * under the finger keep their own touches). It used to be the left 60% only, which left a child "stuck" at the
   * map's east edge, where the player is drawn on the right and that is where they drag.
   * opts.enabled() -> boolean: extra gate (e.g. no stick while a dialog is open).
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    const ui = uiScale(scene);
    this.radius = (opts.radius ?? 56) * ui;
    this.deadzone = opts.deadzone ?? 0.25;
    this.zone = opts.zone || ((x, y) => { const v = viewport(scene); return x >= 0 && x <= v.w && y > v.h * 0.15; });
    this.enabled = opts.enabled || (() => true);
    this.pointer = null;
    this.vector = { x: 0, y: 0 };
    this.base = scene.add.image(0, 0, 'joy-base').setScale(ui * 0.5).setAlpha(0).setDepth(400).setScrollFactor(0);
    this.thumb = scene.add.image(0, 0, 'joy-thumb').setScale(ui * 0.5).setAlpha(0).setDepth(401).setScrollFactor(0);
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
    const p = pointerPos(this.scene, pointer);
    if (!this.enabled() || !this.zone(p.x, p.y)) return;
    if (over && over.length) return;              // a button under the finger owns this touch
    this.pointer = pointer;
    this.origin = { x: p.x, y: p.y };
    this.base.setPosition(p.x, p.y).setAlpha(1);
    this.thumb.setPosition(p.x, p.y).setAlpha(1);
    this.vector = { x: 0, y: 0 };
  }

  onMove(pointer) {
    if (pointer !== this.pointer) return;
    const p = pointerPos(this.scene, pointer);
    let dx = p.x - this.origin.x, dy = p.y - this.origin.y;
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
