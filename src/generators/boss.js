// Boss battle questions: one multiple-choice shape { prompt, choices, answer, skill } drawn from every
// generator of a subject so a boss tests the whole zone, not one game.
import { generateQuestion } from './math/arithmetic.js';
import { generateRound as patternRound } from './math/patterns.js';
import { generateRounds as grammarRounds, fillBlank } from './english/grammar.js';
import { generateRound as programRound } from './coding/programGen.js';
import { DIR_NAME } from './coding/interpreter.js';
import { programText } from './coding/text.js';
import { numericDistractors, makeChoices } from './distractors.js';
import { PAIRS } from '../data/english/pairBank.js';
import { WORDS } from '../data/english/wordBank.js';
import { bandFor } from '../data/grades.js';
import { scramble } from './english/words.js';
import { bibleQuestion } from './bible/quiz.js';

const DIR_WORD = { N: 'North ▲', E: 'East ▶', S: 'South ▼', W: 'West ◀' };

function mathQuestion(grade, rng) {
  if (rng.chance(0.6)) return generateQuestion(grade, rng);
  const r = patternRound(grade, rng);
  const shown = r.terms.map((t, i) => (i === r.missingIndex ? '?' : String(t))).join(', ');
  return { prompt: (r.rule ? r.rule + '\n' : '') + shown, choices: r.choices, answer: r.answer, skill: r.skill };
}

/** One English question of any kind (grammar, word pairs or unscrambling). Also used by Frog Hop. */
export function wordsQuestion(grade, rng) {
  const band = bandFor(grade);
  const kind = rng.pick(['grammar', 'grammar', 'match', 'build']);
  if (kind === 'grammar') {
    const [r] = grammarRounds(grade, rng, 1);
    return { prompt: fillBlank(r.sentence), choices: r.options, answer: r.options[r.answer], skill: r.skill };
  }
  if (kind === 'match') {
    const bank = PAIRS[band];
    const [p, ...others] = rng.sample(bank, 4);
    return { prompt: `Which word goes with "${p.l}"?`, choices: rng.shuffle([p.r, ...others.map((o) => o.r)]), answer: p.r, skill: p.k };
  }
  const bank = WORDS[band];
  const [w, ...others] = rng.sample(bank, 4);
  return { prompt: `Unscramble: ${scramble(w.w, rng).join(' ').toUpperCase()}\n${w.h}`, choices: rng.shuffle([w.w, ...others.map((o) => o.w)]), answer: w.w, skill: 'spelling' };
}

export { programText };

function codeQuestion(grade, rng) {
  // Only straight-line and repeat programs: with no grid on screen the answer must follow from the text alone.
  const band = bandFor(grade) === 'A' ? 'A' : 'B';
  const r = programRound(rng, band);
  const start = `Robot faces ${DIR_WORD[r.level.startDir]}\n`;
  if (rng.chance(0.5)) {
    const moves = r.steps.filter((s) => s.kind === 'move').length;
    const d = numericDistractors(moves, rng, { min: 0, candidates: [moves + 1, moves - 1, moves + 2] });
    return { prompt: start + programText(r.program.main) + '\n\nHow many squares does it move?', choices: makeChoices(moves, d, rng), answer: String(moves), skill: band === 'B' ? 'repeat' : 'sequence_code' };
  }
  const answer = DIR_WORD[DIR_NAME[r.end.dir]];
  return { prompt: start + programText(r.program.main) + '\n\nWhich way does it face at the end?', choices: rng.shuffle(Object.values(DIR_WORD)), answer, skill: band === 'B' ? 'repeat' : 'sequence_code' };
}

const BY_SUBJECT = { math: mathQuestion, words: wordsQuestion, code: codeQuestion, bible: bibleQuestion };

/** n questions for a subject at a grade, with no repeated prompts. */
export function bossQuestions(subject, grade, rng, n = 20) {
  const gen = BY_SUBJECT[subject] || mathQuestion;
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const q = gen(Number(grade) || 3, rng);
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt); out.push(q);
  }
  return out;
}
