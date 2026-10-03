// Letters for the youngest readers: each letter with a word that starts with its sound and a picture of it
// (Caribbean where we can: mango, crab, goat, yam). No digraph starts (no "sh", "ch"), so the first sound is the
// letter's own. Also rhyming families, sight words and short picture words.
export const LETTERS = [
  { u: 'A', l: 'a', word: 'apple', pic: '🍎' }, { u: 'B', l: 'b', word: 'banana', pic: '🍌' }, { u: 'C', l: 'c', word: 'crab', pic: '🦀' },
  { u: 'D', l: 'd', word: 'dog', pic: '🐶' }, { u: 'E', l: 'e', word: 'egg', pic: '🥚' }, { u: 'F', l: 'f', word: 'fish', pic: '🐟' },
  { u: 'G', l: 'g', word: 'goat', pic: '🐐' }, { u: 'H', l: 'h', word: 'hat', pic: '👒' }, { u: 'I', l: 'i', word: 'insect', pic: '🐜' },
  { u: 'J', l: 'j', word: 'jar', pic: '🫙' }, { u: 'K', l: 'k', word: 'kite', pic: '🪁' }, { u: 'L', l: 'l', word: 'leaf', pic: '🍃' },
  { u: 'M', l: 'm', word: 'mango', pic: '🥭' }, { u: 'N', l: 'n', word: 'nest', pic: '🪺' }, { u: 'O', l: 'o', word: 'octopus', pic: '🐙' },
  { u: 'P', l: 'p', word: 'pineapple', pic: '🍍' }, { u: 'Q', l: 'q', word: 'queen', pic: '👑' }, { u: 'R', l: 'r', word: 'rain', pic: '🌧️' },
  { u: 'S', l: 's', word: 'sun', pic: '☀️' }, { u: 'T', l: 't', word: 'turtle', pic: '🐢' }, { u: 'U', l: 'u', word: 'umbrella', pic: '☂️' },
  { u: 'V', l: 'v', word: 'van', pic: '🚐' }, { u: 'W', l: 'w', word: 'web', pic: '🕸️' }, { u: 'X', l: 'x', word: 'box', pic: '📦', ends: true },
  { u: 'Y', l: 'y', word: 'yam', pic: '🍠' }, { u: 'Z', l: 'z', word: 'zebra', pic: '🦓' }
];
/** Letters to start with: the easiest to see and say (the letters of the child's first words). */
export const FIRST_LETTERS = 'SATPINMDGOCKEHRB'.split('');
export const letterInfo = (ch) => LETTERS.find((x) => x.u === String(ch).toUpperCase()) || null;

/** Rhyming families of short words, each with a picture so a child who cannot read yet can still match them. */
export const RHYMES = [
  [{ w: 'cat', pic: '🐱' }, { w: 'hat', pic: '👒' }, { w: 'bat', pic: '🦇' }, { w: 'mat', pic: '🧶' }],
  [{ w: 'dog', pic: '🐶' }, { w: 'log', pic: '🪵' }, { w: 'frog', pic: '🐸' }],
  [{ w: 'sun', pic: '☀️' }, { w: 'bun', pic: '🍞' }, { w: 'run', pic: '🏃' }],
  [{ w: 'bee', pic: '🐝' }, { w: 'tree', pic: '🌳' }, { w: 'sea', pic: '🌊' }, { w: 'three', pic: '3️⃣' }],
  [{ w: 'goat', pic: '🐐' }, { w: 'boat', pic: '⛵' }, { w: 'coat', pic: '🧥' }],
  [{ w: 'cake', pic: '🎂' }, { w: 'snake', pic: '🐍' }, { w: 'lake', pic: '🏞️' }],
  [{ w: 'star', pic: '⭐' }, { w: 'car', pic: '🚗' }, { w: 'jar', pic: '🫙' }],
  [{ w: 'bed', pic: '🛏️' }, { w: 'red', pic: '🟥' }, { w: 'bread', pic: '🍞' }],
  [{ w: 'pig', pic: '🐷' }, { w: 'wig', pic: '💇' }, { w: 'dig', pic: '⛏️' }],
  [{ w: 'moon', pic: '🌙' }, { w: 'spoon', pic: '🥄' }, { w: 'balloon', pic: '🎈' }],
  [{ w: 'fish', pic: '🐟' }, { w: 'dish', pic: '🍽️' }, { w: 'wish', pic: '🌠' }],
  [{ w: 'king', pic: '🤴' }, { w: 'ring', pic: '💍' }, { w: 'swing', pic: '🛝' }]
];

/** Sight words: Kindergarten, then Grade 1. */
export const SIGHT_WORDS = {
  0: ['the', 'I', 'a', 'is', 'can', 'see', 'and', 'my', 'we', 'go', 'to', 'like', 'it', 'in', 'me', 'you'],
  1: ['was', 'said', 'they', 'come', 'have', 'what', 'here', 'there', 'where', 'some', 'look', 'play', 'went', 'with', 'this', 'are']
};

/** Short words with pictures, for "which word is this?" and Word Builder: three letters, one sound each. */
export const PICTURE_WORDS = [
  { w: 'cat', pic: '🐱', h: 'A pet that says meow' }, { w: 'dog', pic: '🐶', h: 'A pet that barks' }, { w: 'sun', pic: '☀️', h: 'It shines in the sky' },
  { w: 'pig', pic: '🐷', h: 'A farm animal that oinks' }, { w: 'hat', pic: '👒', h: 'You wear it on your head' }, { w: 'bus', pic: '🚌', h: 'It takes you to school' },
  { w: 'bed', pic: '🛏️', h: 'You sleep in it' }, { w: 'cup', pic: '🥤', h: 'You drink from it' }, { w: 'yam', pic: '🍠', h: 'A root we cook and eat' },
  { w: 'net', pic: '🥅', h: 'It catches fish' }, { w: 'map', pic: '🗺️', h: 'It shows the way' }, { w: 'box', pic: '📦', h: 'You keep things in it' },
  { w: 'web', pic: '🕸️', h: 'A spider makes it' }, { w: 'fox', pic: '🦊', h: 'A red animal with a bushy tail' }, { w: 'van', pic: '🚐', h: 'It carries people and boxes' },
  { w: 'jam', pic: '🍯', h: 'Sweet and spread on bread' }, { w: 'pen', pic: '🖊️', h: 'You write with it' }, { w: 'bat', pic: '🦇', h: 'It flies at night' },
  { w: 'bug', pic: '🐛', h: 'A tiny crawling animal' }, { w: 'hen', pic: '🐔', h: 'It lays eggs' }
];
