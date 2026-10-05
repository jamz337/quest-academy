// Spaced review: questions a player missed come back at the start of a later game in the same subject,
// a day later, then three days, then a week. Three right answers in a row and the question is learned and
// dropped; a miss sends it back to the start. Pure functions over profile.recentMisses (see Progression).
import { getGame } from '../data/minigames.js';
import { recordSkills } from './Practice.js';

export const REVIEW_DAYS = [1, 3, 7];   // wait after the 1st, 2nd and 3rd success in a row
export const REVIEW_MAX = 3;            // questions reviewed before one game
export const REVIEW_XP = 5;             // per review answered right
const DAY = 86400000;

const subjectOfMiss = (m) => getGame(m.gameId)?.subject || null;
/** A miss can be reviewed when it kept its answer choices (open-ended answers cannot be re-asked). */
export const reviewable = (m) => !!m && Array.isArray(m.choices) && m.choices.length >= 2 && m.choices.includes(m.answer);
export const dueAt = (m) => (Number.isFinite(m.nextAt) ? m.nextAt : (m.at || 0) + REVIEW_DAYS[0] * DAY);

/**
 * Misses in `subject` that are due now, soonest first (at most `max`). With `gameId`, only that game's own misses:
 * a game warms up with its own questions, so Fraction Pizza never opens looking like Number Dash.
 */
export function dueReviews(profile, subject, now = Date.now(), max = REVIEW_MAX, gameId = null) {
  return (profile?.recentMisses || [])
    .filter((m) => reviewable(m) && subjectOfMiss(m) === subject && (!gameId || m.gameId === gameId) && dueAt(m) <= now)
    .sort((a, b) => dueAt(a) - dueAt(b))
    .slice(0, max);
}

const same = (a, b) => a.prompt === b.prompt && a.gameId === b.gameId;

/**
 * Fold a review answer into the profile: right moves the question to the next spacing (or drops it after the
 * last one), wrong sends it back to a one-day wait. Skill memory is updated either way. Returns { learned }.
 */
export function recordReview(profile, miss, right, now = Date.now()) {
  const list = profile.recentMisses || [];
  const i = list.findIndex((m) => same(m, miss));
  if (i < 0) return { learned: false };
  const m = list[i];
  recordSkills(profile, { seen: m.skill ? [m.skill] : [], missed: right || !m.skill ? [] : [m.skill] }, now);
  if (!right) { m.stage = 0; m.nextAt = now + REVIEW_DAYS[0] * DAY; return { learned: false }; }
  const stage = (m.stage | 0) + 1;
  if (stage >= REVIEW_DAYS.length) { list.splice(i, 1); return { learned: true }; }
  m.stage = stage; m.nextAt = now + REVIEW_DAYS[stage] * DAY;
  return { learned: false };
}

/** How many questions are waiting to be reviewed in any subject (for the home screen). */
export const reviewCount = (profile, now = Date.now()) => (profile?.recentMisses || []).filter((m) => reviewable(m) && dueAt(m) <= now).length;
