import { handler, readJson, send, badRequest, query } from './_lib/http.js';
import { db } from './_lib/db.js';
import { requireUser } from './_lib/auth.js';

const int = (v, d = null) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);

/** POST: record one finished game. GET: ?limit=50 recent results for the account (newest first). */
export default handler(['GET', 'POST'], async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const sql = await db();
  if (req.method === 'GET') {
    const limit = Math.min(500, Math.max(1, int(query(req).limit, 100)));
    const rows = await sql`SELECT profile_id, profile_name, game_id, band, stars, correct, total, xp, coins, time_ms, missed_skills, level_id, created_at
                           FROM results WHERE account_id = ${user.id} ORDER BY created_at DESC LIMIT ${limit}`;
    return send(res, 200, { results: rows });
  }
  const b = await readJson(req);
  if (!b.profileId || !b.gameId) return badRequest(res, 'invalid-result');
  const missed = Array.isArray(b.missedSkills) ? b.missedSkills.slice(0, 10).map(String) : [];
  await sql`INSERT INTO results (account_id, profile_id, profile_name, game_id, band, stars, correct, total, xp, coins, time_ms, missed_skills, level_id)
            VALUES (${user.id}, ${String(b.profileId).slice(0, 40)}, ${String(b.profileName || 'Player').slice(0, 20)}, ${String(b.gameId).slice(0, 40)},
                    ${b.band ? String(b.band).slice(0, 4) : null}, ${int(b.stars, 0)}, ${int(b.correct)}, ${int(b.total)}, ${int(b.xp, 0)}, ${int(b.coins, 0)},
                    ${int(b.timeMs)}, ${missed}, ${b.levelId ? String(b.levelId).slice(0, 20) : null})`;
  send(res, 201, { ok: true });
});
