// localStorage persistence with a version number and forward migrations.
import { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_VERSION } from '../constants.js';

export function defaultSave() {
  return { version: SAVE_VERSION, activeProfileId: null, settings: { sound: true, lastMode: 'roam' }, profiles: {}, deleted: {} };
}

export function newProfile({ name, avatar = 0, grade = 3, look = null }) {
  const id = 'p_' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  return {
    id, name: String(name || 'Player').slice(0, 14), avatar, look, grade,
    createdAt: now, updatedAt: now, coins: 0, xp: 0, badges: [],
    games: {}, coding: { levels: {} },
    world: { x: null, y: null, unlockedZones: ['math'], npcsTalked: [], coinsCollected: [] }
  };
}

/** Each migration upgrades data from version i to i+1. Index 0 = 0->1 (none yet). */
export const migrations = [];

export function migrate(data) {
  let d = data;
  let v = Number(d.version) || 0;
  while (v < SAVE_VERSION) {
    const step = migrations[v];
    d = step ? step(d) : d;
    v += 1; d.version = v;
  }
  // Fill any fields that older profiles might miss.
  for (const p of Object.values(d.profiles || {})) {
    p.games ||= {}; p.coding ||= { levels: {} }; p.badges ||= [];
    p.world ||= { x: null, y: null, unlockedZones: ['math'], npcsTalked: [], coinsCollected: [] };
    p.world.unlockedZones ||= ['math']; p.world.npcsTalked ||= []; p.world.coinsCollected ||= [];
  }
  d.profiles ||= {};
  d.settings ||= { sound: true, lastMode: 'roam' };
  d.deleted ||= {};
  return d;
}

/**
 * Merge two saves (used for cloud sync, on both the device and the server). Profiles are matched by id and
 * the copy with the newer updatedAt wins; `deleted` holds tombstones so a profile removed on one device
 * does not come back from another. Settings and the active profile come from `incoming`.
 */
export function mergeSaves(base, incoming) {
  const a = base || defaultSave(), b = incoming || defaultSave();
  const deleted = { ...(a.deleted || {}) };
  for (const [id, ts] of Object.entries(b.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, Number(ts) || 0);
  const profiles = {};
  const ids = new Set([...Object.keys(a.profiles || {}), ...Object.keys(b.profiles || {})]);
  for (const id of ids) {
    const pa = a.profiles?.[id], pb = b.profiles?.[id];
    const p = !pa ? pb : !pb ? pa : (pb.updatedAt || 0) >= (pa.updatedAt || 0) ? pb : pa;
    if (deleted[id] && deleted[id] >= (p.updatedAt || 0)) continue;
    profiles[id] = p;
  }
  const activeProfileId = profiles[b.activeProfileId] ? b.activeProfileId : profiles[a.activeProfileId] ? a.activeProfileId : null;
  return migrate({ version: SAVE_VERSION, activeProfileId, settings: { ...(a.settings || {}), ...(b.settings || {}) }, profiles, deleted });
}

function parse(raw) {
  if (!raw) return null;
  try { const d = JSON.parse(raw); return d && typeof d === 'object' && d.profiles ? d : null; } catch { return null; }
}

export function load(storage = globalThis.localStorage) {
  let data = null;
  try { data = parse(storage.getItem(SAVE_KEY)) || parse(storage.getItem(SAVE_BACKUP_KEY)); } catch { data = null; }
  return migrate(data || defaultSave());
}

export function save(data, storage = globalThis.localStorage) {
  try {
    const raw = JSON.stringify(data);
    storage.setItem(SAVE_KEY, raw);
    storage.setItem(SAVE_BACKUP_KEY, raw);
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}

export const levelFromXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
export const xpForLevel = (lvl) => (lvl - 1) * (lvl - 1) * 100;
