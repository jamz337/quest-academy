// Studio Summit questions: Color Mixer, Symmetry Painter, Sculpting Shapes and Gallery Guide, from Pre-K colours
// and shapes to Grade 8 art vocabulary. Every question is { prompt, text, pics, choices, answer, skill, explain[],
// ask: true, difficulty } as the picture games expect. A colour question carries `swatches` (hex colours the scene
// paints, since colour emoji differ by device); a mirror question carries `mirror` (a pattern the scene draws with
// its mirror line). Those kinds are `drawn`, so duels, bosses and New Skill pages take the others.
import { bandFor, gradeOf } from '../../data/grades.js';
import {
  COLOURS, colourOf, PRIMARY, SECONDARY, COMPLEMENTS, COLOURED_THINGS, COLOUR_WORDS, RAINBOW,
  SYMMETRIC_LETTERS, LOPSIDED_LETTERS, SYMMETRIC_THINGS, LOPSIDED_THINGS, LINES_OF_SYMMETRY, SYMMETRY_WORDS,
  FLAT_SHAPES, SOLID_SHAPES, SCULPT_WORDS, TOOLS, ART_KINDS, ART_WORDS, ART_FACTS
} from '../../data/art/facts.js';

export const ART_GAMES = ['art-colours', 'art-symmetry', 'art-shapes', 'art-gallery'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const choiceCount = (grade) => (grade <= -1 ? 3 : 4);
const done = (q, d) => ({ ask: true, difficulty: d, ...q });
const label = (x) => `${x.pic} ${x.name}`;
const an = (s) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
const num = (n) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] || String(n);

function choicesWith(answer, candidates, fallback, rng, n) {
  const out = [String(answer)];
  const add = (v) => { const s = String(v); if (s && !out.includes(s)) out.push(s); };
  for (const c of rng.shuffle(candidates)) { if (out.length >= n) break; add(c); }
  let guard = 0;
  while (out.length < n && guard++ < 100) add(fallback());
  return rng.shuffle(out);
}
const factQ = (facts, skill) => (grade, rng, d) => {
  const band = bandFor(grade);
  const pool = facts.filter((f) => f.band === band || (band === 'C' && rng.chance(0.4)));
  const f = rng.pick(pool.length ? pool : facts);
  return done({ prompt: f.q, text: f.q, pics: [], answer: f.a, skill, choices: rng.shuffle([f.a, ...f.pool.slice(0, 3)]), explain: [f.explain, `So the answer is: ${f.a}.`] }, d);
};
const wordQ = (words, skill, what) => (grade, rng, d) => {
  const band = bandFor(grade);
  const pool = words.filter((w) => w.band === band || band === 'C');
  const w = rng.pick(pool.length ? pool : words), others = words.filter((x) => x !== w);
  if (rng.chance(0.5)) {
    const text = `In art, what does "${w.word}" mean?`;
    return done({ prompt: text, text, pics: [], answer: w.means, skill, choices: choicesWith(w.means, rng.sample(others, 5).map((x) => x.means), () => rng.pick(others).means, rng, 4), explain: [`"${cap(w.word)}" means ${w.means}.`, `An ${what} word worth keeping.`, `So the answer is "${w.means}".`] }, d);
  }
  const text = `Which art word means "${w.means}"?`;
  return done({ prompt: text, text, pics: [], answer: w.word, skill, choices: choicesWith(w.word, rng.sample(others, 5).map((x) => x.word), () => rng.pick(others).word, rng, 4), explain: [`${cap(w.means)}: that is "${w.word}".`, `So the answer is "${w.word}".`] }, d);
};

// ---- Color Mixer -------------------------------------------------------------------------------------------

/** Swatch choices are the colour's name; the scene paints the colour beside each name. */
const swatch = (c) => `${c.pic} ${c.name}`;
function nameColourQ(grade, rng, d) {
  const c = rng.pick(COLOURS.slice(0, grade <= -1 ? 6 : 9)), others = COLOURS.filter((x) => x !== c);
  const text = 'What colour is this?';
  return done({ prompt: `${text}\n${c.pic}`, text, pics: [c.pic], swatches: [c.swatch], answer: swatch(c), skill: 'colours', choices: choicesWith(swatch(c), rng.sample(others, 5).map(swatch), () => swatch(rng.pick(others)), rng, choiceCount(grade)),
    explain: [`This colour is ${c.name}.`, `So the answer is ${c.name}.`] }, d);
}
nameColourQ.drawn = true;
function thingColourQ(grade, rng, d) {
  const t = rng.pick(COLOURED_THINGS), c = colourOf(t.colour), others = COLOURS.filter((x) => x !== c);
  const text = `What colour is ${an(t.name)}?`;
  return done({ prompt: `${text}\n${t.pic}`, text, pics: [t.pic], answer: swatch(c), skill: 'colours', choices: choicesWith(swatch(c), rng.sample(others, 5).map(swatch), () => swatch(rng.pick(others)), rng, choiceCount(grade)),
    explain: [`${cap(an(t.name))} is ${c.name}.`, `So the answer is ${c.name}.`] }, d);
}
function mixQ(grade, rng, d) {
  const s = rng.pick(SECONDARY), [a, b] = s.mix, others = COLOURS.filter((x) => x !== s);
  if (rng.chance(0.5)) {
    const text = `${cap(a)} and ${b} mixed together make…`;
    return done({ prompt: `${text}\n${colourOf(a).pic} + ${colourOf(b).pic}`, text, pics: [`${colourOf(a).pic} + ${colourOf(b).pic}`], swatches: [colourOf(a).swatch, colourOf(b).swatch], answer: swatch(s), skill: 'mixing', choices: choicesWith(swatch(s), rng.sample(others, 5).map(swatch), () => swatch(rng.pick(others)), rng, choiceCount(grade)),
      explain: [`${cap(a)} + ${b} = ${s.name}.`, 'Mixing two primary colours makes a secondary colour.', `So the answer is ${s.name}.`] }, d);
  }
  const text = `Which two colours mix to make ${s.name}?`;
  const pairs = SECONDARY.map((x) => `${x.mix[0]} + ${x.mix[1]}`), ans = `${a} + ${b}`;
  return done({ prompt: `${text}\n${s.pic}`, text, pics: [s.pic], swatches: [s.swatch], answer: ans, skill: 'mixing', choices: choicesWith(ans, pairs.filter((p) => p !== ans).concat(['red + green', 'blue + black']), () => 'yellow + white', rng, choiceCount(grade)),
    explain: [`${cap(s.name)} is made by mixing ${a} and ${b}.`, `So the answer is ${ans}.`] }, d);
}
mixQ.drawn = true;
function primaryQ(grade, rng, d) {
  const want = rng.chance(0.5);
  const pick = rng.pick(want ? PRIMARY : SECONDARY), others = want ? [...SECONDARY, colourOf('pink'), colourOf('brown')] : PRIMARY;
  const text = want ? 'Which of these is a PRIMARY colour?' : 'Which of these is a SECONDARY colour?';
  return done({ prompt: text, text, pics: [], answer: swatch(pick), skill: 'mixing', choices: choicesWith(swatch(pick), others.map(swatch), () => swatch(rng.pick(others)), rng, 4),
    explain: ['The primary colours are red, yellow and blue; mixing two of them gives a secondary colour: orange, green or purple.', `${cap(pick.name)} is ${want ? 'primary' : 'secondary'}.`, `So the answer is ${pick.name}.`] }, d);
}
function warmCoolQ(grade, rng, d) {
  const warm = rng.chance(0.5), pool = COLOURS.filter((c) => c.warm === warm && !['black', 'white', 'grey'].includes(c.name));
  const pick = rng.pick(pool), others = COLOURS.filter((c) => c.warm !== warm && !['black', 'white', 'grey'].includes(c.name));
  const text = `Which of these is a ${warm ? 'WARM' : 'COOL'} colour?`;
  return done({ prompt: text, text, pics: [], answer: swatch(pick), skill: 'colour-words', choices: choicesWith(swatch(pick), others.map(swatch), () => swatch(rng.pick(others)), rng, 4),
    explain: ['Warm colours are the colours of fire and sun: reds, oranges, yellows. Cool colours are water and shade: blues, greens, purples.', `${cap(pick.name)} is ${warm ? 'warm' : 'cool'}.`, `So the answer is ${pick.name}.`] }, d);
}
function tintShadeQ(grade, rng, d) {
  const tint = rng.chance(0.5);
  const text = tint ? 'Adding WHITE to a colour makes a…' : 'Adding BLACK to a colour makes a…';
  return done({ prompt: text, text, pics: [], answer: tint ? 'tint (lighter)' : 'shade (darker)', skill: 'colour-words', choices: rng.shuffle(['tint (lighter)', 'shade (darker)', 'tone (softer)', 'hue (brighter)']),
    explain: ['White lightens a colour into a tint; black darkens it into a shade; grey softens it into a tone.', `So the answer is a ${tint ? 'tint' : 'shade'}.`] }, d);
}
function complementQ(grade, rng, d) {
  const pair = rng.pick(COMPLEMENTS), flip = rng.chance(0.5), a = pair[flip ? 1 : 0], b = pair[flip ? 0 : 1];
  const text = `On the colour wheel, which colour sits opposite ${a}?`;
  return done({ prompt: text, text, pics: [], answer: swatch(colourOf(b)), skill: 'colour-words', choices: choicesWith(swatch(colourOf(b)), COLOURS.filter((c) => c.name !== b && c.name !== a).slice(0, 6).map(swatch), () => swatch(rng.pick(COLOURS)), rng, 4),
    explain: ['Complementary colours sit opposite each other: red and green, blue and orange, yellow and purple.', `Opposite ${a} is ${b}.`, `So the answer is ${b}.`] }, d);
}
function rainbowQ(grade, rng, d) {
  const i = rng.int(0, RAINBOW.length - 2), c = RAINBOW[i], next = RAINBOW[i + 1];
  const text = `In a rainbow, which colour comes after ${c}?`;
  return done({ prompt: `${text}\n🌈`, text, pics: ['🌈'], answer: next, skill: 'colour-words', choices: choicesWith(next, RAINBOW.filter((x) => x !== next), () => rng.pick(RAINBOW), rng, 4),
    explain: ['Red, orange, yellow, green, blue, indigo, violet: the colours of the rainbow in order.', `After ${c} comes ${next}.`, `So the answer is ${next}.`] }, d);
}
const colourWordQ = wordQ(COLOUR_WORDS, 'colour-words', 'art');

// ---- Symmetry Painter ------------------------------------------------------------------------------------------

function sameSidesQ(grade, rng, d) {
  const want = rng.chance(0.5), pick = rng.pick(want ? SYMMETRIC_THINGS : LOPSIDED_THINGS), others = want ? LOPSIDED_THINGS : SYMMETRIC_THINGS;
  const text = want ? 'Which one is the same on both sides?' : 'Which one is NOT the same on both sides?';
  return done({ prompt: text, text, pics: [], answer: label(pick), skill: 'symmetry', choices: choicesWith(label(pick), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [want ? `Fold a ${pick.name} down the middle and the two halves match: it is symmetrical.` : `A ${pick.name} has a different left side and right side: it is not symmetrical.`, `So the answer is ${label(pick)}.`] }, d);
}
function letterQ(grade, rng, d) {
  const want = rng.chance(0.5), pick = rng.pick(want ? SYMMETRIC_LETTERS : LOPSIDED_LETTERS), others = want ? LOPSIDED_LETTERS : SYMMETRIC_LETTERS;
  const text = want ? 'Which letter looks the same in a mirror held beside it?' : 'Which letter looks DIFFERENT in a mirror held beside it?';
  return done({ prompt: text, text, pics: [], answer: pick, skill: 'symmetry', choices: choicesWith(pick, rng.sample(others, 5), () => rng.pick(others), rng, choiceCount(grade)),
    explain: [want ? `${pick} has a line of symmetry down its middle: its left and right halves match.` : `${pick} has no line of symmetry down its middle.`, `So the answer is ${pick}.`] }, d);
}
function linesQ(grade, rng, d) {
  const s = rng.pick(LINES_OF_SYMMETRY);
  const text = `How many lines of symmetry does ${s.shape} have?`;
  return done({ prompt: `${text}\n${s.pic}`, text, pics: [s.pic], answer: num(s.lines), skill: 'symmetry', choices: choicesWith(num(s.lines), ['one', 'two', 'three', 'four', 'five', 'six', 'eight'].filter((x) => x !== num(s.lines)), () => num(rng.int(1, 8)), rng, 4),
    explain: ['A line of symmetry is a fold line where the two halves match exactly.', `${cap(s.shape)} has ${num(s.lines)}.`, `So the answer is ${num(s.lines)}.`] }, d);
}
const DOTS = ['🔴', '🔵', '🟡', '🟢'];
function mirrorQ(grade, rng, d) {
  const n = grade <= 1 ? 3 : 4;
  let pattern = Array.from({ length: n }, () => rng.pick(DOTS));
  if (pattern.join('') === [...pattern].reverse().join('')) pattern[0] = DOTS.find((x) => x !== pattern[n - 1]);
  const mirrored = [...pattern].reverse();
  const text = 'What does this row look like in the mirror?';
  const distract = () => { let g = 0, s = ''; do { s = rng.shuffle([...pattern]).join(''); } while (s === mirrored.join('') && g++ < 20); return s === mirrored.join('') ? rng.shuffle([...pattern, rng.pick(DOTS)]).join('') : s; };
  return done({ prompt: `${text}\n${pattern.join('')} |`, text, pics: [`${pattern.join('')} |`], mirror: pattern, answer: mirrored.join(''), skill: 'reflection', choices: choicesWith(mirrored.join(''), [pattern.join(''), distract(), distract()], distract, rng, 4),
    explain: ['A reflection flips the row: the dot nearest the mirror stays nearest, so the order reverses.', `${pattern.join('')} becomes ${mirrored.join('')}.`, `So the answer is ${mirrored.join('')}.`] }, d);
}
mirrorQ.drawn = true;
function palindromeQ(grade, rng, d) {
  const sym = rng.chance(0.5), half = Array.from({ length: 2 }, () => rng.pick(DOTS));
  let row = sym ? [...half, rng.pick(DOTS), ...[...half].reverse()] : [...half, rng.pick(DOTS), ...half];
  if (!sym && row.join('') === [...row].reverse().join('')) row[4] = DOTS.find((x) => x !== row[0]);
  const text = 'Is this row symmetrical, with the same pattern from both ends?';
  return done({ prompt: `${text}\n${row.join('')}`, text, pics: [row.join('')], answer: sym ? 'yes, symmetrical' : 'no, not symmetrical', skill: 'symmetry', choices: rng.shuffle(['yes, symmetrical', 'no, not symmetrical']),
    explain: [sym ? 'Read it from either end and the colours come in the same order: symmetrical.' : 'Read it from the other end and the order is different: not symmetrical.', `So the answer is ${sym ? 'yes' : 'no'}.`] }, d);
}
palindromeQ.drawn = true;   // its row lives in the picture, so a words-only page could not show it
const symmetryWordQ = wordQ(SYMMETRY_WORDS, 'symmetry-words', 'art');

// ---- Sculpting Shapes ------------------------------------------------------------------------------------------

function whichShapeQ(grade, rng, d) {
  const pool = grade <= -1 ? FLAT_SHAPES.slice(0, 4) : FLAT_SHAPES, s = rng.pick(pool), others = FLAT_SHAPES.filter((x) => x !== s);
  const text = `Which one is a ${s.name}?`;
  return done({ prompt: text, text, pics: [], answer: label(s), skill: 'shapes', choices: choicesWith(label(s), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [s.tells, `So the answer is ${label(s)}.`] }, d);
}
function sidesQ(grade, rng, d) {
  const s = rng.pick(FLAT_SHAPES.filter((x) => x.sides > 0 && x.sides <= 6));
  const text = `How many sides does a ${s.name} have?`;
  return done({ prompt: `${text}\n${s.pic}`, text, pics: [s.pic], answer: num(s.sides), skill: 'shapes', choices: choicesWith(num(s.sides), ['three', 'four', 'five', 'six', 'eight'].filter((x) => x !== num(s.sides)), () => num(rng.int(3, 8)), rng, choiceCount(grade)),
    explain: [s.tells, `So the answer is ${num(s.sides)}.`] }, d);
}
function solidQ(grade, rng, d) {
  const s = rng.pick(SOLID_SHAPES), others = SOLID_SHAPES.filter((x) => x !== s);
  const text = `${cap(s.thing)} is which solid shape?`;
  return done({ prompt: `${text}\n${s.pic}`, text, pics: [s.pic], answer: s.name, skill: 'solid-shapes', choices: choicesWith(s.name, others.map((x) => x.name), () => rng.pick(others).name, rng, choiceCount(grade)),
    explain: [s.tells, `So the answer is a ${s.name}.`] }, d);
}
function facesQ(grade, rng, d) {
  const s = rng.pick(SOLID_SHAPES.filter((x) => x.faces > 1)), what = rng.pick(['faces', 'edges', 'corners']), n = s[what];
  const text = `How many ${what} does a ${s.name} have?`;
  return done({ prompt: `${text}\n${s.pic}`, text, pics: [s.pic], answer: num(n), skill: 'solid-shapes', choices: choicesWith(num(n), ['one', 'two', 'three', 'four', 'five', 'six', 'eight', 'twelve'].filter((x) => x !== num(n)), () => num(rng.int(1, 12)), rng, 4),
    explain: ['Faces are the flat sides, edges the lines where faces meet, corners (vertices) where edges meet.', `A ${s.name} has ${num(s.faces)} faces, ${num(s.edges)} edges and ${num(s.corners)} corners.`, `So the answer is ${num(n)}.`] }, d);
}
function rollsQ(grade, rng, d) {
  const want = rng.chance(0.5), pick = rng.pick(SOLID_SHAPES.filter((x) => x.rolls === want)), others = SOLID_SHAPES.filter((x) => x.rolls !== want);
  const text = want ? 'Which shape can ROLL?' : 'Which shape cannot roll, only slide?';
  return done({ prompt: text, text, pics: [], answer: label(pick), skill: 'solid-shapes', choices: choicesWith(label(pick), others.map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: ['Shapes with a curved surface roll; shapes with only flat faces slide.', s_tells(pick), `So the answer is ${label(pick)}.`] }, d);
}
const s_tells = (s) => s.tells;
const sculptWordQ = wordQ(SCULPT_WORDS, 'sculpture-words', 'art');

// ---- Gallery Guide -----------------------------------------------------------------------------------------

function toolQ(grade, rng, d) {
  const t = rng.pick(TOOLS), others = TOOLS.filter((x) => x !== t && x.does !== t.does);
  const text = `Which of these does an artist use to ${t.does}?`;
  return done({ prompt: text, text, pics: [], answer: label(t), skill: 'art-tools', choices: choicesWith(label(t), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [t.fact, `So the answer is ${label(t)}.`] }, d);
}
function toolDoesQ(grade, rng, d) {
  const t = rng.pick(TOOLS), others = TOOLS.filter((x) => x.does !== t.does);
  const text = `What does an artist do with ${t.name === 'scissors' || t.name === 'crayons' ? '' : 'a '}${t.name}?`;
  return done({ prompt: `${text}
${t.pic}`, text, pics: [t.pic], answer: t.does, skill: 'art-tools', choices: choicesWith(t.does, rng.sample(others, 5).map((x) => x.does), () => rng.pick(others).does, rng, choiceCount(grade)),
    explain: [t.fact, `So the answer is: ${t.does}.`] }, d);
}
function kindQ(grade, rng, d) {
  const band = bandFor(grade), pool = ART_KINDS.filter((k) => k.band === 'A' || (band !== 'A' && k.band === band) || band === 'C'), k = rng.pick(pool.length ? pool : ART_KINDS), others = ART_KINDS.filter((x) => x !== k);
  if (rng.chance(0.5)) {
    const text = `${cap(k.means)} is called…`;
    return done({ prompt: `${text}\n${k.pic}`, text, pics: [k.pic], answer: k.kind, skill: 'art-kinds', choices: choicesWith(k.kind, rng.sample(others, 5).map((x) => x.kind), () => rng.pick(others).kind, rng, choiceCount(grade)),
      explain: [`${cap(k.means)}: that is ${k.kind === 'abstract art' ? '' : 'a '}${k.kind}.`, `So the answer is ${k.kind}.`] }, d);
  }
  const text = `What is ${k.kind === 'abstract art' ? '' : 'a '}${k.kind}?`;
  return done({ prompt: `${text}\n${k.pic}`, text, pics: [k.pic], answer: k.means, skill: 'art-kinds', choices: choicesWith(k.means, rng.sample(others, 5).map((x) => x.means), () => rng.pick(others).means, rng, choiceCount(grade)),
    explain: [`${cap(k.kind)}: ${k.means}.`, `So the answer is: ${k.means}.`] }, d);
}
const artWordQ = wordQ(ART_WORDS, 'art-words', 'art');
const artFactQ = factQ(ART_FACTS, 'art-facts');

// ---- Picking by game, grade and difficulty ---------------------------------------------------------------------

const KINDS = {
  'art-colours': { E: [nameColourQ, thingColourQ], A: [thingColourQ, nameColourQ, mixQ], B: [mixQ, primaryQ, warmCoolQ, tintShadeQ, rainbowQ], C: [complementQ, tintShadeQ, colourWordQ, rainbowQ] },
  'art-symmetry': { E: [sameSidesQ, letterQ], A: [sameSidesQ, letterQ, palindromeQ], B: [palindromeQ, mirrorQ, linesQ, symmetryWordQ], C: [mirrorQ, linesQ, symmetryWordQ] },
  'art-shapes': { E: [whichShapeQ, sidesQ, rollsQ, solidQ], A: [whichShapeQ, sidesQ, solidQ, rollsQ], B: [solidQ, facesQ, rollsQ, sculptWordQ], C: [facesQ, sculptWordQ] },
  'art-gallery': { E: [toolQ, toolDoesQ], A: [toolQ, toolDoesQ, kindQ], B: [kindQ, artWordQ, artFactQ], C: [artWordQ, artFactQ] }
};

/**
 * One question for a game at a grade; d (0..1) is how hard, reaching the later kinds of its band.
 * opts.drawn === false leaves out the kinds that need the scene (painted colours, a mirror): duels, bosses, New Skill pages.
 */
export function artQuestion(gameId, grade, rng, d = 0.5, opts = {}) {
  const g = gradeOf(grade), all = KINDS[gameId] || KINDS['art-colours'];
  let kinds = all[bandFor(g)];
  if (opts.drawn === false) {
    const order = ['E', 'A', 'B', 'C'], from = order.indexOf(bandFor(g));
    kinds = [...new Set([...order.slice(from), ...order.slice(0, from)].flatMap((b) => all[b]))].filter((k) => !k.drawn);
  }
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  return kinds[rng.int(0, reach - 1)](g, rng, d, opts);
}

/** n questions with no repeats, each as hard as `targets[i]` (easiest first when no targets are given). */
export function artSet(gameId, grade, rng, n = 10, targets = null, opts = {}) {
  const out = [], seen = new Set();
  let guard = 0, repeats = 0;
  while (out.length < n && guard++ < n * 14) {
    const want = targets ? targets[out.length] : out.length / Math.max(1, n - 1);
    const d = Math.min(1, (want ?? 0.5) + repeats * 0.12);
    const q = artQuestion(gameId, grade, rng, d, opts);
    const key = `${q.prompt}|${q.answer}`;
    if (seen.has(key)) { repeats += 1; continue; }
    repeats = 0; seen.add(key); out.push(q);
  }
  return out;
}

/** The whole subject's mix (bosses and reviews): a random game's question. */
export const artMix = (grade, rng, opts = {}) => artQuestion(rng.pick(ART_GAMES), grade, rng, rng.float(), opts);
