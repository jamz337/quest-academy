// Spelling practice: which words a player has learned, how each practice round is shaped, and how a typed
// answer is marked. Progress lives on profile.spelling = { words: { [word]: { right, wrong, streak, heardRight,
// taught?, miss?: { [letter index]: count }, box?, due? } }, lists: { [listId]: { best, plays } }, sessions, tests }.
// `box` and `due` are spaced review (a Leitner box): a word spelled right waits longer before it comes back, a miss
// brings it back today. `miss` remembers which letters the child got wrong, so the tricky part can be pointed at.
import { listWords, SPELLING_LISTS, spellingGradeFor } from '../data/spelling/lists.js';
import { trickFor, trickyIndex } from '../data/spelling/tricks.js';
import { recordSkills } from './Practice.js';

export const LEARNED_STREAK = 3;        // right in a row (from hearing only) before a word counts as learned
export const SESSION_WORDS = 10;
export const COINS_PER_WORD = 2, COINS_ALL_RIGHT = 10, XP_PER_WORD = 5, XP_ALL_RIGHT = 20;
export const MODES = ['look', 'fill', 'sentence', 'listen'];   // show and hide it; fill the missing letters; write it in its sentence; spell it from hearing
export const DAY = 24 * 60 * 60 * 1000;
/** Days until a word comes back, by Leitner box: a miss (box 0) is due again today, then 1, 2, 4, 7 and 14 days. */
export const REVIEW_DAYS = [0, 1, 2, 4, 7, 14];
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

/**
 * The mode a word should be practised in next: look while new, fill once seen, then written into its sentence
 * (when it has one), then spelled from hearing alone.
 */
export function pickMode(stats, hasSentence = false) {
  if (stats.right + stats.wrong === 0) return 'look';
  if (stats.streak === 0) return stats.wrong > stats.right ? 'look' : 'fill';
  if (stats.streak === 1) return 'fill';
  if (stats.streak === 2 && hasSentence) return 'sentence';
  return 'listen';
}

/** The sentence with the word blanked out ("We walk to _____ in the morning."), or null. */
export function blankSentence(sentence, word) {
  if (!sentence) return null;
  const at = String(sentence).toLowerCase().indexOf(String(word).toLowerCase());
  return at >= 0 ? sentence.slice(0, at) + '_____' + sentence.slice(at + String(word).length) : null;
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
    const mode = pickMode(st, !!blankSentence(e.s, e.w));
    return { word: e.w, syllables: e.syl, sentence: e.s, pic: e.pic || null, mode, blanks: mode === 'fill' ? blankPositions(e.w, rnd) : [], trick: e.trick || null, tricky: e.tricky || null };
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

/**
 * Fold one answer into the profile. `typed` (what was written) lets a miss remember which letters went wrong.
 * Also moves the word's review box: right waits longer, a miss is due again today. Returns the word's new stats.
 */
export function recordSpelling(profile, word, right, mode, typed = null, now = Date.now()) {
  const s = ensureSpelling(profile);
  const st = s.words[word] || { right: 0, wrong: 0, streak: 0, heardRight: 0 };
  if (right) { st.right += 1; st.streak += 1; if (mode === 'listen') st.heardRight += 1; }
  else { st.wrong += 1; st.streak = 0; st.heardRight = 0; }
  if (!right && typed !== null && typed !== undefined) {
    st.miss ||= {};
    markSpelling(typed, word).marks.forEach((m, i) => { if (i < String(word).length && !m.ok) st.miss[i] = (st.miss[i] | 0) + 1; });
  }
  st.box = right ? Math.min(REVIEW_DAYS.length - 1, (st.box | 0) + 1) : 0;
  st.due = now + REVIEW_DAYS[st.box] * DAY;
  s.words[word] = st;
  recordSkills(profile, { seen: ['spelling'], missed: right ? [] : ['spelling'] });
  return st;
}

/** A word was studied on its flash card and copied correctly (the teaching stage): first review tomorrow. */
export function recordTaught(profile, word, now = Date.now()) {
  const s = ensureSpelling(profile);
  const st = s.words[word] || { right: 0, wrong: 0, streak: 0, heardRight: 0 };
  st.taught = (st.taught | 0) + 1;
  if (!st.due) { st.box = st.box | 0; st.due = now + DAY; }
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

/**
 * Letter positions to point at in a word: the built-in tricky part (from tricks.js or the list entry) and any
 * letter the child has got wrong before. Returns a sorted array of indexes.
 */
export function trickySpots(profile, word, entry = null) {
  const out = new Set();
  const t = trickFor(word, entry);
  const at = t ? trickyIndex(word, t.tricky) : -1;
  if (at >= 0) for (let i = 0; i < t.tricky.length; i++) out.add(at + i);
  for (const [i, n] of Object.entries(wordStats(profile, word).miss || {})) if (n > 0 && Number(i) < String(word).length) out.add(Number(i));
  return [...out].sort((a, b) => a - b);
}

/**
 * Words due for spaced review today, across the lists for the player's grade (and any list word practised
 * before): only words already met (taught or answered) whose review date has come, the longest overdue first.
 * Returns list entries ({ w, syl, s, pic, ... }).
 */
export function dueWords(profile, now = Date.now(), max = 12) {
  const words = profile?.spelling?.words || {};
  const grade = spellingGradeFor(profile?.grade);
  const seen = new Map();
  const lists = [...(SPELLING_LISTS[grade] || []), ...Object.values(SPELLING_LISTS).flat()];
  for (const l of lists) for (const e of listWords(l)) {
    if (seen.has(e.w)) continue;
    const st = words[e.w];
    if (!st || ((st.right | 0) + (st.wrong | 0) + (st.taught | 0)) === 0) continue;
    const due = st.due ?? 0;
    if (due <= now) seen.set(e.w, { e, due });
  }
  return [...seen.values()].sort((a, b) => a.due - b.due).slice(0, max).map((x) => x.e);
}

/** When the next spaced review falls (ms), or null when nothing has been practised yet. */
export function nextReviewAt(profile) {
  const dues = Object.values(profile?.spelling?.words || {}).map((st) => st.due).filter((d) => typeof d === 'number');
  return dues.length ? Math.min(...dues) : null;
}
