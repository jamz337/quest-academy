// Social studies progress: which rooms of the house have been read and how the quizzes went.
// Lives on profile.social = { rooms: { [roomId]: { read, plays, best, lastCorrect } } }.
import { ROOMS } from '../data/social/barbados.js';
import { recordSkills } from './Practice.js';

export const SOCIAL_SKILL = 'barbados';
export const COINS_PER_RIGHT = 2, COINS_ALL_RIGHT = 5, XP_PER_RIGHT = 4, XP_ALL_RIGHT = 10;

export function ensureSocial(profile) {
  const s = profile.social || (profile.social = {});
  s.rooms ||= {};
  return s;
}

export const roomRecord = (profile, id) => profile?.social?.rooms?.[id] || { read: false, plays: 0, best: 0, lastCorrect: null };

/** The story of a room was read to the end. */
export function markRead(profile, id) {
  const s = ensureSocial(profile);
  const r = s.rooms[id] || { read: false, plays: 0, best: 0, lastCorrect: null };
  r.read = true;
  s.rooms[id] = r;
  return r;
}

/** Stars, coins and XP for a quiz: 3 stars for all right, 2 for most, 1 for half. */
export function roomReward(correct, total) {
  const all = total > 0 && correct === total, ratio = total ? correct / total : 0;
  return { coins: correct * COINS_PER_RIGHT + (all ? COINS_ALL_RIGHT : 0), xp: correct * XP_PER_RIGHT + (all ? XP_ALL_RIGHT : 0), stars: all ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.5 ? 1 : 0 };
}

/** Bank a finished quiz: rewards, the room's record, the skill memory. Returns the reward. */
export function finishRoom(profile, id, correct, total) {
  const s = ensureSocial(profile);
  const reward = roomReward(correct, total);
  const r = s.rooms[id] || { read: false, plays: 0, best: 0, lastCorrect: null };
  r.plays += 1; r.best = Math.max(r.best | 0, reward.stars); r.lastCorrect = correct; r.lastTotal = total; r.at = Date.now();
  s.rooms[id] = r;
  profile.coins = (profile.coins || 0) + reward.coins;
  profile.xp = (profile.xp || 0) + reward.xp;
  recordSkills(profile, { seen: [SOCIAL_SKILL], missed: correct < total ? [SOCIAL_SKILL] : [] });
  return reward;
}

/** Cooking on the stove: each dish pays once a day. Kept on profile.house.cooked = { [recipeId]: 'YYYY-MM-DD' }. */
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
export const cookedToday = (profile, recipeId, now = Date.now()) => profile?.house?.cooked?.[recipeId] === dayKey(now);
export function recordCooked(profile, recipeId, now = Date.now()) {
  profile.house ||= {}; profile.house.cooked ||= {};
  profile.house.cooked[recipeId] = dayKey(now);
  profile.house.dishes = (profile.house.dishes | 0) + 1;
}

/** { read, total, stars, maxStars, mastered } across every room. */
export function socialProgress(profile) {
  const recs = ROOMS.map((r) => roomRecord(profile, r.id));
  return {
    read: recs.filter((r) => r.read).length, total: ROOMS.length,
    stars: recs.reduce((n, r) => n + (r.best | 0), 0), maxStars: ROOMS.length * 3,
    mastered: recs.filter((r) => (r.best | 0) >= 3).length
  };
}
