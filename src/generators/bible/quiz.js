// Bible Village rounds: { prompt, choices, answer, skill, ref } from the banks in data/bible/bank.js.
import { QUIZ, VERSES, PAIRS, ORDER } from '../../data/bible/bank.js';
import { bandFor, bankFor } from '../../data/grades.js';

export const quizQuestion = (item, rng) => ({ prompt: item.q, choices: rng.shuffle([item.a, ...item.o]), answer: item.a, skill: item.k, ref: item.ref });
export const verseQuestion = (item, rng) => ({ prompt: 'Fill in the missing word:\n“' + item.t.replace('___', '_____') + '”', choices: rng.shuffle([item.a, ...item.o]), answer: item.a, skill: 'verses', ref: item.ref });

/** "Who ...?" from a pair bank entry with three other people as distractors. */
export function whoQuestion(pair, others, rng) {
  return { prompt: `Who ${pair.r}?`, choices: rng.shuffle([pair.l, ...others.map((o) => o.l)]), answer: pair.l, skill: pair.k, ref: null };
}

/** n rounds of one kind: 'quiz' or 'verse'. */
export function generateRounds(grade, rng, n = 10, kind = 'quiz') {
  const band = bandFor(grade);
  const bank = kind === 'verse' ? bankFor(VERSES, band) : bankFor(QUIZ, band);
  const make = kind === 'verse' ? verseQuestion : quizQuestion;
  return rng.sample(bank, Math.min(n, bank.length)).map((item) => make(item, rng));
}

/** "Put the story in order" rounds: { kind: 'order', prompt, steps (correct order), shuffled, answer, skill, ref }. */
export function orderRounds(grade, rng, n = 2) {
  const band = bandFor(grade);
  const order = bankFor(ORDER, band);
  return rng.sample(order, Math.min(n, order.length)).map((item) => {
    let shuffled = rng.shuffle(item.steps);
    if (shuffled.every((s, i) => s === item.steps[i])) shuffled = [...item.steps.slice(1), item.steps[0]];
    return { kind: 'order', prompt: `Put the story of ${item.title} in order`, steps: item.steps, shuffled, answer: item.steps.join(' → '), skill: 'stories', ref: item.ref, explain: `The order is: ${item.steps.map((s, i) => `${i + 1}. ${s}`).join('  ')}. Read it in ${item.ref}.` };
  });
}

const TWO_BY_TWO = [['🦁', 'lion'], ['🦒', 'giraffe'], ['🐘', 'elephant'], ['🦓', 'zebra'], ['🐒', 'monkey'], ['🐢', 'turtle'], ['🐑', 'sheep'], ['🐫', 'camel'], ['🐻', 'bear'], ['🦘', 'kangaroo'], ['🐊', 'crocodile'], ['🦛', 'hippo']];

/** The animals went into the ark two by two: find this one's partner. */
export function animalPairQuestion(grade, rng) {
  const [[pic, name], ...others] = rng.sample(TWO_BY_TWO, grade <= -1 ? 3 : 4);
  const text = `Find the other ${name}! The animals went into the ark two by two.`;
  return { prompt: `${text}\n${pic}`, text, pics: [pic], choices: rng.shuffle([pic, ...others.map((o) => o[0])]), answer: pic, skill: 'stories', ask: true, ref: 'Genesis 7:9',
    explain: [`Look closely at the ${name}.`, 'Find the animal that looks just the same.', `So its partner is ${pic}.`] };
}

/** One question of any kind, for the boss. */
export function bibleQuestion(grade, rng) {
  const band = bandFor(grade);
  if (band === 'E') {
    const kind = rng.pick(['animal', 'quiz', 'quiz', 'who']);
    if (kind === 'animal') return animalPairQuestion(grade, rng);
    if (kind === 'quiz') return quizQuestion(rng.pick(bankFor(QUIZ, band)), rng);
    const [p, ...others] = rng.sample(bankFor(PAIRS, band), 3);
    return whoQuestion(p, others, rng);
  }
  const kind = rng.pick(['quiz', 'quiz', 'verse', 'who']);
  if (kind === 'quiz') return quizQuestion(rng.pick(bankFor(QUIZ, band)), rng);
  if (kind === 'verse') return verseQuestion(rng.pick(bankFor(VERSES, band)), rng);
  const [p, ...others] = rng.sample(bankFor(PAIRS, band), 4);
  return whoQuestion(p, others, rng);
}
