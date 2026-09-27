// Duel questions: one multiple-choice shape { prompt, choices, answer, skill } drawn from the villager's OWN
// game, so Chef Fraction asks fractions, the Bridge Keeper patterns, the Gate Guard grammar, and so on.
// Bosses keep mixing their whole subject (see boss.js).
import { generateQuestion } from './math/arithmetic.js';
import { gcd, frac } from './math/fractions.js';
import { patternQuestion, grammarQuestion, matchQuestion, buildQuestion, wordsQuestion, codeQuestion } from './boss.js';
import { danceRound } from './coding/dance.js';
import { programText } from './coding/text.js';
import { DIR_NAME } from './coding/interpreter.js';
import { bugLevelsForBand } from '../data/coding/levels.js';
import { quizQuestion, verseQuestion, whoQuestion, bibleQuestion } from './bible/quiz.js';
import { QUIZ, VERSES, PAIRS } from '../data/bible/bank.js';
import { bandFor } from '../data/grades.js';

const DIR_WORD = { N: 'North ▲', E: 'East ▶', S: 'South ▼', W: 'West ◀' };

/** 4 shuffled choices: the answer plus unique distractors (candidates first, then the fallback). */
function choicesFor(answer, candidates, fallback, rng) {
  const out = [], seen = new Set([answer]);
  const add = (s) => { if (s && !seen.has(s) && !/NaN|undefined|Infinity/.test(s)) { seen.add(s); out.push(s); } };
  for (const c of candidates) { if (out.length >= 3) break; add(c); }
  let guard = 0;
  while (out.length < 3 && guard++ < 200) add(fallback());
  return rng.shuffle([answer, ...out]);
}

/** Fractions in words: what fraction was eaten, which is bigger, which is equal, adding slices, converting. */
export function fractionQuestion(grade, rng) {
  const g = Number(grade) || 3;
  const kind = g <= 3 ? rng.pick(['eat', 'eat', 'bigger']) : g <= 5 ? rng.pick(['equal', 'bigger', 'eat']) : rng.pick(['add', 'convert', 'equal']);
  if (kind === 'eat') {
    const den = rng.pick(g <= 2 ? [2, 4] : [2, 3, 4, 6, 8]), num = rng.int(1, den - 1);
    const answer = frac(num, den);
    const choices = choicesFor(answer, [frac(den - num, den), frac(num, den + 1), frac(num + 1, den), frac(1, den)], () => { const d = rng.int(2, 8); return frac(rng.int(1, d), d); }, rng);
    return { prompt: `A pizza is cut into ${den} equal slices.\nYou eat ${num}. What fraction did you eat?`, choices, answer, skill: 'fractions' };
  }
  if (kind === 'bigger') {
    let a, b;
    do { const d1 = rng.pick([2, 3, 4, 5, 6, 8]), d2 = rng.pick([2, 3, 4, 5, 6, 8]); a = [rng.int(1, d1 - 1), d1]; b = [rng.int(1, d2 - 1), d2]; }
    while (Math.abs(a[0] / a[1] - b[0] / b[1]) < 1e-9 || (a[0] === b[0] && a[1] === b[1]));
    const [big, small] = a[0] / a[1] > b[0] / b[1] ? [a, b] : [b, a];
    const answer = frac(...big);
    const choices = choicesFor(answer, [frac(...small), frac(small[0], big[1]), frac(big[0], small[1] + 1)], () => { const d = rng.int(2, 9); return frac(rng.int(1, d), d); }, rng);
    return { prompt: `Which is bigger: ${frac(...a)} or ${frac(...b)}?`, choices, answer, skill: 'compare' };
  }
  if (kind === 'equal') {
    let p, q;
    do { q = rng.pick([2, 3, 4, 5, 6]); p = rng.int(1, q - 1); } while (gcd(p, q) !== 1);
    const k = rng.int(2, 3);
    const answer = frac(k * p, k * q);
    const choices = choicesFor(answer, [frac(p, k * q), frac(k * p, q), frac(p + 1, q + 1), frac(k * p + 1, k * q)], () => { const d = rng.int(2, 12); return frac(rng.int(1, d), d); }, rng);
    return { prompt: `Which fraction equals ${frac(p, q)}?`, choices, answer, skill: 'equivalent' };
  }
  if (kind === 'add') {
    const d = rng.pick([3, 4, 5, 6, 8, 10]), a = rng.int(1, d - 2), b = rng.int(1, d - 1 - a);
    const answer = frac(a + b, d);
    const choices = choicesFor(answer, [frac(a + b, 2 * d), frac(a * b, d), frac(a + b + 1, d), frac(a + b, d + 1)], () => frac(rng.int(1, d), d), rng);
    return { prompt: `${frac(a, d)} + ${frac(b, d)} = ?`, choices, answer, skill: 'fraction-add' };
  }
  const den = rng.pick([2, 4, 5, 10, 20, 25, 50]), num = rng.int(1, den - 1), v = num / den;
  const percent = rng.chance(0.5);
  const fmt = (x) => (percent ? `${Math.round(x * 1000) / 10}%` : String(Math.round(x * 100) / 100));
  const answer = fmt(v);
  const choices = choicesFor(answer, [fmt(1 - v), fmt(v / 10), fmt(Math.min(0.99, v + 0.1)), fmt(Math.max(0.01, v - 0.1))], () => fmt(rng.int(1, 99) / 100), rng);
  return { prompt: `${frac(num, den)} as a ${percent ? 'percent' : 'decimal'} is...`, choices, answer, skill: 'convert' };
}

/** Program lines in the order programText prints them, with the block that made each line. */
function programLines(blocks, depth = 0) {
  const out = [];
  for (const b of blocks) {
    out.push({ uid: b.uid, text: programText([{ ...b, body: [] }], depth).split('\n')[0] });
    if (b.op === 'repeat') out.push(...programLines(b.body, depth + 1));
  }
  return out;
}

/** Bug Hunt in words: the program is shown with numbered lines; which line is the bug? */
export function bugQuestion(grade, rng) {
  const band = bandFor(grade) === 'A' ? 'A' : 'B';
  // Only puzzles long enough to offer four different lines to pick from.
  const long = (list) => list.filter((lv) => programLines(lv.program.main).length >= 4);
  const pool = long(bugLevelsForBand(band)).length ? long(bugLevelsForBand(band)) : long(bugLevelsForBand('A'));
  const lv = rng.pick(pool);
  const lines = programLines(lv.program.main);
  const bugAt = Math.max(0, lines.findIndex((l) => l.uid === lv.fix.uid));
  const listing = lines.map((l, i) => `${i + 1}. ${l.text}`).join('\n');
  const answer = `Line ${bugAt + 1}`;
  const others = lines.map((_, i) => i).filter((i) => i !== bugAt);
  const choices = rng.shuffle([answer, ...rng.shuffle(others).slice(0, 3).map((i) => `Line ${i + 1}`)]);
  return { prompt: `${lv.hint}\nRobot faces ${DIR_WORD[lv.level.startDir]}\n${listing}\n\nWhich line has the bug?`, choices, answer, skill: band === 'B' ? 'repeat' : 'sequence_code', explain: `${lv.hint} Line ${bugAt + 1} (${lines[bugAt].text.trim()}) is the wrong block.` };
}

/** Robot Dance in words: which program ends where the robot must be? */
export function danceQuestion(grade, rng) {
  const band = bandFor(grade) === 'A' ? 'A' : 'B';
  const r = danceRound(rng, band);
  const moves = r.steps.filter((s) => s.kind === 'move').length;
  const facing = DIR_WORD[DIR_NAME[r.end.dir]];
  return {
    prompt: `Robot faces ${DIR_WORD[r.level.startDir]}. Which dance moves it ${moves} square${moves === 1 ? '' : 's'} and ends facing ${facing}?`,
    choices: r.choices.map((c) => c.text), answer: r.answer, skill: r.skill
  };
}

const bibleOf = (kind) => (grade, rng) => {
  const band = bandFor(grade);
  if (kind === 'quiz') return quizQuestion(rng.pick(QUIZ[band]), rng);
  if (kind === 'verse') return verseQuestion(rng.pick(VERSES[band]), rng);
  const [p, ...others] = rng.sample(PAIRS[band], 4);
  return whoQuestion(p, others, rng);
};

/** Generator per game id; anything unknown falls back to the subject mix. */
export const BY_GAME = {
  'math-dash': generateQuestion, 'math-balloons': generateQuestion, 'math-pizza': fractionQuestion, 'math-bridge': patternQuestion,
  'eng-builder': buildQuestion, 'eng-grammar': grammarQuestion, 'eng-match': matchQuestion, 'eng-frog': wordsQuestion,
  'code-maze': codeQuestion, 'code-predict': codeQuestion, 'code-bug': bugQuestion, 'code-dance': danceQuestion,
  'bible-quiz': bibleOf('quiz'), 'bible-verse': bibleOf('verse'), 'bible-match': bibleOf('who'), 'bible-ark': bibleQuestion
};

export const duelQuestion = (gameId, grade, rng) => (BY_GAME[gameId] || generateQuestion)(Number(grade) || 3, rng);

/** n questions from one game's topic at a grade, with no repeated prompts. */
export function duelQuestions(gameId, grade, rng, n = 20) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const q = duelQuestion(gameId, grade, rng);
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt); out.push(q);
  }
  return out;
}
