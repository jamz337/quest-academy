import { handler, send } from './_lib/http.js';
import { db } from './_lib/db.js';
import { requireUser } from './_lib/auth.js';
import { summarize } from './_lib/summary.js';

/** Parent dashboard data for the signed-in account: one card per child profile. */
export default handler('GET', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const sql = await db();
  const saves = await sql`SELECT data, updated_at FROM saves WHERE account_id = ${user.id}`;
  const results = await sql`SELECT profile_id, profile_name, game_id, band, stars, correct, total, xp, coins, time_ms, missed_skills, level_id, question_log, created_at
                            FROM results WHERE account_id = ${user.id} ORDER BY created_at DESC LIMIT 500`;
  send(res, 200, { account: user, updatedAt: saves[0]?.updated_at || null, children: summarize(saves[0]?.data || null, results) });
});
