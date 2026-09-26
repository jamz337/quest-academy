// Runs the api/ functions locally on port 3001 (Vite proxies /api to it). Reads DATABASE_URL etc. from .env.
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const envPath = path.resolve('.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !m[1].startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.API_PORT) || 3001;
const modules = new Map();

async function route(req, res) {
  const url = new URL(req.url, 'http://local');
  const rel = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const parts = rel.split('/');
  if (!rel || parts.some((p) => !p || p.startsWith('_') || p.includes('..'))) { res.statusCode = 404; return res.end('{"error":"not-found"}'); }
  const file = path.resolve('api', rel + '.js');
  if (!existsSync(file)) { res.statusCode = 404; return res.end('{"error":"not-found"}'); }
  if (!modules.has(file)) modules.set(file, import(pathToFileURL(file).href));
  const mod = await modules.get(file);
  return mod.default(req, res);
}

http.createServer((req, res) => {
  route(req, res).catch((e) => { console.error(e); res.statusCode = 500; res.end('{"error":"server-error"}'); });
}).listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}/api  (cloud ${process.env.DATABASE_URL ? 'configured' : 'NOT configured: set DATABASE_URL in .env'})`);
});
