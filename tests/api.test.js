// The serverless API against a fake database: every handler's validation, status codes and the SQL it sends.
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.AUTH_SECRET = 'test-secret';
delete process.env.DATABASE_URL;

// A tagged-template `sql` whose answers are scripted per test; every call is recorded for assertions.
const fake = { calls: [], answers: [] };
const sql = (strings, ...values) => {
  const text = strings.join('?').replace(/\s+/g, ' ').trim();
  fake.calls.push({ text, values });
  const a = fake.answers.find((x) => x.match.test(text));
  return Promise.resolve(a ? (typeof a.rows === 'function' ? a.rows(values, text) : a.rows) : []);
};
vi.mock('../api/_lib/db.js', () => ({ db: async () => { if (fake.unconfigured) { const e = new Error('no db'); e.code = 'CLOUD_NOT_CONFIGURED'; throw e; } return sql; }, configured: () => !fake.unconfigured }));

const { signToken } = await import('../api/_lib/auth.js');
const { handler } = await import('../api/_lib/http.js');
const { skillTrend, dailyActivity, summarize } = await import('../api/_lib/summary.js');
const register = (await import('../api/auth/register.js')).default;
const login = (await import('../api/auth/login.js')).default;
const me = (await import('../api/auth/me.js')).default;
const results = (await import('../api/results.js')).default;
const save = (await import('../api/save.js')).default;
const dashboard = (await import('../api/dashboard.js')).default;
const leaderboard = (await import('../api/leaderboard.js')).default;
const { newProfile, defaultSave } = await import('../src/systems/SaveSystem.js');

const USER = { id: 7, email: 'p@example.com', leaderboard: true };
const token = () => signToken({ sub: USER.id, email: USER.email });
function call(fn, { method = 'GET', url = '/api/x', body, auth = true } = {}) {
  const req = { method, url, headers: auth ? { authorization: 'Bearer ' + token() } : {}, body };
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  return fn(req, res).then(() => res);
}
const answer = (re, rows) => fake.answers.push({ match: re, rows });
const userRow = () => answer(/SELECT id, email, leaderboard FROM accounts WHERE id/, [USER]);

beforeEach(() => { fake.calls = []; fake.answers = []; fake.unconfigured = false; });

describe('http handler', () => {
  it('rejects other methods, reports a missing database as 503 and hides other errors', async () => {
    const ok = handler('GET', async (req, res) => { res.statusCode = 200; res.end('{"ok":true}'); });
    expect((await call(ok, { method: 'POST' })).statusCode).toBe(405);
    const noDb = handler('GET', async () => { const e = new Error('x'); e.code = 'CLOUD_NOT_CONFIGURED'; throw e; });
    expect((await call(noDb)).body).toEqual({ error: 'cloud-not-configured' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = handler('GET', async () => { throw new Error('secret detail'); });
    const r = await call(boom);
    expect(r.statusCode).toBe(500); expect(JSON.stringify(r.body)).not.toContain('secret detail');
    spy.mockRestore();
  });
});

describe('auth', () => {
  it('registers with validation and a fresh token', async () => {
    expect((await call(register, { method: 'POST', body: { email: 'nope', password: 'longenough' }, auth: false })).body).toEqual({ error: 'invalid-email' });
    expect((await call(register, { method: 'POST', body: { email: 'a@b.co', password: 'short' }, auth: false })).body).toEqual({ error: 'password-too-short' });
    answer(/SELECT id FROM accounts WHERE email/, [{ id: 1 }]);
    expect((await call(register, { method: 'POST', body: { email: 'A@B.co', password: 'longenough' }, auth: false })).statusCode).toBe(409);
    fake.answers = [];
    answer(/INSERT INTO accounts/, [{ id: 9, email: 'a@b.co', leaderboard: true }]);
    const r = await call(register, { method: 'POST', body: { email: ' A@B.co ', password: 'longenough' }, auth: false });
    expect(r.statusCode).toBe(201);
    expect(r.body.account).toEqual({ id: 9, email: 'a@b.co', leaderboard: true });
    expect(typeof r.body.token).toBe('string');
    expect(fake.calls.at(-1).values[0]).toBe('a@b.co');   // normalised before storing
    expect(fake.calls.at(-1).values[1]).not.toBe('longenough');   // hashed
  });

  it('logs in only with the right password and answers who-am-i', async () => {
    const { hashPassword } = await import('../api/_lib/auth.js');
    answer(/SELECT id, email, password_hash, leaderboard FROM accounts WHERE email/, [{ id: 7, email: USER.email, password_hash: hashPassword('correct horse'), leaderboard: true }]);
    expect((await call(login, { method: 'POST', body: { email: USER.email, password: 'wrong' }, auth: false })).statusCode).toBe(401);
    const ok = await call(login, { method: 'POST', body: { email: USER.email, password: 'correct horse' }, auth: false });
    expect(ok.statusCode).toBe(200); expect(ok.body.account.id).toBe(7);
    userRow();
    expect((await call(me)).body.account).toEqual(USER);
    expect((await call(me, { auth: false })).statusCode).toBe(401);
  });
});

describe('results', () => {
  it('needs a session, validates the body, clips what it stores and lists recent rows', async () => {
    expect((await call(results, { method: 'POST', body: {}, auth: false })).statusCode).toBe(401);
    userRow();
    expect((await call(results, { method: 'POST', body: { gameId: 'x' } })).body).toEqual({ error: 'invalid-result' });
    const questions = Array.from({ length: 50 }, (_, i) => ({ skill: 'add', right: i % 2 === 0, ms: 1200 }));
    const r = await call(results, { method: 'POST', body: { profileId: 'p_1', profileName: 'A'.repeat(40), gameId: 'math-dash', band: 'A', stars: 2.4, correct: 7, total: 10, xp: 90, coins: 24, timeMs: 61000, missedSkills: Array.from({ length: 15 }, (_, i) => 's' + i), questions } });
    expect(r.statusCode).toBe(201);
    const ins = fake.calls.find((c) => c.text.startsWith('INSERT INTO results'));
    expect(ins.values[0]).toBe(USER.id);
    expect(ins.values[2]).toHaveLength(20);          // profile name clipped
    expect(ins.values[5]).toBe(2);                   // stars rounded
    expect(ins.values[11]).toHaveLength(10);         // at most 10 missed skills
    expect(JSON.parse(ins.values[13])).toHaveLength(40);   // at most 40 logged questions
    answer(/FROM results WHERE account_id/, [{ game_id: 'math-dash', stars: 2 }]);
    const list = await call(results, { url: '/api/results?limit=5000' });
    expect(list.body.results).toEqual([{ game_id: 'math-dash', stars: 2 }]);
    expect(fake.calls.at(-1).values.at(-1)).toBe(500);   // limit capped
  });
});

describe('save', () => {
  it('returns the stored save, validates uploads and merges with what the server has', async () => {
    userRow();
    answer(/SELECT data, updated_at FROM saves/, []);
    expect((await call(save)).body).toEqual({ data: null, updatedAt: null });
    expect((await call(save, { method: 'PUT', body: { data: { nope: 1 } } })).body).toEqual({ error: 'invalid-save' });
    const big = defaultSave(); big.profiles.p_big = { ...newProfile({ name: 'B' }), blob: 'x'.repeat(600 * 1024) };
    expect((await call(save, { method: 'PUT', body: { data: big } })).body).toEqual({ error: 'save-too-large' });
    const server = defaultSave(), a = { ...newProfile({ name: 'Old' }), updatedAt: 100 }; server.profiles[a.id] = a;
    const device = defaultSave(), b = { ...newProfile({ name: 'New' }), updatedAt: 200 }; device.profiles[b.id] = b; device.activeProfileId = b.id;
    fake.answers = []; userRow();
    answer(/SELECT data, updated_at FROM saves/, [{ data: server, updated_at: '2026-09-01T00:00:00Z' }]);
    answer(/INSERT INTO saves/, []);
    const r = await call(save, { method: 'PUT', body: { data: device } });
    expect(r.statusCode).toBe(200);
    expect(Object.keys(r.body.data.profiles).sort()).toEqual([a.id, b.id].sort());
    expect(r.body.data.activeProfileId).toBe(b.id);
    const ins = fake.calls.find((c) => c.text.startsWith('INSERT INTO saves'));
    expect(JSON.parse(ins.values[1]).profiles[a.id].name).toBe('Old');
  });
});

describe('dashboard and leaderboard', () => {
  it('summarises each child with trends, activity and the review queue', async () => {
    const p = newProfile({ name: 'Zed', grade: 5 });
    p.recentMisses = [{ prompt: '6 × 7', answer: '42', skill: 'mult', choices: ['42', '36'], gameId: 'math-dash', at: Date.now() - 2 * 86400000 }];
    const s = defaultSave(); s.profiles[p.id] = p;
    const now = Date.now();
    const rows = [
      { profile_id: p.id, game_id: 'math-dash', stars: 3, correct: 9, total: 10, xp: 100, time_ms: 60000, missed_skills: [], question_log: [{ skill: 'mult', right: true }, { skill: 'mult', right: false }, { skill: 'add', right: true }], created_at: new Date(now).toISOString() },   // just now: an hour ago is yesterday's column just after midnight UTC
      { profile_id: p.id, game_id: 'math-dash', stars: 1, correct: 5, total: 10, xp: 50, time_ms: 60000, missed_skills: ['mult'], question_log: [{ skill: 'mult', right: false }, { skill: 'mult', right: false }], created_at: new Date(now - 10 * 86400000).toISOString() }
    ];
    userRow();
    answer(/SELECT data, updated_at FROM saves/, [{ data: s, updated_at: '2026-09-20T00:00:00Z' }]);
    answer(/FROM results WHERE account_id/, rows);
    const r = await call(dashboard);
    expect(r.statusCode).toBe(200);
    expect(fake.calls.some((c) => c.text.includes('question_log'))).toBe(true);
    const [card] = r.body.children;
    expect(card.name).toBe('Zed');
    expect(card.reviewDue).toBe(1); expect(card.reviewQueue).toBe(1);
    expect(card.skillTrend[0]).toEqual({ skill: 'mult', right: 1, total: 2, prevRight: 0, prevTotal: 2 });
    expect(card.days).toHaveLength(14);
    expect(card.days.at(-1).plays).toBe(1);
    expect(card.days.reduce((n, d) => n + d.plays, 0)).toBe(2);
    expect(skillTrend([], now)).toEqual([]);
    expect(dailyActivity([], 3, now).map((d) => d.plays)).toEqual([0, 0, 0]);
    expect(summarize(null, [])).toEqual([]);
  });

  it('builds the public boards from saves and weekly results without exposing accounts', async () => {
    const a = { ...newProfile({ name: 'Amy' }), xp: 300 };
    const s = defaultSave(); s.profiles[a.id] = a;
    answer(/SELECT s\.data FROM saves/, [{ data: s }]);
    answer(/SUM\(r\.xp\)/, [{ name: 'Amy', account_id: 7, profile_id: a.id, xp: 120, games: 3 }]);
    answer(/jsonb_each/, [{ account_id: 7, pid: a.id, avatar: 2, look: null }]);
    const r = await call(leaderboard, { auth: false });
    expect(r.body.allTime[0]).toMatchObject({ name: 'Amy', xp: 300 });
    expect(r.body.week).toEqual([{ name: 'Amy', avatar: 2, look: null, xp: 120, games: 3 }]);
    expect(JSON.stringify(r.body)).not.toContain('account_id');
    expect(r.headers['Cache-Control']).toContain('max-age');
  });

  it('answers 503 when the database is not configured', async () => {
    fake.unconfigured = true;
    expect((await call(leaderboard, { auth: false })).statusCode).toBe(503);
  });
});
