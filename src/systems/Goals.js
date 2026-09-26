// A small goal for today (per player) and a shared family goal for the week (per save).
import { MINIGAMES } from '../data/minigames.js';
import { dayKey } from '../data/world/encounters.js';
import { weakSkills } from './Practice.js';

export const GOAL_BONUS = 20;
export const FAMILY_TARGET = 30, FAMILY_BONUS = 30;

/** ISO-ish week key: the Monday of the week, as YYYY-MM-DD. */
export function weekKey(d = new Date()) {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (day.getUTCDay() + 6) % 7;   // Monday = 0
  day.setUTCDate(day.getUTCDate() - dow);
  return day.toISOString().slice(0, 10);
}

/**
 * Today's goal, made on first ask: the game with the fewest stars (ties by least played), aiming one star
 * above its best (max 3). Kept on profile.goal = { day, gameId, stars, done }.
 */
export function dailyGoal(profile, today = dayKey()) {
  if (profile.goal && profile.goal.day === today) return profile.goal;
  const games = profile.games || {};
  const pick = MINIGAMES.filter((g) => !g.usesLevels).slice().sort((a, b) => {
    const ra = games[a.id] || { bestStars: 0, plays: 0 }, rb = games[b.id] || { bestStars: 0, plays: 0 };
    return ra.bestStars - rb.bestStars || ra.plays - rb.plays;
  })[0];
  const best = games[pick.id]?.bestStars || 0;
  profile.goal = { day: today, gameId: pick.id, stars: Math.min(3, best + 1), done: false, weak: weakSkills(profile)[0] || null };
  return profile.goal;
}

/** After a game: mark today's goal done and pay the bonus. Returns { done, coins } when it just completed. */
export function applyGoal(profile, result, today = dayKey()) {
  const g = profile.goal;
  if (!g || g.day !== today || g.done || result.aborted) return null;
  if (result.gameId !== g.gameId || (result.stars || 0) < g.stars) return null;
  g.done = true;
  profile.coins += GOAL_BONUS;
  return { done: true, coins: GOAL_BONUS };
}

/** The save's family goal for this week: stars earned by everyone on the account together. */
export function familyGoal(save, week = weekKey()) {
  if (!save.family || save.family.week !== week) save.family = { week, stars: 0, target: FAMILY_TARGET, claimedBy: [] };
  return save.family;
}

export function addFamilyStars(save, stars, week = weekKey()) {
  const f = familyGoal(save, week);
  f.stars += Math.max(0, stars | 0);
  return f;
}

/** Each player collects the family bonus once when the target is reached. Returns coins paid (0 if not yet). */
export function claimFamily(save, profile, week = weekKey()) {
  const f = familyGoal(save, week);
  if (f.stars < f.target || f.claimedBy.includes(profile.id)) return 0;
  f.claimedBy.push(profile.id);
  profile.coins += FAMILY_BONUS;
  return FAMILY_BONUS;
}
