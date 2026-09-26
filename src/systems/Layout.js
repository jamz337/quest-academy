// Viewport helpers shared by every scene. All scenes rebuild on resize so these are called often.
//
// HiDPI: the canvas is DPR times larger than its CSS size so phones render sharply (see main.js), and every
// scene camera is zoomed by DPR so scenes keep laying out in CSS pixels. `viewport()` returns CSS sizes.
export const dpr = () => Math.min(3, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));   // read live: it can change (zoom, screens)

export function viewport(scene) {
  const d = dpr();
  const w = scene.scale.width / d, h = scene.scale.height / d;
  return { w, h, cx: w / 2, cy: h / 2, portrait: h >= w, min: Math.min(w, h) };
}

/** Zoom a scene's main camera by DPR and centre it so CSS point (0,0) sits at the canvas's top-left. */
export function fitCamera(scene, zoom = 1) {
  const cam = scene.cameras && scene.cameras.main;
  if (!cam || typeof cam.setZoom !== 'function' || typeof cam.centerOn !== 'function') return;   // headless test mocks
  const d = dpr();
  cam.setZoom(zoom * d);
  cam.centerOn(scene.scale.width / d / 2, scene.scale.height / d / 2);
}

/** Pointer position in the scene's CSS-pixel space (pointer.x/y are canvas pixels). */
export function pointerPos(scene, pointer) {
  const cam = scene.cameras && scene.cameras.main;
  if (!cam || typeof cam.getWorldPoint !== 'function') return { x: pointer.x / dpr(), y: pointer.y / dpr() };
  const p = cam.getWorldPoint(pointer.x, pointer.y);
  return { x: p.x, y: p.y };
}

/** Safe-area insets (notches, gesture bars) read from CSS env() via body custom properties. */
export function safeArea() {
  try {
    const cs = getComputedStyle(document.body);
    const n = (v) => parseInt(v, 10) || 0;
    return {
      top: n(cs.getPropertyValue('--sat')), bottom: n(cs.getPropertyValue('--sab')),
      left: n(cs.getPropertyValue('--sal')), right: n(cs.getPropertyValue('--sar'))
    };
  } catch { return { top: 0, bottom: 0, left: 0, right: 0 }; }
}

/** Split a rect into cols x rows cells, returning centre points and cell sizes. */
export function grid(rect, cols, rows, gap = 8) {
  const cw = (rect.w - gap * (cols - 1)) / cols;
  const ch = (rect.h - gap * (rows - 1)) / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    cells.push({ x: rect.x + c * (cw + gap) + cw / 2, y: rect.y + r * (ch + gap) + ch / 2, w: cw, h: ch, col: c, row: r });
  }
  return cells;
}

/** A scale factor for UI so text and buttons grow on tablets but never get silly. */
export function uiScale(scene) {
  const { min } = viewport(scene);
  return Math.max(0.85, Math.min(1.6, min / 420));
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
