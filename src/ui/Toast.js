import { C, hex } from '../constants.js';
import { uiScale } from '../systems/Layout.js';
import { FONT, WEIGHT } from './TextStyles.js';

/** Short banner that drops in from the top and fades. */
export function toast(scene, message, opts = {}) {
  const { color = C.white, bg = C.purple, duration = 1800, icon = null, y = null } = opts;
  const s = uiScale(scene);
  const w = scene.scale.width;
  const targetY = y ?? 40 * s + 20;
  const c = scene.add.container(w / 2, -60).setDepth(1000);
  const txt = scene.add.text(icon ? 16 : 0, 0, message, {
    fontFamily: FONT, fontSize: Math.round(18 * s) + 'px', color: hex(color), fontStyle: WEIGHT.bold
  }).setOrigin(0.5);
  const pw = Math.min(w - 32, txt.width + 48 + (icon ? 36 : 0)), ph = txt.height + 22;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(-pw / 2, -ph / 2 + 4, pw, ph, 14);
  g.fillStyle(bg, 1).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 14);
  c.add([g, txt]);
  if (icon) c.add(scene.add.image(-pw / 2 + 26, 0, icon).setDisplaySize(28, 28));
  scene.tweens.add({ targets: c, y: targetY, duration: 300, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, alpha: 0, y: targetY - 30, delay: duration, duration: 300, onComplete: () => c.destroy() });
  return c;
}
