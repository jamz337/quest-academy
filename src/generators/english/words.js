// Word Builder rounds: { word, hint, scrambled: string[] } with scrambled guaranteed different from the word.
import { WORDS } from '../../data/english/wordBank.js';
import { bandFor } from '../../data/grades.js';

export function scramble(word, rng) {
  const letters = word.split('');
  let out = letters;
  for (let i = 0; i < 30 && out.join('') === word; i++) out = rng.shuffle(letters);
  if (out.join('') === word) out = letters.slice(1).concat(letters[0]); // e.g. 'aab' edge case
  return out;
}

export function generateRounds(grade, rng, n = 8) {
  const bank = WORDS[bandFor(grade)];
  return rng.sample(bank, Math.min(n, bank.length)).map(({ w, h }) => ({ word: w, hint: h, scrambled: scramble(w, rng) }));
}

/** How hard a round is, for ordering a game easy to hard: longer words have more letters to unscramble. */
export const roundDifficulty = (r) => r.word.length;
