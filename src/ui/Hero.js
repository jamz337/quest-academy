// The heroes: the player's hand-drawn characters (a boy and a girl), ready-made walking sheets in public/sprites
// made by tools/make-player-sheet.py from generated sheets. It uses the pixel sheets' frame numbering (9 columns
// x 4 rows: up, left, down, right; column 0 standing, 1..8 walking) so every scene animates it the same way, but
// its cells are 192 px and the figure fills most of the cell, so sizes come from here rather than LPC_FRAME.
// Pure data and canvas, no Phaser: the parent dashboard draws the same face.

/** The hero sheets by their look's `art` value, which is also their texture key. */
export const HERO_SHEETS = { hero: 'sprites/player.png', 'hero-girl': 'sprites/player-girl.png' };
export const HERO_KEYS = Object.keys(HERO_SHEETS);
export const HERO_KEY = 'hero';
export const HERO_FILE = HERO_SHEETS[HERO_KEY];
/** Is this texture key one of the hero sheets? */
export const isHeroKey = (key) => HERO_KEYS.includes(key);
export const HERO_CELL = 192;
export const HERO_COLS = 9;
export const HERO_ROWS = { up: 0, left: 1, down: 2, right: 3 };
/** The figure's share of a cell's height (its feet sit 6 px above the cell's edge). */
export const HERO_FIGURE = 0.92;
/** A pixel-sheet figure's share of its 64 px cell, for matching sizes between the two kinds of sheet. */
export const PIXEL_FIGURE = 0.75;
/** How tall a hero cell is shown in the world (the figure comes out about 33 px, a little under a villager). */
export const HERO_WORLD_CELL = 36;

/** Is this resolved look drawn with a hero sheet (rather than built from the pixel layers)? */
export const isHero = (look) => !!look && isHeroKey(look.art);
/** The hero sheet a look uses (its texture key), or null for a pixel look. */
export const heroKey = (look) => (isHero(look) ? look.art : null);

/**
 * The scale that shows a sprite's figure as tall as a pixel figure would be at `pixelScale`: the same number for
 * a pixel sheet, smaller for the hero whose cells are bigger and fuller.
 */
export function figureScale(frameHeight, hero, pixelScale) {
  const figure = hero ? HERO_FIGURE : PIXEL_FIGURE;
  return pixelScale * (64 * PIXEL_FIGURE) / (frameHeight * figure);
}

/** For a sprite shown at a display size: the hero's fuller cell shrinks so its figure matches a pixel figure's height. */
export const figureFix = (key) => (isHeroKey(key) ? PIXEL_FIGURE / HERO_FIGURE : 1);

/** The part of the standing, facing-down cell that holds the head and shoulders: x, y, w, h in cell pixels. */
export const HERO_BUST = { x: 42, y: 4, w: 108, h: 108 };

/** Draw the hero's head and shoulders from the sheet image (or its canvas) into a badge, `size` px square at (cx, cy). */
export function drawHeroBust(ctx, img, cx, cy, size) {
  const b = HERO_BUST, sx = b.x, sy = HERO_ROWS.down * HERO_CELL + b.y;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, b.w, b.h, cx - size / 2, cy - size / 2, size, size);
}
