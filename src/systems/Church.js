// Village Church progress: which lesson blocks each child has finished, per module and grade band.
// Lives on profile.church = { [moduleId]: { [band]: { [blockIndex]: stars 1..3 } } }. Blocks open in order: the
// first is always open, each later one once the block before it is done. Finishing a block also tells the games
// the skill has been learned (so its New Skill page is not needed) and counts in the skill memory.
import { MODULES, moduleBlocks } from '../data/bible/lessons.js';
import { markIntroduced, recordSkills } from './Practice.js';

export const COINS_FIRST_BLOCK = 5, COINS_ALL_STARS = 3, XP_PER_BLOCK = 8;

const record = (profile, moduleId, band) => profile?.church?.[moduleId]?.[band] || {};
export const blockStars = (profile, moduleId, band, i) => record(profile, moduleId, band)[i] | 0;
export const blockOpen = (profile, moduleId, band, i) => i === 0 || blockStars(profile, moduleId, band, i - 1) > 0;

/** Stars for a practice run: every question right first time 3, three in four 2, anything else 1 (it was finished). */
export function blockReward(firstTry, total) {
  const ratio = total ? firstTry / total : 0;
  return ratio >= 1 ? 3 : ratio >= 0.75 ? 2 : 1;
}

/**
 * Bank a finished block. Coins and XP come the first time only (plus a bonus the first time it reaches 3 stars);
 * later runs can still raise the stars. Returns { stars, coins, xp, first, improved }.
 */
export function finishBlock(profile, moduleId, band, i, firstTry, total) {
  const mod = MODULES.find((m) => m.id === moduleId);
  const stars = blockReward(firstTry, total);
  profile.church ||= {};
  profile.church[moduleId] ||= {};
  const rec = (profile.church[moduleId][band] ||= {});
  const before = rec[i] | 0;
  rec[i] = Math.max(before, stars);
  const first = before === 0;
  const coins = (first ? COINS_FIRST_BLOCK : 0) + (stars === 3 && before < 3 ? COINS_ALL_STARS : 0);
  const xp = first ? XP_PER_BLOCK : 0;
  profile.coins = (profile.coins || 0) + coins;
  profile.xp = (profile.xp || 0) + xp;
  if (mod) {
    markIntroduced(profile, mod.skill);
    recordSkills(profile, { seen: [mod.skill], missed: firstTry < total ? [mod.skill] : [] });
  }
  return { stars, coins, xp, first, improved: stars > before };
}

/** { done, total, stars, maxStars, complete } for one module at a band. */
export function moduleProgress(profile, moduleId, band) {
  const total = moduleBlocks(moduleId, band).length;
  const rec = record(profile, moduleId, band);
  let done = 0, stars = 0;
  for (let i = 0; i < total; i++) { const s = rec[i] | 0; if (s) done += 1; stars += s; }
  return { done, total, stars, maxStars: total * 3, complete: total > 0 && done === total };
}

/** The same across every module. */
export function churchProgress(profile, band) {
  return MODULES.reduce((acc, m) => {
    const p = moduleProgress(profile, m.id, band);
    return { done: acc.done + p.done, total: acc.total + p.total, stars: acc.stars + p.stars, maxStars: acc.maxStars + p.maxStars, complete: acc.complete + (p.complete ? 1 : 0) };
  }, { done: 0, total: 0, stars: 0, maxStars: 0, complete: 0 });
}
