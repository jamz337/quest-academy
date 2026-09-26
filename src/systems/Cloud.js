// Optional cloud saves: a parent account (email + password) whose save is merged with the server after every
// change. Everything here is best-effort: the game keeps working offline and without an account.
import * as Store from './Store.js';
import { mergeSaves } from './SaveSystem.js';

const KEY = 'qa.cloud';
const PUSH_DELAY_MS = 2500;
const hasBrowser = typeof window !== 'undefined' && typeof fetch === 'function';

const state = {
  token: null, email: null, leaderboard: true,
  status: 'signed-out',          // signed-out | idle | syncing | synced | offline | unavailable
  lastSync: null, error: null, busy: false, pending: false, timer: null
};
const subscribers = new Set();
const notify = () => { for (const fn of subscribers) { try { fn(info()); } catch { /* ignore */ } } };

export function subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
export const isSignedIn = () => !!state.token;
export function info() {
  const { token, timer, ...rest } = state;
  return { ...rest, signedIn: !!token };
}

function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); state.token = s.token || null; state.email = s.email || null; state.leaderboard = s.leaderboard !== false; }
  } catch { /* no storage */ }
}
function saveSession() {
  try {
    if (state.token) localStorage.setItem(KEY, JSON.stringify({ token: state.token, email: state.email, leaderboard: state.leaderboard }));
    else localStorage.removeItem(KEY);
  } catch { /* no storage */ }
}

/** Call once after Store.init(). Restores the session and syncs in the background. */
export function init() {
  if (!hasBrowser) return;
  loadSession();
  state.status = state.token ? 'idle' : 'signed-out';
  Store.onChange(() => schedulePush());
  window.addEventListener('online', () => { if (state.token) syncNow(); });
  if (state.token) syncNow();
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers.Authorization = 'Bearer ' + state.token;
  const res = await fetch('api/' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (res.status === 401 && auth && state.token) signOut();
  if (!res.ok) { const e = new Error(data.error || 'http-' + res.status); e.code = data.error || 'http-' + res.status; e.status = res.status; throw e; }
  return data;
}

function setSession(d) {
  state.token = d.token; state.email = d.account.email; state.leaderboard = d.account.leaderboard !== false;
  state.status = 'idle'; state.error = null;
  saveSession(); notify();
}

export async function register(email, password) { setSession(await api('auth/register', { method: 'POST', body: { email, password }, auth: false })); await syncNow(); }
export async function signIn(email, password) { setSession(await api('auth/login', { method: 'POST', body: { email, password }, auth: false })); await syncNow(); }
export function signOut() {
  clearTimeout(state.timer);
  state.token = null; state.email = null; state.status = 'signed-out'; state.lastSync = null; state.error = null;
  saveSession(); notify();
}

export async function setLeaderboard(on) {
  const d = await api('auth/me', { method: 'PATCH', body: { leaderboard: !!on } });
  state.leaderboard = d.account.leaderboard !== false; saveSession(); notify();
}

function failed(e) {
  state.status = e.code === 'cloud-not-configured' ? 'unavailable' : state.token ? 'offline' : 'signed-out';
  state.error = e.code || e.message;
}

/** Pull the server save, merge it with this device, push the result and adopt the server's merged copy. */
export async function syncNow() {
  if (!state.token) return false;
  if (state.busy) { state.pending = true; return false; }
  state.busy = true; state.status = 'syncing'; notify();
  try {
    const remote = await api('save');
    const merged = remote.data ? mergeSaves(remote.data, Store.getSave()) : Store.getSave();
    const put = await api('save', { method: 'PUT', body: { data: merged } });
    adopt(put.data);
    state.lastSync = Date.now(); state.status = 'synced'; state.error = null;
    return true;
  } catch (e) { failed(e); return false; }
  finally { state.busy = false; notify(); if (state.pending) { state.pending = false; schedulePush(); } }
}

function adopt(data) {
  if (!data || JSON.stringify(data) === JSON.stringify(Store.getSave())) return;
  Store.replaceSave(data);
}

function schedulePush() {
  if (!state.token || !hasBrowser) return;
  clearTimeout(state.timer);
  state.timer = setTimeout(() => push(), PUSH_DELAY_MS);
}

async function push() {
  if (!state.token) return;
  if (state.busy) { state.pending = true; return; }
  state.busy = true;
  try {
    const put = await api('save', { method: 'PUT', body: { data: Store.getSave() } });
    adopt(put.data);
    state.lastSync = Date.now(); state.status = 'synced'; state.error = null;
  } catch (e) { failed(e); }
  finally { state.busy = false; notify(); if (state.pending) { state.pending = false; schedulePush(); } }
}

/** Record a finished game for the dashboard and weekly leaderboard. Fire-and-forget. */
export function postResult(profile, payload, result) {
  if (!state.token || !hasBrowser || !profile || !result || result.aborted) return;
  api('results', {
    method: 'POST',
    body: {
      profileId: profile.id, profileName: profile.name, gameId: payload.gameId, band: payload.band,
      stars: result.stars, correct: result.correct, total: result.total, xp: result.xp, coins: result.coins,
      timeMs: result.timeMs, missedSkills: result.missedSkills || [], levelId: result.levelId
    }
  }).catch(() => { /* offline: the save itself still syncs later */ });
}

export function fetchLeaderboard() { return api('leaderboard', { auth: false }); }

export const dashboardUrl = () => 'dashboard.html';
