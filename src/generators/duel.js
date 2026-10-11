// Duel questions: one multiple-choice shape { prompt, choices, answer, skill, key?, explain?, code? } drawn from
// the villager's OWN game, so Chef Fraction asks fractions, the Bridge Keeper patterns, the Gate Guard grammar,
// and so on. The four coding villagers ask what their lessons teach and carry a `code` block the duel screen
// draws as a mini maze and a block program: Robo Maze (which program reaches the flag), Predict the Robot
// (where does it stop), Bug Hunt (which line is wrong) and Robot Dance (which program made this path).
// Bosses mix their whole subject (see boss.js; the code boss mixes the four coding kinds).
import { scienceQuestion } from './science/questions.js';
import { historyQuestion } from './history/questions.js';
import { musicQuestion } from './music/questions.js';
import { artQuestion } from './art/questions.js';
import { generateQuestion } from './math/arithmetic.js';
import { gcd, frac } from './math/fractions.js';
import { patternQuestion, grammarQuestion, matchQuestion, buildQuestion, wordsQuestion, bossQuestions } from './boss.js';
import { danceRound, mutate } from './coding/dance.js';
import { programText } from './coding/text.js';
import { parseLevel, runToEnd } from './coding/interpreter.js';
import { generateRound as programRound } from './coding/programGen.js';
import { bugLevelsForBand, levelsForBand } from '../data/coding/levels.js';
import { quizQuestion, verseQuestion, whoQuestion, bibleQuestion } from './bible/quiz.js';
import { QUIZ, VERSES, PAIRS } from '../data/bible/bank.js';
import { bandFor, gradeOf } from '../data/grades.js';

const LETTERS = ['A', 'B', 'C', 'D'];

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
  const g = gradeOf(grade);
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

// ---- Coding: the four lessons of Code Cove ------------------------------------------------------------

/** Duels use the two lower bands like the lessons' first two tiers (band C blocks are shown fine, but not asked). */
const codeBand = (grade) => (bandFor(grade) === 'A' ? 'A' : 'B');
const plainLevel = (lv) => ({ id: lv.id, grid: lv.grid, startDir: lv.startDir });
const hasOp = (list, ops) => (list || []).some((b) => ops.includes(b.op) || hasOp(b.body, ops) || hasOp(b.then, ops) || hasOp(b.else, ops));
/** The skill a program exercises: conditionals beat loops beat plain sequences. */
export const skillOf = (program) => (hasOp(program.main, ['if', 'while']) ? 'conditional' : hasOp(program.main, ['repeat']) ? 'repeat' : 'sequence_code');
const gridKey = (level) => level.grid.join('/') + '@' + level.startDir;

/** Program lines in the order programText prints them, with the block that made each line (Else lines have none). */
function programLines(blocks, depth = 0) {
  const out = [];
  for (const b of blocks) {
    out.push({ uid: b.uid, text: programText([{ ...b, body: [], then: [], else: null }], depth).split('\n')[0] });
    if (b.op === 'repeat' || b.op === 'while') out.push(...programLines(b.body, depth + 1));
    if (b.op === 'if') {
      out.push(...programLines(b.then, depth + 1));
      if (b.else && b.else.length) { out.push({ uid: null, text: '  '.repeat(depth) + 'Else:' }); out.push(...programLines(b.else, depth + 1)); }
    }
  }
  return out;
}

/** Robo Maze levels a duel can show: no functions, a short solution, a grid that fits the puzzle box. */
const mazePool = (band) => levelsForBand(band).filter((lv) => !Object.keys(lv.solution.functions || {}).length && programText(lv.solution.main).split('\n').length <= 6 && lv.grid.length <= 9 && Math.max(...lv.grid.map((r) => r.length)) <= 10);

/** Robo Maze: which of three programs walks the robot to the flag? The wrong ones are small edits that fail. */
export function mazeQuestion(grade, rng) {
  const band = codeBand(grade);
  const pool = mazePool(band).length ? mazePool(band) : mazePool('A');
  const build = (lv, wrongs) => {
    const right = programText(lv.solution.main);
    const choices = rng.shuffle([right, ...wrongs]);
    return {
      prompt: 'Which program reaches the flag?', choices, answer: right, skill: skillOf(lv.solution),
      key: 'maze:' + lv.id + ':' + choices.join('|'),
      explain: `${lv.hint} Follow the green program block by block and the robot lands on the flag.`,
      code: { kind: 'maze', title: 'Robo Maze', level: plainLevel(lv), choice: 'program' }
    };
  };
  for (let attempt = 0; attempt < 12; attempt++) {
    const lv = rng.pick(pool);
    const right = programText(lv.solution.main), wrongs = [];
    for (let i = 0; i < 60 && wrongs.length < 2; i++) {
      const m = mutate(lv.solution, rng);
      if (!m) continue;
      const t = programText(m.main);
      if (t === right || wrongs.includes(t) || runToEnd(m, lv).solved) continue;
      wrongs.push(t);
    }
    if (wrongs.length === 2) return build(lv, wrongs);
  }
  // Practically unreachable: any level with a stop-short and a wrong-turn edit that both miss the flag.
  const lv = pool[0];
  const main = lv.solution.main;
  const shorter = programText(main.slice(0, -1)), turned = programText([{ op: 'right' }, ...main]);
  return build(lv, [shorter, turned].filter((t, i, a) => t !== programText(main) && a.indexOf(t) === i).slice(0, 2));
}

/** Predict the Robot: read the program, then say which lettered square the robot stops on. */
export function predictQuestion(grade, rng) {
  const band = codeBand(grade);
  const r = programRound(rng, band);
  const lv = parseLevel(r.level);
  const key = (c) => `${c.x},${c.y}`;
  const seen = new Set([key(r.end), key(lv.start)]);
  const visited = [];
  for (const st of r.steps) if (st.kind === 'move' && !seen.has(key(st.to))) { seen.add(key(st.to)); visited.push({ x: st.to.x, y: st.to.y }); }
  const floor = [];
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) if (!lv.walls[y][x] && !seen.has(key({ x, y }))) floor.push({ x, y });
  const cells = [{ x: r.end.x, y: r.end.y }, ...rng.shuffle(visited).slice(0, 3)];
  const extra = rng.shuffle(floor);
  while (cells.length < 4 && extra.length) cells.push(extra.pop());
  const ordered = cells.slice(0, 4).sort((a, b) => a.y - b.y || a.x - b.x);   // letters read left to right, top to bottom
  const markers = ordered.map((c, i) => ({ letter: LETTERS[i], x: c.x, y: c.y }));
  const answer = markers.find((m) => m.x === r.end.x && m.y === r.end.y).letter;
  const program = programText(r.program.main);
  return {
    prompt: 'Where will the robot stop?', choices: markers.map((m) => m.letter), answer, skill: skillOf(r.program),
    key: 'predict:' + gridKey(r.level) + ':' + program,
    explain: `Act it out from the start, one block at a time. The robot stops on ${answer}.`,
    code: { kind: 'predict', title: 'Predict the Robot', level: plainLevel(r.level), program, robot: { x: lv.start.x, y: lv.start.y, dir: lv.dir }, markers, choice: 'letter' }
  };
}

/** Bug Hunt: the program is listed with numbered lines beside its maze; which line is the bug? */
export function bugQuestion(grade, rng) {
  const band = codeBand(grade);
  // Only puzzles long enough to offer four different lines to pick from.
  const long = (list) => list.filter((lv) => programLines(lv.program.main).length >= 4);
  const pool = long(bugLevelsForBand(band)).length ? long(bugLevelsForBand(band)) : long(bugLevelsForBand('A'));
  const lv = rng.pick(pool);
  const lines = programLines(lv.program.main);
  const bugAt = Math.max(0, lines.findIndex((l) => l.uid === lv.fix.uid));
  const listing = lines.map((l) => l.text).join('\n');
  const answer = `Line ${bugAt + 1}`;
  const others = lines.map((_, i) => i).filter((i) => i !== bugAt);
  const choices = rng.shuffle([answer, ...rng.shuffle(others).slice(0, 3).map((i) => `Line ${i + 1}`)]);
  const start = parseLevel(lv.level);
  return {
    prompt: 'Which line has the bug?', choices, answer, skill: skillOf(lv.program), key: 'bug:' + lv.id,
    explain: `${lv.hint} Line ${bugAt + 1} (${lines[bugAt].text.trim()}) is the wrong block.`,
    code: { kind: 'bug', title: 'Bug Hunt', level: plainLevel(lv.level), program: listing, numbered: true, robot: { x: start.start.x, y: start.start.y, dir: start.dir }, choice: 'line' }
  };
}

/** Robot Dance: the robot's path is drawn on the floor; which program did it follow? */
export function danceQuestion(grade, rng) {
  const band = codeBand(grade);
  const r = danceRound(rng, band);
  const path = r.steps.filter((s) => s.kind === 'move').map((s) => ({ from: s.from, to: s.to }));
  const moves = path.length, turns = r.steps.filter((s) => s.kind === 'turn').length;
  return {
    prompt: 'Which program made this dance?',
    choices: r.choices.map((c) => c.text), answer: r.answer, skill: r.skill,
    key: 'dance:' + gridKey(r.level) + ':' + r.answer,
    explain: `The robot moved ${moves} ${moves === 1 ? 'square' : 'squares'} and turned ${turns} ${turns === 1 ? 'time' : 'times'}. The green program is the one it followed.`,
    code: { kind: 'dance', title: 'Robot Dance', level: plainLevel(r.level), robot: { x: r.end.x, y: r.end.y, dir: r.end.dir }, path, choice: 'program' }
  };
}

/** The code boss mixes the four lessons. */
export const codeDuelQuestion = (grade, rng) => rng.pick([mazeQuestion, predictQuestion, bugQuestion, danceQuestion])(grade, rng);

const bibleOf = (kind) => (grade, rng) => {
  const band = bandFor(grade);
  if (kind === 'quiz') return quizQuestion(rng.pick(QUIZ[band]), rng);
  if (kind === 'verse') return verseQuestion(rng.pick(VERSES[band]), rng);
  const [p, ...others] = rng.sample(PAIRS[band], 4);
  return whoQuestion(p, others, rng);
};

// A duel wants three or four answers to pick from, so Sink or Float's yes/no questions give way to its fuller kinds.
// Flag Finder's 'which flag?' needs drawn flags, so duels (plain text) ask by description instead.
const historyOf = (id) => (grade, rng) => { let q = historyQuestion(id, grade, rng, rng.float(), { drawn: false }); for (let i = 0; i < 40 && q.choices.length < 3; i++) q = historyQuestion(id, grade, rng, 1, { drawn: false }); return q; };
const musicOf = (id) => (grade, rng) => { let q = musicQuestion(id, grade, rng, rng.float(), { drawn: false }); for (let i = 0; i < 40 && q.choices.length < 3; i++) q = musicQuestion(id, grade, rng, 1, { drawn: false }); return q; };
const artOf = (id) => (grade, rng) => { let q = artQuestion(id, grade, rng, rng.float(), { drawn: false }); for (let i = 0; i < 40 && q.choices.length < 3; i++) q = artQuestion(id, grade, rng, 1, { drawn: false }); return q; };
const scienceOf = (id) => (grade, rng) => { let q = scienceQuestion(id, grade, rng, rng.float()); for (let i = 0; i < 40 && q.choices.length < 3; i++) q = scienceQuestion(id, grade, rng, 1); return q; };

/** Generator per game id; anything unknown falls back to the subject mix. */
export const BY_GAME = {
  'math-dash': generateQuestion, 'math-balloons': generateQuestion, 'math-pizza': fractionQuestion, 'math-bridge': patternQuestion,
  'eng-builder': buildQuestion, 'eng-grammar': grammarQuestion, 'eng-match': matchQuestion, 'eng-frog': wordsQuestion,
  'code-maze': mazeQuestion, 'code-predict': predictQuestion, 'code-bug': bugQuestion, 'code-dance': danceQuestion,
  'bible-quiz': bibleOf('quiz'), 'bible-verse': bibleOf('verse'), 'bible-match': bibleOf('who'), 'bible-ark': bibleQuestion,
  'sci-habitat': scienceOf('sci-habitat'), 'sci-plants': scienceOf('sci-plants'), 'sci-float': scienceOf('sci-float'), 'sci-matter': scienceOf('sci-matter'),
  'his-compass': historyOf('his-compass'), 'his-helpers': historyOf('his-helpers'), 'his-flags': historyOf('his-flags'), 'his-time': historyOf('his-time'),
  'mus-rhythm': musicOf('mus-rhythm'), 'mus-notes': musicOf('mus-notes'), 'mus-pitch': musicOf('mus-pitch'), 'mus-instruments': musicOf('mus-instruments'),
  'art-colours': artOf('art-colours'), 'art-symmetry': artOf('art-symmetry'), 'art-shapes': artOf('art-shapes'), 'art-gallery': artOf('art-gallery')
};

export const duelQuestion = (gameId, grade, rng) => (BY_GAME[gameId] || generateQuestion)(gradeOf(grade), rng);

/** n questions from a generator at a grade, without repeats while it has enough (a small bank may repeat). */
function fill(gen, grade, rng, n) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const q = gen(gradeOf(grade), rng);
    const key = q.key || q.prompt;
    if (seen.has(key)) continue;
    seen.add(key); out.push(q);
  }
  while (out.length < n && out.length) out.push(out[out.length % seen.size]);
  return out;
}

/** n questions from one game's topic at a grade. */
export const duelQuestions = (gameId, grade, rng, n = 20) => fill((g, r) => duelQuestion(gameId, g, r), grade, rng, n);

/** A boss's questions: the whole subject; the code boss uses the four coding lessons. */
export const bossDuelQuestions = (subject, grade, rng, n = 20) => (subject === 'code' ? fill(codeDuelQuestion, grade, rng, n) : bossQuestions(subject, grade, rng, n));
