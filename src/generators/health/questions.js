// The Hospital's questions: Body Map, Plate Planner, Germ Zapper and Feel Good, from Pre-K body parts and foods to
// Grade 8 body systems, nutrients and first aid. Every question is { prompt, text, pics, choices, answer, skill,
// explain[], ask: true, difficulty } as the picture games expect. A plate question carries `plate` (food group ids
// the scene paints as a divided plate), so that kind is `drawn` and duels, bosses and New Skill pages take the others.
import { bandFor, gradeOf } from '../../data/grades.js';
import {
  BODY_PARTS, ORGANS, SYSTEMS, BODY_FACTS, FOOD_GROUPS, groupOf, FOODS, NUTRIENTS, PLATE_FACTS,
  HABITS, GERM_FACTS, HELPERS, FEELINGS, CALM_DOWNS, NOT_CALM, SLEEP_HOURS, ACTIVE, SAFETY
} from '../../data/health/facts.js';

export const HEALTH_GAMES = ['hea-body', 'hea-plate', 'hea-germs', 'hea-feel'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const choiceCount = (grade) => (grade <= -1 ? 3 : 4);
const done = (q, d) => ({ ask: true, difficulty: d, ...q });
const label = (x) => `${x.pic} ${x.name}`;

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
  const pool = facts.filter((f) => f.band === band || (band === 'C' && rng.chance(0.4)) || (band === 'B' && f.band === 'A' && rng.chance(0.3)));
  const f = rng.pick(pool.length ? pool : facts);
  return done({ prompt: f.q, text: f.q, pics: [], answer: f.a, skill, choices: rng.shuffle([f.a, ...f.pool.slice(0, grade <= -1 ? 2 : 3)]), explain: [f.explain, `So the answer is: ${f.a}.`] }, d);
};

// ---- Body Map ----------------------------------------------------------------------------------------------

function partDoesQ(grade, rng, d) {
  const p = rng.pick(BODY_PARTS), others = BODY_PARTS.filter((x) => x !== p && x.does !== p.does);
  if (rng.chance(0.5)) {
    const text = `Which part of the body do you ${p.does} with?`;
    return done({ prompt: text, text, pics: [], answer: label(p), skill: 'body-parts', choices: choicesWith(label(p), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
      explain: [`You ${p.does} with your ${p.name}.`, `So the answer is ${label(p)}.`] }, d);
  }
  const text = `What do you do with your ${p.name}?`;
  return done({ prompt: `${text}\n${p.pic}`, text, pics: [p.pic], answer: p.does, skill: 'body-parts', choices: choicesWith(p.does, rng.sample(others, 5).map((x) => x.does), () => rng.pick(others).does, rng, choiceCount(grade)),
    explain: [`Your ${p.name} ${p.does}.`, `So the answer is: ${p.does}.`] }, d);
}
function senseQ(grade, rng, d) {
  const parts = BODY_PARTS.filter((p) => p.sense), p = rng.pick(parts), others = parts.filter((x) => x !== p);
  const text = `Which sense do the ${p.name} give you?`;
  return done({ prompt: `${text}\n${p.pic}`, text, pics: [p.pic], answer: p.sense, skill: 'senses', choices: choicesWith(p.sense, others.map((x) => x.sense), () => rng.pick(others).sense, rng, choiceCount(grade)),
    explain: ['The five senses are sight, hearing, smell, taste and touch.', `The ${p.name} give you ${p.sense}.`, `So the answer is ${p.sense}.`] }, d);
}
function organQ(grade, rng, d) {
  const band = bandFor(grade), pool = ORGANS.filter((o) => o.band === 'A' || band === 'C' || (band === 'B' && o.band === 'B'));
  const o = rng.pick(pool), others = ORGANS.filter((x) => x !== o);
  if (rng.chance(0.5)) {
    const text = `Which organ ${o.does}?`;
    return done({ prompt: text, text, pics: [], answer: label(o), skill: 'organs', choices: choicesWith(label(o), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
      explain: [`The ${o.name} ${o.does}.`, `So the answer is ${label(o)}.`] }, d);
  }
  const text = `What does the ${o.name} do?`;
  return done({ prompt: `${text}\n${o.pic}`, text, pics: [o.pic], answer: o.does, skill: 'organs', choices: choicesWith(o.does, rng.sample(others, 5).map((x) => x.does), () => rng.pick(others).does, rng, choiceCount(grade)),
    explain: [`The ${o.name} ${o.does}.`, `So the answer is: ${o.does}.`] }, d);
}
function systemQ(grade, rng, d) {
  const s = rng.pick(SYSTEMS), others = SYSTEMS.filter((x) => x !== s);
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const text = `Which body system ${s.does}?`;
    return done({ prompt: text, text, pics: [], answer: s.name, skill: 'body-systems', choices: choicesWith(s.name, others.map((x) => x.name), () => rng.pick(others).name, rng, 4),
      explain: [`The ${s.name} ${s.does}: ${s.parts}.`, `So the answer is the ${s.name}.`] }, d);
  }
  if (kind === 1) {
    const text = `The ${s.name} is made of…`;
    return done({ prompt: text, text, pics: [], answer: s.parts, skill: 'body-systems', choices: choicesWith(s.parts, others.map((x) => x.parts), () => rng.pick(others).parts, rng, 4),
      explain: [`The ${s.name} is ${s.parts}, and it ${s.does}.`, `So the answer is: ${s.parts}.`] }, d);
  }
  const organs = ORGANS.filter((o) => o.system === s.id), o = rng.pick(organs), wrong = ORGANS.filter((x) => x.system !== s.id);
  const text = `Which organ belongs to the ${s.name}?`;
  return done({ prompt: text, text, pics: [], answer: label(o), skill: 'body-systems', choices: choicesWith(label(o), rng.sample(wrong, 5).map(label), () => label(rng.pick(wrong)), rng, 4),
    explain: [`The ${o.name} is part of the ${s.name}: it ${o.does}.`, `So the answer is ${label(o)}.`] }, d);
}
const bodyFactQ = factQ(BODY_FACTS, 'body-facts');

// ---- Plate Planner -----------------------------------------------------------------------------------------

function foodGroupQ(grade, rng, d) {
  const f = rng.pick(FOODS), g = groupOf(f.group), others = FOOD_GROUPS.filter((x) => x !== g);
  const text = `Which food group ${f.name === 'eggs' || f.name === 'beans' || f.name === 'peanuts' || f.name === 'sweets' || f.name === 'chips' ? 'are' : 'is'} ${f.name} in?`;
  return done({ prompt: `${text}\n${f.pic}`, text, pics: [f.pic], answer: label(g), skill: 'food-groups', choices: choicesWith(label(g), others.map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [`${cap(f.name)} ${f.name.endsWith('s') ? 'are' : 'is'} in the ${g.name} group, which gives ${g.gives}.`, `So the answer is ${label(g)}.`] }, d);
}
function whichFoodQ(grade, rng, d) {
  const g = rng.pick(FOOD_GROUPS), inGroup = FOODS.filter((f) => f.group === g.id), out = FOODS.filter((f) => f.group !== g.id);
  const f = rng.pick(inGroup);
  const text = `Which of these is ${g.id === 'treats' ? 'a sometimes food' : `in the ${g.name} group`}?`;
  return done({ prompt: text, text, pics: [], answer: label(f), skill: 'food-groups', choices: choicesWith(label(f), rng.sample(out, 6).map(label), () => label(rng.pick(out)), rng, choiceCount(grade)),
    explain: [`${cap(g.name)}: ${g.gives}.`, `${cap(f.name)} belongs there.`, `So the answer is ${label(f)}.`] }, d);
}
/** A plate drawn by the scene: which group is missing from it, or which plate is balanced. */
function plateQ(grade, rng, d) {
  const main = ['fruit', 'veg', 'grains', 'protein'], missing = rng.pick(main), plate = main.filter((g) => g !== missing);
  const g = groupOf(missing);
  const text = 'This plate is missing one food group. Which one?';
  return done({ prompt: `${text}\n${plate.map((id) => groupOf(id).pic).join(' ')}`, text, pics: [plate.map((id) => groupOf(id).pic).join(' ')], plate, answer: label(g), skill: 'balanced-plate',
    choices: choicesWith(label(g), FOOD_GROUPS.filter((x) => x !== g && x.id !== 'treats').map(label), () => label(rng.pick(FOOD_GROUPS)), rng, choiceCount(grade)),
    explain: ['A balanced plate has fruit, vegetables, grains and protein, with some dairy.', `This one has no ${g.name}.`, `So the answer is ${label(g)}.`] }, d);
}
plateQ.drawn = true;
function nutrientQ(grade, rng, d) {
  const band = bandFor(grade), pool = NUTRIENTS.filter((n) => n.band === band || band === 'C'), n = rng.pick(pool.length ? pool : NUTRIENTS), others = NUTRIENTS.filter((x) => x !== n);
  const kind = rng.int(0, 1);
  if (kind === 0) {
    const text = `Which nutrient ${n.does}?`;
    return done({ prompt: text, text, pics: [], answer: n.name, skill: 'nutrients', choices: choicesWith(n.name, others.map((x) => x.name), () => rng.pick(others).name, rng, 4),
      explain: [`${cap(n.name)} ${n.does}; you get it from ${n.from}.`, `So the answer is ${n.name}.`] }, d);
  }
  const text = `Where do you get ${n.name} from?`;
  return done({ prompt: text, text, pics: [], answer: n.from, skill: 'nutrients', choices: choicesWith(n.from, others.map((x) => x.from), () => rng.pick(others).from, rng, 4),
    explain: [`${cap(n.name)} comes from ${n.from}, and it ${n.does}.`, `So the answer is: ${n.from}.`] }, d);
}
const plateFactQ = factQ(PLATE_FACTS, 'healthy-eating');

// ---- Germ Zapper -------------------------------------------------------------------------------------------

function habitQ(grade, rng, d) {
  const good = HABITS.filter((h) => h.good), bad = HABITS.filter((h) => !h.good);
  const want = rng.chance(0.6), pick = rng.pick(want ? good : bad), others = want ? bad : good;
  const text = want ? 'Which of these keeps germs away?' : 'Which of these SPREADS germs?';
  const lbl = (h) => `${h.pic} ${h.do}`;
  return done({ prompt: text, text, pics: [], answer: lbl(pick), skill: 'hygiene', choices: choicesWith(lbl(pick), rng.sample(others, 5).map(lbl), () => lbl(rng.pick(others)), rng, choiceCount(grade)),
    explain: [want ? `${cap(pick.do)}: ${pick.when}.` : `${cap(pick.do)}? No: ${pick.why}.`, `So the answer is: ${pick.do}.`] }, d);
}
function whenQ(grade, rng, d) {
  const pool = HABITS.filter((h) => h.good), h = rng.pick(pool), others = pool.filter((x) => x !== h);
  const text = `When should you ${h.do}?`;
  return done({ prompt: `${text}\n${h.pic}`, text, pics: [h.pic], answer: h.when, skill: 'hygiene', choices: choicesWith(h.when, others.map((x) => x.when), () => rng.pick(others).when, rng, choiceCount(grade)),
    explain: [`${cap(h.do)} ${h.when}.`, `So the answer is: ${h.when}.`] }, d);
}
function helperQ(grade, rng, d) {
  const h = rng.pick(HELPERS), others = HELPERS.filter((x) => x !== h);
  if (rng.chance(0.5)) {
    const text = `Who ${h.does}?`;
    return done({ prompt: text, text, pics: [], answer: label(h), skill: 'health-helpers', choices: choicesWith(label(h), others.map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
      explain: [`A ${h.name} ${h.does}.`, `So the answer is ${label(h)}.`] }, d);
  }
  const text = `What does a ${h.name} do?`;
  return done({ prompt: `${text}\n${h.pic}`, text, pics: [h.pic], answer: h.does, skill: 'health-helpers', choices: choicesWith(h.does, others.map((x) => x.does), () => rng.pick(others).does, rng, choiceCount(grade)),
    explain: [`A ${h.name} ${h.does}.`, `So the answer is: ${h.does}.`] }, d);
}
const germFactQ = factQ(GERM_FACTS, 'germs-and-first-aid');

// ---- Feel Good ---------------------------------------------------------------------------------------------

function feelingQ(grade, rng, d) {
  const f = rng.pick(FEELINGS), others = FEELINGS.filter((x) => x !== f);
  if (rng.chance(0.5)) {
    const text = 'Which face shows this feeling: ' + f.name + '?';
    return done({ prompt: text, text, pics: [], answer: `${f.pic} ${f.name}`, skill: 'feelings', choices: choicesWith(`${f.pic} ${f.name}`, rng.sample(others, 5).map((x) => `${x.pic} ${x.name}`), () => { const o = rng.pick(others); return `${o.pic} ${o.name}`; }, rng, choiceCount(grade)),
      explain: [`${f.pic} is ${f.name}, like when ${f.when}.`, `So the answer is ${f.name}.`] }, d);
  }
  const text = `How might you feel when ${f.when}?`;
  return done({ prompt: text, text, pics: [], answer: `${f.pic} ${f.name}`, skill: 'feelings', choices: choicesWith(`${f.pic} ${f.name}`, rng.sample(others, 5).map((x) => `${x.pic} ${x.name}`), () => { const o = rng.pick(others); return `${o.pic} ${o.name}`; }, rng, choiceCount(grade)),
    explain: [`When ${f.when}, most people feel ${f.name}.`, 'Every feeling is allowed; what matters is what you do with it.', `So the answer is ${f.name}.`] }, d);
}
function calmQ(grade, rng, d) {
  const good = rng.pick(CALM_DOWNS);
  const text = 'You feel angry or worried. What is a good thing to do?';
  return done({ prompt: text, text, pics: [], answer: good, skill: 'feelings', choices: choicesWith(good, NOT_CALM, () => rng.pick(NOT_CALM), rng, choiceCount(grade)),
    explain: [`${cap(good)}: it helps the big feeling pass.`, 'Hitting, shouting or hiding a feeling only makes it bigger.', `So the answer is: ${good}.`] }, d);
}
function sleepQ(grade, rng, d) {
  const s = rng.pick(SLEEP_HOURS);
  const text = `How many hours of sleep does ${s.who} need each night?`;
  return done({ prompt: text, text, pics: [], answer: `${s.hours} hours`, skill: 'sleep-and-exercise', choices: rng.shuffle([`${s.hours} hours`, ...s.pool.slice(0, grade <= -1 ? 2 : 3).map((p) => `${p} hours`)]),
    explain: ['Younger bodies and brains grow while they sleep, so they need more of it.', `${cap(s.who)} needs ${s.hours} hours.`, `So the answer is ${s.hours} hours.`] }, d);
}
function activeQ(grade, rng, d) {
  const on = ACTIVE.filter((a) => a.active), off = ACTIVE.filter((a) => !a.active);
  const want = rng.chance(0.7), pick = rng.pick(want ? on : off), others = want ? off : on;
  const text = want ? 'Which of these gets your heart beating faster?' : 'Which of these is NOT exercise?';
  const lbl = (a) => `${a.pic} ${a.what}`;
  return done({ prompt: text, text, pics: [], answer: lbl(pick), skill: 'sleep-and-exercise', choices: choicesWith(lbl(pick), rng.sample(others, 5).map(lbl), () => lbl(rng.pick(others)), rng, choiceCount(grade)),
    explain: ['Exercise is anything that gets you moving and breathing harder: about an hour a day.', `${cap(pick.what)} ${want ? 'does' : 'does not'}.`, `So the answer is ${lbl(pick)}.`] }, d);
}
const safetyQ = factQ(SAFETY, 'safety');

// ---- Picking by game, grade and difficulty ---------------------------------------------------------------------

const KINDS = {
  'hea-body': { E: [partDoesQ, senseQ], A: [partDoesQ, senseQ, organQ], B: [organQ, bodyFactQ, systemQ], C: [systemQ, bodyFactQ] },
  'hea-plate': { E: [whichFoodQ, foodGroupQ], A: [foodGroupQ, whichFoodQ, plateQ, plateFactQ], B: [plateQ, plateFactQ, nutrientQ], C: [nutrientQ, plateFactQ] },
  'hea-germs': { E: [habitQ, helperQ], A: [habitQ, whenQ, helperQ, germFactQ], B: [germFactQ, whenQ, helperQ], C: [germFactQ] },
  'hea-feel': { E: [feelingQ, activeQ], A: [feelingQ, calmQ, activeQ, safetyQ], B: [safetyQ, sleepQ, calmQ], C: [safetyQ, sleepQ] }
};

/**
 * One question for a game at a grade; d (0..1) is how hard, reaching the later kinds of its band.
 * opts.drawn === false leaves out the kinds that need the scene (a painted plate): duels, bosses, New Skill pages.
 */
export function healthQuestion(gameId, grade, rng, d = 0.5, opts = {}) {
  const g = gradeOf(grade), all = KINDS[gameId] || KINDS['hea-body'];
  let kinds = all[bandFor(g)];
  if (opts.drawn === false) {
    const order = ['E', 'A', 'B', 'C'], from = order.indexOf(bandFor(g));
    kinds = [...new Set([...order.slice(from), ...order.slice(0, from)].flatMap((b) => all[b]))].filter((k) => !k.drawn);
  }
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  return kinds[rng.int(0, reach - 1)](g, rng, d, opts);
}

/** n questions with no repeats, each as hard as `targets[i]` (easiest first when no targets are given). */
export function healthSet(gameId, grade, rng, n = 10, targets = null, opts = {}) {
  const out = [], seen = new Set();
  let guard = 0, repeats = 0;
  while (out.length < n && guard++ < n * 14) {
    const want = targets ? targets[out.length] : out.length / Math.max(1, n - 1);
    const d = Math.min(1, (want ?? 0.5) + repeats * 0.12);
    const q = healthQuestion(gameId, grade, rng, d, opts);
    const key = `${q.prompt}|${q.answer}`;
    if (seen.has(key)) { repeats += 1; continue; }
    repeats = 0; seen.add(key); out.push(q);
  }
  return out;
}

/** The whole subject's mix (reviews): a random game's question. */
export const healthMix = (grade, rng, opts = {}) => healthQuestion(rng.pick(HEALTH_GAMES), grade, rng, rng.float(), opts);
