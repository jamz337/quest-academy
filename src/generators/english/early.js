// Early reading for Pre-K (-1), Kindergarten (0) and Grade 1 (1): letters, first sounds, rhymes, sight words and
// short picture words. Questions are { prompt, choices, answer, skill, ask: true, explain } (see math/early.js);
// pictures sit on the prompt's second line and are seen, not said. Also the Word Match pairs for the same ages.
import { LETTERS, FIRST_LETTERS, letterInfo, RHYMES, SIGHT_WORDS, PICTURE_WORDS } from '../../data/early/letters.js';

const choiceCount = (grade) => (grade <= -1 ? 3 : 4);
const pickLetters = (rng, grade, d) => {
  // Pre-K starts with the first letters children learn, then the rest of the alphabet.
  const pool = grade <= -1 && d < 0.6 ? FIRST_LETTERS : LETTERS.map((x) => x.u);
  return pool;
};

function letterQ(grade, rng, d) {
  const pool = pickLetters(rng, grade, d);
  const lower = grade >= 0;
  const target = rng.pick(pool);
  const others = rng.sample(pool.filter((x) => x !== target), choiceCount(grade) - 1);
  const show = (x) => (lower ? x.toLowerCase() : x);
  const info = letterInfo(target);
  return {
    prompt: `Find the letter ${show(target)}.`, text: `Find the letter ${show(target)}.`, answer: show(target), choices: rng.shuffle([target, ...others].map(show)), skill: 'letters', ask: true,
    explain: [`${target} is the letter that starts ${info.word}.`, lower ? `The small ${target} looks like this: ${target.toLowerCase()}.` : `Look for the letter shape that matches.`, `So it is ${show(target)}.`]
  };
}

function caseQ(grade, rng) {
  const target = rng.pick(LETTERS.filter((x) => x.u !== x.l.toUpperCase() || true));
  const toSmall = rng.chance(0.6);
  const others = rng.sample(LETTERS.filter((x) => x !== target), choiceCount(grade) - 1);
  const answer = toSmall ? target.l : target.u;
  const text = toSmall ? `Find the small letter for ${target.u}.` : `Find the big letter for ${target.l}.`;
  return {
    prompt: text, text, answer, choices: rng.shuffle([target, ...others].map((x) => (toSmall ? x.l : x.u))), skill: 'letter-case', ask: true,
    explain: ['Every letter has a big shape and a small shape.', `They make the same sound, as in ${target.word}.`, `So the ${toSmall ? 'small' : 'big'} letter is ${answer}.`]
  };
}

function firstSoundQ(grade, rng) {
  const target = rng.pick(LETTERS.filter((x) => !x.ends));
  const others = rng.sample(LETTERS.filter((x) => x !== target), choiceCount(grade) - 1);
  const show = (x) => (grade <= -1 ? x.u : x.l);
  const text = `What sound does ${target.word} start with?`;
  return {
    prompt: `${text}\n${target.pic}`, text, pics: [target.pic], answer: show(target), choices: rng.shuffle([target, ...others].map(show)), skill: 'first-sounds', ask: true,
    explain: [`Say ${target.word} slowly and listen to the very first sound.`, `${target.word} starts with the sound of ${target.u}.`, `So the letter is ${show(target)}.`]
  };
}

function rhymeQ(grade, rng) {
  const fam = rng.pick(RHYMES);
  const [a, b] = rng.sample(fam, 2);
  const others = rng.sample(RHYMES.filter((f) => f !== fam).map((f) => rng.pick(f)), choiceCount(grade) - 1);
  const label = (x) => `${x.pic} ${x.w}`;
  const text = `Which word rhymes with ${a.w}?`;
  return {
    prompt: `${text}\n${a.pic}`, text, pics: [a.pic], answer: label(b), choices: rng.shuffle([b, ...others].map(label)), skill: 'rhyming', ask: true,
    explain: ['Words rhyme when they end with the same sound.', `Say ${a.w} and listen to its end.`, `So ${b.w} rhymes with ${a.w}.`]
  };
}

function sightQ(grade, rng) {
  const list = SIGHT_WORDS[grade >= 1 ? 1 : 0];
  const target = rng.pick(list);
  const others = rng.sample(list.filter((x) => x !== target), choiceCount(grade) - 1);
  const text = `Find the word "${target}".`;
  return {
    prompt: text, text, answer: target, choices: rng.shuffle([target, ...others]), skill: 'sight-words', ask: true,
    explain: [`${target} is a word we see in lots of books.`, `It is spelt ${[...target].join(', ')}.`, `So it is ${target}.`]
  };
}

function pictureWordQ(grade, rng) {
  const target = rng.pick(PICTURE_WORDS);
  // Near misses: words that share letters, so the child has to look at every letter.
  const near = PICTURE_WORDS.filter((x) => x !== target && (x.w[0] === target.w[0] || x.w[1] === target.w[1] || x.w[2] === target.w[2]));
  const rest = PICTURE_WORDS.filter((x) => x !== target && !near.includes(x));
  const others = [...rng.shuffle(near), ...rng.shuffle(rest)].slice(0, choiceCount(grade) - 1);
  const text = 'Which word goes with the picture?';
  return {
    prompt: `${text}\n${target.pic}`, text, pics: [target.pic], answer: target.w, choices: rng.shuffle([target, ...others].map((x) => x.w)), skill: 'picture-words', ask: true,
    explain: [`Say the sounds: ${[...target.w].join(', ')}.`, `Blend them together: ${target.w}.`, `So the word is ${target.w}.`]
  };
}

/** The kinds a grade meets, gentlest first; `d` (0..1) walks along them. */
const KINDS = {
  '-1': ['letter', 'letter', 'case', 'first'],
  0: ['letter', 'first', 'case', 'rhyme', 'sight', 'picture'],
  1: ['rhyme', 'sight', 'picture', 'first']
};

/** One early reading question for `grade` (-1, 0 or 1) at difficulty `d`. */
export function earlyReadingQuestion(grade, rng, d = rng.float()) {
  const g = grade <= -1 ? -1 : grade >= 1 ? 1 : 0;
  const kinds = KINDS[g];
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  const kind = kinds[rng.int(0, reach - 1)];
  const q = kind === 'letter' ? letterQ(g, rng, d) : kind === 'case' ? caseQ(g, rng) : kind === 'first' ? firstSoundQ(g, rng)
    : kind === 'rhyme' ? rhymeQ(g, rng) : kind === 'sight' ? sightQ(g, rng) : pictureWordQ(g, rng);
  q.difficulty = d;
  return q;
}

/** Word Match rounds for the youngest: one kind per round, so its title fits ("Match the big and small letters"). */
export function earlyMatchRounds(grade, rng, rounds = 3, perRound = 5) {
  const kinds = grade <= -1 ? ['case', 'case', 'first'] : grade >= 1 ? ['rhyme', 'first', 'rhyme'] : ['case', 'first', 'rhyme'];
  const used = new Set();
  return kinds.slice(0, rounds).map((kind) => {
    let pairs = [];
    if (kind === 'case') pairs = rng.sample(LETTERS.filter((x) => !used.has(x.u)), perRound).map((x) => { used.add(x.u); return { l: x.u, r: x.l, k: 'letter-case' }; });
    else if (kind === 'first') pairs = rng.sample(LETTERS.filter((x) => !x.ends && !used.has('f' + x.u)), perRound).map((x) => { used.add('f' + x.u); return { l: `${x.pic} ${x.word}`, r: grade <= -1 ? x.u : x.l, k: 'first-sounds' }; });
    else pairs = rng.sample(RHYMES, perRound).map((fam) => { const [a, b] = rng.sample(fam, 2); return { l: `${a.pic} ${a.w}`, r: `${b.pic} ${b.w}`, k: 'rhyming' }; });
    const ids = pairs.map((_, i) => i);
    let right = rng.shuffle(ids);
    for (let t = 0; t < 10 && right.every((v, i) => v === i); t++) right = rng.shuffle(ids);
    if (right.every((v, i) => v === i)) right = ids.slice(1).concat(ids[0]);
    return { pairs, right };
  });
}

/** Word Builder's picture words for Kindergarten: three letters with the picture in the hint. */
export const earlyBuildWords = () => PICTURE_WORDS.map((x) => ({ w: x.w, h: `${x.pic} ${x.h}` }));
