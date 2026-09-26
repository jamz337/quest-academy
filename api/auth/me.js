import { handler, readJson, send, badRequest } from '../_lib/http.js';
import { db } from '../_lib/db.js';
import { requireUser, hashPassword, verifyPassword, validPassword } from '../_lib/auth.js';

/** GET: who am I. PATCH: { leaderboard?: boolean, password?: { current, next } }. */
export default handler(['GET', 'PATCH'], async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method === 'GET') return send(res, 200, { account: user });
  const body = await readJson(req);
  const sql = await db();
  if (typeof body.leaderboard === 'boolean') await sql`UPDATE accounts SET leaderboard = ${body.leaderboard} WHERE id = ${user.id}`;
  if (body.password) {
    if (!validPassword(body.password.next)) return badRequest(res, 'password-too-short');
    const rows = await sql`SELECT password_hash FROM accounts WHERE id = ${user.id}`;
    if (!verifyPassword(body.password.current, rows[0].password_hash)) return send(res, 401, { error: 'wrong-email-or-password' });
    await sql`UPDATE accounts SET password_hash = ${hashPassword(body.password.next)} WHERE id = ${user.id}`;
  }
  const rows = await sql`SELECT id, email, leaderboard FROM accounts WHERE id = ${user.id}`;
  send(res, 200, { account: rows[0] });
});
