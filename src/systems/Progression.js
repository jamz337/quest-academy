// Every star, coin, XP, badge, mastery and unlock rule lives here so the games stay simple.
import { BADGES } from '../data/badges.js';
import { gamesForSubject } from '../data/minigames.js';
import { bossDefeated } from '../data/world/quests.js';

// ---- Mastery: the better a player does in a subject, the harder its games get ----------------
export const MASTERY_MAX = 3;
export const MASTERY_LABEL = ['Rookie', 'Skilled', 'Expert', 'Master'];
const MIN_GRADE = 2, MAX_GRADE = 8;

/** { level, streak } for a subject. streak counts consecutive 3-star (+) or 0-1-star (−) results. */
export function mastery(profile, subject) {
  const m = profile?.mastery?.[subject];
  return { level: Math.max(0, Math.min(MASTERY_MAX, m?.level | 0)), streak: m?.streak | 0 };
}

/** Grade the generators are asked for: the player's grade raised by their mastery level. */
export function effectiveGrade(profile, subject, extra = 0) {
  const g = (Number(profile?.grade) || 3) + mastery(profile, subject).level + extra;
  return Math.max(MIN_GRADE, Math.min(MAX_GRADE, g));
}

/**
 * Fold a result into the subject's mastery: two 3-star games in a row step it up, two weak games in a row
 * step it down, a 2-star game holds. Returns { from, to }.
 */
export function updateMastery(profile, subject, stars) {
  profile.mastery ||= {};
  const m = profile.mastery[subject] || { level: 0, streak: 0 };
  const from = m.level;
  if (stars >= 3) m.streak = Math.max(1, m.streak + 1);
  else if (stars <= 1) m.streak = Math.min(-1, m.streak - 1);
  else m.streak = 0;
  if (m.streak >= 2 && m.level < MASTERY_MAX) { m.level += 1; m.streak = 0; }
  if (m.streak <= -2 && m.level > 0) { m.level -= 1; m.streak = 0; }
  profile.mastery[subject] = m;
  return { from, to: m.level };
}

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

/**
 * Which roam zones this profile may enter: a zone opens when the previous zone's boss is beaten. Zones
 * already unlocked under the old star rule stay open.
 */
export function unlockedZones(profile) {
  const stored = profile?.world?.unlockedZones || [];
  const zones = ['math'];
  if (bossDefeated(profile, 'math') || stored.includes('words')) zones.push('words');
  if (bossDefeated(profile, 'words') || stored.includes('code')) zones.push('code');
  return zones;
}

/** Score a boss fight. raw: { won, hpLeft, heartsLeft, correct, total }. Stars come from hearts kept. */
function applyBossResult(profile, payload, raw, result) {
  const won = !!raw.won;
  const stars = won ? Math.max(1, Math.min(3, raw.heartsLeft | 0)) : 0;
  const coins = raw.coins ?? (raw.correct || 0) * 2 + (won ? 50 : 0);
  const xp = raw.xp ?? (raw.correct || 0) * 10 + (won ? 150 : 0);
  Object.assign(result, { stars, coins, xp, score: (raw.correct || 0) * 10 + stars * 50, timeBonus: 0, passed: won, newBest: false });
  profile.world.bosses ||= {};
  const rec = profile.world.bosses[payload.boss.zone] || { defeated: false, attempts: 0, bestStars: 0, firstWinAt: null };
  rec.attempts += 1;
  if (won && !rec.defeated) rec.firstWinAt = Date.now();
  rec.defeated = rec.defeated || won;
  rec.bestStars = Math.max(rec.bestStars, stars);
  profile.world.bosses[payload.boss.zone] = rec;
}

/**
 * Apply a raw minigame outcome to the profile and return the full result record.
 * raw: { correct, total, timeMs, parTimeMs?, stars?, coins?, xp?, levelId?, solved?, blocksUsed?, par?, attempts?, missedSkills?, aborted? }
 */
export function applyResult(profile, payload, raw) {
  const result = { gameId: payload.gameId, band: payload.band, aborted: !!raw.aborted, ...raw };
  if (result.aborted) return result;
  if (payload.boss) {
    applyBossResult(profile, payload, raw, result);
    profile.coins += result.coins;
    profile.xp += result.xp;
    return finishResult(profile, result);
  }

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
  if (payload.subject) {
    const m = updateMastery(profile, payload.subject, stars);
    result.mastery = m.to; result.masteryChange = m.to - m.from;
  }
  return finishResult(profile, result);
}

/** Zone unlocks and badges, shared by games and boss fights. */
function finishResult(profile, result) {
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
