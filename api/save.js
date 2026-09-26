import { handler, readJson, send, badRequest } from './_lib/http.js';
import { db } from './_lib/db.js';
import { requireUser } from './_lib/auth.js';
import { mergeSaves } from '../src/systems/SaveSystem.js';

const MAX_BYTES = 512 * 1024;

/** GET: the account's save. PUT: { data } merged with what the server has (newest profile wins). */
export default handler(['GET', 'PUT'], async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const sql = await db();
  const rows = await sql`SELECT data, updated_at FROM saves WHERE account_id = ${user.id}`;
  if (req.method === 'GET') return send(res, 200, { data: rows[0]?.data || null, updatedAt: rows[0]?.updated_at || null });

  const body = await readJson(req);
  const incoming = body.data;
  if (!incoming || typeof incoming !== 'object' || !incoming.profiles) return badRequest(res, 'invalid-save');
  if (JSON.stringify(incoming).length > MAX_BYTES) return badRequest(res, 'save-too-large');
  const merged = rows.length ? mergeSaves(rows[0].data, incoming) : incoming;
  const json = JSON.stringify(merged);
  await sql`INSERT INTO saves (account_id, data, updated_at) VALUES (${user.id}, ${json}::jsonb, now())
            ON CONFLICT (account_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
  send(res, 200, { data: merged, updatedAt: new Date().toISOString() });
});
