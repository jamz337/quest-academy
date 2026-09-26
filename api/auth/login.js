import { handler, readJson, send } from '../_lib/http.js';
import { db } from '../_lib/db.js';
import { verifyPassword, signToken, normalizeEmail } from '../_lib/auth.js';

export default handler('POST', async (req, res) => {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const sql = await db();
  const rows = await sql`SELECT id, email, password_hash, leaderboard FROM accounts WHERE email = ${email}`;
  if (!rows.length || !verifyPassword(body.password, rows[0].password_hash)) return send(res, 401, { error: 'wrong-email-or-password' });
  const { id, leaderboard } = rows[0];
  send(res, 200, { token: signToken({ sub: id, email }), account: { id, email, leaderboard } });
});
