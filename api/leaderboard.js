import { handler, send } from './_lib/http.js';
import { db } from './_lib/db.js';
import { allTimeBoard } from './_lib/summary.js';

/** Public. { allTime: [{name, avatar, grade, xp, stars}], week: [{name, avatar, xp, games}] } — first names and avatars only. */
export default handler('GET', async (req, res) => {
  const sql = await db();
  const saves = await sql`SELECT s.data FROM saves s JOIN accounts a ON a.id = s.account_id WHERE a.leaderboard`;
  const allTime = allTimeBoard(saves.map((r) => r.data), 20);
  const week = await sql`
    SELECT r.profile_name AS name, r.account_id, r.profile_id, SUM(r.xp)::int AS xp, COUNT(*)::int AS games
    FROM results r JOIN accounts a ON a.id = r.account_id
    WHERE a.leaderboard AND r.created_at > now() - interval '7 days'
    GROUP BY r.account_id, r.profile_id, r.profile_name
    ORDER BY xp DESC LIMIT 20`;
  // Attach avatars from the saves for the weekly rows.
  const avatars = {};
  for (const r of await sql`SELECT s.account_id, p.key AS pid, (p.value->>'avatar')::int AS avatar
                            FROM saves s, jsonb_each(s.data->'profiles') p`) avatars[`${r.account_id}:${r.pid}`] = r.avatar;
  res.setHeader('Cache-Control', 'public, max-age=60');
  send(res, 200, {
    allTime,
    week: week.map((r) => ({ name: r.name, avatar: avatars[`${r.account_id}:${r.profile_id}`] ?? 0, xp: r.xp, games: r.games }))
  });
});
