// Science Springs questions: Habitat Match, Plant Power, Sink or Float and States of Matter, from the picture
// questions of Kindergarten to the vocabulary of Grade 8. Every question is { prompt, text, pics, choices, answer,
// skill, explain[], ask: true, difficulty } as the picture games expect (see generators/math/early.js); choices
// carry a word with every picture so they can be read aloud. Pure functions of (gameId, grade, rng).
import { bandFor, gradeOf } from '../../data/grades.js';
import {
  HABITATS, ANIMALS, animalsIn, habitatOf, FOOD_CHAINS, DECOMPOSERS, ECOLOGY_WORDS, BIOME_FACTS,
  PLANT_NEEDS, NOT_PLANT_NEEDS, PLANT_PARTS, LIFE_CYCLE, SEED_TRAVEL, PLANT_FACTS,
  OBJECTS, FLOAT_FACTS, STATES, MATTER_ITEMS, CHANGES, MATTER_FACTS
} from '../../data/science/facts.js';

export const SCIENCE_GAMES = ['sci-habitat', 'sci-plants', 'sci-float', 'sci-matter'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const choiceCount = (grade) => (grade <= -1 ? 3 : 4);

/** n unique choices containing `answer`: candidates first (shuffled), then `fallback()`. */
function choicesWith(answer, candidates, fallback, rng, n) {
  const out = [String(answer)];
  const add = (v) => { const s = String(v); if (s && !out.includes(s)) out.push(s); };
  for (const c of rng.shuffle(candidates)) { if (out.length >= n) break; add(c); }
  let guard = 0;
  while (out.length < n && guard++ < 100) add(fallback());
  return rng.shuffle(out);
}
const label = (x) => `${x.pic} ${x.name}`;
const done = (q, d) => ({ ask: true, difficulty: d, ...q });

// ---- Habitat Match ---------------------------------------------------------------------------------------------

const otherHabitats = (h) => HABITATS.filter((x) => x.id !== h.id);

/** Where does the camel live? (pictures of homes) */
function whereQ(grade, rng, d) {
  const a = rng.pick(ANIMALS), h = habitatOf(a), n = choiceCount(grade);
  const text = `Where does the ${a.name} live?`;
  return done({
    prompt: `${text}\n${a.pic}`, text, pics: [a.pic], answer: label(h), skill: 'habitats',
    choices: choicesWith(label(h), otherHabitats(h).map(label), () => label(rng.pick(HABITATS)), rng, n),
    explain: [`A ${a.name} lives ${h.kids}.`, `${cap(h.name)} is ${h.desc}.`, `It has ${a.adapt}, which helps it live there.`, `So the answer is ${label(h)}.`]
  }, d);
}

/** Which animal lives in the ocean? (pictures of animals) */
function whoLivesQ(grade, rng, d) {
  const h = rng.pick(HABITATS), a = rng.pick(animalsIn(h.id)), n = choiceCount(grade);
  const others = ANIMALS.filter((x) => x.habitat !== h.id);
  const text = `Which animal lives in ${h.name}?`;
  return done({
    prompt: `${text}\n${h.pic}`, text, pics: [h.pic], answer: label(a), skill: 'habitats',
    choices: choicesWith(label(a), others.map(label), () => label(rng.pick(others)), rng, n),
    explain: [`${cap(h.name)} is ${h.desc}.`, `The ${a.name} lives there: it has ${a.adapt}.`, `So the answer is ${label(a)}.`]
  }, d);
}

/** Which animal has a hump that stores fat? */
function adaptQ(grade, rng, d) {
  const a = rng.pick(ANIMALS), n = choiceCount(grade);
  const others = ANIMALS.filter((x) => x.name !== a.name && x.adapt !== a.adapt);
  const text = `Which animal has ${a.adapt}?`;
  return done({
    prompt: text, text, pics: [], answer: label(a), skill: 'adaptations',
    choices: choicesWith(label(a), others.map(label), () => label(rng.pick(others)), rng, n),
    explain: [`An adaptation is a body part or habit that helps an animal live where it does.`, `The ${a.name} lives ${habitatOf(a).kids}, and ${a.adapt} helps it there.`, `So the answer is ${label(a)}.`]
  }, d);
}

const EATER = { plants: 'herbivore', meat: 'carnivore', both: 'omnivore' };
const EATER_DESC = { herbivore: 'eats only plants', carnivore: 'eats only other animals', omnivore: 'eats both plants and animals' };

/** Food chains: producer, next link, decomposer, kinds of eater. */
function chainQ(grade, rng, d) {
  const kind = rng.pick(['producer', 'next', 'decomposer', 'eater']);
  if (kind === 'eater') {
    const a = rng.pick(ANIMALS), ans = EATER[a.eats];
    const text = `A ${a.name} ${EATER_DESC[ans]}. What kind of eater is it?`;
    return done({ prompt: text, text, pics: [a.pic], answer: ans, skill: 'food-chains', choices: rng.shuffle(['herbivore', 'carnivore', 'omnivore']),
      explain: ['Herbivores eat plants, carnivores eat animals, omnivores eat both.', `A ${a.name} ${EATER_DESC[ans]}.`, `So it is a ${ans}.`] }, d);
  }
  const c = rng.pick(FOOD_CHAINS), chain = c.links.map((l) => `${l.pic} ${l.name}`).join(' → ');
  if (kind === 'producer') {
    const text = `In this food chain, which is the producer?\n${chain}`;
    const dec = rng.pick(DECOMPOSERS);
    return done({ prompt: text, text, pics: [], answer: label(c.links[0]), skill: 'food-chains', choices: rng.shuffle([...c.links.map(label), label(dec)]),
      explain: ['A producer makes its own food from sunlight, so every food chain starts with one.', `${cap(c.links[0].name)} is a plant, so it is the producer.`, `So the answer is ${label(c.links[0])}.`] }, d);
  }
  if (kind === 'decomposer') {
    const dec = rng.pick(DECOMPOSERS);
    const text = 'Which of these is a decomposer?';
    return done({ prompt: text, text, pics: [], answer: label(dec), skill: 'food-chains', choices: rng.shuffle([label(dec), ...c.links.map(label)]),
      explain: ['Decomposers break down dead plants and animals and return the goodness to the soil.', `${cap(dec.name)} do that job.`, `So the answer is ${label(dec)}.`] }, d);
  }
  const i = rng.int(0, c.links.length - 2), next = c.links[i + 1];
  const text = `What comes next in this food chain?\n${c.links.slice(0, i + 1).map(label).join(' → ')} → ?`;
  const others = ANIMALS.filter((x) => x.habitat !== c.where || !c.links.some((l) => l.name.includes(x.name)));
  return done({ prompt: text, text, pics: [], answer: label(next), skill: 'food-chains',
    choices: choicesWith(label(next), rng.sample(others, 6).map(label), () => label(rng.pick(others)), rng, 4),
    explain: ['Each arrow means "is eaten by".', `In ${c.where === 'garden' ? 'a garden' : 'the ' + c.where}, ${c.links[i].name} is eaten by the ${next.name}.`, `So the answer is ${label(next)}.`] }, d);
}

/** Vocabulary: meanings and words. */
function wordQ(grade, rng, d) {
  const w = rng.pick(ECOLOGY_WORDS), others = ECOLOGY_WORDS.filter((x) => x !== w);
  if (rng.chance(0.5)) {
    const text = `What does "${w.word}" mean?`;
    return done({ prompt: text, text, pics: [], answer: w.means, skill: 'ecology-words', choices: choicesWith(w.means, rng.sample(others, 5).map((x) => x.means), () => rng.pick(others).means, rng, 4),
      explain: [`"${cap(w.word)}" means ${w.means}.`, `For example: ${w.example}.`, `So the answer is "${w.means}".`] }, d);
  }
  const text = `Which word means "${w.means}"?`;
  return done({ prompt: text, text, pics: [], answer: w.word, skill: 'ecology-words', choices: choicesWith(w.word, rng.sample(others, 5).map((x) => x.word), () => rng.pick(others).word, rng, 4),
    explain: [`${cap(w.means)}: that is the meaning of "${w.word}".`, `For example: ${w.example}.`, `So the answer is "${w.word}".`] }, d);
}

/** Biomes (Grades 6-8). */
function biomeQ(grade, rng, d) {
  const b = rng.pick(BIOME_FACTS), others = BIOME_FACTS.filter((x) => x !== b);
  const text = `Which biome ${b.fact}?`;
  return done({ prompt: text, text, pics: [], answer: b.biome, skill: 'biomes', choices: choicesWith(b.biome, others.map((x) => x.biome), () => rng.pick(others).biome, rng, 4),
    explain: ['A biome is a huge area with its own climate and living things.', `The ${b.biome} ${b.fact}.`, `So the answer is the ${b.biome}.`] }, d);
}

// ---- Plant Power -----------------------------------------------------------------------------------------------

const NEED_ASKS = { sunlight: 'Which of these helps a plant make its food?', water: 'Which of these does a plant drink?', air: 'Which of these does a plant breathe in?', soil: "Where do a plant's roots grow?" };

function needQ(grade, rng, d) {
  const need = rng.pick(PLANT_NEEDS), n = choiceCount(grade);
  if (grade >= 2 && rng.chance(0.4)) {
    const text = `What does a plant use ${need.name} for?`;
    const others = PLANT_NEEDS.filter((x) => x !== need);
    return done({ prompt: text, text, pics: [need.pic], answer: need.why, skill: 'plant-needs', choices: choicesWith(need.why, others.map((x) => x.why), () => rng.pick(others).why, rng, 4),
      explain: [`Plants need sunlight, water, air and soil.`, `${cap(need.name)} is ${need.why}.`, `So the answer is "${need.why}".`] }, d);
  }
  const text = NEED_ASKS[need.name] || 'Which of these does a plant need to grow?';
  return done({ prompt: text, text, pics: [], answer: label(need), skill: 'plant-needs',
    choices: choicesWith(label(need), NOT_PLANT_NEEDS.map(label), () => label(rng.pick(NOT_PLANT_NEEDS)), rng, n),
    explain: ['Plants need sunlight, water, air and soil to grow.', `${cap(need.name)} is ${need.why}.`, `So the answer is ${label(need)}.`] }, d);
}

function partQ(grade, rng, d) {
  const p = rng.pick(PLANT_PARTS), n = choiceCount(grade), others = PLANT_PARTS.filter((x) => x !== p);
  if (grade <= 1 || rng.chance(0.4)) {
    const text = `Which part of the plant is this?`;
    return done({ prompt: `${text}\n${p.pic}`, text, pics: [p.pic], answer: label(p), skill: 'plant-parts', choices: choicesWith(label(p), others.map(label), () => label(rng.pick(others)), rng, n),
      explain: [`The ${p.name}: it ${p.job}.`, `So the answer is ${label(p)}.`] }, d);
  }
  const text = `Which part of a plant ${p.job.replace(/^(takes|carries|makes|protects|grows)/, (m) => m)}?`;
  return done({ prompt: text, text, pics: [], answer: label(p), skill: 'plant-parts', choices: choicesWith(label(p), others.map(label), () => label(rng.pick(others)), rng, n),
    explain: ['Every part of a plant has a job.', `The ${p.name} ${p.job}.`, `So the answer is ${label(p)}.`] }, d);
}

function cycleQ(grade, rng, d) {
  const n = choiceCount(grade);
  const i = rng.int(0, LIFE_CYCLE.length - 2), now = LIFE_CYCLE[i], next = LIFE_CYCLE[i + 1];
  const others = LIFE_CYCLE.filter((x) => x !== next);
  const text = rng.chance(0.5) ? `What comes after the ${now.name}?` : `A plant's life: ${LIFE_CYCLE.slice(0, i + 1).map((s) => s.pic).join(' → ')} → ?`;
  return done({ prompt: text.includes('\n') ? text : `${text}`, text, pics: [now.pic], answer: label(next), skill: 'life-cycle', choices: choicesWith(label(next), others.map(label), () => label(rng.pick(others)), rng, n),
    explain: [now.tells, next.tells, `So after the ${now.name} comes the ${next.name}.`] }, d);
}

function seedQ(grade, rng, d) {
  const s = rng.pick(SEED_TRAVEL), others = SEED_TRAVEL.filter((x) => x !== s);
  const text = `How do ${s.plant} seeds travel to new places?`;
  return done({ prompt: `${text}\n${s.plantPic}`, text, pics: [s.plantPic], answer: `${s.pic} by ${s.how}`, skill: 'seed-travel',
    choices: choicesWith(`${s.pic} by ${s.how}`, others.map((x) => `${x.pic} by ${x.how}`), () => { const x = rng.pick(others); return `${x.pic} by ${x.how}`; }, rng, 4),
    explain: ['Seeds travel so new plants do not grow in the shade of their parent.', `The ${s.plant} spreads its seeds by ${s.how}, because ${s.because}.`, `So the answer is by ${s.how}.`] }, d);
}

const factQ = (facts, skill) => (grade, rng, d) => {
  const band = bandFor(grade);
  const pool = facts.filter((f) => f.band === band || (band === 'C' && rng.chance(0.4)) || (band === 'B' && f.band === 'B'));
  const f = rng.pick(pool.length ? pool : facts);
  return done({ prompt: f.q, text: f.q, pics: [], answer: f.a, skill, choices: rng.shuffle([f.a, ...f.pool.slice(0, 3)]), explain: [f.explain, `So the answer is: ${f.a}.`] }, d);
};
const plantFactQ = factQ(PLANT_FACTS, 'plant-science');

// ---- Sink or Float ---------------------------------------------------------------------------------------------

const SINK = '⬇️ sink', FLOAT = '🛟 float';
const verb = (o) => (o.floats ? 'floats' : 'sinks');

function sinkFloatQ(grade, rng, d) {
  const o = rng.pick(OBJECTS);
  const text = `Will the ${o.name} sink or float?`;
  return done({ prompt: `${text}\n${o.pic}`, text, pics: [o.pic], answer: o.floats ? FLOAT : SINK, skill: 'sink-float', choices: rng.shuffle([SINK, FLOAT]),
    explain: ['Things that are light for their size float. Things that are heavy for their size sink.', `A ${o.name} ${verb(o)} because ${o.why}.`, `So it ${verb(o)}.`] }, d);
}

function whichFloatsQ(grade, rng, d) {
  const floats = rng.chance(0.5), n = choiceCount(grade);
  const yes = OBJECTS.filter((o) => o.floats === floats), no = OBJECTS.filter((o) => o.floats !== floats);
  const a = rng.pick(yes);
  const text = `Which of these ${floats ? 'floats' : 'sinks'}?`;
  return done({ prompt: text, text, pics: [], answer: label(a), skill: 'sink-float', choices: choicesWith(label(a), no.map(label), () => label(rng.pick(no)), rng, n),
    explain: [`A ${a.name} ${verb(a)} because ${a.why}.`, `The others ${floats ? 'sink: they are heavy for their size' : 'float: they are light for their size'}.`, `So the answer is ${label(a)}.`] }, d);
}

function whyFloatQ(grade, rng, d) {
  const o = rng.pick(OBJECTS), others = OBJECTS.filter((x) => x.floats !== o.floats);
  const text = `Why does a ${o.name} ${o.floats ? 'float' : 'sink'}?`;
  return done({ prompt: `${text}\n${o.pic}`, text, pics: [o.pic], answer: o.why, skill: 'density', choices: choicesWith(o.why, rng.sample(others, 5).map((x) => x.why), () => rng.pick(others).why, rng, 4),
    explain: ['Whether something floats depends on how heavy it is for its size (its density), not just how heavy it is.', `A ${o.name} ${verb(o)} because ${o.why}.`, `So the answer is: ${o.why}.`] }, d);
}
const floatFactQ = factQ(FLOAT_FACTS, 'density');

// ---- States of Matter -------------------------------------------------------------------------------------------

const stateOf = (id) => STATES.find((s) => s.id === id);

function stateQ(grade, rng, d) {
  const item = rng.pick(MATTER_ITEMS), st = stateOf(item.state);
  const text = `Is ${item.name} a solid, a liquid or a gas?`;
  return done({ prompt: `${text}\n${item.pic}`, text, pics: [item.pic], answer: label(st), skill: 'states', choices: rng.shuffle(STATES.map(label)),
    explain: [`A ${st.name} ${st.keeps}.`, `${cap(item.name)} ${st.keeps}, so it is a ${st.name}.`, `So the answer is ${label(st)}.`] }, d);
}

function whichStateQ(grade, rng, d) {
  const st = rng.pick(STATES), n = choiceCount(grade);
  const yes = MATTER_ITEMS.filter((i) => i.state === st.id), no = MATTER_ITEMS.filter((i) => i.state !== st.id);
  const a = rng.pick(yes);
  const text = `Which of these is a ${st.name}?`;
  return done({ prompt: text, text, pics: [], answer: label(a), skill: 'states', choices: choicesWith(label(a), no.map(label), () => label(rng.pick(no)), rng, n),
    explain: [`A ${st.name} ${st.keeps}.`, `${cap(a.name)} does that, so it is a ${st.name}.`, `So the answer is ${label(a)}.`] }, d);
}

function propertyQ(grade, rng, d) {
  const st = rng.pick(STATES), particles = grade >= 4 && rng.chance(0.5);
  const text = particles ? `In which state are the particles ${st.particles}?` : `Which state of matter ${st.keeps}?`;
  return done({ prompt: text, text, pics: [], answer: label(st), skill: 'states', choices: rng.shuffle(STATES.map(label)),
    explain: particles ? [`In a solid the particles are ${stateOf('solid').particles}; in a liquid ${stateOf('liquid').particles}; in a gas ${stateOf('gas').particles}.`, `So the answer is ${label(st)}.`]
      : [`A solid ${stateOf('solid').keeps}; a liquid ${stateOf('liquid').keeps}; a gas ${stateOf('gas').keeps}.`, `So the answer is ${label(st)}.`] }, d);
}

function changeQ(grade, rng, d) {
  const c = rng.pick(CHANGES), others = CHANGES.filter((x) => x.name !== c.name), n = choiceCount(grade);
  const kind = grade <= 1 ? 'example' : rng.pick(['example', 'name', 'needs']);
  if (kind === 'needs') {
    const text = `What does ${c.name} need: heat or cold?`;
    return done({ prompt: `${text}\n${c.pic}`, text, pics: [], answer: c.needs === 'heat' ? '🔥 heat' : '❄️ cold', skill: 'changes-of-state', choices: rng.shuffle(['🔥 heat', '❄️ cold']),
      explain: [`${cap(c.name)} turns a ${c.from} into a ${c.to}.`, `That takes ${c.needs}: for example, ${c.example}.`, `So the answer is ${c.needs}.`] }, d);
  }
  if (kind === 'name') {
    const text = `A ${c.from} turning into a ${c.to} is called…`;
    return done({ prompt: `${text}\n${c.pic}`, text, pics: [], answer: c.name, skill: 'changes-of-state', choices: choicesWith(c.name, others.map((x) => x.name), () => rng.pick(others).name, rng, n),
      explain: [`${cap(c.name)}: a ${c.from} becomes a ${c.to}.`, `For example, ${c.example}.`, `So the answer is ${c.name}.`] }, d);
  }
  const text = `${cap(c.example)}. What is happening?`;
  return done({ prompt: `${text}\n${c.pic}`, text, pics: [], answer: c.name, skill: 'changes-of-state', choices: choicesWith(c.name, others.map((x) => x.name), () => rng.pick(others).name, rng, n),
    explain: [`A ${c.from} is turning into a ${c.to}.`, `That change is called ${c.name}, and it needs ${c.needs}.`, `So the answer is ${c.name}.`] }, d);
}
const matterFactQ = factQ(MATTER_FACTS, 'matter-facts');

// ---- Picking by game, grade and difficulty ---------------------------------------------------------------------

/** Kinds per band, gentlest first; difficulty 0..1 reaches further down the list. */
const KINDS = {
  'sci-habitat': { E: [whereQ, whoLivesQ], A: [whereQ, whoLivesQ, adaptQ], B: [whoLivesQ, adaptQ, chainQ, wordQ], C: [adaptQ, chainQ, wordQ, biomeQ] },
  'sci-plants': { E: [needQ, partQ], A: [needQ, partQ, cycleQ], B: [partQ, cycleQ, seedQ, plantFactQ], C: [cycleQ, seedQ, plantFactQ] },
  'sci-float': { E: [sinkFloatQ], A: [sinkFloatQ, whichFloatsQ], B: [whichFloatsQ, whyFloatQ, floatFactQ], C: [whyFloatQ, floatFactQ] },
  'sci-matter': { E: [stateQ, whichStateQ], A: [stateQ, whichStateQ, changeQ], B: [whichStateQ, propertyQ, changeQ, matterFactQ], C: [propertyQ, changeQ, matterFactQ] }
};

/** One question for a game at a grade; d (0..1) is how hard, reaching the later kinds of its band. */
export function scienceQuestion(gameId, grade, rng, d = 0.5) {
  const g = gradeOf(grade), kinds = (KINDS[gameId] || KINDS['sci-habitat'])[bandFor(g)];
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  const kind = kinds[rng.int(0, reach - 1)];
  return kind(g, rng, d);
}

/** n questions with no repeated prompts, each as hard as `targets[i]` (easiest first when no targets are given). */
export function scienceSet(gameId, grade, rng, n = 10, targets = null) {
  const out = [], seen = new Set();
  let guard = 0, repeats = 0;
  while (out.length < n && guard++ < n * 12) {
    const want = targets ? targets[out.length] : out.length / Math.max(1, n - 1);
    const d = Math.min(1, (want ?? 0.5) + repeats * 0.12);   // a kind that keeps repeating its prompt gives way to the next
    const q = scienceQuestion(gameId, grade, rng, d);
    if (seen.has(q.prompt)) { repeats += 1; continue; }
    repeats = 0; seen.add(q.prompt); out.push(q);
  }
  return out;
}

/** The whole subject's mix (bosses and reviews): a random game's question. */
export const scienceMix = (grade, rng) => scienceQuestion(rng.pick(SCIENCE_GAMES), grade, rng, rng.float());
