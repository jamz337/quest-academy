// Maths for the youngest players: Pre-K (-1), Kindergarten (0) and Grade 1 (1), Caribbean pictures first.
// Output is the usual { prompt, answer, choices, skill, difficulty } plus:
//   ask: true          the prompt is a question to answer, not a sum (games do not add " = ?")
//   text, pics         the question line and the pictures, for games that draw them big (Count It)
//   explain            the working, one short step per line, for "Let's see why" and the New Skill page
// The prompt is the question line, then a line of pictures; speech skips the pictures (see Speech.speakable).
import { THINGS, SHAPES, numberWord } from '../../data/early/pictures.js';

/** n unique choices containing `answer`: candidates first, then `fallback()`, shuffled. */
function choicesWith(answer, candidates, fallback, rng, n) {
  const out = [String(answer)];
  const add = (v) => { const s = String(v); if (s && !out.includes(s)) out.push(s); };
  for (const c of candidates) { if (out.length >= n) break; add(c); }
  let guard = 0;
  while (out.length < n && guard++ < 100) add(fallback());
  return rng.shuffle(out);
}
const numberChoices = (answer, rng, n, lo, hi) => choicesWith(answer, [answer + 1, answer - 1, answer + 2, answer - 2].filter((v) => v >= lo && v <= hi), () => rng.int(lo, hi), rng, n);
const row = (pic, k) => Array.from({ length: k }, () => pic).join('');
const counted = (k) => Array.from({ length: k }, (_, i) => i + 1).join(', ');

/** How many choices a grade gets: Pre-K picks from 3, older children from 4. */
const choiceCount = (grade) => (grade <= -1 ? 3 : 4);

function countQ(grade, rng, d) {
  const t = rng.pick(THINGS);
  const lo = grade <= -1 ? 1 : grade === 0 ? 3 : 8, hi = grade <= -1 ? 3 + Math.round(d * 4) : grade === 0 ? 6 + Math.round(d * 6) : 12 + Math.round(d * 8);
  const n = rng.int(lo, Math.max(lo, hi));
  const pics = Array.from({ length: n }, () => t.pic);
  const text = `How many ${t.many}?`;
  return {
    prompt: `${text}\n${pics.join('')}`, text, pics, answer: String(n), choices: numberChoices(n, rng, choiceCount(grade), 1, 20), skill: 'counting', ask: true,
    explain: [`Touch each ${t.one} as you count it.`, `Say one number for each ${t.one}: ${counted(Math.min(n, 5))}${n > 5 ? ' …' : '.'}`, 'The last number you say tells you how many.', `So there are ${n} ${n === 1 ? t.one : t.many}.`]
  };
}

function numeralQ(grade, rng, d) {
  const hi = grade <= -1 ? 5 + Math.round(d * 5) : grade === 0 ? 10 + Math.round(d * 10) : 20;
  const n = rng.int(grade <= -1 ? 1 : 0, hi);
  const text = `Find the number ${numberWord(n)}.`;
  return {
    prompt: text, text, pics: [], answer: String(n), choices: numberChoices(n, rng, choiceCount(grade), 0, Math.max(hi, 5)), skill: 'numerals', ask: true,
    explain: [`Count up to ${numberWord(n)}: ${n <= 10 ? (n ? counted(n) : 'zero means none at all') : '1, 2, 3 … all the way'}.`, `Look for the number that says ${numberWord(n)}.`, `So it is ${n}.`]
  };
}

function moreQ(grade, rng, d) {
  const t = rng.pick(THINGS);
  const less = grade >= 0 && rng.chance(0.4);
  const hi = grade <= -1 ? 5 : 8 + Math.round(d * 2);
  const a = rng.int(1, hi - 1);
  let b = rng.int(1, hi);
  while (b === a) b = rng.int(1, hi);
  const [big, small] = a > b ? [a, b] : [b, a];
  const answer = row(t.pic, less ? small : big);
  const text = less ? `Which has fewer ${t.many}?` : `Which has more ${t.many}?`;
  return {
    prompt: text, text, pics: [], answer, choices: rng.shuffle([row(t.pic, a), row(t.pic, b)]), skill: 'more-less', ask: true,
    explain: ['Count each group.', `One group has ${big} and the other has ${small}.`, less ? `${small} is fewer than ${big}.` : `${big} is more than ${small}.`, `So the group with ${less ? small : big} has ${less ? 'fewer' : 'more'}.`]
  };
}

function shapeQ(grade, rng) {
  const pool = grade <= -1 ? SHAPES.slice(0, 5) : SHAPES;
  const s = rng.pick(pool);
  const others = rng.sample(pool.filter((x) => x !== s), choiceCount(grade) - 1);
  const text = `Which one is a ${s.name}?`;
  return {
    prompt: text, text, pics: [], answer: s.pic, choices: rng.shuffle([s.pic, ...others.map((o) => o.pic)]), skill: 'shapes', ask: true,
    explain: [s.fact, `So the ${s.name} is ${s.pic}.`]
  };
}

/** Adding or taking away with pictures: within 5 for K, within 10 for Grade 1. */
function picSumQ(grade, rng, d, op) {
  const t = rng.pick(THINGS);
  const max = grade <= 0 ? 5 : 10;
  let a, b;
  if (op === '+') { a = rng.int(1, max - 1); b = rng.int(1, Math.max(1, Math.min(max - a, 1 + Math.round(d * 4)))); }
  else { a = rng.int(2, max); b = rng.int(1, Math.max(1, Math.min(a - 1, 1 + Math.round(d * 4)))); }
  const answer = op === '+' ? a + b : a - b;
  const text = op === '+' ? `${a} ${a === 1 ? t.one : t.many} and ${b} more. How many now?` : `${a} ${a === 1 ? t.one : t.many}. Take away ${b}. How many are left?`;
  const pics = op === '+' ? [row(t.pic, a), '➕', row(t.pic, b)] : [row(t.pic, a), '➖', row(t.pic, b)];
  return {
    prompt: `${text}\n${pics.join(' ')}`, text, pics: [...[...Array(a)].map(() => t.pic), op === '+' ? '➕' : '➖', ...[...Array(b)].map(() => t.pic)],
    answer: String(answer), choices: numberChoices(answer, rng, choiceCount(grade), 0, max), skill: op === '+' ? 'add-pictures' : 'take-away', ask: true,
    explain: op === '+'
      ? [`Start with ${a}.`, `Count on ${b} more: ${Array.from({ length: b }, (_, i) => a + i + 1).join(', ')}.`, `So ${a} and ${b} more make ${answer}.`]
      : [`Start with ${a}.`, `Take away ${b}: count back ${Array.from({ length: b }, (_, i) => a - i - 1).join(', ')}.`, `So ${answer} ${answer === 1 ? 'is' : 'are'} left.`]
  };
}

/** What comes after (or before) a number: to 10 for K, to 100 for Grade 1. */
function nextQ(grade, rng, d) {
  const before = grade >= 1 && rng.chance(0.4);
  const hi = grade <= 0 ? 9 + Math.round(d * 10) : 99;
  const n = rng.int(before ? 1 : 0, hi);
  const answer = before ? n - 1 : n + 1;
  const text = before ? `What number comes just before ${n}?` : `What number comes just after ${n}?`;
  return {
    prompt: text, text, pics: [], answer: String(answer), choices: numberChoices(answer, rng, choiceCount(grade), 0, 100), skill: 'number-order', ask: true,
    explain: before ? [`Count back from ${n}: ${n}, ${n - 1}.`, `So the number before ${n} is ${n - 1}.`] : [`Count on from ${n}: ${n}, ${n + 1}.`, `So the number after ${n} is ${n + 1}.`]
  };
}

/** Which number is bigger: to 10 for K, to 100 for Grade 1. */
function compareQ(grade, rng, d) {
  const hi = grade <= 0 ? 10 : 20 + Math.round(d * 80);
  const a = rng.int(0, hi);
  let b = rng.int(0, hi);
  while (b === a) b = rng.int(0, hi);
  const smaller = rng.chance(0.3);
  const answer = smaller ? Math.min(a, b) : Math.max(a, b);
  const text = smaller ? 'Which number is smaller?' : 'Which number is bigger?';
  const tensTip = hi > 10 ? 'Look at the tens first: more tens means bigger.' : 'Count up: the one you say later is bigger.';
  return {
    prompt: `${text}\n${a}   or   ${b}`, text: `${text}  ${a} or ${b}?`, pics: [], answer: String(answer), choices: rng.shuffle([String(a), String(b)]), skill: 'compare-numbers', ask: true,
    explain: [tensTip, `So ${Math.max(a, b)} is bigger and ${Math.min(a, b)} is smaller.`]
  };
}

/** The kinds a grade meets, gentlest first; `d` (0..1) walks along them. */
const KINDS = {
  '-1': ['count', 'numeral', 'shape', 'count', 'more'],
  0: ['count', 'numeral', 'more', 'shape', 'next', 'add', 'sub', 'compare'],
  1: ['count', 'next', 'compare', 'add', 'sub']
};

/** One early-years maths question for `grade` (-1, 0 or 1) at difficulty `d`. */
export function earlyQuestion(grade, rng, d = rng.float()) {
  const g = grade <= -1 ? -1 : grade >= 1 ? 1 : 0;
  const kinds = KINDS[g];
  // Mostly the kinds up to the ramp's point, sometimes an earlier one for variety.
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  const kind = kinds[rng.int(0, reach - 1)];
  let q;
  switch (kind) {
    case 'count': q = countQ(g, rng, d); break;
    case 'numeral': q = numeralQ(g, rng, d); break;
    case 'more': q = moreQ(g, rng, d); break;
    case 'shape': q = shapeQ(g, rng); break;
    case 'add': q = picSumQ(g, rng, d, '+'); break;
    case 'sub': q = picSumQ(g, rng, d, '-'); break;
    case 'next': q = nextQ(g, rng, d); break;
    default: q = compareQ(g, rng, d);
  }
  q.difficulty = d;
  return q;
}

/** A set of n different early questions, easiest first when `targets` (difficulties) are given. */
export function earlySet(grade, rng, n = 8, targets = null) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const q = earlyQuestion(grade, rng, targets ? targets[out.length] : rng.float());
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt); out.push(q);
  }
  return out;
}

/** Picture patterns for Pattern Bridge: AB, AAB, ABB and ABC repeats of Caribbean pictures; what comes next? */
export function picturePattern(grade, rng) {
  const unit = grade <= -1 ? rng.pick(['AB', 'AB', 'AAB']) : rng.pick(['AB', 'AAB', 'ABB', 'ABC']);
  const pool = rng.sample([...THINGS.map((t) => t.pic), '🔴', '🟦', '🔺'], 3);
  const letters = [...unit];
  const terms = Array.from({ length: 6 }, (_, i) => pool[letters[i % letters.length].charCodeAt(0) - 65]);
  const missingIndex = grade <= -1 ? 5 : rng.pick([3, 4, 5]);
  const answer = terms[missingIndex];
  const others = [...new Set(pool.filter((p) => p !== answer))];
  const choices = rng.shuffle([answer, ...others].slice(0, grade <= -1 ? 2 : 3));
  return {
    terms, missingIndex, answer, choices, skill: 'picture-patterns', rule: missingIndex === 5 ? 'What comes next?' : 'Which picture is missing?',
    explain: [`Look at the part that repeats: ${terms.slice(0, letters.length).join(' ')}`, 'The same pictures come again and again, in the same order.', 'Keep the pattern going to find the gap.', `So the missing one is ${answer}.`]
  };
}
