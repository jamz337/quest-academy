import { THEME, hex, textOn, drawShadow } from './theme.js';
import { uiScale, safeArea, viewport } from '../systems/Layout.js';
import { FONT, WEIGHT } from './TextStyles.js';

/**
 * Short banner that drops in from the top and fades. White by default with an optional icon or coloured dot (`accent`);
 * pass `bg` for a filled coloured toast.
 */
export function toast(scene, message, opts = {}) {
  const { color, bg = THEME.surface, duration = 1800, icon = null, y = null, accent = null, depth = 1000 } = opts;
  const s = uiScale(scene);
  const w = viewport(scene).w;
  const targetY = y ?? safeArea().top + 40 * s + 20;
  const c = scene.add.container(w / 2, -60).setDepth(depth);
  const txt = scene.add.text(0, 0, message, {
    fontFamily: FONT, fontSize: Math.round(16 * s) + 'px', color: hex(color ?? textOn(bg)), fontStyle: WEIGHT.bold, align: 'center', wordWrap: { width: w - 96 }
  }).setOrigin(0.5);
  const lead = icon ? 36 : accent !== null ? 22 : 0;
  const pw = Math.min(w - 32, txt.width + 44 + lead), ph = txt.height + 22;
  const g = scene.add.graphics();
  drawShadow(g, -pw / 2, -ph / 2, pw, ph, ph / 2, 'md');
  g.fillStyle(bg, 1).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
  c.add([g, txt]);
  txt.x = lead / 2;
  if (icon) c.add(scene.add.image(-pw / 2 + 24, 0, icon).setDisplaySize(26, 26));
  else if (accent !== null) { g.fillStyle(accent, 1); g.fillCircle(-pw / 2 + 20, 0, 5); }
  scene.tweens.add({ targets: c, y: targetY, duration: 320, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, alpha: 0, y: targetY - 24, delay: duration, duration: 280, ease: 'Sine.In', onComplete: () => c.destroy() });
  return c;
}
