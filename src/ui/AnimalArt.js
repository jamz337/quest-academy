// Pictures for the Pre-K ark's animals: one PNG per animal in public/sprites/ark/animals, cut from the approved
// mock-up (each animal mirrored from its unlabelled half, so the pairs stand symmetrical). Loaded at boot.
import { ARK_ANIMALS, ARK_PICTURED } from '../data/early/animals.js';

export const ANIMAL_BASE = 'sprites/ark/animals/';
/** Texture key of an animal's picture. */
export const animalKey = (key) => `animal-${key}`;
/** Animals with a picture file. */
export const ANIMAL_FILES = ARK_PICTURED.map((a) => a.key);
/** Animals with a recorded call (public/sounds/animals/<key>.mp3). */
export const CALL_FILES = ARK_ANIMALS.map((a) => a.key);

/** Scale an image so it fits inside w x h without changing its shape. */
export function fitImage(img, w, h) {
  const fr = img.frame || img.texture && img.texture.get && img.texture.get();
  const fw = (fr && fr.width) || img.width || 1, fh = (fr && fr.height) || img.height || 1;
  const k = Math.min(w / fw, h / fh);
  if (img.setScale) img.setScale(k);
  return img;
}
