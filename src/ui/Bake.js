// Scenery that is painted once and kept as a picture (house and church interiors, the world's shadows and trims).
// The camera zooms in on it several times over, so it is baked larger than life and shown scaled back down:
// otherwise the phone stretches a small picture and every edge turns soft and blocky.

const MAX_SIDE = 4096;   // the largest texture every phone can hold

/**
 * Bake graphics `g` (drawn in a W x H space) into a sharp picture at (0, 0) and the given depth.
 * It is up to `maxScale` times the drawn size, as far as the texture limit allows. Returns the render texture.
 */
/**
 * Bake a region of the world once: `draw(g)` paints in world coordinates, and the box (x0, y0, w, h) of what it drew
 * is kept as a picture `k` times larger than life, placed back at (x0, y0) at `depth`. For things that never change
 * (lamp posts, gateway pillars): a Graphics object re-tessellates every shape every frame, a picture costs nothing.
 */
export function bakeRegion(scene, draw, x0, y0, w, h, depth = 0, k = 4) {
  const g = scene.make.graphics({ add: false });
  draw(g);
  return bakeGraphics(scene, g, x0, y0, w, h, depth, k);
}

/**
 * Bake an already drawn Graphics object (world coordinates) into a picture of the box (x0, y0, w, h) at `depth`,
 * `k` times larger than life (less if the texture limit says so), and throw the Graphics away.
 */
export function bakeGraphics(scene, g, x0, y0, w, h, depth = 0, k = 4) {
  k = Math.max(1, Math.min(k, Math.floor(MAX_SIDE / Math.max(1, w, h))));
  g.setScale(k);
  const rt = scene.add.renderTexture(x0, y0, Math.ceil(w * k), Math.ceil(h * k)).setOrigin(0).setDepth(depth).setScale(1 / k);
  rt.draw(g, -x0 * k, -y0 * k);
  g.destroy();
  return rt;
}

/** Bake a small drawing (made around (0, 0), within a w x h box) into a reusable texture under `key`; returns the key. */
export function bakeTexture(scene, key, draw, w, h, k = 4) {
  if (scene.textures.exists(key)) return key;
  const rt = bakeRegion(scene, draw, -w / 2, -h / 2, w, h, 0, k);
  rt.saveTexture(key);
  rt.setVisible(false);
  return key;
}

export function bakeSharp(scene, g, W, H, depth = 0, maxScale = 4) {
  const k = Math.max(1, Math.min(maxScale, Math.floor(MAX_SIDE / Math.max(W, H))));
  g.setScale(k);
  const rt = scene.add.renderTexture(0, 0, W * k, H * k).setOrigin(0).setDepth(depth).setScale(1 / k);
  rt.draw(g);
  return rt;
}
