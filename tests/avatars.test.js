import { describe, it, expect } from 'vitest';
import { CHARACTER_STYLES, HAIR_COLORS, CLOTHES_COLORS, BG_COLORS, resolveLook, sanitizeLook, lookId } from '../src/data/avatars.js';

describe('avatar looks', () => {
  it('profiles without a look render exactly as their preset', () => {
    const st = CHARACTER_STYLES[2];
    expect(resolveLook({ avatar: 2 })).toEqual({ ...st, bg: st.top });
    expect(resolveLook({})).toEqual({ ...CHARACTER_STYLES[0], bg: CHARACTER_STYLES[0].top });
    expect(resolveLook({ avatar: 99 })).toEqual({ ...CHARACTER_STYLES[7], bg: CHARACTER_STYLES[7].top });
  });

  it('applies hair, clothes and background overrides and keeps the preset skin and legs', () => {
    const look = resolveLook({ avatar: 1, look: { hair: '#FFC531', top: '#ffffff', bg: '#2d2a4a' } });
    expect(look).toEqual({ hair: '#ffc531', skin: CHARACTER_STYLES[1].skin, top: '#ffffff', legs: CHARACTER_STYLES[1].legs, bg: '#2d2a4a' });
  });

  it('the badge background follows a custom top until it is set on its own', () => {
    expect(resolveLook({ avatar: 0, look: { top: '#ff5c6c' } }).bg).toBe('#ff5c6c');
    expect(resolveLook({ avatar: 0, look: { top: '#ff5c6c', bg: '#ffffff' } }).bg).toBe('#ffffff');
  });

  it('drops anything that is not a hex colour', () => {
    expect(sanitizeLook(null)).toBeNull();
    expect(sanitizeLook('red')).toBeNull();
    expect(sanitizeLook({ hair: 'red', top: 'url(x)', skin: '#000000' })).toBeNull();
    expect(sanitizeLook({ hair: '#ABCDEF', top: 12 })).toEqual({ hair: '#abcdef' });
  });

  it('gives different looks different texture ids', () => {
    const a = resolveLook({ avatar: 0 }), b = resolveLook({ avatar: 0, look: { bg: '#ffffff' } });
    expect(lookId(a)).not.toBe(lookId(b));
    expect(lookId(a)).toBe(lookId(resolveLook({ avatar: 0, look: null })));
  });

  it('offers only valid swatches', () => {
    for (const c of [...HAIR_COLORS, ...CLOTHES_COLORS, ...BG_COLORS]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});
