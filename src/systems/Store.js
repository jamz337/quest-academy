// In-memory app state. ES modules are singletons, so importing this anywhere shares the same state.
import * as SaveSystem from './SaveSystem.js';
import { setMuted } from './Audio.js';

const state = { save: null };

export function init() {
  state.save = SaveSystem.load();
  setMuted(!state.save.settings.sound);
  return state.save;
}
export function getSave() { return state.save; }
export function persist() {
  const p = getProfile();
  if (p) p.updatedAt = Date.now();
  SaveSystem.save(state.save);
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
  if (state.save.activeProfileId === id) state.save.activeProfileId = null;
  persist();
}
export function settings() { return state.save.settings; }
export function setSetting(k, v) { state.save.settings[k] = v; if (k === 'sound') setMuted(!v); persist(); }
