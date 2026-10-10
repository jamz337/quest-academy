// Villagers' orders: each day three villagers want something only their own game can make ("two pizzas, sliced
// just right"). Playing that villager's game well enough (two stars or more) fills the order and pays a little
// extra. Nothing is locked by it; it gives a reason to visit a particular house today.
// State: profile.world.requests = { day, done: [npcId] }.
import { NPCS } from './npcs.js';
import { dayKey, daySeed } from './encounters.js';
import { getGame, playableAt } from '../minigames.js';

export const REQUEST_REWARD = { coins: 15, xp: 20 };
export const REQUEST_STARS = 2;      // stars needed in one play of the game
export const REQUESTS_PER_DAY = 3;

/** What each villager asks for: `emoji` floats over their head, `ask` opens the talk, `thanks` follows the game. */
export const REQUESTS = {
  'prof-plus': { emoji: '🧮', ask: 'My abacus has lost count! Race through Number Dash for two stars and it will tick again.', thanks: 'Click, click, click: the abacus counts again. Splendid sums!' },
  'chef-fraction': { emoji: '🍕', ask: 'A big order has come in! Slice the pizzas well enough for two stars and I can feed everyone.', thanks: 'Every slice just right! The whole meadow is fed.' },
  'bridge-keeper': { emoji: '🔨', ask: 'The river took some planks in the night. Mend the bridges for two stars and folk can cross again.', thanks: 'Solid as a rock! Feet are crossing already.' },
  'balloon-seller': { emoji: '🎈', ask: 'It is the fair today and I am short of balloons! Pop the right ones for two stars and I will blow up a fresh bunch.', thanks: 'Look at them all! The fair is saved.' },
  'owl-librarian': { emoji: '📚', ask: 'The wind has scrambled my book titles. Build the words for two stars and the shelves will be tidy again.', thanks: 'Every title in its place. Thank you, quiet reader!' },
  'gate-guard': { emoji: '🛡️', ask: 'The castle gate will only shut for good grammar. Earn two stars and the wall is safe tonight.', thanks: 'Clang! The gate is shut tight. Well spoken!' },
  'safari-ranger': { emoji: '🔭', ask: 'My animal tags are all mixed up. Match the words for two stars and I can label the herd.', thanks: 'Every creature has its tag. Fine spotting!' },
  'frog-friend': { emoji: '🐸', ask: 'My little brothers are stuck on the far bank. Hop the right pads for two stars to show them the way.', thanks: 'Ribbit! They all hopped home behind you.' },
  'robo-mechanic': { emoji: '🔧', ask: 'A delivery robot is lost in the maze. Guide the robot for two stars and the parcel arrives.', thanks: 'Beep! Parcel delivered. Lovely programming.' },
  'bug-catcher': { emoji: '🥅', ask: 'Bugs have got into the code again! Fix them for two stars and my net can rest.', thanks: 'Not a bug left. The code hums!' },
  'fortune-teller': { emoji: '🔮', ask: 'My crystal ball is cloudy. Predict the robot for two stars and it will clear.', thanks: 'Clear as glass! You saw it coming.' },
  'dj-bot': { emoji: '🎧', ask: 'The dance floor is empty! Spot the dance programs for two stars and the party starts.', thanks: 'The floor is jumping! Nice moves.' },
  shepherd: { emoji: '🐑', ask: 'I am telling the stories by the fire tonight. Answer the Bible quiz for two stars and help me remember them.', thanks: 'Every story told true. The fire burns bright.' },
  scribe: { emoji: '📜', ask: 'Some words have faded from my scrolls. Fill in the verses for two stars and they will be whole again.', thanks: 'The ink is fresh and the verses are whole.' },
  fisherman: { emoji: '🎣', ask: 'Visitors keep asking who is who in the Bible. Play Who Am I? for two stars and I can tell them.', thanks: 'Now I know every name. Thank you, friend!' },
  'ark-builder': { emoji: '🪚', ask: 'Rain clouds are coming! Bring the animals aboard for two stars before the first drops fall.', thanks: 'All aboard and dry! Just in time.' },
  botanist: { emoji: '🌱', ask: 'My seedlings are wilting! Play Plant Power for two stars and I will know just what they need.', thanks: 'Green and growing again. Thank you, young gardener!' },
  'ranger-rio': { emoji: '🦒', ask: 'The animals have wandered from their homes! Match the habitats for two stars and I can guide them back.', thanks: 'Every creature is home. Fine tracking!' },
  'captain-cork': { emoji: '⚓', ask: 'I am loading the boat and cannot tell what will float! Play Sink or Float for two stars and help me pack.', thanks: 'Nothing sank! The boat is packed and bobbing.' },
  'dr-misty': { emoji: '🧊', ask: 'My ice is melting and my kettle is boiling! Sort the states of matter for two stars and help me keep up.', thanks: 'Solid, liquid, gas: all sorted. Brilliant!' },
  'captain-compass': { emoji: '🧭', ask: 'The fishing boats are lost in the fog! Play Compass Quest for two stars and I can call them home.', thanks: 'Every boat is back in the harbour. Steady bearings!' },
  'mayor-marigold': { emoji: '🏛️', ask: 'The town fair needs every helper in the right place! Play Community Helpers for two stars and I can sort the stalls.', thanks: 'Doctor, firefighter, baker: all in place. What a fair!' },
  flora: { emoji: '🏁', ask: 'A ship is coming in and I cannot tell whose flag it flies! Play Flag Finder for two stars and help me greet them.', thanks: 'Welcomed in their own language! Thank you, flag spotter.' },
  'old-tom': { emoji: '🕰️', ask: 'The museum is opening and the exhibits are all muddled! Play Past & Present for two stars and help me put them in order.', thanks: 'Long ago on the left, today on the right. The museum is open!' }
};

/** The villagers with an order today (their ids), the same all day for this player. */
export function todaysRequests(profile, day = dayKey()) {
  const able = NPCS.filter((n) => REQUESTS[n.id] && n.gameId && getGame(n.gameId) && playableAt(getGame(n.gameId), profile?.grade));
  let seed = daySeed(profile?.id || 'player', day);
  const pool = able.map((n) => n.id), out = [];
  while (out.length < REQUESTS_PER_DAY && pool.length) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    out.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return out;
}

const doneToday = (profile, day) => (profile?.world?.requests?.day === day ? profile.world.requests.done || [] : []);

/** This villager's order if they have one today and it is not filled yet, else null. */
export function pendingRequest(profile, npcId, day = dayKey()) {
  if (!REQUESTS[npcId] || !todaysRequests(profile, day).includes(npcId) || doneToday(profile, day).includes(npcId)) return null;
  return { npc: npcId, ...REQUESTS[npcId] };
}

/** The orders still open today: [{ npc, emoji, ask, thanks }]. */
export const openRequests = (profile, day = dayKey()) => todaysRequests(profile, day).map((id) => pendingRequest(profile, id, day)).filter(Boolean);

/**
 * After a game at a villager's house: fill their order when the play earned enough stars. Pays REQUEST_REWARD.
 * Returns { done: true, request, coins, xp } when it was just filled, { done: false, request } when it is still open,
 * or null when that villager had no order.
 */
export function fillRequest(profile, npcId, stars, day = dayKey()) {
  const request = pendingRequest(profile, npcId, day);
  if (!request) return null;
  if ((stars | 0) < REQUEST_STARS) return { done: false, request };
  profile.world ||= {};
  if (!profile.world.requests || profile.world.requests.day !== day) profile.world.requests = { day, done: [] };
  profile.world.requests.done.push(npcId);
  profile.coins = (profile.coins | 0) + REQUEST_REWARD.coins;
  profile.xp = (profile.xp | 0) + REQUEST_REWARD.xp;
  return { done: true, request, ...REQUEST_REWARD };
}
