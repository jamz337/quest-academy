// Drag-and-drop for game pieces (rune stones, story cards…), built on the scene's own pointer events so it works
// with the game's camera scaling (see systems/Layout.pointerPos). A press that hardly moves is still a tap, so every
// draggable piece can also be tapped, the way it worked before dragging existed.
import { pointerPos } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';

const TAP_SLOP = 8;   // px a press may wander and still count as a tap

/**
 * Make `obj` (a Container or Game Object with a size) draggable.
 *   onTap()            a press without a drag;
 *   onMove(x, y)       while dragging, the piece's centre (for highlighting where it would land);
 *   onDrop(x, y)       when let go after a drag: return true if the drop was used (the scene usually rebuilds),
 *                      false to send the piece springing back to where it started;
 *   onCancel()         after a spring-back.
 * Headless (no input plugin, as in tests) it falls back to a plain tap on pointerdown.
 */
export function draggable(scene, obj, { onTap = null, onMove = null, onDrop = null, onCancel = null } = {}) {
  if (!obj) return obj;
  if (typeof obj.setInteractive === 'function') obj.setInteractive({ useHandCursor: true });
  const input = scene.input;
  if (!input || typeof input.on !== 'function') {
    if (onTap) obj.on('pointerdown', () => onTap());
    return obj;
  }
  let drag = null;
  const finish = (pointer, cancelled = false) => {
    if (!drag) return;
    const d = drag; drag = null;
    input.off('pointermove', move); input.off('pointerup', up); input.off('gameout', out);
    if (!obj.active) return;
    if (!d.moved) { obj.setScale(d.scale); if (onTap && !cancelled) onTap(); return; }
    const used = !cancelled && onDrop ? onDrop(obj.x, obj.y, pointer) : false;
    if (used || !obj.active) return;
    // Spring back to where it came from.
    if (scene.tweens) scene.tweens.add({ targets: obj, x: d.x0, y: d.y0, scale: d.scale, duration: 220, ease: 'Back.Out', onComplete: () => { if (obj.active && d.depth !== undefined) obj.setDepth(d.depth); } });
    else { obj.setPosition(d.x0, d.y0); obj.setScale(d.scale); }
    if (onCancel) onCancel();
  };
  const move = (pointer) => {
    if (!drag || !obj.active) return;
    const p = pointerPos(scene, pointer);
    if (!drag.moved && Math.hypot(p.x - drag.px, p.y - drag.py) < TAP_SLOP) return;
    if (!drag.moved) { drag.moved = true; obj.setDepth(1000); obj.setScale(drag.scale * 1.12); Sfx.lift(); }
    obj.setPosition(drag.x0 + p.x - drag.px, drag.y0 + p.y - drag.py);
    if (onMove) onMove(obj.x, obj.y);
  };
  const up = (pointer) => finish(pointer);
  const out = () => finish(null, true);
  obj.on('pointerdown', (pointer) => {
    if (drag) return;
    const p = pointerPos(scene, pointer);
    drag = { px: p.x, py: p.y, x0: obj.x, y0: obj.y, scale: obj.scale || 1, depth: obj.depth, moved: false };
    input.on('pointermove', move); input.on('pointerup', up); input.on('gameout', out);
  });
  obj.once('destroy', () => { if (drag) { drag = null; input.off('pointermove', move); input.off('pointerup', up); input.off('gameout', out); } });
  return obj;
}

/** The index of the target nearest (x, y) within `reach` px, or -1. targets: [{ x, y }]. */
export function nearestTarget(targets, x, y, reach) {
  let best = -1, bestD = reach;
  targets.forEach((t, i) => { if (!t) return; const d = Math.hypot(t.x - x, t.y - y); if (d < bestD) { bestD = d; best = i; } });
  return best;
}
