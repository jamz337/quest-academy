// Every star, coin, XP, badge and unlock rule lives here so the games stay simple.
import { BADGES } from '../data/badges.js';
import { gamesForSubject } from '../data/minigames.js';

export function starsFromAccuracy(correct, total) {
  if (!total) return 0;
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  if (acc >= 0.5) return 1;
  return 0;
}

/** Robo Maze star rule: efficiency and few attempts. */
export function starsForMaze({ solved, blocksUsed, par, attempts }) {
  if (!solved) return 0;
  if (blocksUsed <= par && attempts <= 2) return 3;
  if (blocksUsed <= par + 2 || attempts <= 4) return 2;
  return 1;
}

export const subjectBestStars = (profile, subject) =>
  gamesForSubject(subject).reduce((s, g) => s + (profile.games[g.id]?.bestStars || 0), 0);

/** Which roam zones this profile may enter. */
export function unlockedZones(profile) {
  const zones = ['math'];
  if (subjectBestStars(profile, 'math') >= 3) zones.push('words');
  if (subjectBestStars(profile, 'words') >= 3) zones.push('code');
  return zones;
}

/**
 * Apply a raw minigame outcome to the profile and return the full result record.
 * raw: { correct, total, timeMs, parTimeMs?, stars?, coins?, xp?, levelId?, solved?, blocksUsed?, par?, attempts?, missedSkills?, aborted? }
 */
export function applyResult(profile, payload, raw) {
  const result = { gameId: payload.gameId, band: payload.band, aborted: !!raw.aborted, ...raw };
  if (result.aborted) return result;

  const isCoding = raw.stars !== undefined && raw.stars !== null;
  const stars = isCoding ? raw.stars : starsFromAccuracy(raw.correct, raw.total);
  const timeBonus = raw.parTimeMs && raw.timeMs && raw.timeMs <= raw.parTimeMs ? 20 : 0;
  const coins = raw.coins ?? (isCoding ? stars * 10 : (raw.correct || 0) * 2 + stars * 5);
  const xp = raw.xp ?? (isCoding ? stars * 40 : (raw.correct || 0) * 10 + stars * 15 + timeBonus);
  const score = raw.score ?? (raw.correct || 0) * 10 + stars * 20 + (timeBonus ? 10 : 0);
  Object.assign(result, { stars, coins, xp, score, timeBonus, passed: stars >= 1 });

  // Per-game record
  const rec = profile.games[payload.gameId] || { bestStars: 0, bestScore: 0, plays: 0, lastBand: payload.band, lastPlayed: 0 };
  rec.plays += 1;
  rec.lastBand = payload.band;
  rec.lastPlayed = Date.now();
  result.newBest = score > rec.bestScore;
  rec.bestScore = Math.max(rec.bestScore, score);
  rec.bestStars = Math.max(rec.bestStars, stars);
  profile.games[payload.gameId] = rec;

  // Per-level record for coding levels
  if (raw.levelId) {
    const lv = profile.coding.levels[raw.levelId] || { stars: 0, bestBlocks: null };
    lv.stars = Math.max(lv.stars, stars);
    if (raw.solved && raw.blocksUsed !== undefined) lv.bestBlocks = lv.bestBlocks === null ? raw.blocksUsed : Math.min(lv.bestBlocks, raw.blocksUsed);
    profile.coding.levels[raw.levelId] = lv;
  }

  profile.coins += coins;
  profile.xp += xp;

  // Unlocks
  const before = new Set(profile.world.unlockedZones || ['math']);
  const now = unlockedZones(profile);
  result.newUnlocks = now.filter((z) => !before.has(z));
  profile.world.unlockedZones = now;

  // Badges
  result.newBadges = [];
  for (const b of BADGES) {
    if (profile.badges.includes(b.id)) continue;
    let ok = false;
    try { ok = b.test(profile, result); } catch { ok = false; }
    if (ok) { profile.badges.push(b.id); result.newBadges.push(b.id); }
  }
  return result;
}
