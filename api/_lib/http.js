// Tiny helpers so every function works both on Vercel and under scripts/dev-api.mjs (plain Node http).

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export const badRequest = (res, msg) => send(res, 400, { error: msg });
export const unauthorized = (res) => send(res, 401, { error: 'sign-in-required' });

/** Parse a JSON body (Vercel may already have parsed it into req.body). */
export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export function query(req) {
  const url = new URL(req.url || '/', 'http://local');
  return Object.fromEntries(url.searchParams.entries());
}

/** Wrap a handler: 405 for other methods, structured errors instead of stack traces. */
export function handler(methods, fn) {
  const allowed = Array.isArray(methods) ? methods : [methods];
  return async (req, res) => {
    if (!allowed.includes(req.method)) { res.setHeader('Allow', allowed.join(', ')); return send(res, 405, { error: 'method-not-allowed' }); }
    try {
      await fn(req, res);
    } catch (e) {
      if (e && e.code === 'CLOUD_NOT_CONFIGURED') return send(res, 503, { error: 'cloud-not-configured' });
      console.error(e);
      send(res, 500, { error: 'server-error' });
    }
  };
}
