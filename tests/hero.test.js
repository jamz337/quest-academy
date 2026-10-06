import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { HERO_KEY, HERO_SHEETS, HERO_CELL, HERO_COLS, HERO_ROWS, HERO_BUST, HERO_WORLD_CELL, figureScale, figureFix, isHero, heroKey } from '../src/ui/Hero.js';
import { IDLE_FRAMES, walkRange, LPC_COLS, LPC_ROWS } from '../src/ui/LpcCharacter.js';
import { VILLAGER_SHEETS, VILLAGER_CELL, VILLAGERS } from '../src/ui/Villagers.js';

describe('the hero sheet', () => {
  it('ships as 9 x 4 sheets of square cells in the pixel sheets\' frame order', () => {
    expect(Object.keys(HERO_SHEETS)).toEqual(['hero', 'hero-girl']);
    for (const file of Object.values(HERO_SHEETS)) {
      const png = fs.readFileSync('public/' + file);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(HERO_COLS * HERO_CELL);   // IHDR width
      expect(png.readUInt32BE(20)).toBe(4 * HERO_CELL);           // IHDR height
    }
    expect(HERO_COLS).toBe(LPC_COLS);
    expect(HERO_ROWS).toEqual(LPC_ROWS);
    // So the standing frames and walk cycles the scenes use land on the right cells.
    expect(IDLE_FRAMES.down).toBe(HERO_ROWS.down * HERO_COLS);
    expect(walkRange('up')).toEqual({ start: 1, end: 8 });
  });

  it('villagers with drawn sheets ship them in the same layout', () => {
    for (const [who, file] of Object.entries(VILLAGER_SHEETS)) {
      expect(VILLAGERS).toContain(who);
      const png = fs.readFileSync('public/' + file);
      expect(png.readUInt32BE(16)).toBe(LPC_COLS * VILLAGER_CELL);
      expect(png.readUInt32BE(20)).toBe(4 * VILLAGER_CELL);
    }
  });

  it('is sized to match the pixel characters and the villagers', () => {
    expect(figureScale(64, false, 0.5)).toBe(0.5);                               // a pixel sheet keeps its scale
    expect(figureScale(HERO_CELL, true, 0.5) * HERO_CELL * 0.92).toBeCloseTo(24, 5);   // the hero's figure as tall as a pixel figure
    expect(figureFix('look:abc')).toBe(1);
    expect(figureFix(HERO_KEY)).toBeLessThan(1);
    expect(HERO_WORLD_CELL * 0.92).toBeGreaterThan(30);   // taller than a pixel character (24 px)...
    expect(HERO_WORLD_CELL).toBeLessThan(40);             // ...and a little under a villager (40 px cells)
    expect(HERO_BUST.x + HERO_BUST.w).toBeLessThanOrEqual(HERO_CELL);
    expect(HERO_BUST.y + HERO_BUST.h).toBeLessThanOrEqual(HERO_CELL);
    expect(isHero({ art: 'hero' })).toBe(true);
    expect(isHero({ art: 'hero-girl' })).toBe(true);
    expect(heroKey({ art: 'hero-girl' })).toBe('hero-girl');
    expect(heroKey({ art: 'pixel' })).toBeNull();
    expect(isHero({ art: 'pixel' })).toBe(false);
    expect(isHero(null)).toBe(false);
  });
});
