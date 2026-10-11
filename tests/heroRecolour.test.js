// Recolouring the drawn heroes: the part each pixel belongs to, the keys the recoloured sheets live under, and the
// look fields the editor saves. The canvas work itself runs in the browser; its rules are tested here.
import { describe, it, expect } from 'vitest';
import { partOf, heroColourKey, heroRecoloured, heroHex, shadeTo, rgbToHsl, HERO_COLOUR_KEYS } from '../src/ui/HeroRecolour.js';
import { sanitizeLook, resolveLook } from '../src/data/avatars.js';
import { isHeroKey } from '../src/ui/Hero.js';

describe('hero recolouring', () => {
  it('finds skin, clothes and the girl\'s hair by colour and place on the figure, and leaves outlines alone', () => {
    expect(partOf('hero', 140, 90, 55, 0.2)).toBe('skin');          // brown face
    expect(partOf('hero', 60, 120, 220, 0.4)).toBe('top');          // the boy's blue shirt, mid-figure
    expect(partOf('hero', 60, 120, 220, 0.7)).toBe('bottom');       // the same blue lower down: his shorts
    expect(partOf('hero', 230, 225, 215, 0.92)).toBe('shoes');      // pale trainers at the feet
    expect(partOf('hero-girl', 60, 35, 95, 0.93)).toBe('shoes');     // the girl's dark purple sandals, not her skirt
    expect(partOf('hero-girl', 60, 35, 95, 0.75)).toBe('bottom');    // the same purple higher up is the skirt
    expect(partOf('hero-girl', 10, 8, 8, 0.95)).toBe(null);          // the outline round the sandals
    expect(partOf('hero-girl', 140, 90, 55, 0.93)).toBe('skin');    // her toes between the straps stay skin
    expect(partOf('hero', 20, 20, 20, 0.1)).toBe(null);             // black hair / outline: nothing to recolour
    expect(partOf('hero-girl', 70, 40, 25, 0.2)).toBe('hair');      // the girl's dark brown curls
    expect(partOf('hero-girl', 70, 40, 25, 0.35, 0.8)).toBe('hair');  // curls hanging beside the face
    expect(partOf('hero-girl', 90, 52, 30, 0.32, 0.1)).toBe('skin');  // the shadow under the chin stays skin
    expect(partOf('hero-girl', 225, 110, 140, 0.45)).toBe('top');   // her pink top
    expect(partOf('hero-girl', 110, 60, 160, 0.75)).toBe('bottom'); // her purple skirt
    expect(partOf('hero-girl', 140, 90, 55, 0.5)).toBe('skin');     // an arm beside the top
  });

  it('keeps the drawing\'s light and shade around the chosen colour', () => {
    const light = shadeTo('top', '#e5383b', 0.65), dark = shadeTo('top', '#e5383b', 0.35);
    expect(rgbToHsl(...light)[2]).toBeGreaterThan(rgbToHsl(...dark)[2]);
    expect(Math.abs(rgbToHsl(...light)[0] - rgbToHsl(...dark)[0])).toBeLessThan(2);   // same hue
  });

  it('names the recoloured sheet after its choices and counts as a hero sheet', () => {
    expect(heroColourKey('hero', {})).toBe('hero');
    expect(heroRecoloured({})).toBe(false);
    const look = { heroSkin: 'amber', heroTop: 'red' };
    expect(heroRecoloured(look)).toBe(true);
    expect(heroColourKey('hero-girl', look)).toBe('hero-girl:amber||red||');
    expect(isHeroKey('hero-girl:amber||red||')).toBe(true);
    expect(isHeroKey('look:boy|light')).toBe(false);
    for (const k of Object.keys(HERO_COLOUR_KEYS)) expect(heroHex(k, k === 'heroSkin' ? 'amber' : k === 'heroHair' ? 'blonde' : 'red')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('the editor\'s hero colours survive saving, and bad values are dropped', () => {
    expect(sanitizeLook({ heroSkin: 'amber', heroTop: 'red', heroHair: 'nope' })).toEqual({ heroSkin: 'amber', heroTop: 'red' });
    expect(resolveLook({ avatar: 1, look: { heroShoes: 'blue' } }).heroShoes).toBe('blue');
  });
});
