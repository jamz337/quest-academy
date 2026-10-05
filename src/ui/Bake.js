// Scenery that is painted once and kept as a picture (house and church interiors, the world's shadows and trims).
// The camera zooms in on it several times over, so it is baked larger than life and shown scaled back down:
// otherwise the phone stretches a small picture and every edge turns soft and blocky.

const MAX_SIDE = 4096;   // the largest texture every phone can hold

/**
 * Bake graphics `g` (drawn in a W x H space) into a sharp picture at (0, 0) and the given depth.
 * It is up to `maxScale` times the drawn size, as far as the texture limit allows. Returns the render texture.
 */
export function bakeSharp(scene, g, W, H, depth = 0, maxScale = 4) {
  const k = Math.max(1, Math.min(maxScale, Math.floor(MAX_SIDE / Math.max(W, H))));
  g.setScale(k);
  const rt = scene.add.renderTexture(0, 0, W * k, H * k).setOrigin(0).setDepth(depth).setScale(1 / k);
  rt.draw(g);
  return rt;
}
