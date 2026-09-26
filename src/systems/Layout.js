// Viewport helpers shared by every scene. All scenes rebuild on resize so these are called often.
export function viewport(scene) {
  const w = scene.scale.width, h = scene.scale.height;
  return { w, h, cx: w / 2, cy: h / 2, portrait: h >= w, min: Math.min(w, h) };
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
