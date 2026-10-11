// Depth by feet: everything that stands on the ground (the player, villagers, bosses, critters, drawn trees and
// bushes, drawn buildings) sorts by where its feet are, so a thing lower on the screen draws in front. Flat ground
// cover (flowers, rocks, grass tufts) stays beneath everyone, and a soft shadow sits under each character.

/** Depth of the ground plane's standing things; a thing's own depth is this plus a hair per pixel of its feet. */
export const SORT_BASE = 10;
export const SHADOW_DEPTH = SORT_BASE - 0.02;
export const footDepth = (feetY) => SORT_BASE + Math.max(0, feetY) * 0.0001;

/** Where a sprite's feet are: just above its bottom edge, whatever its origin. */
export const feetOf = (s) => s.y + s.displayHeight * (0.96 - s.originY);

const SHADOW_KEY = 'foot-shadow';

/** A soft round shadow texture, made once per scene. */
export function ensureShadowTexture(scene) {
  if (scene.textures.exists(SHADOW_KEY)) return SHADOW_KEY;
  const c = scene.textures.createCanvas(SHADOW_KEY, 64, 64);
  if (!c) return null;
  const ctx = c.getContext();
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, 'rgba(20, 16, 30, 0.55)');
  g.addColorStop(0.6, 'rgba(20, 16, 30, 0.25)');
  g.addColorStop(1, 'rgba(20, 16, 30, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  c.refresh();
  return SHADOW_KEY;
}

/** Put a shadow under a sprite (width in world px); it follows the sprite whenever sortSprite is called. */
export function addShadow(scene, sprite, width = 18) {
  const key = ensureShadowTexture(scene);
  if (!key || !scene.add) return null;
  const img = scene.add.image(sprite.x, feetOf(sprite), key).setDisplaySize(width, width * 0.42).setDepth(SHADOW_DEPTH).setAlpha(0.9);
  sprite.shadow = img;
  return img;
}

/** Depth from the feet, and the shadow moved along. Call once for things that stand still, every frame for movers. */
export function sortSprite(sprite) {
  if (!sprite || !sprite.active) return;
  const fy = feetOf(sprite);
  sprite.setDepth(footDepth(fy));
  if (sprite.shadow && sprite.shadow.active) sprite.shadow.setPosition(sprite.x, fy - 1);
}

/** Tidy a sprite's shadow away with it. */
export function dropShadow(sprite) {
  if (sprite && sprite.shadow) { sprite.shadow.destroy(); sprite.shadow = null; }
}
