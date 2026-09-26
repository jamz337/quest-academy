// localStorage persistence with a version number and forward migrations.
import { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_VERSION } from '../constants.js';

export function defaultSave() {
  return { version: SAVE_VERSION, activeProfileId: null, settings: { sound: true, lastMode: 'roam' }, profiles: {} };
}

export function newProfile({ name, avatar = 0, grade = 3 }) {
  const id = 'p_' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  return {
    id, name: String(name || 'Player').slice(0, 14), avatar, grade,
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
  d.settings ||= { sound: true, lastMode: 'roam' };
  return d;
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
