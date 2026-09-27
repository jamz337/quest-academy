// Buying, wearing and using what the market sells. Everything lives on profile.inventory =
// { owned: [itemId], equipped: { hat, glasses, back }, decor: { [roomId]: { wall?, floor? } }, spent, visited }.
import { ITEMS, CARD_SETS, LOOK_KINDS, getItem, cardsOfSet } from '../data/market/items.js';

export function ensureInventory(profile) {
  const inv = profile.inventory || (profile.inventory = {});
  inv.owned ||= []; inv.equipped ||= {}; inv.decor ||= {}; inv.spent |= 0; inv.visited = !!inv.visited;
  return inv;
}

export const owns = (profile, id) => !!profile?.inventory?.owned?.includes(id);
export const equipped = (profile, kind) => profile?.inventory?.equipped?.[kind] || null;

/** Why an item cannot be bought right now, or null when it can. */
export function buyBlock(profile, id) {
  const item = getItem(id);
  if (!item) return 'unknown';
  if (owns(profile, id)) return 'owned';
  if ((profile.coins || 0) < item.price) return 'coins';
  return null;
}

/** Buy an item: coins out, item in; looks are put on straight away. Returns { ok, reason?, item }. */
export function buy(profile, id) {
  const block = buyBlock(profile, id);
  const item = getItem(id);
  if (block) return { ok: false, reason: block, item };
  const inv = ensureInventory(profile);
  profile.coins -= item.price;
  inv.owned.push(id);
  inv.spent += item.price;
  if (LOOK_KINDS.includes(item.kind)) inv.equipped[item.kind] = id;
  return { ok: true, item };
}

/** Wear an owned look item, or nothing of that kind (id null). Returns true when the outfit changed. */
export function equip(profile, kind, id) {
  if (!LOOK_KINDS.includes(kind)) return false;
  if (id !== null && (!owns(profile, id) || getItem(id)?.kind !== kind)) return false;
  const inv = ensureInventory(profile);
  if ((inv.equipped[kind] || null) === id) return false;
  inv.equipped[kind] = id;
  return true;
}

/** The look items worn, as the styles the character renderer draws: { hat, glasses, back } (each a style or null). */
export function outfitOf(profile) {
  const out = { hat: null, glasses: null, back: null };
  for (const kind of LOOK_KINDS) { const it = getItem(equipped(profile, kind)); if (it && owns(profile, it.id)) out[kind] = it.style; }
  return out;
}

/** Stable id for an outfit, for texture keys ('' when nothing is worn). */
export const outfitId = (profile) => LOOK_KINDS.map((k) => (owns(profile, equipped(profile, k)) ? equipped(profile, k) : '')).join(',').replace(/^,+$/, '');

/** Use an owned paint or floor in a room. Returns true when the room changed. */
export function applyDecor(profile, roomId, id) {
  const item = getItem(id);
  if (!item || !owns(profile, id) || (item.kind !== 'paint' && item.kind !== 'floor')) return false;
  const inv = ensureInventory(profile);
  const room = inv.decor[roomId] || (inv.decor[roomId] = {});
  const key = item.kind === 'paint' ? 'wall' : 'floor';
  if (room[key] === id) return false;
  room[key] = id;
  return true;
}

/** { wall?: colour number, floor?: style name } for a room, from what has been applied there. */
export function roomDecor(profile, roomId) {
  const d = profile?.inventory?.decor?.[roomId] || {};
  const wall = getItem(d.wall), floor = getItem(d.floor);
  return { wall: wall ? wall.colour : undefined, floor: floor ? floor.floor : undefined };
}

/** Progress per card set: [{ id, name, icon, owned, total, done }]. */
export function cardSets(profile) {
  return CARD_SETS.map((set) => {
    const cards = cardsOfSet(set.id);
    const n = cards.filter((c) => owns(profile, c.id)).length;
    return { id: set.id, name: set.name, icon: set.icon, owned: n, total: cards.length, done: n >= cards.length };
  });
}

export const anySetComplete = (profile) => cardSets(profile).some((s) => s.done);
export const purchases = (profile) => (profile?.inventory?.owned || []).length;

/** For the parent dashboard. */
export function marketSummary(profile) {
  const owned = profile?.inventory?.owned || [];
  const byKind = {};
  for (const id of owned) { const it = getItem(id); if (it) byKind[it.kind] = (byKind[it.kind] | 0) + 1; }
  return { items: owned.length, spent: profile?.inventory?.spent | 0, byKind, sets: cardSets(profile).map(({ name, owned: o, total }) => ({ name, owned: o, total })) };
}

export { ITEMS };
