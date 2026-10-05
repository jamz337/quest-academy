// The player's hearts: three of them, kept between duels like coins. A wrong answer in a villager's duel costs
// one; a drink from the market puts them back (mango juice one, coconut water two, sorrel three). They are also
// full again every new day, so nobody is ever left without a way to duel.
// State: profile.hearts (0..HEARTS_MAX) and profile.heartsDay (the day that count belongs to).
import { dayKey } from '../data/world/encounters.js';

export const HEARTS_MAX = 3;
const clamp = (n) => Math.max(0, Math.min(HEARTS_MAX, n | 0));

/** How many hearts the player has now (full on a new day, and for a save from before hearts existed). */
export function heartsOf(profile, day = dayKey()) {
  if (!profile || profile.heartsDay !== day || !Number.isFinite(profile.hearts)) return HEARTS_MAX;
  return clamp(profile.hearts);
}

export function setHearts(profile, n, day = dayKey()) {
  profile.hearts = clamp(n); profile.heartsDay = day;
  return profile.hearts;
}

/** Add up to `n` hearts. Returns how many were actually gained (0 when already full). */
export function healHearts(profile, n, day = dayKey()) {
  const before = heartsOf(profile, day);
  return setHearts(profile, before + Math.max(0, n | 0), day) - before;
}

/** Hearts a market item gives back when drunk: its duel healing, at least one for any drink. */
export const heartsFrom = (item) => (item && item.drink ? Math.max(1, (item.effect && item.effect.heal) | 0) : 0);
