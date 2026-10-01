// Letter patterns worth pointing out when two or more words in a list share them: vowel teams, consonant
// digraphs and common endings. The teaching screen opens with one card per pattern found, highlighting the
// letters inside each word, so the child learns the chunk rather than each word on its own.
export const PATTERNS = [
  { letters: 'tion', where: 'end', note: 'says "shun" at the end of a word' },
  { letters: 'tious', where: 'end', note: 'says "shus" at the end of a word' },
  { letters: 'ies', where: 'end', note: 'y turns into ies to make more than one' },
  { letters: 'ing', where: 'end', note: 'an ending that means it is happening now' },
  { letters: 'ful', where: 'end', note: 'an ending that means "full of"' },
  { letters: 'ous', where: 'end', note: 'an ending that means "full of"' },
  { letters: 'ants', where: 'end', note: 'an ending for people or things that do something' },
  { letters: 'ents', where: 'end', note: 'an ending for things that do something' },
  { letters: 'ists', where: 'end', note: 'people who do something' },
  { letters: 'ors', where: 'end', note: 'people who do something' },
  { letters: 'ed', where: 'end', note: 'an ending that means it already happened' },
  { letters: 'er', where: 'end', note: 'a common ending' },
  { letters: 'ly', where: 'end', note: 'an ending that tells how' },
  { letters: 'ea', where: 'any', note: 'two vowels working together' },
  { letters: 'ee', where: 'any', note: 'two vowels working together' },
  { letters: 'ai', where: 'any', note: 'two vowels working together' },
  { letters: 'oa', where: 'any', note: 'two vowels working together' },
  { letters: 'oo', where: 'any', note: 'two vowels working together' },
  { letters: 'ou', where: 'any', note: 'two vowels working together' },
  { letters: 'ie', where: 'any', note: 'two vowels working together' },
  { letters: 'ch', where: 'any', note: 'two letters, one sound' },
  { letters: 'sh', where: 'any', note: 'two letters, one sound' },
  { letters: 'th', where: 'any', note: 'two letters, one sound' },
  { letters: 'ph', where: 'any', note: 'two letters that say "f"' },
  { letters: 'ck', where: 'any', note: 'two letters that say "k"' },
  { letters: 'tt', where: 'any', note: 'a doubled letter' },
  { letters: 'll', where: 'any', note: 'a doubled letter' },
  { letters: 'ss', where: 'any', note: 'a doubled letter' },
  { letters: 'bb', where: 'any', note: 'a doubled letter' }
];

/** Where `letters` sit in `word` for a pattern, or -1. */
export function patternIndex(word, p) {
  const w = String(word).toLowerCase();
  if (p.where === 'end') return w.endsWith(p.letters) ? w.length - p.letters.length : -1;
  return w.indexOf(p.letters);
}

/**
 * Patterns shared by at least two of `words`, most shared first (at most `max`):
 * [{ letters, note, words: [{ word, at }] }]. A word is used by one pattern only, its best fit.
 */
export function findPatterns(words, max = 4) {
  const used = new Set();
  const found = [];
  for (const p of PATTERNS) {
    const hits = words.map((w) => ({ word: w, at: patternIndex(w, p) })).filter((h) => h.at >= 0 && !used.has(h.word));
    if (hits.length >= 2) found.push({ letters: p.letters, note: p.note, words: hits });
  }
  found.sort((a, b) => b.words.length - a.words.length || b.letters.length - a.letters.length);
  const out = [];
  for (const f of found) {
    const fresh = f.words.filter((h) => !used.has(h.word));
    if (fresh.length < 2) continue;
    fresh.forEach((h) => used.add(h.word));
    out.push({ ...f, words: fresh });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * More words for each pattern, for the "find the family" round: the child spots which new words share the
 * letters. Short, everyday words a child can read.
 */
export const FAMILIES = {
  tion: ['station', 'nation', 'lotion', 'action', 'motion'],
  tious: ['delicious', 'cautious', 'ambitious', 'precious'],
  ies: ['babies', 'puppies', 'stories', 'cities', 'berries'],
  ing: ['jumping', 'singing', 'reading', 'playing', 'eating'],
  ful: ['helpful', 'careful', 'joyful', 'colourful', 'playful'],
  ous: ['famous', 'nervous', 'enormous', 'dangerous'],
  ants: ['giants', 'plants', 'pants', 'servants'],
  ents: ['parents', 'students', 'presents', 'tents'],
  ists: ['artists', 'dentists', 'scientists', 'cyclists'],
  ors: ['doctors', 'visitors', 'sailors', 'actors'],
  ed: ['jumped', 'played', 'walked', 'helped', 'laughed'],
  er: ['farmer', 'baker', 'sister', 'winter', 'paper'],
  ly: ['slowly', 'kindly', 'quickly', 'softly', 'loudly'],
  ea: ['beach', 'leaf', 'read', 'teach', 'dream'],
  ee: ['tree', 'feet', 'green', 'sleep', 'bee'],
  ai: ['rain', 'train', 'paint', 'snail', 'tail'],
  oa: ['boat', 'goat', 'coat', 'road', 'soap'],
  oo: ['moon', 'book', 'food', 'pool', 'spoon'],
  ou: ['house', 'mouse', 'cloud', 'round', 'loud'],
  ie: ['pie', 'tie', 'field', 'chief', 'thief'],
  ch: ['chair', 'lunch', 'cheese', 'beach', 'chick'],
  sh: ['ship', 'fish', 'shell', 'brush', 'shop'],
  th: ['thumb', 'bath', 'three', 'mouth', 'think'],
  ph: ['phone', 'photo', 'dolphin', 'elephant', 'alphabet'],
  ck: ['duck', 'clock', 'sock', 'truck', 'back'],
  tt: ['kitten', 'butter', 'letter', 'bottle', 'little'],
  ll: ['ball', 'bell', 'hill', 'doll', 'shell'],
  ss: ['grass', 'dress', 'kiss', 'glass', 'class'],
  bb: ['rabbit', 'ribbon', 'bubble', 'hobby', 'cabbage']
};

/**
 * A "find the family" round for a pattern: `want` new words that share its letters (never one of the list's own
 * words) mixed with as many that do not. Returns { letters, words: [{ word, member }] } shuffled by `shuffle`, or
 * null when there are not enough family words.
 */
export function familyRound(letters, listWords, shuffle, want = 3) {
  const p = PATTERNS.find((x) => x.letters === letters) || { letters, where: 'any' };
  const own = new Set(listWords.map((w) => String(w).toLowerCase()));
  const members = shuffle((FAMILIES[letters] || []).filter((w) => !own.has(w) && patternIndex(w, p) >= 0)).slice(0, want);
  if (members.length < 2) return null;
  const others = shuffle(Object.entries(FAMILIES).filter(([k]) => k !== letters).flatMap(([, ws]) => ws)
    .filter((w) => !own.has(w) && !String(w).toLowerCase().includes(letters)));
  const outsiders = [...new Set(others)].slice(0, members.length);
  return { letters, words: shuffle([...members.map((word) => ({ word, member: true })), ...outsiders.map((word) => ({ word, member: false }))]) };
}
