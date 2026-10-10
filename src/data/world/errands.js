// Errands: a villager asks the player to fetch something from another zone and bring it back. Each errand
// unlocks after level 1 of that villager's game is passed, and one errand is carried at a time.
// States on profile.world.errands[id]: (none) locked → 'available' → 'active' (item placed) → 'carrying' → 'done'.
import { NPCS } from './npcs.js';
import { ZONE_NAMES, OY } from './map.js';

export const ERRAND_REWARD = { coins: 25, xp: 40 };

// pickup spots are grass/path tiles off the main roads in a different zone, so players have to explore. (Written in the
// original world's rows; `OY` moves them down with the map, see map.js.)
const RAW_ERRANDS = [
  { id: 'abacus', npc: 'prof-plus', item: 'abacus', emoji: '🧮', zone: 'words', tx: 45, ty: 10, ask: 'I lent my abacus to the Owl Librarian and never got it back. Could you fetch it from Word Woods?', thanks: 'My abacus! Now I can count twice as fast.' },
  { id: 'olives', npc: 'chef-fraction', item: 'basket of olives', emoji: '🫒', zone: 'bible', tx: 39, ty: 24, ask: 'My pizzas need olives, and the best ones grow by the pond in Bible Village. Would you bring me a basket?', thanks: 'Perfect olives! Tonight’s pizza is on me.' },
  { id: 'nails', npc: 'bridge-keeper', item: 'bag of nails', emoji: '🔩', zone: 'code', tx: 52, ty: 31, ask: 'The bridge needs new nails. The Robo Mechanic left a bag on the beach in Code Cove. Could you fetch it?', thanks: 'Sturdy nails! The bridge will hold for years.' },
  { id: 'book', npc: 'owl-librarian', item: 'overdue book', emoji: '📕', zone: 'math', tx: 12, ty: 8, ask: 'Hoo! A book is overdue. It was last seen in Math Meadow, north of the lanes. Could you bring it back?', thanks: 'Returned at last! No fine for you, dear.' },
  { id: 'key', npc: 'gate-guard', item: 'lost key', emoji: '🗝️', zone: 'code', tx: 3, ty: 30, ask: 'I dropped my gate key somewhere by the castle in Code Cove. Would you look for it?', thanks: 'My key! I can lock up properly tonight.' },
  { id: 'binoculars', npc: 'safari-ranger', item: 'binoculars', emoji: '🔭', zone: 'bible', tx: 52, ty: 16, ask: 'I left my binoculars in Bible Village, out east by the houses. Could you fetch them for me?', thanks: 'Now I can spot every word in these woods!' },
  { id: 'battery', npc: 'robo-mechanic', item: 'spare battery', emoji: '🔋', zone: 'math', tx: 12, ty: 18, ask: 'Beep! My robot needs a battery. There is a spare in Math Meadow, near the Bridge Keeper. Could you get it?', thanks: 'Fully charged! Beep boop, thank you.' },
  { id: 'net', npc: 'bug-catcher', item: 'butterfly net', emoji: '🥅', zone: 'words', tx: 34, ty: 2, ask: 'I lost my net chasing a moth into Word Woods, up in the far corner. Could you fetch it?', thanks: 'My net! The bugs won’t know what hit them.' },
  { id: 'crystal', npc: 'fortune-teller', item: 'crystal ball', emoji: '🔮', zone: 'bible', tx: 39, ty: 20, ask: 'I foresee... my crystal ball, by the pond in Bible Village! Would you bring it to me?', thanks: 'Ah, the future is clear again.' },
  { id: 'lamb', npc: 'shepherd', item: 'lost lamb', emoji: '🐑', zone: 'math', tx: 2, ty: 26, ask: 'One of my lambs wandered off to Math Meadow, down in the south-west corner. Could you carry her home?', thanks: 'My little lamb! Thank you, friend.' },
  { id: 'ink', npc: 'scribe', item: 'jar of ink', emoji: '🫙', zone: 'words', tx: 46, ty: 12, ask: 'I am out of ink! A jar was left in Word Woods, down by the road. Would you fetch it?', thanks: 'Ink! Now the scrolls can be finished.' },
  { id: 'fishnet', npc: 'fisherman', item: 'fishing net', emoji: '🪢', zone: 'code', tx: 20, ty: 29, ask: 'My net blew away to Code Cove, up by the trees. Could you bring it back?', thanks: 'My net! Tomorrow’s catch is saved.' },
  { id: 'pump', npc: 'balloon-seller', item: 'balloon pump', emoji: '🫧', zone: 'code', tx: 50, ty: 30, ask: 'My balloon pump rolled all the way down to Code Cove, out east on the sand. Could you fetch it?', thanks: 'Pump it up! The balloons are back in business.' },
  { id: 'flute', npc: 'frog-friend', item: 'reed flute', emoji: '🎶', zone: 'bible', tx: 40, ty: 26, ask: 'I dropped my reed flute by the pond in Bible Village, on the south side. Would you find it?', thanks: 'Ribbit! Now the frogs can sing along.' },
  { id: 'record', npc: 'dj-bot', item: 'vinyl record', emoji: '💿', zone: 'math', tx: 13, ty: 10, ask: 'Bzzt! My favourite record spun off to Math Meadow, north of the lanes. Could you bring it back?', thanks: 'Drop the beat! Thank you.' },
  { id: 'hammer', npc: 'ark-builder', item: 'hammer', emoji: '🔨', zone: 'words', tx: 37, ty: 10, ask: 'I lent my hammer to the Gate Guard and it never came back. It is in Word Woods, south of the lane. Could you fetch it?', thanks: 'Bang, bang! The ark will be done in no time.' },
  { id: 'seeds', npc: 'botanist', item: 'packet of seeds', emoji: '🌾', zone: 'math', tx: 10, ty: 26, ask: 'I lent my best seed packet to Professor Plus and it ended up on the Number Trail in Math Meadow. Could you fetch it?', thanks: 'My seeds! The greenhouse will be green again.' },
  { id: 'notebook', npc: 'ranger-rio', item: 'field notebook', emoji: '📓', zone: 'words', tx: 38, ty: 7, ask: 'I left my field notebook in Word Woods, on the lane past the Gate Guard. Would you bring it back?', thanks: 'My notes! Every animal I ever spotted is in here.' },
  { id: 'snorkel', npc: 'captain-cork', item: 'snorkel', emoji: '🤿', zone: 'bible', tx: 48, ty: 17, ask: 'My snorkel is in Bible Village, up the high street near the castle. Could you fetch it for me?', thanks: 'Ahoy! Back to the deep end.' },
  { id: 'thermometer', npc: 'dr-misty', item: 'thermometer', emoji: '🌡️', zone: 'code', tx: 12, ty: 33, ask: 'I dropped my thermometer on the promenade in Code Cove, down by the sea. Would you look for it?', thanks: 'Zero to one hundred degrees! Science can continue.' }
];
export const ERRANDS = RAW_ERRANDS.map((e) => ({ ...e, ty: e.ty + OY }));

export const getErrand = (id) => ERRANDS.find((e) => e.id === id) || null;
export const errandFor = (npcId) => ERRANDS.find((e) => e.npc === npcId) || null;
export const errandState = (profile, id) => profile?.world?.errands?.[id] || null;

/** The errand being carried out right now (active or carrying), if any. */
export function activeErrand(profile) {
  const states = profile?.world?.errands || {};
  const id = Object.keys(states).find((k) => states[k] === 'active' || states[k] === 'carrying');
  return id ? getErrand(id) : null;
}

/** Passing level 1 at a house makes that villager's errand available. */
export function unlockErrand(profile, npcId) {
  const e = errandFor(npcId);
  if (!e) return null;
  profile.world.errands ||= {};
  if (!profile.world.errands[e.id]) { profile.world.errands[e.id] = 'available'; return e; }
  return null;
}

/** Accept an errand (only one at a time). Returns true when it became active. */
export function acceptErrand(profile, id) {
  if (activeErrand(profile) || errandState(profile, id) !== 'available') return false;
  profile.world.errands[id] = 'active';
  return true;
}

export function pickUpErrand(profile, id) {
  if (errandState(profile, id) !== 'active') return false;
  profile.world.errands[id] = 'carrying';
  return true;
}

/** Hand the item to its villager: rewards are paid and the errand is done. Returns the reward or null. */
export function deliverErrand(profile, id) {
  if (errandState(profile, id) !== 'carrying') return null;
  profile.world.errands[id] = 'done';
  profile.coins += ERRAND_REWARD.coins;
  profile.xp += ERRAND_REWARD.xp;
  return { ...ERRAND_REWARD };
}

export const errandsDone = (profile) => Object.values(profile?.world?.errands || {}).filter((s) => s === 'done').length;

/** One line for the quest panel / HUD about the errand in progress. */
export function errandLine(profile) {
  const e = activeErrand(profile);
  if (!e) return null;
  const giver = NPCS.find((n) => n.id === e.npc);
  return errandState(profile, e.id) === 'carrying'
    ? `${e.emoji} Carry the ${e.item} to ${giver ? giver.name : e.npc}`
    : `${e.emoji} Find the ${e.item} in ${ZONE_NAMES[e.zone]}`;
}
