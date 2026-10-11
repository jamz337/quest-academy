// Design tokens for the UI. Phaser-free on purpose: the parent dashboard imports this too.
// World pixel art keeps its own palette in constants.js (C) and systems/Textures.js.

export const THEME = {
  // surfaces
  bg: 0xfbf3ea, bgBottom: 0xf8eadb, surface: 0xffffff, surfaceAlt: 0xfbf6ee, sunken: 0xf3ede4,
  // ink
  ink: 0x1e1b4b, ink2: 0x5f5c85, ink3: 0x9794ad, onAccent: 0xffffff, line: 0xe9e2d8, lineStrong: 0xd6cfc4,
  // accents
  primary: 0x3d8bff, primaryDark: 0x2a6fd6, primarySoft: 0xdcebff,
  brand: 0x7c5cff, brandDark: 0x6244d9, brandSoft: 0xe9e3ff,
  pink: 0xff6fae, pinkDark: 0xd9548f, pinkSoft: 0xffe3ef,
  // semantic
  success: 0x2ec46a, successDark: 0x229c53, successSoft: 0xdcf6e6,
  danger: 0xff5c6c, dangerDark: 0xd94656, dangerSoft: 0xffe1e5,
  warning: 0xffb627, warningDark: 0xe09a12, warningSoft: 0xfff0cc,
  gold: 0xffc531, coin: 0xffb627, starOff: 0xe4ddd2,
  subjects: {
    math: { accent: 0x4c8df6, dark: 0x2e63d6, soft: 0xdcebff },
    words: { accent: 0x249762, dark: 0x17694a, soft: 0xdcf6e6 },
    code: { accent: 0xe8623f, dark: 0xcf4a2e, soft: 0xffe6d3 },
    bible: { accent: 0x8566ee, dark: 0x6243cf, soft: 0xeee6ff },
    science: { accent: 0x12a3b0, dark: 0x0c7d88, soft: 0xd6f3f5 },
    history: { accent: 0x30589c, dark: 0x1f3d75, soft: 0xdfe7f7 },
    music: { accent: 0xd8368a, dark: 0x9f1f62, soft: 0xfbe0ee },
    studio: { accent: 0xd9642c, dark: 0xa3461c, soft: 0xfbe3d6 }
  },
  radius: { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  // "Soft" shadows drawn as stacked offset rects (Graphics cannot blur). Each entry is one rounded rect.
  shadow: {
    color: 0x1e1b4b,
    none: [],
    sm: [{ dy: 3, a: 0.10 }],
    md: [{ dy: 3, a: 0.06 }, { dy: 8, a: 0.06 }],
    lg: [{ dy: 4, a: 0.05 }, { dy: 12, a: 0.07 }, { dy: 24, a: 0.05 }]
  },
  motion: {
    fast: 90, base: 180, slow: 300, enter: 260, stagger: 40,
    ease: { spring: 'Back.Out', out: 'Cubic.Out', inOut: 'Sine.InOut' },
    press: 0.96
  },
  block: {
    fwd: 0x3d8bff, left: 0x8b7fd6, right: 0x8b7fd6, pick: 0xffc531, repeat: 0xff8f3f,
    if: 0x2ec46a, while: 0x7c5cff, call: 0xff6fae, else: 0x229c53
  }
};

/** 0xrrggbb -> '#rrggbb' */
export const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

const ch = (c, shift) => (c >> shift) & 0xff;
const rgb = (r, g, b) => ((Math.round(r) & 0xff) << 16) | ((Math.round(g) & 0xff) << 8) | (Math.round(b) & 0xff);

/** Linear blend from a to b by t in 0..1. */
export function mix(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return rgb(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * k, ch(a, 8) + (ch(b, 8) - ch(a, 8)) * k, ch(a, 0) + (ch(b, 0) - ch(a, 0)) * k);
}
export const darken = (c, f = 0.85) => rgb(ch(c, 16) * f, ch(c, 8) * f, ch(c, 0) * f);
export const lighten = (c, f = 0.3) => mix(c, 0xffffff, f);

/** Relative luminance 0..1 (sRGB approximation, good enough for picking text colour). */
export function luma(c) {
  return (0.2126 * ch(c, 16) + 0.7152 * ch(c, 8) + 0.0722 * ch(c, 0)) / 255;
}
/** Ink on light fills, white on dark fills. */
export const textOn = (c) => (luma(c) > 0.62 ? THEME.ink : THEME.onAccent);

/**
 * Brushed-metal finishes for small buttons: [top, middle, bottom, border, text]. Silver is the default side action;
 * bronze, gunmetal and steel give the home screen's four small buttons their own character.
 */
export const METALS = {
  silver: [0xf6f8fb, 0xc6cdd9, 0xe9edf3, 0x9aa3b2, 0x1e1b4b],
  bronze: [0xefe1d0, 0xb9a088, 0xe0cdb8, 0x8e7862, 0x3a2a1c],
  gunmetal: [0x555b6b, 0x2a2e39, 0x484d5c, 0x1f222b, 0xffffff],
  steel: [0x8fa5bc, 0x5c748d, 0x7f96ae, 0x4d6279, 0xffffff]
};

/**
 * Fill a rounded rect with top-to-bottom shading (Graphics cannot gradient a rounded shape): thin strips, inset at
 * the corners. `stops` is [top, bottom] or [top, middle, bottom] (the middle sits at 55%).
 */
export function shadeRoundedRect(g, x, y, w, h, r, stops) {
  const at = (t) => (stops.length === 2 ? mix(stops[0], stops[1], t) : t < 0.55 ? mix(stops[0], stops[1], t / 0.55) : mix(stops[1], stops[2], (t - 0.55) / 0.45));
  // Strips are one screen pixel tall inside the rounded corners (so the curve has no visible steps on a sharp
  // phone screen) and 2 units tall along the straight sides, where only the colour changes.
  const fine = 1 / Math.max(1, Math.min(4, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  for (let yy = 0; yy < h - 0.001;) {
    const corner = yy < r || yy >= h - r;
    const sh = Math.min(corner ? fine : Math.min(2, Math.max(fine, h - r - yy)), h - yy);
    const mid = yy + sh / 2, d = Math.min(mid, h - mid);
    const inset = d < r ? r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d))) : 0;
    g.fillStyle(at(yy / h), 1);
    g.fillRect(x + inset, y + yy, w - inset * 2, sh);
    yy += sh;
  }
}

/** Subject accent set; falls back to primary for unknown ids. */
export function subjectOf(id) {
  return THEME.subjects[id] ?? { accent: THEME.primary, dark: THEME.primaryDark, soft: THEME.primarySoft };
}

/** Draw a soft shadow under a rounded rect (top-left origin) using the stacked-rect spec. */
export function drawShadow(g, x, y, w, h, r, level = 'md') {
  const layers = THEME.shadow[level] || [];
  for (const { dy, a } of layers) {
    g.fillStyle(THEME.shadow.color, a);
    g.fillRoundedRect(x, y + dy, w, h, r);
  }
  return g;
}

/** CSS custom properties mirroring the tokens, for the HTML pages. */
export function cssVars() {
  const v = {
    '--bg': hex(THEME.bg), '--bg-bottom': hex(THEME.bgBottom), '--surface': hex(THEME.surface), '--surface-alt': hex(THEME.surfaceAlt),
    '--sunken': hex(THEME.sunken), '--ink': hex(THEME.ink), '--ink2': hex(THEME.ink2), '--ink3': hex(THEME.ink3),
    '--line': hex(THEME.line), '--line-strong': hex(THEME.lineStrong),
    '--primary': hex(THEME.primary), '--primary-dark': hex(THEME.primaryDark), '--primary-soft': hex(THEME.primarySoft),
    '--brand': hex(THEME.brand), '--brand-soft': hex(THEME.brandSoft), '--pink': hex(THEME.pink), '--pink-soft': hex(THEME.pinkSoft),
    '--brand-dark': hex(THEME.brandDark), '--pink-dark': hex(THEME.pinkDark),
    '--success': hex(THEME.success), '--success-dark': hex(THEME.successDark), '--success-soft': hex(THEME.successSoft),
    '--danger': hex(THEME.danger), '--danger-dark': hex(THEME.dangerDark), '--danger-soft': hex(THEME.dangerSoft),
    '--warning': hex(THEME.warning), '--warning-dark': hex(THEME.warningDark), '--warning-soft': hex(THEME.warningSoft), '--gold': hex(THEME.gold), '--star-off': hex(THEME.starOff),
    '--math': hex(THEME.subjects.math.accent), '--words': hex(THEME.subjects.words.accent), '--code': hex(THEME.subjects.code.accent), '--bible': hex(THEME.subjects.bible.accent), '--science': hex(THEME.subjects.science.accent), '--history': hex(THEME.subjects.history.accent), '--music': hex(THEME.subjects.music.accent), '--studio': hex(THEME.subjects.studio.accent),
    '--math-soft': hex(THEME.subjects.math.soft), '--words-soft': hex(THEME.subjects.words.soft), '--code-soft': hex(THEME.subjects.code.soft)
  };
  return v;
}
