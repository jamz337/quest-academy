// Colour styles for the 8 player avatars and 10 villagers. Pure data, no Phaser: the parent dashboard
// draws the same faces from these values so it needs no game assets.
export const OUTLINE = '#2d2a4a';
export const MOUTH = '#e0567a';
export const BOOTS = '#3b2f2f';

export const CHARACTER_STYLES = [
  { hair: '#a8613a', skin: '#ffd6b3', top: '#3d8bff', legs: '#2d2a4a' },
  { hair: '#2d2a4a', skin: '#b8794a', top: '#ff6fae', legs: '#7c5cff' },
  { hair: '#ffc531', skin: '#ffd6b3', top: '#2ec46a', legs: '#229c53' },
  { hair: '#625f7e', skin: '#ffd6b3', top: '#ff8f3f', legs: '#625f7e' },
  { hair: '#ff5c6c', skin: '#ffd6b3', top: '#8b7fd6', legs: '#2d2a4a' },
  { hair: '#2d2a4a', skin: '#ffd6b3', top: '#ffc531', legs: '#3d8bff' },
  { hair: '#7c5cff', skin: '#b8794a', top: '#d6cfc4', legs: '#2d2a4a' },
  { hair: '#d6cfc4', skin: '#ffd6b3', top: '#ff5c6c', legs: '#2d2a4a' }
];

// Extra NPC looks so villagers do not all resemble the player avatars.
export const NPC_STYLES = [
  { hair: '#ffffff', skin: '#ffd6b3', top: '#7c5cff', legs: '#2d2a4a' },
  { hair: '#a8613a', skin: '#ffd6b3', top: '#ffffff', legs: '#ff5c6c' },
  { hair: '#2d2a4a', skin: '#b8794a', top: '#ffc531', legs: '#625f7e' },
  { hair: '#625f7e', skin: '#ffd6b3', top: '#229c53', legs: '#a8613a' },
  { hair: '#ff8f3f', skin: '#ffd6b3', top: '#3d8bff', legs: '#ffffff' },
  { hair: '#8b7fd6', skin: '#b8794a', top: '#ff6fae', legs: '#2d2a4a' },
  { hair: '#2ec46a', skin: '#ffd6b3', top: '#625f7e', legs: '#3d8bff' },
  { hair: '#d6cfc4', skin: '#ffd6b3', top: '#a8613a', legs: '#7c5cff' },
  { hair: '#ff5c6c', skin: '#b8794a', top: '#2ec46a', legs: '#2d2a4a' },
  { hair: '#ffc531', skin: '#ffd6b3', top: '#8b7fd6', legs: '#229c53' },
  { hair: '#7a4a2a', skin: '#b8794a', top: '#e8d9b5', legs: '#7a4a2a' },   // shepherd
  { hair: '#2d2a4a', skin: '#ffd6b3', top: '#8b5cf6', legs: '#625f7e' },   // scribe
  { hair: '#a8613a', skin: '#b8794a', top: '#3d8bff', legs: '#2d2a4a' },   // fisherman
  { hair: '#ff6fae', skin: '#ffd6b3', top: '#ffc531', legs: '#3d8bff' },   // balloon seller
  { hair: '#2ec46a', skin: '#b8794a', top: '#8fe07c', legs: '#229c53' },   // lily pad lou
  { hair: '#3d8bff', skin: '#d6cfc4', top: '#2d2a4a', legs: '#7c5cff' },   // dj bot
  { hair: '#625f7e', skin: '#c98a5a', top: '#a06a3e', legs: '#5a3a22' }    // ark builder
];

// Swatches players can pick in the profile editor. The first entries mirror the preset colours above.
export const HAIR_COLORS = ['#2d2a4a', '#a8613a', '#7a4a2a', '#ffc531', '#ff8f3f', '#ff5c6c', '#625f7e', '#d6cfc4', '#ffffff', '#7c5cff', '#ff6fae', '#3d8bff', '#2ec46a'];
export const CLOTHES_COLORS = ['#3d8bff', '#ff6fae', '#2ec46a', '#ff8f3f', '#8b7fd6', '#ffc531', '#d6cfc4', '#ff5c6c', '#7c5cff', '#229c53', '#2d2a4a', '#ffffff', '#a8613a'];
export const BG_COLORS = ['#3d8bff', '#ff6fae', '#2ec46a', '#ff8f3f', '#8b7fd6', '#ffc531', '#ff5c6c', '#7c5cff', '#4aa8ff', '#f3e2ad', '#2d2a4a', '#ffffff', '#5cc45a'];

const HEX = /^#[0-9a-f]{6}$/i;

/** Keep only valid '#rrggbb' overrides from a stored look; anything else is dropped. Returns null when nothing is set. */
export function sanitizeLook(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  for (const k of ['hair', 'top', 'bg']) if (typeof look[k] === 'string' && HEX.test(look[k])) out[k] = look[k].toLowerCase();
  return Object.keys(out).length ? out : null;
}

/**
 * The colours a profile is drawn with: its preset (`avatar` index) with any `look` overrides on top.
 * `bg` is the badge background; it defaults to the top colour so profiles without a look render as before.
 */
export function resolveLook(profile) {
  const idx = Math.max(0, Math.min(CHARACTER_STYLES.length - 1, Number(profile?.avatar) || 0));
  const st = CHARACTER_STYLES[idx];
  const o = sanitizeLook(profile?.look) || {};
  const top = o.top || st.top;
  return { hair: o.hair || st.hair, skin: st.skin, top, legs: st.legs, bg: o.bg || top };
}

/** Stable id for a resolved look, used as a texture key suffix. */
export function lookId(look) {
  return [look.hair, look.skin, look.top, look.legs, look.bg].map((c) => c.slice(1)).join('');
}
