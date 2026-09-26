// In-memory app state. ES modules are singletons, so importing this anywhere shares the same state.
import * as SaveSystem from './SaveSystem.js';
import { setMuted } from './Audio.js';

const state = { save: null };
const listeners = new Set();

export function init() {
  state.save = SaveSystem.load();
  setMuted(!state.save.settings.sound);
  return state.save;
}
export function getSave() { return state.save; }

/** Called after every persist() with the current save (cloud sync hooks in here). Returns an unsubscribe function. */
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function persist() {
  const p = getProfile();
  if (p) p.updatedAt = Date.now();
  SaveSystem.save(state.save);
  for (const fn of listeners) { try { fn(state.save); } catch (e) { console.warn(e); } }
}

/** Swap in a save that came back from the cloud (already merged). Does not notify listeners, so no sync loop. */
export function replaceSave(data) {
  state.save = SaveSystem.migrate(data);
  setMuted(!state.save.settings.sound);
  SaveSystem.save(state.save);
  return state.save;
}

export function getProfile() { return state.save.profiles[state.save.activeProfileId] || null; }
export function listProfiles() { return Object.values(state.save.profiles).sort((a, b) => b.updatedAt - a.updatedAt); }
export function setActiveProfile(id) { state.save.activeProfileId = id; persist(); }
export function createProfile(fields) {
  const p = SaveSystem.newProfile(fields);
  state.save.profiles[p.id] = p;
  state.save.activeProfileId = p.id;
  persist();
  return p;
}
export function updateProfile(fn) { const p = getProfile(); if (p) { fn(p); persist(); } return p; }
export function deleteProfile(id) {
  delete state.save.profiles[id];
  state.save.deleted ||= {};
  state.save.deleted[id] = Date.now();
  if (state.save.activeProfileId === id) state.save.activeProfileId = null;
  persist();
}
export function settings() { return state.save.settings; }
export function setSetting(k, v) { state.save.settings[k] = v; if (k === 'sound') setMuted(!v); persist(); }
