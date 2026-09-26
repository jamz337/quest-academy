// Bible Village rounds: { prompt, choices, answer, skill, ref } from the banks in data/bible/bank.js.
import { QUIZ, VERSES, PAIRS } from '../../data/bible/bank.js';
import { bandFor } from '../../data/grades.js';

export const quizQuestion = (item, rng) => ({ prompt: item.q, choices: rng.shuffle([item.a, ...item.o]), answer: item.a, skill: item.k, ref: item.ref });
export const verseQuestion = (item, rng) => ({ prompt: 'Fill in the missing word:\n“' + item.t.replace('___', '_____') + '”', choices: rng.shuffle([item.a, ...item.o]), answer: item.a, skill: 'verses', ref: item.ref });

/** "Who ...?" from a pair bank entry with three other people as distractors. */
export function whoQuestion(pair, others, rng) {
  return { prompt: `Who ${pair.r}?`, choices: rng.shuffle([pair.l, ...others.map((o) => o.l)]), answer: pair.l, skill: pair.k, ref: null };
}

/** n rounds of one kind: 'quiz' or 'verse'. */
export function generateRounds(grade, rng, n = 10, kind = 'quiz') {
  const band = bandFor(grade);
  const bank = kind === 'verse' ? VERSES[band] : QUIZ[band];
  const make = kind === 'verse' ? verseQuestion : quizQuestion;
  return rng.sample(bank, Math.min(n, bank.length)).map((item) => make(item, rng));
}

/** One question of any kind, for the boss. */
export function bibleQuestion(grade, rng) {
  const band = bandFor(grade);
  const kind = rng.pick(['quiz', 'quiz', 'verse', 'who']);
  if (kind === 'quiz') return quizQuestion(rng.pick(QUIZ[band]), rng);
  if (kind === 'verse') return verseQuestion(rng.pick(VERSES[band]), rng);
  const [p, ...others] = rng.sample(PAIRS[band], 4);
  return whoQuestion(p, others, rng);
}
