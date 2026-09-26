import { handler, readJson, send, badRequest } from '../_lib/http.js';
import { db } from '../_lib/db.js';
import { hashPassword, signToken, normalizeEmail, validEmail, validPassword } from '../_lib/auth.js';

export default handler('POST', async (req, res) => {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return badRequest(res, 'invalid-email');
  if (!validPassword(body.password)) return badRequest(res, 'password-too-short');
  const sql = await db();
  const existing = await sql`SELECT id FROM accounts WHERE email = ${email}`;
  if (existing.length) return send(res, 409, { error: 'email-taken' });
  const rows = await sql`INSERT INTO accounts (email, password_hash) VALUES (${email}, ${hashPassword(body.password)}) RETURNING id, email, leaderboard`;
  const acc = rows[0];
  send(res, 201, { token: signToken({ sub: acc.id, email: acc.email }), account: acc });
});
