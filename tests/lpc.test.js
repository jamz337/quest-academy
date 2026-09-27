import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LPC_FRAME, LPC_COLS, LPC_ROWS, WORLD_SCALE, IDLE_FRAMES, walkRange, HAIR_STYLES, TOP_STYLES, BOTTOM_STYLES, SKIN_TONES, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS, swatch, layersFor, allLayerPaths, recolour, drawOutfitBack, drawOutfitFront, drawBustFromSheet, LPC_CREDITS } from '../src/ui/LpcCharacter.js';
import { CHARACTER_STYLES, NPC_STYLES } from '../src/data/avatars.js';
import { BOSSES } from '../src/data/world/bosses.js';
import { itemsOfKind } from '../src/data/market/items.js';
import BODY from '../src/data/lpc/body.json';
import HAIR from '../src/data/lpc/hair.json';

describe('Liberated Pixel Cup characters', () => {
  it('every layer any look can use is shipped in public/lpc, and looks resolve to seven layers in order', () => {
    const paths = allLayerPaths();
    expect(paths.length).toBeGreaterThan(30);
    for (const p of paths) expect(fs.existsSync(path.join('public', 'lpc', 'spritesheets', p)), p).toBe(true);
    for (const look of [...CHARACTER_STYLES, ...NPC_STYLES, ...BOSSES.map((b) => b.look)]) {
      const layers = layersFor(look);
      const names = layers.map((l) => l.path.split('/')[0]);
      expect(names.slice(-6)).toEqual(['body', 'head', 'feet', 'legs', 'torso', 'hair']);
      if (HAIR_STYLES[look.hairStyle].bg) expect(names[0]).toBe('hair'); else expect(layers).toHaveLength(6);
      for (const l of layers) expect(paths).toContain(l.path);
      const body = layers.find((l) => l.path.startsWith('body/'));
      expect(body.path).toContain(look.sex === 'girl' ? '/female/' : '/male/');
    }
    expect(Object.keys(HAIR_STYLES).length).toBe(18);
    expect(Object.keys(TOP_STYLES)).toEqual(['tshirt', 'polo']); expect(Object.keys(BOTTOM_STYLES)).toEqual(['pants', 'shorts', 'skirt']);
    for (const v of SKIN_TONES) expect(BODY[v]).toBeTruthy();
    for (const v of HAIR_COLOURS) expect(HAIR[v]).toBeTruthy();
    expect(CLOTH_COLOURS.length).toBeGreaterThan(8); expect(EYE_COLOURS.length).toBe(6);
    expect(swatch('body', 'brown')).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(swatch('hair', 'nope')).toBe('#888888');
  });

  it('frames follow the pack layout: nine columns, rows up/left/down/right, standing then walking', () => {
    expect(LPC_FRAME).toBe(64); expect(LPC_COLS).toBe(9); expect(WORLD_SCALE * LPC_FRAME).toBe(32);
    expect(LPC_ROWS).toEqual({ up: 0, left: 1, down: 2, right: 3 });
    expect(IDLE_FRAMES).toEqual({ down: 18, up: 0, side: 9 });
    expect(walkRange('down')).toEqual({ start: 19, end: 26 }); expect(walkRange('side')).toEqual({ start: 10, end: 17 }); expect(walkRange('up')).toEqual({ start: 1, end: 8 });
  });

  it('recolours the base ramp to the chosen variant and leaves other pixels alone', () => {
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const light = BODY.light, brown = BODY.brown;
    const data = new Uint8ClampedArray([...hex(light[2]), 255, ...hex(light[4]), 255, 10, 20, 30, 255, 0, 0, 0, 0]);
    recolour(data, 'body', 'brown');
    expect([...data.slice(0, 3)]).toEqual(hex(brown[2]));
    expect([...data.slice(4, 7)]).toEqual(hex(brown[4]));
    expect([...data.slice(8, 11)]).toEqual([10, 20, 30]);   // not on the ramp
    const same = new Uint8ClampedArray([...hex(light[1]), 255]); recolour(same, 'body', 'light'); expect([...same.slice(0, 3)]).toEqual(hex(light[1]));
    const unknown = new Uint8ClampedArray([...hex(light[1]), 255]); recolour(unknown, 'body', 'mystery'); expect([...unknown.slice(0, 3)]).toEqual(hex(light[1]));
  });

  it('draws every market look and the Headmistress over all 36 frames, and the bust from the standing frame', () => {
    const calls = [];
    const ctx = { imageSmoothingEnabled: true, fillStyle: null, fillRect: (...a) => calls.push(a), drawImage: (...a) => calls.push(['img', ...a]) };
    for (const kind of ['hat', 'glasses', 'back']) for (const it of itemsOfKind(kind)) {
      calls.length = 0;
      drawOutfitBack(ctx, { [kind]: it.style }); drawOutfitFront(ctx, { [kind]: it.style });
      expect(calls.length, it.id).toBeGreaterThanOrEqual(36);
      for (const c of calls) expect(c.every((v) => Number.isFinite(v) || typeof v === 'string'), it.id).toBe(true);
    }
    calls.length = 0; drawOutfitFront(ctx, null, 'headmistress'); expect(calls.length).toBeGreaterThan(36 * 4);
    calls.length = 0; drawBustFromSheet(ctx, {}, 40, 40, 64);
    expect(calls[0][0]).toBe('img'); expect(calls[0][3]).toBe(LPC_ROWS.down * LPC_FRAME + 4);
    expect(LPC_CREDITS.length).toBeGreaterThanOrEqual(4);
    for (const c of LPC_CREDITS) expect(c.authors && c.licence && c.url).toBeTruthy();
  });
});
