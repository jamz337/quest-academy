// Looks for players and villagers, built from the Liberated Pixel Cup sprite layers (see ui/LpcCharacter.js).
// A look is { sex, skin, hairStyle, hair, topStyle, top, bottomStyle, bottom, shoes, eyes, bg }: the colour fields
// are palette variant names from the pack, `bg` is the badge background as '#rrggbb'. Pure data, no Phaser: the
// parent dashboard composes the same faces.
import { SKIN_TONES, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS, SKIN_VARIANTS, HAIR_VARIANTS, CLOTH_VARIANTS, EYE_VARIANTS, HAIR_STYLES as LPC_HAIR, TOP_STYLES, BOTTOM_STYLES } from '../ui/LpcCharacter.js';

export const OUTLINE = '#2d2a4a';
export const MOUTH = '#e0567a';
export const BOOTS = '#3b2f2f';
export const SEXES = ['boy', 'girl'];
export const HAIR_STYLES = Object.keys(LPC_HAIR);
export const TOPS = Object.keys(TOP_STYLES);
export const BOTTOMS = Object.keys(BOTTOM_STYLES);
export { SKIN_TONES, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS, SKIN_VARIANTS, HAIR_VARIANTS, CLOTH_VARIANTS, EYE_VARIANTS };

/** The eight presets on the profile screen: four boys and four girls. */
export const CHARACTER_STYLES = [
  { sex: 'boy', skin: 'brown', hairStyle: 'dreadlocks_short', hair: 'black', topStyle: 'tshirt', top: 'blue', bottomStyle: 'shorts', bottom: 'navy', shoes: 'white', eyes: 'brown', bg: '#3d8bff' },
  { sex: 'girl', skin: 'bronze', hairStyle: 'curly_long', hair: 'dark_brown', topStyle: 'tshirt', top: 'pink', bottomStyle: 'skirt', bottom: 'purple', shoes: 'brown', eyes: 'brown', bg: '#ff6fae' },
  { sex: 'boy', skin: 'light', hairStyle: 'plain', hair: 'blonde', topStyle: 'polo', top: 'green', bottomStyle: 'pants', bottom: 'brown', shoes: 'brown', eyes: 'blue', bg: '#2ec46a' },
  { sex: 'girl', skin: 'amber', hairStyle: 'high_ponytail', hair: 'chestnut', topStyle: 'tshirt', top: 'orange', bottomStyle: 'pants', bottom: 'blue', shoes: 'white', eyes: 'green', bg: '#ff8f3f' },
  { sex: 'girl', skin: 'black', hairStyle: 'twists_straight', hair: 'black', topStyle: 'polo', top: 'purple', bottomStyle: 'shorts', bottom: 'yellow', shoes: 'black', eyes: 'brown', bg: '#8b7fd6' },
  { sex: 'boy', skin: 'olive', hairStyle: 'curly_short', hair: 'black', topStyle: 'tshirt', top: 'yellow', bottomStyle: 'pants', bottom: 'navy', shoes: 'brown', eyes: 'brown', bg: '#ffc531' },
  { sex: 'girl', skin: 'taupe', hairStyle: 'braid', hair: 'dark_brown', topStyle: 'tshirt', top: 'teal', bottomStyle: 'skirt', bottom: 'red', shoes: 'brown', eyes: 'gray', bg: '#7c5cff' },
  { sex: 'boy', skin: 'bronze', hairStyle: 'afro', hair: 'black', topStyle: 'polo', top: 'red', bottomStyle: 'shorts', bottom: 'black', shoes: 'white', eyes: 'brown', bg: '#ff5c6c' }
];

/** The villagers, in npc0.. order (see world/npcs.js). `body` and `outfit` add a special body or worn items. */
export const NPC_STYLES = [
  { sex: 'boy', skin: 'light', hairStyle: 'plain', hair: 'white', topStyle: 'polo', top: 'purple', bottomStyle: 'pants', bottom: 'navy', shoes: 'brown', eyes: 'blue' },          // professor plus
  { sex: 'girl', skin: 'light', hairStyle: 'bob', hair: 'chestnut', topStyle: 'tshirt', top: 'white', bottomStyle: 'skirt', bottom: 'red', shoes: 'black', eyes: 'green' },        // chef fraction
  { sex: 'boy', skin: 'bronze', hairStyle: 'buzzcut', hair: 'black', topStyle: 'tshirt', top: 'yellow', bottomStyle: 'pants', bottom: 'gray', shoes: 'brown', eyes: 'brown' },     // bridge keeper
  { sex: 'girl', skin: 'light', hairStyle: 'long', hair: 'gray', topStyle: 'polo', top: 'green', bottomStyle: 'skirt', bottom: 'brown', shoes: 'brown', eyes: 'brown' },          // owl librarian
  { sex: 'boy', skin: 'light', hairStyle: 'spiked', hair: 'ginger', topStyle: 'polo', top: 'blue', bottomStyle: 'pants', bottom: 'white', shoes: 'black', eyes: 'blue' },        // gate guard
  { sex: 'girl', skin: 'bronze', hairStyle: 'ponytail', hair: 'purple', topStyle: 'tshirt', top: 'pink', bottomStyle: 'shorts', bottom: 'black', shoes: 'brown', eyes: 'brown' }, // safari ranger
  { sex: 'girl', skin: 'light', hairStyle: 'bob', hair: 'green', topStyle: 'tshirt', top: 'gray', bottomStyle: 'pants', bottom: 'blue', shoes: 'black', eyes: 'gray' },           // robo mechanic
  { sex: 'boy', skin: 'light', hairStyle: 'curly_short', hair: 'gray', topStyle: 'tshirt', top: 'brown', bottomStyle: 'shorts', bottom: 'purple', shoes: 'brown', eyes: 'brown' }, // bug catcher
  { sex: 'boy', skin: 'bronze', hairStyle: 'plain', hair: 'redhead', topStyle: 'polo', top: 'green', bottomStyle: 'pants', bottom: 'black', shoes: 'brown', eyes: 'brown' },      // signpost sam
  { sex: 'girl', skin: 'light', hairStyle: 'long', hair: 'blonde', topStyle: 'tshirt', top: 'purple', bottomStyle: 'skirt', bottom: 'green', shoes: 'brown', eyes: 'blue' },      // fortune teller
  { sex: 'boy', skin: 'bronze', hairStyle: 'curly_short', hair: 'dark_brown', topStyle: 'tshirt', top: 'tan', bottomStyle: 'pants', bottom: 'brown', shoes: 'brown', eyes: 'brown' }, // shepherd
  { sex: 'girl', skin: 'light', hairStyle: 'braid', hair: 'black', topStyle: 'polo', top: 'lavender', bottomStyle: 'skirt', bottom: 'gray', shoes: 'brown', eyes: 'brown' },      // scribe
  { sex: 'boy', skin: 'bronze', hairStyle: 'plain', hair: 'chestnut', topStyle: 'tshirt', top: 'blue', bottomStyle: 'shorts', bottom: 'navy', shoes: 'brown', eyes: 'brown' },    // fisherman
  { sex: 'girl', skin: 'light', hairStyle: 'high_ponytail', hair: 'pink', topStyle: 'tshirt', top: 'yellow', bottomStyle: 'skirt', bottom: 'blue', shoes: 'white', eyes: 'blue' }, // balloon seller
  { sex: 'girl', skin: 'bronze', hairStyle: 'braid', hair: 'green', topStyle: 'tshirt', top: 'green', bottomStyle: 'shorts', bottom: 'forest', shoes: 'brown', eyes: 'green' },  // lily pad lou
  { sex: 'boy', skin: 'taupe', hairStyle: 'spiked', hair: 'blue', topStyle: 'tshirt', top: 'black', bottomStyle: 'pants', bottom: 'purple', shoes: 'white', eyes: 'blue' },       // dj bolt
  { sex: 'boy', skin: 'brown', hairStyle: 'afro', hair: 'black', topStyle: 'polo', top: 'brown', bottomStyle: 'pants', bottom: 'leather', shoes: 'brown', eyes: 'brown' },        // ark builder
  { sex: 'girl', skin: 'brown', hairStyle: 'bangs', hair: 'gray', topStyle: 'polo', top: 'navy', bottomStyle: 'skirt', bottom: 'navy', shoes: 'black', eyes: 'brown', body: 'headmistress' },   // headmistress hope
  { sex: 'girl', skin: 'black', hairStyle: 'bob', hair: 'black', topStyle: 'tshirt', top: 'orange', bottomStyle: 'skirt', bottom: 'green', shoes: 'brown', eyes: 'brown', outfit: { hat: { shape: 'sun', colour: '#ffc531' } } }   // auntie vee
];

// Badge backgrounds players can pick in the profile editor.
export const BG_COLORS = ['#3d8bff', '#ff6fae', '#2ec46a', '#ff8f3f', '#8b7fd6', '#ffc531', '#ff5c6c', '#7c5cff', '#4aa8ff', '#f3e2ad', '#2d2a4a', '#ffffff', '#5cc45a'];

const HEX = /^#[0-9a-f]{6}$/i;
const ALLOWED = {
  sex: SEXES, skin: SKIN_VARIANTS, hairStyle: HAIR_STYLES, hair: HAIR_VARIANTS, topStyle: TOPS, top: CLOTH_VARIANTS,
  bottomStyle: BOTTOMS, bottom: CLOTH_VARIANTS, shoes: CLOTH_VARIANTS, eyes: EYE_VARIANTS
};

/** Keep only valid overrides from a stored look; anything else (including old colour codes) is dropped. */
export function sanitizeLook(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  for (const [k, allowed] of Object.entries(ALLOWED)) if (allowed.includes(look[k])) out[k] = look[k];
  if (typeof look.bg === 'string' && HEX.test(look.bg)) out.bg = look.bg.toLowerCase();
  return Object.keys(out).length ? out : null;
}

/** The look a profile is drawn with: its preset (`avatar` index) with any `look` overrides on top. */
export function resolveLook(profile) {
  const idx = Math.max(0, Math.min(CHARACTER_STYLES.length - 1, Number(profile?.avatar) || 0));
  return { ...CHARACTER_STYLES[idx], ...(sanitizeLook(profile?.look) || {}) };
}

/** Stable id for a resolved look, used as a texture key suffix. */
export function lookId(look) {
  return ['sex', 'skin', 'hairStyle', 'hair', 'topStyle', 'top', 'bottomStyle', 'bottom', 'shoes', 'eyes', 'bg', 'body'].map((k) => String(look[k] || '')).join('|');
}
