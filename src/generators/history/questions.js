// History Harbor questions: Compass Quest, Community Helpers, Flag Finder and Past & Present, from the picture
// questions of Kindergarten to the vocabulary of Grade 8. Every question is { prompt, text, pics, choices, answer,
// skill, explain[], ask: true, difficulty } as the picture games expect; a flag choice is "🇧🇧 Barbados", and the
// scene draws the flag itself (ui/Flags.js) from the country's code. Pure functions of (gameId, grade, rng).
import { bandFor, gradeOf } from '../../data/grades.js';
import {
  DIRECTIONS, BETWEEN, dirOf, DIRECTION_CLUES, HARBOUR_MAP, MAP_WORDS,
  HELPERS, COMMUNITY_FACTS, COUNTRIES, CONTINENTS, WORLD_FACTS, THEN_NOW, EVENTS, HISTORY_WORDS, HISTORY_FACTS
} from '../../data/history/facts.js';

export const HISTORY_GAMES = ['his-compass', 'his-helpers', 'his-flags', 'his-time'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const choiceCount = (grade) => (grade <= -1 ? 3 : 4);
const done = (q, d) => ({ ask: true, difficulty: d, ...q });

function choicesWith(answer, candidates, fallback, rng, n) {
  const out = [String(answer)];
  const add = (v) => { const s = String(v); if (s && !out.includes(s)) out.push(s); };
  for (const c of rng.shuffle(candidates)) { if (out.length >= n) break; add(c); }
  let guard = 0;
  while (out.length < n && guard++ < 100) add(fallback());
  return rng.shuffle(out);
}
const label = (x) => `${x.pic} ${x.name}`;
/** The regional-indicator emoji for a country code: shown as a flag where the font has one, two letters elsewhere. */
export const flagCode = (c) => String.fromCodePoint(...[...c.code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
const shortName = (c) => c.name.replace(/^the /, '');
export const flagLabel = (c) => `${flagCode(c)} ${shortName(c)}`;
/** The country a choice, answer or picture names, if any: lets the scene draw the real flag over the emoji. */
export const countryOfLabel = (str) => COUNTRIES.find((c) => str === flagLabel(c) || str === flagCode(c) || str === c.name || str === cap(c.name));

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
    const text = `What does "${w.word}" mean?`;
    return done({ prompt: text, text, pics: [], answer: w.means, skill, choices: choicesWith(w.means, rng.sample(others, 5).map((x) => x.means), () => rng.pick(others).means, rng, 4), explain: [`"${cap(w.word)}" means ${w.means}.`, `That is a ${what} word worth keeping.`, `So the answer is "${w.means}".`] }, d);
  }
  const text = `Which word means "${w.means}"?`;
  return done({ prompt: text, text, pics: [], answer: w.word, skill, choices: choicesWith(w.word, rng.sample(others, 5).map((x) => x.word), () => rng.pick(others).word, rng, 4), explain: [`${cap(w.means)}: that is "${w.word}".`, `So the answer is "${w.word}".`] }, d);
};

// ---- Compass Quest ---------------------------------------------------------------------------------------------

const dirChoices = (rng, n, answer) => choicesWith(label(dirOf(answer)), DIRECTIONS.filter((x) => x.id !== answer).map(label), () => label(rng.pick(DIRECTIONS)), rng, n);

function arrowQ(grade, rng, d) {
  const dir = rng.pick(DIRECTIONS), n = choiceCount(grade);
  const text = `Which arrow points ${dir.name}?`;
  return done({ prompt: text, text, pics: [], answer: label(dir), skill: 'directions', choices: dirChoices(rng, n, dir.id),
    explain: [dir.tells, `So ${dir.pic} points ${dir.name}.`] }, d);
}
function clueQ(grade, rng, d) {
  const c = rng.pick(DIRECTION_CLUES), n = choiceCount(grade), dir = dirOf(c.answer);
  const text = c.clue;
  return done({ prompt: `${text}\n${c.pic}`, text, pics: [c.pic], answer: label(dir), skill: 'directions', choices: dirChoices(rng, n, dir.id),
    explain: [dir.tells, `So the answer is ${label(dir)}.`] }, d);
}
function letterQ(grade, rng, d) {
  const dir = rng.pick(DIRECTIONS);
  const text = `On a compass, what does the letter ${dir.letter} stand for?`;
  return done({ prompt: `${text}\n🧭`, text, pics: ['🧭'], answer: label(dir), skill: 'directions', choices: rng.shuffle(DIRECTIONS.map(label)),
    explain: ['A compass rose is marked N, E, S, W, going round clockwise.', `${dir.letter} stands for ${dir.name}.`, `So the answer is ${label(dir)}.`] }, d);
}
/** The little harbour map as a picture: the lighthouse in the middle, the town above it, the sea below, and so on. */
const at = (dir) => HARBOUR_MAP.find((s) => s.dir === dir).pic;
export const MAP_PIC = `${at('north')}\n${at('west')} 🗼 ${at('east')}\n${at('south')}`;
const WHERE = { north: 'above', east: 'to the right of', south: 'below', west: 'to the left of' };
function mapQ(grade, rng, d) {
  const spot = rng.pick(HARBOUR_MAP), dir = dirOf(spot.dir);
  const text = `Look at the harbour map. Which way is ${spot.thing} from the lighthouse?`;
  return done({ prompt: `${text}\n${MAP_PIC}`, text, pics: [MAP_PIC], map: true, answer: label(dir), skill: 'map-reading', choices: rng.shuffle(DIRECTIONS.map(label)),
    explain: ['On a map, up is north, right is east, down is south and left is west.', `${cap(spot.thing)} is ${WHERE[spot.dir]} the lighthouse: that is ${spot.dir}.`, `So the answer is ${label(dir)}.`] }, d);
}
mapQ.drawn = true;   // needs the map picture: left out of duels, bosses and New Skill pages
function turnQ(grade, rng, d) {
  const dir = rng.pick(DIRECTIONS), kind = rng.pick(['opposite', 'right', 'left']);
  const ans = dirOf(dir[kind]);
  const text = kind === 'opposite' ? `You are walking ${dir.name}. You turn right round. Which way are you walking now?` : `You face ${dir.name} and turn ${kind}. Which way do you face now?`;
  return done({ prompt: `${text}\n🧭`, text, pics: ['🧭'], answer: label(ans), skill: 'map-reading', choices: rng.shuffle(DIRECTIONS.map(label)),
    explain: ['Round the compass clockwise it goes north, east, south, west.', kind === 'opposite' ? `Turning right round from ${dir.name} faces ${ans.name}.` : `A ${kind} turn from ${dir.name} faces ${ans.name}.`, `So the answer is ${label(ans)}.`] }, d);
}
function betweenQ(grade, rng, d) {
  const b = rng.pick(BETWEEN), others = BETWEEN.filter((x) => x !== b);
  const text = rng.chance(0.5) ? `Which direction is between ${b.between[0]} and ${b.between[1]}?` : `A ship sails ${b.name}. Which arrow is that?`;
  return done({ prompt: `${text}\n🧭`, text, pics: ['🧭'], answer: label(b), skill: 'map-reading', choices: choicesWith(label(b), others.map(label), () => label(rng.pick(others)), rng, 4),
    explain: [`${cap(b.name)} lies halfway between ${b.between[0]} and ${b.between[1]}.`, `So the answer is ${label(b)}.`] }, d);
}
function degreesQ(grade, rng, d) {
  const all = [...DIRECTIONS.map((x) => ({ name: x.name, pic: x.pic, degrees: x.degrees })), ...BETWEEN];
  const dir = rng.pick(all), others = all.filter((x) => x !== dir);
  const text = rng.chance(0.5) ? `A compass bearing of ${dir.degrees}° means…` : `What bearing, in degrees, is ${dir.name}?`;
  const byDeg = text.startsWith('What');
  const answer = byDeg ? `${dir.degrees}°` : label(dir);
  const choices = byDeg ? choicesWith(answer, others.map((x) => `${x.degrees}°`), () => `${rng.pick(others).degrees}°`, rng, 4) : choicesWith(answer, others.map(label), () => label(rng.pick(others)), rng, 4);
  return done({ prompt: `${text}\n🧭`, text, pics: ['🧭'], answer, skill: 'compass-degrees', choices,
    explain: ['Bearings go clockwise from north: north 0°, east 90°, south 180°, west 270°.', `${cap(dir.name)} is ${dir.degrees}°.`, `So the answer is ${answer}.`] }, d);
}
const mapWordQ = wordQ(MAP_WORDS, 'geography-lines', 'map');

// ---- Community Helpers -----------------------------------------------------------------------------------------

function whoHelpsQ(grade, rng, d) {
  const h = rng.pick(HELPERS), n = choiceCount(grade), others = HELPERS.filter((x) => x !== h);
  const text = `Who ${h.does}?`;
  return done({ prompt: text, text, pics: [], answer: label(h), skill: 'helpers', choices: choicesWith(label(h), others.map(label), () => label(rng.pick(others)), rng, n),
    explain: [`A ${h.name} ${h.does}.`, `They work at ${h.place} and use ${h.tool}.`, `So the answer is ${label(h)}.`] }, d);
}
function toolQ(grade, rng, d) {
  const h = rng.pick(HELPERS), n = choiceCount(grade), others = HELPERS.filter((x) => x !== h && x.tool !== h.tool);
  const text = `Which of these does a ${h.name} use?`;
  const lab = (x) => `${x.toolPic} ${x.tool}`;
  return done({ prompt: `${text}\n${h.pic}`, text, pics: [h.pic], answer: lab(h), skill: 'helper-tools', choices: choicesWith(lab(h), others.map(lab), () => lab(rng.pick(others)), rng, n),
    explain: [`A ${h.name} ${h.does}.`, `For that they use ${h.tool}.`, `So the answer is ${lab(h)}.`] }, d);
}
function placeQ(grade, rng, d) {
  const h = rng.pick(HELPERS), n = choiceCount(grade), others = HELPERS.filter((x) => x.place !== h.place);
  const text = `Where does a ${h.name} work?`;
  const lab = (x) => `${x.placePic} ${x.place}`;
  return done({ prompt: `${text}\n${h.pic}`, text, pics: [h.pic], answer: lab(h), skill: 'helpers', choices: choicesWith(lab(h), others.map(lab), () => lab(rng.pick(others)), rng, n),
    explain: [`A ${h.name} ${h.does}.`, `You will find them at ${h.place}.`, `So the answer is ${lab(h)}.`] }, d);
}
function whatDoesQ(grade, rng, d) {
  const h = rng.pick(HELPERS), others = HELPERS.filter((x) => x !== h);
  const text = `What does a ${h.name} do?`;
  return done({ prompt: `${text}\n${h.pic}`, text, pics: [h.pic], answer: h.does, skill: 'helpers', choices: choicesWith(h.does, rng.sample(others, 5).map((x) => x.does), () => rng.pick(others).does, rng, 4),
    explain: [`A ${h.name} ${h.does}.`, `So the answer is: ${h.does}.`] }, d);
}
const communityQ = factQ(COMMUNITY_FACTS, 'community');

// ---- Flag Finder -----------------------------------------------------------------------------------------------

const CARIBBEAN = COUNTRIES.filter((c) => c.continent === 'the Caribbean');
const pickCountry = (grade, rng) => (grade <= 1 ? rng.pick(rng.chance(0.6) ? CARIBBEAN : COUNTRIES) : rng.pick(COUNTRIES));

/** "Which flag is Barbados?": the choices are flags alone (drawn by the scene), so the names give nothing away. */
function whichFlagQ(grade, rng, d) {
  const c = pickCountry(grade, rng), n = choiceCount(grade), others = COUNTRIES.filter((x) => x !== c);
  const text = `Which flag is ${c.name}?`;
  return done({ prompt: text, text, pics: [], answer: flagCode(c), skill: 'flags', flagChoices: true, choices: choicesWith(flagCode(c), rng.sample(others, 6).map(flagCode), () => flagCode(rng.pick(others)), rng, n),
    explain: [`The flag of ${c.name} is ${c.look}.`, c.fact, `So the answer is the flag of ${c.name}: ${c.look}.`] }, d);
}
whichFlagQ.drawn = true;
/** A flag to name; where nothing can be drawn (duels, bosses) the flag is described in words instead. */
function whoseFlagQ(grade, rng, d, opts = {}) {
  const c = pickCountry(grade, rng), n = choiceCount(grade), others = COUNTRIES.filter((x) => x !== c), drawn = opts.drawn !== false;
  const text = drawn ? 'Which country has this flag?' : `Which country's flag is ${c.look}?`;
  return done({ prompt: drawn ? `${text}\n${flagCode(c)}` : text, text, pics: drawn ? [flagCode(c)] : [], ...(drawn ? { flag: c.code } : {}), answer: cap(c.name), skill: 'flags', choices: choicesWith(cap(c.name), rng.sample(others, 6).map((x) => cap(x.name)), () => cap(rng.pick(others).name), rng, n),
    explain: [`This flag is ${c.look}: the flag of ${c.name}.`, c.fact, `So the answer is ${cap(c.name)}.`] }, d);
}
function capitalQ(grade, rng, d) {
  const c = rng.pick(COUNTRIES), others = COUNTRIES.filter((x) => x !== c);
  const text = `What is the capital of ${c.name}?`;
  return done({ prompt: `${text}\n${flagCode(c)}`, text, pics: [flagCode(c)], flag: c.code, answer: c.capital, skill: 'capitals', choices: choicesWith(c.capital, rng.sample(others, 6).map((x) => x.capital), () => rng.pick(others).capital, rng, 4),
    explain: [`The capital is the city where a country's government sits.`, `${cap(c.name)}'s capital is ${c.capital}.`, `So the answer is ${c.capital}.`] }, d);
}
function continentQ(grade, rng, d) {
  const c = rng.pick(COUNTRIES), others = CONTINENTS.filter((x) => x !== c.continent);
  const text = `Which part of the world is ${c.name} in?`;
  return done({ prompt: `${text}\n${flagCode(c)}`, text, pics: [flagCode(c)], flag: c.code, answer: c.continent, skill: 'continents', choices: choicesWith(c.continent, others, () => rng.pick(others), rng, 4),
    explain: [c.fact, `${cap(c.name)} is in ${c.continent}.`, `So the answer is ${c.continent}.`] }, d);
}
const worldQ = factQ(WORLD_FACTS, 'world-geography');

// ---- Past & Present --------------------------------------------------------------------------------------------

function thenNowQ(grade, rng, d) {
  const p = rng.pick(THEN_NOW), n = choiceCount(grade), askThen = rng.chance(0.5);
  const ans = askThen ? p.then : p.now, other = askThen ? p.now : p.then;
  const text = `Which one ${askThen ? 'did people use long ago' : 'do people use today'} ${p.use}?`;
  const extras = THEN_NOW.filter((x) => x !== p).map((x) => (askThen ? x.now : x.then));
  return done({ prompt: text, text, pics: [], answer: label(ans), skill: 'then-now', choices: choicesWith(label(ans), [label(other), ...rng.sample(extras, 3).map(label)], () => label(rng.pick(extras)), rng, n),
    explain: [`Long ago people used a ${p.then.name} ${p.use}. Today they use a ${p.now.name}.`, `So ${askThen ? 'long ago' : 'today'} it is the ${ans.name}.`] }, d);
}
function firstQ(grade, rng, d) {
  const band = bandFor(grade), pool = EVENTS.filter((e) => e.band === 'B' || band === 'C');
  const [a, b] = rng.sample(pool, 2), first = a.year < b.year ? a : b, later = first === a ? b : a;
  const text = `Which happened first?`;
  return done({ prompt: `${text}\n${a.pic} ${b.pic}`, text, pics: [a.pic, b.pic], answer: `${first.pic} ${cap(first.name)}`, skill: 'timeline', choices: rng.shuffle([`${a.pic} ${cap(a.name)}`, `${b.pic} ${cap(b.name)}`]),
    explain: [`${cap(first.name)} in ${yr(first.year)}; ${later.name} in ${yr(later.year)}.`, 'The earlier year comes first on a timeline.', `So the answer is ${cap(first.name)}.`] }, d);
}
const yr = (y) => (y < 0 ? `${Math.abs(y)} BC` : String(y));
function yearQ(grade, rng, d) {
  const band = bandFor(grade), pool = EVENTS.filter((e) => e.band === 'B' || band === 'C'), e = rng.pick(pool), others = pool.filter((x) => x !== e);
  const text = `When did this happen: ${e.name}?`;
  return done({ prompt: `${text}\n${e.pic}`, text, pics: [e.pic], answer: yr(e.year), skill: 'timeline', choices: choicesWith(yr(e.year), others.map((x) => yr(x.year)), () => yr(rng.pick(others).year), rng, 4),
    explain: [`${cap(e.name)} in ${yr(e.year)}.`, `So the answer is ${yr(e.year)}.`] }, d);
}
const historyWordQ = wordQ(HISTORY_WORDS, 'history-words', 'history');
const historyFactQ = factQ(HISTORY_FACTS, 'history-facts');

// ---- Picking by game, grade and difficulty ---------------------------------------------------------------------

const KINDS = {
  'his-compass': { E: [arrowQ, clueQ], A: [arrowQ, clueQ, letterQ, mapQ], B: [mapQ, turnQ, betweenQ, mapWordQ], C: [turnQ, betweenQ, degreesQ, mapWordQ] },
  'his-helpers': { E: [whoHelpsQ, placeQ], A: [whoHelpsQ, placeQ, toolQ], B: [toolQ, whatDoesQ, communityQ], C: [whatDoesQ, communityQ] },
  'his-flags': { E: [whichFlagQ, whoseFlagQ], A: [whichFlagQ, whoseFlagQ, continentQ], B: [whoseFlagQ, continentQ, capitalQ, worldQ], C: [capitalQ, continentQ, worldQ] },
  'his-time': { E: [thenNowQ], A: [thenNowQ, firstQ], B: [firstQ, historyWordQ, historyFactQ, yearQ], C: [yearQ, historyWordQ, historyFactQ] }
};

/**
 * One question for a game at a grade; d (0..1) is how hard, reaching the later kinds of its band.
 * opts.drawn === false leaves out the kinds that need drawn flags (for duels and bosses, which show plain text).
 */
export function historyQuestion(gameId, grade, rng, d = 0.5, opts = {}) {
  const g = gradeOf(grade);
  let kinds = (KINDS[gameId] || KINDS['his-compass'])[bandFor(g)];
  if (opts.drawn === false) kinds = kinds.filter((k) => !k.drawn);
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  const kind = kinds[rng.int(0, reach - 1)];
  return kind(g, rng, d, opts);
}

/** n questions with no repeated prompts, each as hard as `targets[i]` (easiest first when no targets are given). */
export function historySet(gameId, grade, rng, n = 10, targets = null, opts = {}) {
  const out = [], seen = new Set();
  let guard = 0, repeats = 0;
  while (out.length < n && guard++ < n * 12) {
    const want = targets ? targets[out.length] : out.length / Math.max(1, n - 1);
    const d = Math.min(1, (want ?? 0.5) + repeats * 0.12);
    const q = historyQuestion(gameId, grade, rng, d, opts);
    if (seen.has(q.prompt)) { repeats += 1; continue; }
    repeats = 0; seen.add(q.prompt); out.push(q);
  }
  return out;
}

/** The whole subject's mix (bosses and reviews): a random game's question. */
export const historyMix = (grade, rng, opts = {}) => historyQuestion(rng.pick(HISTORY_GAMES), grade, rng, rng.float(), opts);
