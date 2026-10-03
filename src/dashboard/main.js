// Parent dashboard: signs in with the same account as the game and renders one card per child.
import { MINIGAMES } from '../data/minigames.js';
import { SUBJECTS } from '../constants.js';
import { skillLabel } from '../data/skills.js';
import { skillTip } from '../data/explanations.js';
import { getBadge } from '../data/badges.js';
import { getList } from '../data/spelling/lists.js';
import { roomFromGameId } from '../data/social/barbados.js';
import { resolveLook } from '../data/avatars.js';
import { layersFor, composeSheet, drawBustFromSheet, LPC_BASE } from '../ui/LpcCharacter.js';
import { cssVars } from '../ui/theme.js';

// The page's CSS variables come from the same tokens as the game so the two never drift.
for (const [k, v] of Object.entries(cssVars())) document.documentElement.style.setProperty(k, v);

const KEY = 'qa.cloud';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** "Pre-K", "Kindergarten", "Grade 3" (grades run from -1, Pre-K, to 8). */
const gradeName = (g) => (Number(g) <= -1 ? 'Pre-K' : Number(g) === 0 ? 'Kindergarten' : `Grade ${g}`);
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
    const room = roomFromGameId(r.gameId);
    const g = MINIGAMES.find((x) => x.id === r.gameId) || (r.gameId === 'spelling' ? { icon: '🐝', title: 'Spelling Bee' } : r.gameId === 'spelling-test' ? { icon: '📝', title: 'Weekly spelling test' } : room ? { icon: room.item, title: `${room.title} quiz` } : null);
    const detail = r.total ? `${r.correct} / ${r.total}` : r.levelId ? `level ${r.levelId}` : '';
    return `<tr><td>${when(r.at)}</td><td>${g ? g.icon + ' ' + esc(g.title) : esc(r.gameId)}</td><td>${stars(r.stars)}</td><td>${detail}</td><td>+${r.xp} XP</td></tr>`;
  }).join('');
  // Skills the game is revisiting (missed and not yet answered right three times since), each with a home tip.
  const weak = c.weakSkills && c.weakSkills.length ? c.weakSkills : c.practise.map((p) => p.skill);
  const practise = weak.length
    ? weak.slice(0, 5).map((id) => `<div class="tip"><span class="skill">${esc(skillLabel(id))}</span> <span class="muted">${esc(skillTip(id))}</span></div>`).join('')
    : '<span class="muted">Nothing stands out. Keep going!</span>';
  const misses = (c.recentMisses || []).map((m) => `<tr><td>${when(m.at)}</td><td>${esc(m.prompt)}</td><td><b>${esc(m.answer)}</b></td><td>${esc(skillLabel(m.skill))}</td></tr>`).join('');
  const wk = c.week || { plays: 0, stars: 0, minutes: 0 };
  const weekLine = wk.plays ? `This week: ${wk.plays} ${wk.plays === 1 ? 'game' : 'games'}, ${wk.stars} ★, ${wk.minutes} min` : 'No games this week yet';
  const badges = c.badges.length ? c.badges.map((id) => `<span class="badge">🏅 ${esc(getBadge(id)?.title || id)}</span>`).join('') : '<span class="muted">No badges yet.</span>';
  const sp = c.spelling || { practised: 0, learned: 0, tricky: [], sessions: 0, tests: [] };
  const testRows = (sp.tests || []).map((t) => {
    const list = getList(t.listId);
    const pct = t.total ? Math.round((t.correct / t.total) * 100) : 0;
    return `<tr><td>${when(new Date(t.at).toISOString())}</td><td>${esc(list ? list.title : t.listId)}</td><td><b>${t.correct} / ${t.total}</b></td><td><span class="${pct >= 80 ? 'subject-words' : pct >= 50 ? 'subject-code' : 'subject-bible'}">${pct}%</span></td></tr>`;
  }).join('');
  const spelling = sp.practised || testRows
    ? `<div class="tip">🐝 <b>${sp.learned}</b> ${sp.learned === 1 ? 'word' : 'words'} learned of ${sp.practised} practised, over ${sp.sessions} ${sp.sessions === 1 ? 'session' : 'sessions'}.</div>` +
      (sp.tricky.length ? `<div class="tip">Still tricky: ${sp.tricky.map((w) => `<span class="skill">${esc(w)}</span>`).join(' ')} <span class="muted">Try them out loud at home, then let them type the word into the Spelling Bee.</span></div>` : '<div class="muted">No tricky words at the moment.</div>') +
      (testRows ? `<h3>Weekly spelling tests</h3><table><tr><th>When</th><th>List</th><th>Score</th><th></th></tr>${testRows}</table>` : '<div class="muted">No weekly test taken yet. It is the "Weekly test" button on each list: every word from hearing alone, no hints.</div>')
    : '<div class="muted">No spelling practice yet. The Spelling Bee is on the home screen.</div>';
  const so = c.social || { rooms: [], read: 0, total: 0, stars: 0, maxStars: 0 };
  const socialRows = so.rooms.map((r) => `<tr><td>${r.item} ${esc(r.title)}</td><td>${r.read ? 'read' : '<span class="muted">not yet</span>'}</td><td>${stars(r.best)}</td><td>${r.plays ? `${r.plays} ${r.plays === 1 ? 'quiz' : 'quizzes'}${r.lastTotal ? `, last ${r.lastCorrect} / ${r.lastTotal}` : ''}` : '<span class="muted">no quiz yet</span>'}</td></tr>`).join('');
  const social = so.total
    ? `<div class="tip">🏠 <b>${so.read}</b> of ${so.total} room stories read, <b>${so.stars}</b> of ${so.maxStars} stars. Each room of the player's house tells a story about Barbados (the flag, the National Heroes, the parishes, the symbols, Crop Over) and ends with a five-question quiz.</div><table><tr><th>Room</th><th>Story</th><th>Best</th><th></th></tr>${socialRows}</table>`
    : '';
  const mk = c.market || { items: 0, spent: 0, sets: [] };
  const market = mk.items
    ? `<div class="tip">🧺 <b>${mk.items}</b> ${mk.items === 1 ? 'item' : 'items'} bought for <b>${mk.spent}</b> coins. Cards: ${mk.sets.map((s) => `${esc(s.name)} ${s.owned}/${s.total}`).join(', ')}.</div>`
    : '<div class="muted">Nothing bought yet. Coins from games can be spent at Auntie Vee\'s stall on the plaza: hats, paint for the house, and Barbados collector cards.</div>';
  const review = c.reviewQueue
    ? `<div class="tip">📚 <b>${c.reviewDue}</b> ${c.reviewDue === 1 ? 'question is' : 'questions are'} due for a quick review at the start of the next game (${c.reviewQueue} in the queue). Each one comes back a day, three days and a week later until it sticks.</div>`
    : '<div class="muted">Nothing waiting for review. Missed questions come back here on a spaced schedule.</div>';
  return `<section class="card">
    <div class="row"><canvas class="avatar" data-avatar="${c.avatar | 0}" data-look="${esc(JSON.stringify(c.look || null))}" width="48" height="48"></canvas>
      <div class="grow"><h2>${esc(c.name)}</h2><div class="muted">${gradeName(c.grade)} · last played ${when(c.lastPlayed)} · ${weekLine}</div></div></div>
    <h3>Progress</h3>
    <div class="stats">
      <div class="stat"><b>${c.level}</b><span>Level</span></div><div class="stat"><b>${c.xp}</b><span>XP</span></div>
      <div class="stat"><b>${c.stars}</b><span>Stars of ${MINIGAMES.length * 3}</span></div><div class="stat"><b>${c.coins}</b><span>Coins</span></div>
      <div class="stat"><b>${c.codingLevels}</b><span>Mazes solved</span></div><div class="stat"><b>${c.minutes}</b><span>Minutes played</span></div>
    </div>
    <h3>Last two weeks</h3>${activityChart(c.days || [])}
    <h3>Skills over time</h3>${trendTable(c.skillTrend || [])}
    <h3>Skills to practise, and what helps at home</h3><div>${practise}</div>
    <h3>Spelling Bee</h3>${spelling}
    <h3>Social studies: Barbados</h3>${social || '<div class="muted">Walk into the house on the map to find the rooms.</div>'}
    <h3>Market</h3>${market}
    <h3>Review queue</h3>${review}
    <h3>Questions missed recently</h3>${misses ? `<table><tr><th>When</th><th>Question</th><th>Answer</th><th>Skill</th></tr>${misses}</table>` : '<div class="muted">None recorded yet. Ask about these at dinner when they appear!</div>'}
    <h3>Badges</h3><div>${badges}</div>
    <h3>Games</h3><table><tr><th>Subject</th><th>Game</th><th>Best</th><th></th></tr>${gameRows}</table>
    <h3>Recent activity</h3>${recent ? `<table><tr><th>When</th><th>Game</th><th>Stars</th><th>Score</th><th></th></tr>${recent}</table>` : '<div class="muted">No games recorded yet. Results appear here after each game played while signed in.</div>'}
  </section>`;
}

/** Fourteen bars, one per day: games played, with stars as the label. */
function activityChart(days) {
  if (!days.length || !days.some((d) => d.plays)) return '<div class="muted">No games in the last two weeks.</div>';
  const max = Math.max(1, ...days.map((d) => d.plays));
  const W = 560, H = 120, pad = 22, bw = (W - pad * 2) / days.length;
  const bars = days.map((d, i) => {
    const h = (d.plays / max) * (H - 40), x = pad + i * bw + 3, y = H - 24 - h;
    const label = new Date(d.day + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'narrow' });
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${d.plays ? 'var(--primary)' : 'var(--line)'}"><title>${d.day}: ${d.plays} games, ${d.stars} stars, ${d.minutes} min</title></rect>` +
      (d.plays ? `<text x="${(x + (bw - 6) / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--ink2)">${d.plays}</text>` : '') +
      `<text x="${(x + (bw - 6) / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--ink3)">${esc(label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Games played per day">${bars}</svg>`;
}

/** One row per skill: accuracy this week as a bar, and the change against the three weeks before. */
function trendTable(rows) {
  if (!rows.length) return '<div class="muted">Skill trends appear after a few games played while signed in.</div>';
  const pct = (r, t) => (t ? Math.round((r / t) * 100) : null);
  const body = rows.map((s) => {
    const now = pct(s.right, s.total), before = pct(s.prevRight, s.prevTotal);
    const shown = now ?? before;
    const bar = shown === null ? '' : `<div style="background:var(--sunken);border-radius:999px;height:10px;overflow:hidden"><div style="width:${shown}%;height:10px;background:${shown >= 80 ? 'var(--success)' : shown >= 60 ? 'var(--warning)' : 'var(--danger)'}"></div></div>`;
    const delta = now !== null && before !== null ? now - before : null;
    const arrow = delta === null ? '<span class="muted">new</span>' : delta > 4 ? `<span class="subject-words">▲ ${delta}%</span>` : delta < -4 ? `<span style="color:var(--danger);font-weight:600">▼ ${-delta}%</span>` : '<span class="muted">steady</span>';
    return `<tr><td>${esc(skillLabel(s.skill))}</td><td style="min-width:120px">${bar}</td><td>${shown === null ? '–' : shown + '%'}</td><td>${now === null ? '' : `${s.right}/${s.total}`}</td><td>${arrow}</td></tr>`;
  }).join('');
  return `<table><tr><th>Skill</th><th>This week</th><th></th><th>Right</th><th>vs before</th></tr>${body}</table>`;
}

// The same face as in the game, composed from the Liberated Pixel Cup layers in public/lpc.
const lpcImages = {};
function loadImage(path) {
  if (lpcImages[path]) return Promise.resolve(lpcImages[path]);
  return new Promise((resolve) => { const img = new Image(); img.onload = () => { lpcImages[path] = img; resolve(img); }; img.onerror = () => resolve(null); img.src = LPC_BASE + path; });
}
async function drawAvatar(canvas) {
  let look = null;
  try { look = JSON.parse(canvas.dataset.look || 'null'); } catch { /* ignore */ }
  const l = resolveLook({ avatar: Number(canvas.dataset.avatar) || 0, look });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = l.bg || '#3d8bff'; ctx.beginPath(); ctx.arc(24, 24, 24, 0, Math.PI * 2); ctx.fill();
  const layers = layersFor(l);
  await Promise.all(layers.map((x) => loadImage(x.path)));
  const sheet = document.createElement('canvas'); sheet.width = 576; sheet.height = 256;
  const scratch = document.createElement('canvas'); scratch.width = 576; scratch.height = 256;
  composeSheet(sheet.getContext('2d', { willReadFrequently: true }), l, lpcImages, scratch);
  ctx.save(); ctx.beginPath(); ctx.arc(24, 24, 22, 0, Math.PI * 2); ctx.clip();
  drawBustFromSheet(ctx, sheet, 24, 25, 38);
  ctx.restore();
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
