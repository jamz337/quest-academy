import { describe, it, expect } from 'vitest';
import { CHARACTER_STYLES, NPC_STYLES, BG_COLORS, SEXES, HAIR_STYLES, TOPS, BOTTOMS, SKIN_TONES, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS, SKIN_VARIANTS, HAIR_VARIANTS, CLOTH_VARIANTS, EYE_VARIANTS, resolveLook, sanitizeLook, lookId } from '../src/data/avatars.js';

describe('avatar looks', () => {
  it('presets and villagers are complete looks the pack can draw', () => {
    // Presets use only what the editor offers; villagers may use any palette variant.
    for (const st of CHARACTER_STYLES) {
      expect(SKIN_TONES).toContain(st.skin); expect(HAIR_COLOURS).toContain(st.hair); expect(CLOTH_COLOURS).toContain(st.top);
      expect(CLOTH_COLOURS).toContain(st.bottom); expect(CLOTH_COLOURS).toContain(st.shoes); expect(EYE_COLOURS).toContain(st.eyes);
    }
    for (const st of [...CHARACTER_STYLES, ...NPC_STYLES]) {
      expect(SEXES).toContain(st.sex); expect(SKIN_VARIANTS).toContain(st.skin); expect(HAIR_STYLES).toContain(st.hairStyle);
      expect(HAIR_VARIANTS).toContain(st.hair); expect(TOPS).toContain(st.topStyle); expect(CLOTH_VARIANTS).toContain(st.top);
      expect(BOTTOMS).toContain(st.bottomStyle); expect(CLOTH_VARIANTS).toContain(st.bottom); expect(CLOTH_VARIANTS).toContain(st.shoes); expect(EYE_VARIANTS).toContain(st.eyes);
    }
    expect(CHARACTER_STYLES.filter((s) => s.sex === 'girl')).toHaveLength(4);
    expect(new Set(CHARACTER_STYLES.map((s) => s.hairStyle)).size).toBe(8);
    expect(BG_COLORS.length).toBeGreaterThan(8);
  });

  it('resolves a preset with overrides on top and drops anything invalid', () => {
    expect(resolveLook({ avatar: 2 })).toEqual({ art: 'hero', ...CHARACTER_STYLES[2] });
    expect(resolveLook({})).toEqual({ art: 'hero', ...CHARACTER_STYLES[0] });
    expect(resolveLook({ avatar: 99 })).toEqual({ art: 'hero', ...CHARACTER_STYLES[7] });
    // Players are a drawn hero (the girl for a girl preset) unless they chose to build a pixel character; a bad choice is dropped.
    expect(resolveLook({ avatar: 1 })).toEqual({ art: 'hero-girl', ...CHARACTER_STYLES[1] });
    expect(resolveLook({ avatar: 1, look: { art: 'hero' } }).art).toBe('hero');
    expect(resolveLook({ avatar: 1, look: { art: 'pixel' } })).toEqual({ art: 'pixel', ...CHARACTER_STYLES[1] });
    expect(sanitizeLook({ art: 'pixel' })).toEqual({ art: 'pixel' });
    expect(sanitizeLook({ art: 'smooth' })).toBeNull();
    const look = resolveLook({ avatar: 1, look: { hair: 'blonde', topStyle: 'polo', bg: '#2D2A4A', skin: 'lime', hairStyle: 'mullet', top: '#ff0000' } });
    expect(look).toMatchObject({ sex: 'girl', hair: 'blonde', topStyle: 'polo', bg: '#2d2a4a', skin: CHARACTER_STYLES[1].skin, hairStyle: CHARACTER_STYLES[1].hairStyle, top: CHARACTER_STYLES[1].top });
    expect(sanitizeLook(null)).toBeNull();
    expect(sanitizeLook('red')).toBeNull();
    expect(sanitizeLook({ hair: '#a8613a', top: 'url(x)' })).toBeNull();   // the old colour codes are ignored
    expect(sanitizeLook({ sex: 'girl', hairStyle: 'braid', eyes: 'green' })).toEqual({ sex: 'girl', hairStyle: 'braid', eyes: 'green' });
    const a = resolveLook({ avatar: 0 }), b = resolveLook({ avatar: 0, look: { sex: 'girl' } });
    expect(lookId(a)).not.toBe(lookId(b));
    expect(lookId(a)).toBe(lookId(resolveLook({ avatar: 0, look: null })));
  });
});
