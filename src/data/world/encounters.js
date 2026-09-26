// Surprises in the grass: daily sparkles that hide a pop quiz, a treasure chest or a mystery gift, plus the
// odd quiz while walking through tall grass. Pure data over the map so the world scene and tests agree.
import { TID, reachableFrom } from './map.js';
import { mulberry32 } from '../../systems/Rng.js';

export const SPARKLES_PER_DAY = 12;
export const GRASS = new Set([TID.grass, TID.flower, TID.meadow, TID.woods, TID.cove, TID.village]);
export const SURPRISE_CHANCE = 1 / 70;      // per new grass tile stepped on
export const SURPRISE_COOLDOWN_MS = 30000;
export const QUIZ_REWARD = { coins: 8, xp: 15 };

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Stable seed for a player's sparkle layout on a given day (FNV-1a over "id:day"). */
export function daySeed(profileId, day = dayKey()) {
  let h = 2166136261;
  for (const ch of `${profileId}:${day}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

const grassCache = new WeakMap();
/** Every grass tile reachable from spawn and clear of NPC and boss spots (cached per map). */
export function grassSpots(map) {
  if (grassCache.has(map)) return grassCache.get(map);
  const reach = reachableFrom(map);
  const key = (s) => `${s.tx},${s.ty}`;
  const taken = new Set([...Object.values(map.npcSpots), ...Object.values(map.bossSpots || {})].map(key));
  const cands = [];
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    if (!GRASS.has(map.data[ty][tx])) continue;
    const k = `${tx},${ty}`;
    if (reach.has(k) && !taken.has(k)) cands.push({ tx, ty });
  }
  grassCache.set(map, cands);
  return cands;
}

/** n grass tiles chosen by the seed. */
export function sparkleSpots(map, seed, n = SPARKLES_PER_DAY) {
  const cands = grassSpots(map).slice();
  const rnd = mulberry32(seed);
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  return cands.slice(0, n);
}

// The wandering sheep: catch it for a few coins, a limited number of times a day so it cannot be farmed.
export const CRITTER = { key: 'sheep', name: 'sheep', coins: 3, maxPerDay: 10, respawnMs: 20000, fleeDist: 96, fleeSpeed: 95, wanderSpeed: 35 };

/** What a sparkle hides. `rnd` is a 0..1 function. */
export function rollEncounter(rnd) {
  const r = rnd();
  return r < 0.5 ? 'quiz' : r < 0.85 ? 'chest' : 'gift';
}

export const chestCoins = (rnd) => 5 + Math.floor(rnd() * 11);   // 5..15

// Mystery gifts. A charm is kept on the profile until the game or boss fight that uses it.
export const GIFTS = [
  { id: 'xp', title: 'Bonus XP', desc: 'A scroll of wisdom: +50 XP!', xp: 50 },
  { id: 'coins', title: 'Bag of Coins', desc: 'A heavy little bag: +25 coins!', coins: 25 },
  { id: 'extraHeart', title: 'Lucky Charm', desc: 'An extra heart in your next boss fight!', charm: 'extraHeart' },
  { id: 'doubleCoins', title: 'Golden Ticket', desc: 'Double coins on your next game!', charm: 'doubleCoins' }
];
export const CHARM_LABELS = { extraHeart: 'Lucky Charm', doubleCoins: 'Golden Ticket' };
export const pickGift = (rnd) => GIFTS[Math.floor(rnd() * GIFTS.length)];
