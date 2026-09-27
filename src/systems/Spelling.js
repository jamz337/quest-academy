// Spelling practice: which words a player has learned, how each practice round is shaped, and how a typed
// answer is marked. Progress lives on profile.spelling = { words: { [word]: { right, wrong, streak, heardRight } },
// lists: { [listId]: { best, plays } }, sessions }.
import { listWords, SPELLING_LISTS } from '../data/spelling/lists.js';
import { recordSkills } from './Practice.js';

export const LEARNED_STREAK = 3;        // right in a row (from hearing only) before a word counts as learned
export const SESSION_WORDS = 10;
export const COINS_PER_WORD = 2, COINS_ALL_RIGHT = 10, XP_PER_WORD = 5, XP_ALL_RIGHT = 20;
export const MODES = ['look', 'fill', 'listen'];   // show and hide it; fill the missing letters; spell it from hearing
export const COMBO_EVERY = 3, COMBO_COINS = 5;      // every third right answer in a row pays a bonus

export function ensureSpelling(profile) {
  const s = profile.spelling || (profile.spelling = {});
  s.words ||= {}; s.lists ||= {}; s.sessions |= 0; s.tests ||= [];
  // Words used to be keyed in lowercase; carry that progress over to the capitalised spelling.
  for (const l of Object.values(SPELLING_LISTS).flat()) for (const e of listWords(l)) {
    const lc = e.w.toLowerCase();
    if (lc !== e.w && s.words[lc] && !s.words[e.w]) { s.words[e.w] = s.words[lc]; delete s.words[lc]; }
  }
  return s;
}

export const wordStats = (profile, word) => profile?.spelling?.words?.[word] || { right: 0, wrong: 0, streak: 0, heardRight: 0 };
export const isLearned = (profile, word) => wordStats(profile, word).heardRight >= LEARNED_STREAK;

/** The mode a word should be practised in next: look while new, fill once seen, listen once it has been filled right. */
export function pickMode(stats) {
  if (stats.right + stats.wrong === 0) return 'look';
  if (stats.streak === 0) return stats.wrong > stats.right ? 'look' : 'fill';
  return stats.streak >= 2 ? 'listen' : 'fill';
}

/** Which letter positions to blank for a fill round: 1 to 3 depending on length, never the same letter twice. */
export function blankPositions(word, rnd) {
  const n = word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3;
  const cands = [...word].map((ch, i) => (/[a-zA-Z]/.test(ch) ? i : -1)).filter((i) => i >= 0);
  const out = [];
  let guard = 0;
  while (out.length < Math.min(n, cands.length) && guard++ < 50) {
    const i = cands[Math.floor(rnd() * cands.length)];
    if (!out.includes(i)) out.push(i);
  }
  return out.sort((a, b) => a - b);
}

/** Plan a session: unlearned and shaky words first, learned ones to keep them fresh, `n` rounds in all. */
export function planSession(profile, list, rnd, n = SESSION_WORDS) {
  const entries = listWords(list);
  const scored = entries.map((e) => ({ e, st: wordStats(profile, e.w) }));
  const order = [...scored].sort((a, b) => {
    const la = isLearned(profile, a.e.w) ? 1 : 0, lb = isLearned(profile, b.e.w) ? 1 : 0;
    if (la !== lb) return la - lb;
    return (a.st.wrong - a.st.right) > (b.st.wrong - b.st.right) ? -1 : 1;
  });
  const picked = order.slice(0, Math.min(n, order.length));
  // Shuffle so the same list does not always start with the same word.
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
  return picked.map(({ e, st }) => {
    const mode = pickMode(st);
    return { word: e.w, syllables: e.syl, sentence: e.s, pic: e.pic || null, mode, blanks: mode === 'fill' ? blankPositions(e.w, rnd) : [] };
  });
}

/**
 * Per-letter marks for what was typed against the word, case included: [{ ch, ok }] for the typed letters, plus
 * missing ones. A letter that is right apart from its case is marked { ok: false, wrongCase: true }, and the
 * result says `caseOnly` when that is the only thing wrong ("Caribbean" typed as "caribbean").
 */
export function markSpelling(typed, word) {
  const t = String(typed || ''), w = String(word);
  const marks = [];
  const n = Math.max(t.length, w.length);
  for (let i = 0; i < n; i++) {
    if (i < t.length) marks.push({ ch: t[i], ok: t[i] === w[i], extra: i >= w.length, wrongCase: i < w.length && t[i] !== w[i] && t[i].toLowerCase() === w[i].toLowerCase() });
    else marks.push({ ch: w[i], ok: false, missing: true });
  }
  return { right: t === w, caseOnly: t !== w && t.toLowerCase() === w.toLowerCase(), marks };
}

/** Fold one answer into the profile. Returns the word's new stats. */
export function recordSpelling(profile, word, right, mode) {
  const s = ensureSpelling(profile);
  const st = s.words[word] || { right: 0, wrong: 0, streak: 0, heardRight: 0 };
  if (right) { st.right += 1; st.streak += 1; if (mode === 'listen') st.heardRight += 1; }
  else { st.wrong += 1; st.streak = 0; st.heardRight = 0; }
  s.words[word] = st;
  recordSkills(profile, { seen: ['spelling'], missed: right ? [] : ['spelling'] });
  return st;
}

/** A word was studied on its flash card and copied correctly (the teaching stage). */
export function recordTaught(profile, word) {
  const s = ensureSpelling(profile);
  const st = s.words[word] || { right: 0, wrong: 0, streak: 0, heardRight: 0 };
  st.taught = (st.taught | 0) + 1;
  s.words[word] = st;
  return st;
}

/** Bonus coins for reaching `combo` right answers in a row (paid at every third), else 0. */
export const comboBonus = (combo) => (combo > 0 && combo % COMBO_EVERY === 0 ? COMBO_COINS : 0);

/** Every word the player has ever spelled right, across lists. */
export const totalRight = (profile) => Object.values(profile?.spelling?.words || {}).reduce((n, st) => n + (st.right | 0), 0);

/** Coins and XP for a finished session; `bonus` coins (combo runs) are added on top. */
export function sessionReward(correct, total, bonus = 0) {
  const all = total > 0 && correct === total;
  return { coins: correct * COINS_PER_WORD + (all ? COINS_ALL_RIGHT : 0) + (bonus | 0), bonus: bonus | 0, xp: correct * XP_PER_WORD + (all ? XP_ALL_RIGHT : 0), stars: total ? (correct / total >= 0.9 ? 3 : correct / total >= 0.7 ? 2 : correct / total >= 0.5 ? 1 : 0) : 0 };
}

/** Bank a session: rewards, list record, session count. Returns the reward. */
export function finishSession(profile, listId, correct, total, bonus = 0) {
  const s = ensureSpelling(profile);
  const r = sessionReward(correct, total, bonus);
  profile.coins = (profile.coins || 0) + r.coins;
  profile.xp = (profile.xp || 0) + r.xp;
  const rec = s.lists[listId] || { best: 0, plays: 0 };
  rec.plays += 1; rec.best = Math.max(rec.best, r.stars);
  s.lists[listId] = rec;
  s.sessions += 1;
  return r;
}

/** Bank a weekly test (listen-only, whole list): kept on profile.spelling.tests, newest last, at most 30. */
export function recordTest(profile, listId, correct, total, at = Date.now()) {
  const s = ensureSpelling(profile);
  s.tests ||= [];
  s.tests.push({ listId, correct, total, at });
  if (s.tests.length > 30) s.tests.splice(0, s.tests.length - 30);
  return s.tests[s.tests.length - 1];
}

/** { learned, total, tricky: [words missed more than spelled right] } for a list. */
export function listProgress(profile, list) {
  const words = listWords(list).map((e) => e.w);
  const learned = words.filter((w) => isLearned(profile, w)).length;
  const tricky = words.filter((w) => { const st = wordStats(profile, w); return st.wrong > 0 && st.wrong >= st.right; });
  const tests = (profile?.spelling?.tests || []).filter((t) => t.listId === list.id);
  const lastTest = tests.length ? tests[tests.length - 1] : null;
  return { learned, total: words.length, tricky, best: profile?.spelling?.lists?.[list.id]?.best || 0, lastTest };
}
