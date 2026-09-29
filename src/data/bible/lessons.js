// The Village Church's lessons: one module per Bible skill the games use (people, stories, places, books, verses),
// each split into short blocks of 3-4 facts. A block is learned with flip cards, then practised with a few questions
// built the same way as the games' questions, so what is learned in church is exactly what the games ask.
// Everything here is pure data derived from the banks in bank.js, per grade band.
import { QUIZ, VERSES, PAIRS, ORDER } from './bank.js';
import { quizQuestion, verseQuestion, whoQuestion } from '../../generators/bible/quiz.js';

export const BLOCK_SIZE = 4;
export const MAX_BLOCKS = 5;

/** The modules, in the order of the church's stained-glass windows. `games` are the Bible games each one feeds. */
export const MODULES = [
  { id: 'people', skill: 'people', title: 'People of the Bible', icon: '👤', glass: 0x8b5cf6, games: ['bible-match', 'bible-quiz', 'bible-ark'],
    intro: 'Meet the men and women whose stories the Bible tells, and what each one did.' },
  { id: 'stories', skill: 'stories', title: 'Great Bible Stories', icon: '📜', glass: 0xff9f1c, games: ['bible-quiz', 'bible-ark'],
    intro: 'The big stories: what happened, who was there, and in what order.' },
  { id: 'places', skill: 'places', title: 'Bible Places', icon: '🗺️', glass: 0x2ec46a, games: ['bible-quiz', 'bible-ark'],
    intro: 'Where things happened: the towns, seas, rivers and mountains of the Bible.' },
  { id: 'books', skill: 'books', title: 'Books of the Bible', icon: '📖', glass: 0x3d8bff, games: ['bible-quiz', 'bible-ark'],
    intro: 'The Bible is a library of books. Learn their names and what is in them.' },
  { id: 'verses', skill: 'verses', title: 'Memory Verses', icon: '✨', glass: 0xff5c8a, games: ['bible-verse', 'bible-ark'],
    intro: 'Short verses to learn by heart. Fill in the missing word.' }
];
export const getModule = (id) => MODULES.find((m) => m.id === id) || null;

/** Where to borrow facts when a band has too few of its own (grades 2-3 have no books questions, for example). */
const NEIGHBOUR = { A: 'B', B: 'A', C: 'B' };

const quizItems = (band, skill) => QUIZ[band].filter((q) => q.k === skill).map((q) => ({ kind: 'quiz', ...q }));

/** Every fact a module teaches for a band, in teaching order. */
export function moduleItems(moduleId, band) {
  switch (moduleId) {
    case 'people': return PAIRS[band].map((p) => ({ kind: 'pair', ...p }));
    case 'verses': return VERSES[band].map((v) => ({ kind: 'verse', ...v }));
    case 'stories': {
      // Three story questions and one story to put in order per block, while both last.
      const quiz = quizItems(band, 'stories'), order = ORDER[band].map((o) => ({ kind: 'order', ...o }));
      const out = [];
      for (let i = 0; out.length < BLOCK_SIZE * MAX_BLOCKS && (i * 3 < quiz.length || i < order.length); i++) {
        out.push(...quiz.slice(i * 3, i * 3 + 3));
        if (order[i]) out.push(order[i]);
      }
      return out;
    }
    default: {
      const own = quizItems(band, moduleId);
      if (own.length >= BLOCK_SIZE) return own;
      const seen = new Set(own.map((q) => q.q));
      return [...own, ...quizItems(NEIGHBOUR[band], moduleId).filter((q) => !seen.has(q.q))];
    }
  }
}

/** The module's blocks for a band: runs of BLOCK_SIZE facts (a short last run joins the one before), at most MAX_BLOCKS. */
export function moduleBlocks(moduleId, band) {
  const items = moduleItems(moduleId, band).slice(0, BLOCK_SIZE * MAX_BLOCKS);
  const blocks = [];
  for (let i = 0; i < items.length; i += BLOCK_SIZE) blocks.push(items.slice(i, i + BLOCK_SIZE));
  if (blocks.length > 1 && blocks[blocks.length - 1].length < 3) blocks[blocks.length - 2].push(...blocks.pop());
  return blocks;
}

/** A short name for a block, from its facts ("Noah, Moses, David…"), for the block's stone. */
export function blockTopic(items) {
  // A bare number ("40") says nothing on its own, so such a fact is named by the start of its question.
  const quizName = (it) => (/^\d+$/.test(String(it.a)) ? `${it.q.split(' ').slice(0, 3).join(' ')}…` : it.a);
  const name = (it) => it.kind === 'pair' ? it.l : it.kind === 'order' ? it.title : it.kind === 'verse' ? it.ref : quizName(it);
  const names = items.slice(0, 3).map(name);
  return names.join(', ') + (items.length > 3 ? '…' : '');
}

/** The two faces of a flip card: what the child reads first, and what turning it over shows. */
export function cardFaces(it) {
  switch (it.kind) {
    case 'pair': return { front: it.l, back: `${it.l} ${it.r}.`, ref: null };
    case 'verse': return { front: `“${it.t}”`, back: `“${it.t.replace('___', it.a.toUpperCase())}”`, ref: it.ref, answer: it.a };
    case 'order': return { front: it.title, back: it.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), ref: it.ref };
    default: return { front: it.q, back: it.a, ref: it.ref };
  }
}

/**
 * The practice question for one fact, shaped like the games' questions ({ prompt, choices, answer, skill, ref }).
 * `pool` is the module's facts, for "Who ...?" distractors.
 */
export function practiceQuestion(it, pool, rng) {
  if (it.kind === 'verse') return verseQuestion(it, rng);
  if (it.kind === 'pair') {
    const others = rng.sample(pool.filter((p) => p.kind === 'pair' && p.l !== it.l), 3);
    return { ...whoQuestion(it, others, rng), skill: 'people' };
  }
  if (it.kind === 'order') return { prompt: `What happened first in the story of ${it.title}?`, choices: rng.shuffle([...it.steps]), answer: it.steps[0], skill: 'stories', ref: it.ref };
  return quizQuestion(it, rng);
}
