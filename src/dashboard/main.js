// Parent dashboard: signs in with the same account as the game and renders one card per child.
import { MINIGAMES } from '../data/minigames.js';
import { SUBJECTS } from '../constants.js';
import { skillLabel } from '../data/skills.js';
import { getBadge } from '../data/badges.js';
import { CHARACTER_STYLES, OUTLINE, MOUTH } from '../data/avatars.js';

const KEY = 'qa.cloud';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ERRORS = {
  'invalid-email': 'That email address does not look right.', 'password-too-short': 'Use a password with at least 8 characters.',
  'email-taken': 'There is already an account with that email. Try signing in.', 'wrong-email-or-password': 'Wrong email or password.',
  'cloud-not-configured': 'Cloud saves are not switched on for this site yet.', 'sign-in-required': 'Please sign in again.'
};

let session = null;
try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { session = null; }

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && session?.token) headers.Authorization = 'Bearer ' + session.token;
  const res = await fetch('api/' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) { const e = new Error(data.error || 'http-' + res.status); e.code = data.error || 'network'; throw e; }
  return data;
}

function setSession(d) {
  session = d ? { token: d.token, email: d.account.email, leaderboard: d.account.leaderboard !== false } : null;
  try { if (session) localStorage.setItem(KEY, JSON.stringify(session)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}

function showError(code) {
  const el = $('login-error');
  el.textContent = ERRORS[code] || 'Could not reach the server. Check your connection and try again.';
  el.classList.remove('hidden');
}

async function auth(kind) {
  const email = $('email').value.trim(), password = $('password').value;
  $('login-btn').disabled = $('register-btn').disabled = true;
  $('login-error').classList.add('hidden');
  try {
    setSession(await api(kind === 'register' ? 'auth/register' : 'auth/login', { method: 'POST', body: { email, password }, auth: false }));
    await load();
  } catch (e) { showError(e.code); }
  finally { $('login-btn').disabled = $('register-btn').disabled = false; }
}

function stars(n, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < n ? '★' : '<span class="off">★</span>';
  return `<span class="stars">${s}</span>`;
}

const when = (iso) => {
  if (!iso) return 'never';
  const d = new Date(iso), diff = Date.now() - d.getTime();
  if (diff < 3600000) return Math.max(1, Math.round(diff / 60000)) + ' min ago';
  if (diff < 86400000) return Math.round(diff / 3600000) + ' h ago';
  return d.toLocaleDateString();
};

function childCard(c) {
  const gameRows = MINIGAMES.map((g) => {
    const rec = c.games[g.id];
    return `<tr><td class="subject-${g.subject}">${SUBJECTS[g.subject].title}</td><td>${g.icon} ${esc(g.title)}</td>
      <td>${stars(rec ? rec.bestStars : 0)}</td><td>${rec ? rec.plays + (rec.plays === 1 ? ' play' : ' plays') : '<span class="muted">not yet</span>'}</td></tr>`;
  }).join('');
  const recent = c.recent.map((r) => {
    const g = MINIGAMES.find((x) => x.id === r.gameId);
    const detail = r.total ? `${r.correct} / ${r.total}` : r.levelId ? `level ${r.levelId}` : '';
    return `<tr><td>${when(r.at)}</td><td>${g ? g.icon + ' ' + esc(g.title) : esc(r.gameId)}</td><td>${stars(r.stars)}</td><td>${detail}</td><td>+${r.xp} XP</td></tr>`;
  }).join('');
  const practise = c.practise.length
    ? c.practise.map((p) => `<span class="skill">${esc(skillLabel(p.skill))} · ${p.count}</span>`).join('')
    : '<span class="muted">Nothing stands out. Keep going!</span>';
  const badges = c.badges.length ? c.badges.map((id) => `<span class="badge">🏅 ${esc(getBadge(id)?.title || id)}</span>`).join('') : '<span class="muted">No badges yet.</span>';
  return `<section class="card">
    <div class="row"><canvas class="avatar" data-avatar="${c.avatar | 0}" width="48" height="48"></canvas>
      <div class="grow"><h2>${esc(c.name)}</h2><div class="muted">Grade ${c.grade} · last played ${when(c.lastPlayed)}</div></div></div>
    <h3>Progress</h3>
    <div class="stats">
      <div class="stat"><b>${c.level}</b><span>Level</span></div><div class="stat"><b>${c.xp}</b><span>XP</span></div>
      <div class="stat"><b>${c.stars}</b><span>Stars of 27</span></div><div class="stat"><b>${c.coins}</b><span>Coins</span></div>
      <div class="stat"><b>${c.codingLevels}</b><span>Mazes solved</span></div><div class="stat"><b>${c.minutes}</b><span>Minutes played</span></div>
    </div>
    <h3>Skills to practise (last 30 days)</h3><div>${practise}</div>
    <h3>Badges</h3><div>${badges}</div>
    <h3>Games</h3><table><tr><th>Subject</th><th>Game</th><th>Best</th><th></th></tr>${gameRows}</table>
    <h3>Recent activity</h3>${recent ? `<table><tr><th>When</th><th>Game</th><th>Stars</th><th>Score</th><th></th></tr>${recent}</table>` : '<div class="muted">No games recorded yet. Results appear here after each game played while signed in.</div>'}
  </section>`;
}

// Same colours as the in-game avatars, drawn as a simple face so the page needs no game assets.
function drawAvatar(canvas) {
  const { hair, skin, top } = CHARACTER_STYLES[Math.max(0, Math.min(7, Number(canvas.dataset.avatar) || 0))];
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(24, 24, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = top; ctx.beginPath(); ctx.arc(24, 24, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.fillRect(13, 14, 22, 22);
  ctx.fillStyle = hair; ctx.fillRect(11, 8, 26, 9); ctx.fillRect(11, 17, 4, 8); ctx.fillRect(33, 17, 4, 8);
  ctx.fillStyle = OUTLINE; ctx.fillRect(18, 24, 3, 4); ctx.fillRect(27, 24, 3, 4);
  ctx.fillStyle = MOUTH; ctx.fillRect(21, 31, 6, 2);
}

async function load() {
  if (!session?.token) return show(false);
  try {
    const d = await api('dashboard');
    $('who').textContent = d.account.email;
    $('synced').textContent = d.updatedAt ? 'Last synced ' + when(d.updatedAt) : 'No game progress synced yet: open the game and sign in there.';
    $('lb-toggle').checked = d.account.leaderboard !== false;
    $('children').innerHTML = d.children.length ? d.children.map(childCard).join('') : '<div class="card muted">No players yet. Create a player in the game while signed in and their progress will appear here.</div>';
    document.querySelectorAll('canvas.avatar').forEach(drawAvatar);
    show(true);
  } catch (e) {
    if (e.code === 'sign-in-required') { setSession(null); show(false); return; }
    show(false); showError(e.code);
  }
}

function show(signedIn) {
  $('login').classList.toggle('hidden', signedIn);
  $('dash').classList.toggle('hidden', !signedIn);
}

$('login-form').addEventListener('submit', (e) => { e.preventDefault(); auth('login'); });
$('register-btn').addEventListener('click', () => auth('register'));
$('refresh-btn').addEventListener('click', load);
$('logout-btn').addEventListener('click', () => { setSession(null); show(false); });
$('lb-toggle').addEventListener('change', async (e) => {
  try { const d = await api('auth/me', { method: 'PATCH', body: { leaderboard: e.target.checked } }); session.leaderboard = d.account.leaderboard; setSession({ token: session.token, account: d.account }); }
  catch { e.target.checked = !e.target.checked; }
});
load();
