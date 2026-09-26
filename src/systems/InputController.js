// Merges keyboard, the Hud joystick and the Hud action button into one 4-way movement vector.
// Deliberately Phaser-free at module level so mergeInput can be unit-tested under node.
import { SCENES } from '../constants.js';

/**
 * Pure merge step (unit-tested).
 * keys: { left, right, up, down } booleans; joy: { x, y } in [-1,1] or null; prefer: 'x'|'y' axis to
 * favour when keyboard diagonals are held. Output dx/dy are snapped to one axis with magnitude 0..1.
 */
export function mergeInput(keys, joy, actionPressed, prefer = 'x') {
  let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (x === 0 && y === 0 && joy) { x = joy.x || 0; y = joy.y || 0; }
  let dx = 0, dy = 0;
  if (x !== 0 || y !== 0) {
    const mag = Math.min(1, Math.hypot(x, y));
    const ax = Math.abs(x), ay = Math.abs(y);
    const horizontal = ax === ay ? prefer === 'x' : ax > ay;
    if (horizontal) dx = Math.sign(x) * mag; else dy = Math.sign(y) * mag;
  }
  return { dx, dy, actionJustPressed: !!actionPressed };
}

/** Scene-bound controller. Reads the Hud scene each frame so it survives the Hud sleeping or rebuilding. */
export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.prefer = 'x';
    this.prevKx = 0; this.prevKy = 0;
    this.prevActionDown = false;
    const kb = scene.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.wasd = kb.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D', enter: 'ENTER', space: 'SPACE' });
    }
  }

  hud() {
    const h = this.scene.scene.get(SCENES.Hud);
    return h && h.scene.isActive() ? h : null;
  }

  keys() {
    const c = this.cursors, w = this.wasd;
    if (!c) return { left: false, right: false, up: false, down: false };
    return {
      left: c.left.isDown || w.left.isDown, right: c.right.isDown || w.right.isDown,
      up: c.up.isDown || w.up.isDown, down: c.down.isDown || w.down.isDown
    };
  }

  /** Call once per frame. */
  read() {
    const keys = this.keys();
    const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (kx !== 0 && this.prevKx === 0) this.prefer = 'x';
    if (ky !== 0 && this.prevKy === 0) this.prefer = 'y';
    this.prevKx = kx; this.prevKy = ky;

    const hud = this.hud();
    const joy = hud && hud.joystick ? hud.joystick.vector : null;
    // Edge-detect the action keys ourselves (equivalent to Phaser's JustDown without the import).
    const actionDown = !!this.wasd && (this.wasd.enter.isDown || this.wasd.space.isDown);
    let action = actionDown && !this.prevActionDown;
    this.prevActionDown = actionDown;
    if (hud && hud.takeAction && hud.takeAction()) action = true;
    return mergeInput(keys, joy, action, this.prefer);
  }

  destroy() {
    const kb = this.scene.input.keyboard;
    if (kb && this.wasd) Object.values(this.wasd).forEach((k) => kb.removeKey(k));
    this.cursors = null; this.wasd = null;
  }
}
