// Pictures for the youngest players (Pre-K to Grade 1): Caribbean things to count, shapes to name, and the words
// they stand for, so a picture answer can be read aloud ("three mangoes", "a triangle").
export const THINGS = [
  { pic: '🥭', one: 'mango', many: 'mangoes' },
  { pic: '🥥', one: 'coconut', many: 'coconuts' },
  { pic: '🐟', one: 'fish', many: 'fish' },
  { pic: '🐚', one: 'shell', many: 'shells' },
  { pic: '🦀', one: 'crab', many: 'crabs' },
  { pic: '🍌', one: 'banana', many: 'bananas' },
  { pic: '🌺', one: 'flower', many: 'flowers' },
  { pic: '🐢', one: 'turtle', many: 'turtles' },
  { pic: '⭐', one: 'star', many: 'stars' },
  { pic: '🍍', one: 'pineapple', many: 'pineapples' },
  { pic: '🐐', one: 'goat', many: 'goats' },
  { pic: '🐓', one: 'rooster', many: 'roosters' },
  { pic: '🦜', one: 'parrot', many: 'parrots' },
  { pic: '⚽', one: 'ball', many: 'balls' }
];

export const SHAPES = [
  { pic: '🔴', name: 'circle', fact: 'A circle is round all the way. It has no corners.' },
  { pic: '🟦', name: 'square', fact: 'A square has 4 sides that are all the same, and 4 corners.' },
  { pic: '🔺', name: 'triangle', fact: 'A triangle has 3 sides and 3 corners.' },
  { pic: '⭐', name: 'star', fact: 'A star has 5 points.' },
  { pic: '❤️', name: 'heart', fact: 'A heart is the shape we draw for love.' },
  { pic: '🔷', name: 'diamond', fact: 'A diamond has 4 sides and stands on one corner.' }
];

export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
export const numberWord = (n) => NUMBER_WORDS[n] ?? String(n);

const BY_PIC = new Map([...THINGS.map((t) => [t.pic, t]), ...SHAPES.map((s) => [s.pic, { one: s.name, many: `${s.name}s` }])]);

/** Picture characters in a string (emoji, keeping each as one item; variation selectors are dropped). */
export function picsIn(str) {
  return [...String(str).replace(/[\u{FE0F}\u{200D}]/gu, '')].filter((ch) => /\p{Extended_Pictographic}/u.test(ch));
}

/**
 * How a picture-only answer should sound: "three mangoes", "a triangle", "two bananas and one mango".
 * Returns null when the string has letters or digits (it is read as it is), or a picture we do not know.
 */
export function picturesSaid(str) {
  const s = String(str || '');
  if (/[\p{L}\p{N}]/u.test(s)) return null;
  const pics = picsIn(s);
  if (!pics.length) return null;
  const counts = new Map();
  for (const p of pics) { const key = p === '❤' ? '❤️' : p; counts.set(key, (counts.get(key) || 0) + 1); }
  const parts = [];
  for (const [p, n] of counts) {
    const t = BY_PIC.get(p) || BY_PIC.get(p + '️');
    if (!t) return null;
    parts.push(n === 1 ? (/^[aeiou]/.test(t.one) ? `an ${t.one}` : `a ${t.one}`) : `${numberWord(n)} ${t.many}`);
  }
  return parts.join(' and ');
}
