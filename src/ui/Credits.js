// The art credits, as the Liberated Pixel Cup licences require them to be visible in the game.
import { THEME } from './theme.js';
import { T, text } from './TextStyles.js';
import { LPC_CREDITS } from './LpcCharacter.js';

/**
 * Lay the credit lines out below `y` inside a box `x..x+w` wide, never past `maxY` (a trailing "…" says the
 * rest is on the full Credits screen). Returns the y after the last line.
 */
export function creditLines(scene, x, y, w, depth = 0, maxY = Infinity) {
  const ui = scene.ui || 1;
  const put = (str, style, dy) => {
    const t = text(scene, x, y, str, { ...style, wordWrap: { width: w } }).setOrigin(0, 0).setDepth(depth);
    if (y + t.height > maxY) { t.destroy(); return false; }
    y += t.height + dy; return true;
  };
  put('Character artwork comes from the Liberated Pixel Cup (LPC), free and open pixel art. Thank you to every artist.', T.small(scene, THEME.ink2), 8 * ui);
  for (const c of LPC_CREDITS) {
    if (!put(c.what, T.bodyBold(scene, THEME.ink), 1 * ui)) { put('…', T.small(scene, THEME.ink3), 0); break; }
    if (!put(`${c.authors}. Licence: ${c.licence}.`, T.caption(scene, THEME.ink2), 1 * ui)) break;
    if (!put(c.url, T.caption(scene, THEME.primaryDark), 7 * ui)) break;
  }
  return y;
}
