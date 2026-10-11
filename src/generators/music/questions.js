// Melody Market questions: Rhythm Repeat, Note Match, High & Low and Instrument Families, from Pre-K sounds to Grade 8
// vocabulary. Every question is { prompt, text, pics, choices, answer, skill, explain[], ask: true, difficulty } as the
// picture games expect; a question with a `sound` is played by the scene (a ▶ button) and marked `drawn`, so duels,
// bosses and New Skill pages (words only) take the kinds without one. Pure functions of (gameId, grade, rng).
import { bandFor, gradeOf } from '../../data/grades.js';
import {
  FAMILIES, familyOf, INSTRUMENTS, instrumentsIn, HOW_WORDS, GROUPS, CARIBBEAN_FACTS, PATTERNS, patternWords, BEAT_PICS,
  NOTE_VALUES, beatsWord, TEMPO_WORDS, NOTE_LETTERS, SOLFEGE, SCALE_NOTES, NOTE_WORDS, MUSIC_FACTS, HIGH_LOW, VOICES, PITCH_WORDS
} from '../../data/music/facts.js';

export const MUSIC_GAMES = ['mus-rhythm', 'mus-notes', 'mus-pitch', 'mus-instruments'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const choiceCount = (grade) => (grade <= -1 ? 3 : 4);
const done = (q, d) => ({ ask: true, difficulty: d, ...q });
const label = (x) => `${x.pic} ${x.name}`;
const SOUND_PIC = '🔊';

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
    const text = `In music, what does "${w.word}" mean?`;
    return done({ prompt: text, text, pics: [], answer: w.means, skill, choices: choicesWith(w.means, rng.sample(others, 5).map((x) => x.means), () => rng.pick(others).means, rng, 4), explain: [`"${cap(w.word)}" means ${w.means}.`, `A ${what} word worth keeping.`, `So the answer is "${w.means}".`] }, d);
  }
  const text = `Which music word means "${w.means}"?`;
  return done({ prompt: text, text, pics: [], answer: w.word, skill, choices: choicesWith(w.word, rng.sample(others, 5).map((x) => x.word), () => rng.pick(others).word, rng, 4), explain: [`${cap(w.means)}: that is "${w.word}".`, `So the answer is "${w.word}".`] }, d);
};
/** A question whose prompt is a sound: the scene shows a ▶ button and plays `sound`. */
const heard = (q, sound, d) => done({ ...q, prompt: `${q.text}\n${SOUND_PIC}`, pics: [SOUND_PIC], sound }, d);

// ---- Rhythm Repeat -------------------------------------------------------------------------------------------

function countBeatsQ(grade, rng, d) {
  const n = rng.int(2, grade <= -1 ? 3 : 4), beats = Array.from({ length: n }, () => 'tak');
  const text = 'How many drum beats do you hear?';
  return heard({ text, answer: String(n), skill: 'rhythm', choices: choicesWith(String(n), ['1', '2', '3', '4', '5'].filter((x) => x !== String(n)), () => String(rng.int(1, 5)), rng, choiceCount(grade)),
    explain: [`Count each tap: ${Array.from({ length: n }, (_, i) => i + 1).join(', ')}.`, `So the answer is ${n}.`] }, { kind: 'rhythm', beats, gap: 0.5 }, d);
}
countBeatsQ.drawn = true;
function patternQ(grade, rng, d) {
  const pool = PATTERNS.filter((p) => (grade <= -1 ? p.length === 3 && !p.includes('-') : grade <= 0 ? !p.includes('-') : true));
  const p = rng.pick(pool), others = PATTERNS.filter((x) => x !== p && x.length === p.length);
  const text = 'Listen. Which pattern did you hear?';
  const write = (b) => (grade <= 0 ? b.map((x) => BEAT_PICS[x]).join(' ') : patternWords(b));
  return heard({ text, answer: write(p), skill: 'rhythm', choices: choicesWith(write(p), others.map(write), () => write(rng.pick(others)), rng, choiceCount(grade)),
    explain: [`The pattern was ${patternWords(p)}: boom is the big drum, tak the small one.`, `So the answer is ${write(p)}.`] }, { kind: 'rhythm', beats: p, gap: 0.42 }, d);
}
patternQ.drawn = true;
function fastSlowQ(grade, rng, d) {
  const fast = rng.chance(0.5);
  const text = 'Was that rhythm fast or slow?';
  return heard({ text, answer: fast ? '🐇 fast' : '🐢 slow', skill: 'tempo', choices: rng.shuffle(['🐇 fast', '🐢 slow']),
    explain: [fast ? 'The beats came quickly, one right after another: fast.' : 'The beats came with a long wait between them: slow.', `So the answer is ${fast ? 'fast' : 'slow'}.`] }, { kind: 'rhythm', beats: ['tak', 'tak', 'tak', 'tak'], gap: fast ? 0.2 : 0.75 }, d);
}
fastSlowQ.drawn = true;
function whichIsHitQ(grade, rng, d) {
  const hit = rng.pick(INSTRUMENTS.filter((i) => i.how === 'hit')), others = INSTRUMENTS.filter((i) => i.family !== 'percussion');
  const text = 'Which of these do you HIT to play?';
  return done({ prompt: text, text, pics: [], answer: label(hit), skill: 'rhythm', choices: choicesWith(label(hit), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [`You hit a ${hit.name}: it is a percussion instrument.`, `So the answer is ${label(hit)}.`] }, d);
}
function noteValueQ(grade, rng, d) {
  const v = rng.pick(NOTE_VALUES), others = NOTE_VALUES.filter((x) => x !== v);
  if (rng.chance(0.5)) {
    const text = `How long does a ${v.name} ${v.sign} last?`;
    return done({ prompt: text, text, pics: [], answer: beatsWord(v.beats), skill: 'note-values', choices: rng.shuffle(NOTE_VALUES.map((x) => beatsWord(x.beats))),
      explain: [`A ${v.name} (${v.also}) lasts ${beatsWord(v.beats)}.`, 'Crotchet 1, minim 2, semibreve 4, quaver half.', `So the answer is ${beatsWord(v.beats)}.`] }, d);
  }
  const text = `Which note lasts ${beatsWord(v.beats)}?`;
  return done({ prompt: text, text, pics: [], answer: `${v.sign} ${v.name}`, skill: 'note-values', choices: rng.shuffle(NOTE_VALUES.map((x) => `${x.sign} ${x.name}`)),
    explain: [`${beatsWord(v.beats)}: that is a ${v.name} (${v.also}).`, `So the answer is ${v.sign} ${v.name}.`] }, d);
}
void 0;
function barQ(grade, rng, d) {
  const top = rng.pick([2, 3, 4]);
  const text = `In ${top}/4 time, how many beats are in each bar?`;
  return done({ prompt: text, text, pics: [], answer: String(top), skill: 'note-values', choices: rng.shuffle(['2', '3', '4', '6']),
    explain: ['The top number of the time signature counts the beats in a bar.', `${top}/4 means ${top} crotchet beats in every bar.`, `So the answer is ${top}.`] }, d);
}
const tempoWordQ = wordQ(TEMPO_WORDS, 'tempo', 'rhythm');

// ---- Note Match ---------------------------------------------------------------------------------------------

function countNotesHeardQ(grade, rng, d) {
  const n = rng.int(2, grade <= -1 ? 3 : 4), notes = rng.sample(SCALE_NOTES, n);
  const text = 'How many notes did you hear?';
  return heard({ text, answer: String(n), skill: 'note-names', choices: choicesWith(String(n), ['1', '2', '3', '4', '5'].filter((x) => x !== String(n)), () => String(rng.int(1, 5)), rng, choiceCount(grade)),
    explain: [`Count each note as it sounds: ${n} notes.`, `So the answer is ${n}.`] }, { kind: 'notes', notes, gap: 0.55 }, d);
}
countNotesHeardQ.drawn = true;
function countNotesPicQ(grade, rng, d) {
  const n = rng.int(2, grade <= -1 ? 4 : 6), pic = '♪'.repeat(n);
  const text = 'How many notes are there?';
  return done({ prompt: `${text}\n${pic}`, text, pics: [pic], answer: String(n), skill: 'note-names', choices: choicesWith(String(n), ['1', '2', '3', '4', '5', '6', '7'].filter((x) => x !== String(n)), () => String(rng.int(1, 7)), rng, choiceCount(grade)),
    explain: [`Count the notes one by one: ${n}.`, `So the answer is ${n}.`] }, d);
}
function sameDifferentQ(grade, rng, d) {
  const same = rng.chance(0.5), a = rng.pick(SCALE_NOTES), b = same ? a : rng.pick(SCALE_NOTES.filter((x) => x !== a));
  const text = 'Two notes. Were they the same or different?';
  return heard({ text, answer: same ? 'the same' : 'different', skill: 'pitch', choices: rng.shuffle(['the same', 'different']),
    explain: [same ? 'Both notes had the same pitch: the same note twice.' : 'The second note had a different pitch from the first.', `So the answer is ${same ? 'the same' : 'different'}.`] }, { kind: 'notes', notes: [a, b], gap: 0.7 }, d);
}
sameDifferentQ.drawn = true;
function longShortQ(grade, rng, d) {
  const long = rng.chance(0.5);
  const text = 'Was that note long or short?';
  return heard({ text, answer: long ? '〰️ long' : '▪️ short', skill: 'note-values', choices: rng.shuffle(['〰️ long', '▪️ short']),
    explain: [long ? 'The note kept sounding for a long time: a long note.' : 'The note stopped almost at once: a short note.', `So the answer is ${long ? 'long' : 'short'}.`] }, { kind: 'notes', notes: ['G4'], gap: 1.6, dur: long ? 1.5 : 0.12 }, d);
}
longShortQ.drawn = true;
function noteNameQ(grade, rng, d) {
  const i = rng.int(0, NOTE_LETTERS.length - 1), letter = NOTE_LETTERS[i], next = NOTE_LETTERS[(i + 1) % 7];
  const text = `In the music alphabet, which letter comes after ${letter}?`;
  return done({ prompt: text, text, pics: [], answer: next, skill: 'note-names', choices: choicesWith(next, NOTE_LETTERS.filter((x) => x !== next), () => rng.pick(NOTE_LETTERS), rng, 4),
    explain: ['The music alphabet is A B C D E F G, then back to A.', `After ${letter} comes ${next}.`, `So the answer is ${next}.`] }, d);
}
function solfegeQ(grade, rng, d) {
  const i = rng.int(0, SOLFEGE.length - 2), s = SOLFEGE[i], next = SOLFEGE[i + 1];
  const text = `Do re mi fa so la ti: which comes after "${s}"?`;
  return done({ prompt: text, text, pics: [], answer: next, skill: 'reading-music', choices: choicesWith(next, SOLFEGE.filter((x) => x !== next), () => rng.pick(SOLFEGE), rng, 4),
    explain: ['Do re mi fa so la ti do: the notes of the scale by their singing names.', `After ${s} comes ${next}.`, `So the answer is ${next}.`] }, d);
}
const noteWordQ = wordQ(NOTE_WORDS, 'music-words', 'music');
const musicFactQ = factQ(MUSIC_FACTS, 'music-facts');

// ---- High & Low -------------------------------------------------------------------------------------------

function highOrLowQ(grade, rng, d) {
  const h = rng.pick(HIGH_LOW);
  const text = 'Was that sound high or low?';
  return heard({ text, answer: h.pitch === 'high' ? '⬆️ high' : '⬇️ low', skill: 'high-low', choices: rng.shuffle(['⬆️ high', '⬇️ low']),
    explain: [h.pitch === 'high' ? 'A thin, squeaky sound is high.' : 'A deep, rumbly sound is low.', `So the answer is ${h.pitch}.`] }, { kind: 'notes', notes: [h.note], gap: 0.9, dur: 0.8 }, d);
}
highOrLowQ.drawn = true;
function highLowAnimalQ(grade, rng, d) {
  const want = rng.pick(['high', 'low']), pick = rng.pick(HIGH_LOW.filter((x) => x.pitch === want)), others = HIGH_LOW.filter((x) => x.pitch !== want);
  const text = `Which one makes a ${want.toUpperCase()} sound?`;
  return done({ prompt: text, text, pics: [], answer: label(pick), skill: 'high-low', choices: choicesWith(label(pick), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [`A ${pick.name} makes a ${want} sound.`, want === 'high' ? 'Small things usually make high sounds.' : 'Big things usually make low sounds.', `So the answer is ${label(pick)}.`] }, d);
}
function whichHigherQ(grade, rng, d) {
  const i = rng.int(0, SCALE_NOTES.length - 1), j = rng.pick([...SCALE_NOTES.keys()].filter((k) => Math.abs(k - i) >= 2));
  const first = SCALE_NOTES[i], second = SCALE_NOTES[j], higher = j > i ? 'the second' : 'the first';
  const text = 'Two notes. Which one was higher?';
  return heard({ text, answer: higher, skill: 'pitch', choices: ['the first', 'the second'],
    explain: [`The ${j > i ? 'second' : 'first'} note was higher: it sounded thinner and brighter.`, `So the answer is ${higher}.`] }, { kind: 'notes', notes: [first, second], gap: 0.7 }, d);
}
whichHigherQ.drawn = true;
function upOrDownQ(grade, rng, d) {
  const up = rng.chance(0.5), start = rng.int(0, SCALE_NOTES.length - 4);
  const run = SCALE_NOTES.slice(start, start + 4);
  const text = 'Did the notes go up or down?';
  return heard({ text, answer: up ? '⬆️ up' : '⬇️ down', skill: 'pitch', choices: rng.shuffle(['⬆️ up', '⬇️ down']),
    explain: [up ? 'Each note was higher than the one before: the tune went up.' : 'Each note was lower than the one before: the tune went down.', `So the answer is ${up ? 'up' : 'down'}.`] }, { kind: 'notes', notes: up ? run : [...run].reverse(), gap: 0.4 }, d);
}
upOrDownQ.drawn = true;
function voiceQ(grade, rng, d) {
  const band = bandFor(grade), pool = VOICES.filter((v) => v.band === band || band === 'C'), v = rng.pick(pool.length ? pool : VOICES);
  const text = `Which singing voice is ${v.means}?`;
  return done({ prompt: text, text, pics: [], answer: v.name, skill: 'voices', choices: rng.shuffle(VOICES.map((x) => x.name)),
    explain: ['From high to low: soprano, alto, tenor, bass.', `${cap(v.means)}: that is ${v.name}.`, `So the answer is ${v.name}.`] }, d);
}
const pitchWordQ = wordQ(PITCH_WORDS, 'pitch', 'pitch');

// ---- Instrument Families --------------------------------------------------------------------------------------

function howPlayedQ(grade, rng, d) {
  const i = rng.pick(INSTRUMENTS), hows = Object.keys(HOW_WORDS).filter((h) => h !== i.how);
  const text = `How do you play a ${i.name}?`;
  return done({ prompt: `${text}\n${i.pic}`, text, pics: [i.pic], answer: HOW_WORDS[i.how], skill: 'instruments', choices: choicesWith(HOW_WORDS[i.how], hows.map((h) => HOW_WORDS[h]), () => HOW_WORDS[rng.pick(hows)], rng, choiceCount(grade)),
    explain: [i.fact, `To play a ${i.name} you ${HOW_WORDS[i.how]}.`, `So the answer is: ${HOW_WORDS[i.how]}.`] }, d);
}
function familyPicQ(grade, rng, d) {
  const f = rng.pick(FAMILIES), pick = rng.pick(instrumentsIn(f.id)), others = INSTRUMENTS.filter((i) => i.family !== f.id);
  const text = f.id === 'percussion' ? 'Which one is a drum or a shaker?' : f.id === 'strings' ? 'Which one has strings?' : f.id === 'wind' ? 'Which one do you blow?' : 'Which one has keys to press?';
  return done({ prompt: text, text, pics: [], answer: label(pick), skill: 'instrument-families', choices: choicesWith(label(pick), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, choiceCount(grade)),
    explain: [f.tells, `The ${pick.name} is a ${f.name} instrument.`, `So the answer is ${label(pick)}.`] }, d);
}
function familyQ(grade, rng, d) {
  const i = rng.pick(INSTRUMENTS), f = familyOf(i.family);
  const text = `Which family is the ${i.name} in?`;
  return done({ prompt: `${text}\n${i.pic}`, text, pics: [i.pic], answer: `${f.pic} ${f.name}`, skill: 'instrument-families', choices: rng.shuffle(FAMILIES.map((x) => `${x.pic} ${x.name}`)),
    explain: [f.tells, `A ${i.name} is ${f.how}: ${f.name}.`, `So the answer is ${f.pic} ${f.name}.`] }, d);
}
function orchestraQ(grade, rng, d) {
  const i = rng.pick(INSTRUMENTS.filter((x) => x.family !== 'keys'));
  const text = `In an orchestra, the ${i.name} belongs to the…`;
  return done({ prompt: `${text}\n${i.pic}`, text, pics: [i.pic], answer: `${i.group} family`, skill: 'instrument-families', choices: rng.shuffle(GROUPS.filter((g) => g !== 'keyboard').map((g) => `${g} family`)),
    explain: ['An orchestra has four families: strings, woodwind, brass and percussion.', i.fact, `So the answer is the ${i.group} family.`] }, d);
}
function instrumentFactQ(grade, rng, d) {
  const i = rng.pick(INSTRUMENTS), others = INSTRUMENTS.filter((x) => x !== i && x.fact !== i.fact);
  const text = `Which instrument is this? ${i.fact}`;
  return done({ prompt: text, text, pics: [], answer: label(i), skill: 'instruments', choices: choicesWith(label(i), rng.sample(others, 5).map(label), () => label(rng.pick(others)), rng, 4),
    explain: [i.fact, `So the answer is ${label(i)}.`] }, d);
}
const caribbeanQ = factQ(CARIBBEAN_FACTS, 'caribbean-music');

// ---- Picking by game, grade and difficulty ---------------------------------------------------------------------

const KINDS = {
  'mus-rhythm': { E: [countBeatsQ, patternQ, whichIsHitQ], A: [patternQ, fastSlowQ, countBeatsQ, whichIsHitQ], B: [patternQ, noteValueQ, barQ, tempoWordQ], C: [noteValueQ, barQ, tempoWordQ, musicFactQ] },
  'mus-notes': { E: [countNotesHeardQ, countNotesPicQ, longShortQ], A: [countNotesHeardQ, sameDifferentQ, longShortQ, countNotesPicQ], B: [noteNameQ, solfegeQ, sameDifferentQ, noteWordQ], C: [noteNameQ, noteWordQ, musicFactQ] },
  'mus-pitch': { E: [highOrLowQ, highLowAnimalQ], A: [highOrLowQ, whichHigherQ, upOrDownQ, highLowAnimalQ], B: [whichHigherQ, upOrDownQ, voiceQ, pitchWordQ], C: [voiceQ, pitchWordQ, musicFactQ] },
  'mus-instruments': { E: [howPlayedQ, familyPicQ], A: [howPlayedQ, familyPicQ, familyQ], B: [familyQ, orchestraQ, caribbeanQ, instrumentFactQ], C: [orchestraQ, caribbeanQ, instrumentFactQ] }
};

/**
 * One question for a game at a grade; d (0..1) is how hard, reaching the later kinds of its band.
 * opts.drawn === false leaves out the kinds that need the scene (a sound to play): duels, bosses and New Skill pages.
 */
export function musicQuestion(gameId, grade, rng, d = 0.5, opts = {}) {
  const g = gradeOf(grade), all = KINDS[gameId] || KINDS['mus-rhythm'];
  let kinds = all[bandFor(g)];
  // Words only: this band's kinds without a sound, then the later bands' (so there is always enough to ask).
  if (opts.drawn === false) {
    const order = ['E', 'A', 'B', 'C'], from = order.indexOf(bandFor(g));
    kinds = [...new Set([...order.slice(from), ...order.slice(0, from)].flatMap((b) => all[b]))].filter((k) => !k.drawn);
  }
  const reach = Math.max(1, Math.round(1 + d * (kinds.length - 1)));
  return kinds[rng.int(0, reach - 1)](g, rng, d, opts);
}

/** n questions with no repeated prompts, each as hard as `targets[i]` (easiest first when no targets are given). */
export function musicSet(gameId, grade, rng, n = 10, targets = null, opts = {}) {
  const out = [], seen = new Set();
  let guard = 0, repeats = 0;
  while (out.length < n && guard++ < n * 14) {
    const want = targets ? targets[out.length] : out.length / Math.max(1, n - 1);
    const d = Math.min(1, (want ?? 0.5) + repeats * 0.12);
    const q = musicQuestion(gameId, grade, rng, d, opts);
    // Many questions repeat their words ("Which of these do you hit?", "Was that high or low?"): what is asked
    // about, the sound or the answer, is what tells them apart.
    const key = `${q.prompt}|${q.sound ? JSON.stringify(q.sound) : ''}|${q.answer}`;
    if (seen.has(key)) { repeats += 1; continue; }
    repeats = 0; seen.add(key); out.push(q);
  }
  return out;
}

/** The whole subject's mix (bosses and reviews): a random game's question. */
export const musicMix = (grade, rng, opts = {}) => musicQuestion(rng.pick(MUSIC_GAMES), grade, rng, rng.float(), opts);
