// Every star, coin, XP, badge, mastery and unlock rule lives here so the games stay simple.
import { BADGES } from '../data/badges.js';
import { gamesForSubject, getGame } from '../data/minigames.js';
import { bandFor } from '../data/grades.js';
import { levelsForBand } from '../data/coding/levels.js';
import { unlockErrand } from '../data/world/errands.js';
import { ZONE_ORDER } from '../data/world/quests.js';
import { recordSkills } from './Practice.js';
import { applyGoal } from './Goals.js';
import { REVIEW_XP } from './Review.js';

// ---- Mastery: the better a player does in a subject, the harder its games get ----------------
export const MASTERY_MAX = 3;
export const MASTERY_LABEL = ['Rookie', 'Skilled', 'Expert', 'Master'];
const MIN_GRADE = 2, MAX_GRADE = 8;

/** { level, streak } for a subject. streak counts consecutive 3-star (+) or 0-1-star (−) results. */
export function mastery(profile, subject) {
  const m = profile?.mastery?.[subject];
  return { level: Math.max(0, Math.min(MASTERY_MAX, m?.level | 0)), streak: m?.streak | 0 };
}

const clampGrade = (g) => Math.max(MIN_GRADE, Math.min(MAX_GRADE, g));

// ---- Grade: questions stay at the grade the player picked. Finishing a game (all its levels passed) moves
// that game up one grade, and its levels reset so the player climbs again at the new grade. ----------------

/** How many grades a game has moved up from the player's grade, by finishing all its levels. */
export const gradeUps = (profile, gameId) => Math.max(0, profile?.games?.[gameId]?.gradeUp | 0);

/** Grade the generators are asked for in one game: the player's grade plus that game's earned grade-ups. */
export function gameGrade(profile, gameId, extra = 0) {
  return clampGrade((Number(profile?.grade) || 3) + gradeUps(profile, gameId) + extra);
}

/**
 * Grade for a whole subject (world quizzes, boss fights, the challenge menu): the player's grade plus the
 * grade-ups every game of the subject has earned, so nobody meets questions a game has not yet reached.
 */
export function effectiveGrade(profile, subject, extra = 0) {
  const games = gamesForSubject(subject);
  const ups = games.length ? Math.min(...games.map((g) => gradeUps(profile, g.id))) : 0;
  return clampGrade((Number(profile?.grade) || 3) + ups + extra);
}

export const MASTERY_UP = 3, MASTERY_DOWN = 2;

/**
 * Fold a result into the subject's mastery: three 3-star games in a row step it up (a lucky run is not
 * enough), two weak games in a row step it down, a 2-star game holds. Returns { from, to }.
 */
export function updateMastery(profile, subject, stars) {
  profile.mastery ||= {};
  const m = profile.mastery[subject] || { level: 0, streak: 0 };
  const from = m.level;
  if (stars >= 3) m.streak = Math.max(1, m.streak + 1);
  else if (stars <= 1) m.streak = Math.min(-1, m.streak - 1);
  else m.streak = 0;
  if (m.streak >= MASTERY_UP && m.level < MASTERY_MAX) { m.level += 1; m.streak = 0; }
  if (m.streak <= -MASTERY_DOWN && m.level > 0) { m.level -= 1; m.streak = 0; }
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

// ---- House levels: every villager's game has three levels; each pass lights a star above the house ----
export const HOUSE_LEVELS = 3;

/** Stars lit above a house (0-3): levels passed, or for Robo Maze the mazes solved in the player's band. */
export function houseStars(profile, gameId) {
  const game = getGame(gameId);
  if (game && game.usesLevels) {
    if (gradeUps(profile, gameId) > 0) return HOUSE_LEVELS;
    const band = bandFor(gameGrade(profile, gameId));
    return Math.min(HOUSE_LEVELS, levelsForBand(band).filter((l) => (profile.coding?.levels?.[l.id]?.stars || 0) > 0).length);
  }
  if (gradeUps(profile, gameId) > 0) return HOUSE_LEVELS;   // finished once: the house keeps its stars
  const lv = profile.games?.[gameId]?.levels || {};
  return Math.min(HOUSE_LEVELS, [1, 2, 3].filter((n) => (lv[n] || 0) >= 1).length);
}

/** The level to play next at a house: the first not yet passed, or 3 once all are done. */
export function nextHouseLevel(profile, gameId) {
  const lv = profile.games?.[gameId]?.levels || {};
  return [1, 2, 3].find((n) => (lv[n] || 0) < 1) || HOUSE_LEVELS;
}

/** Every village is open to roam; only each zone's boss is gated, behind its quests (see quests.js bossReady). */
export function unlockedZones() { return [...ZONE_ORDER]; }

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
  let coins = raw.coins ?? (isCoding ? stars * 10 : (raw.correct || 0) * 2 + stars * 5);
  const reviewXp = ((raw.reviewed && raw.reviewed.right) | 0) * REVIEW_XP;   // quick-review questions before the game
  const xp = (raw.xp ?? (isCoding ? stars * 40 : (raw.correct || 0) * 10 + stars * 15 + timeBonus)) + reviewXp;
  if (reviewXp) result.reviewXp = reviewXp;
  // A Golden Ticket (found in the grass) doubles the coins of the next game, then is spent.
  if (profile.charms?.doubleCoins) { coins *= 2; result.doubledCoins = true; delete profile.charms.doubleCoins; }
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
  // House level: which of the three levels this was, and whether it lit a new star above the house.
  const level = Math.max(1, Math.min(HOUSE_LEVELS, payload.level | 0 || 1));
  rec.levels ||= {};
  const hadStar = (rec.levels[level] || 0) >= 1;
  rec.levels[level] = Math.max(rec.levels[level] || 0, stars);
  profile.games[payload.gameId] = rec;
  const before = houseStars(profile, payload.gameId);   // includes this pass already; compute "new" from hadStar
  Object.assign(result, { level, levelPassed: stars >= 1, newHouseStar: stars >= 1 && !hadStar && !isCoding, houseStars: before, houseLevels: HOUSE_LEVELS });
  if (result.newHouseStar && level === 1 && !rec.gradeUp) result.errandUnlocked = unlockErrand(profile, getGame(payload.gameId)?.npc);
  // Finished every level at this grade: the game moves up a grade and its levels start over.
  if (!isCoding && stars >= 1 && [1, 2, 3].every((n) => (rec.levels[n] || 0) >= 1)) applyGradeUp(profile, payload.gameId, rec, result);

  // Per-level record for coding levels; solving the last level of the band moves the game up a grade.
  if (raw.levelId) {
    const lv = profile.coding.levels[raw.levelId] || { stars: 0, bestBlocks: null };
    const wasSolved = lv.stars > 0;
    lv.stars = Math.max(lv.stars, stars);
    if (raw.solved && raw.blocksUsed !== undefined) lv.bestBlocks = lv.bestBlocks === null ? raw.blocksUsed : Math.min(lv.bestBlocks, raw.blocksUsed);
    profile.coding.levels[raw.levelId] = lv;
    const band = bandFor(gameGrade(profile, payload.gameId));
    const allSolved = levelsForBand(band).every((l) => (profile.coding.levels[l.id]?.stars || 0) > 0);
    if (stars >= 1 && !wasSolved && allSolved) applyGradeUp(profile, payload.gameId, rec, result);
  }

  profile.coins += coins;
  profile.xp += xp;
  if (payload.subject) {
    const m = updateMastery(profile, payload.subject, stars);
    result.mastery = m.to; result.masteryChange = m.to - m.from;
  }
  // Skill memory for spaced practice, the missed questions a parent can see, and today's goal.
  recordSkills(profile, { seen: raw.seenSkills || [], missed: raw.missedSkills || [] });
  if (Array.isArray(raw.missedQuestions) && raw.missedQuestions.length) {
    const at = Date.now();
    profile.recentMisses = [...raw.missedQuestions.slice(0, 5).map((q) => ({ ...q, gameId: payload.gameId, at })), ...(profile.recentMisses || [])].slice(0, 20);
  }
  result.goal = applyGoal(profile, result);
  return finishResult(profile, result);
}

/** Move a finished game up one grade (never past grade 8) and reset its levels; reports it on the result. */
function applyGradeUp(profile, gameId, rec, result) {
  const from = gameGrade(profile, gameId);
  if (from >= MAX_GRADE) return;
  rec.gradeUp = (rec.gradeUp | 0) + 1;
  rec.levels = {};
  result.gradeUp = { from, to: gameGrade(profile, gameId) };
  result.houseStars = houseStars(profile, gameId);
}

/** Badges, shared by games and boss fights. */
function finishResult(profile, result) {
  profile.world.unlockedZones = unlockedZones();

  result.newBadges = checkBadges(profile, result);
  return result;
}

/** Award any badge whose test now passes (result may be null, e.g. after an errand). Returns the new ids. */
export function checkBadges(profile, result = null) {
  const out = [];
  for (const b of BADGES) {
    if (profile.badges.includes(b.id)) continue;
    let ok = false;
    try { ok = b.test(profile, result); } catch { ok = false; }
    if (ok) { profile.badges.push(b.id); out.push(b.id); }
  }
  return out;
}
