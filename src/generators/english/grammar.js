// Grammar Gate rounds: { sentence, options, answer, skill } with options shuffled and the answer index remapped.
import { SENTENCES } from '../../data/english/sentenceBank.js';
import { bandFor } from '../../data/grades.js';

export function generateRounds(grade, rng, n = 10) {
  const bank = SENTENCES[bandFor(grade)];
  return rng.sample(bank, Math.min(n, bank.length)).map((item) => {
    const order = rng.shuffle(item.o.map((_, i) => i));
    return { sentence: item.s, options: order.map((i) => item.o[i]), answer: order.indexOf(item.a), skill: item.k };
  });
}

/** Sentence with the blank replaced by `fill` (or a visible gap). */
export const fillBlank = (sentence, fill = '____') => sentence.replace(/_+/, fill);

/** How hard a round is, for ordering a game easy to hard: longer sentences take more reading. */
export const roundDifficulty = (r) => r.sentence.split(/\s+/).length;
