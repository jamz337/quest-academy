// Daily streak: a coin bonus the first time a player opens the game each day, growing with consecutive days.
import { dayKey } from '../data/world/encounters.js';

export const STREAK_BASE = 10, STREAK_STEP = 5, STREAK_MAX_DAYS = 7;

/** Coins for the n-th consecutive day: 10, 15, 20 … capped at day 7 (40). */
export const streakCoins = (count) => STREAK_BASE + STREAK_STEP * Math.max(0, Math.min(count, STREAK_MAX_DAYS) - 1);

const yesterdayOf = (today) => dayKey(new Date(Date.parse(today + 'T00:00:00Z') - 86400000));

/** Claim today's bonus if not yet claimed (mutates profile). Returns { claimed, count, coins }. */
export function claimStreak(profile, today = dayKey()) {
  const s = profile.streak || { last: null, count: 0 };
  if (s.last === today) return { claimed: false, count: s.count, coins: 0 };
  const count = s.last === yesterdayOf(today) ? s.count + 1 : 1;
  const coins = streakCoins(count);
  profile.streak = { last: today, count };
  profile.coins = (profile.coins || 0) + coins;
  return { claimed: true, count, coins };
}

/** The live streak length: the stored count while it is unbroken (played today or yesterday), else 0. */
export function currentStreak(profile, today = dayKey()) {
  const s = profile?.streak;
  if (!s || !s.last) return 0;
  return s.last === today || s.last === yesterdayOf(today) ? s.count : 0;
}
