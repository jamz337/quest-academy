// Passwords: scrypt with a random salt. Sessions: compact HMAC-signed tokens (no external dependency).
import crypto from 'node:crypto';
import { db } from './db.js';
import { unauthorized } from './http.js';

const TOKEN_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return test.length === ref.length && crypto.timingSafeEqual(test, ref);
}

/** AUTH_SECRET if set, otherwise derived from DATABASE_URL (which is itself a secret). */
export function secret() {
  const s = process.env.AUTH_SECRET || process.env.DATABASE_URL;
  if (!s) { const e = new Error('no secret'); e.code = 'CLOUD_NOT_CONFIGURED'; throw e; }
  return crypto.createHash('sha256').update(s).digest();
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (payload, key) => crypto.createHmac('sha256', key).update(payload).digest('base64url');

export function signToken(claims, key = secret(), now = Date.now()) {
  const body = b64(JSON.stringify({ ...claims, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + TOKEN_DAYS * 86400 }));
  return `${body}.${sign(body, key)}`;
}

export function verifyToken(token, key = secret(), now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body, key);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!claims.exp || claims.exp * 1000 < now) return null;
    return claims;
  } catch { return null; }
}

export const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;
export const validPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 200;

/** Resolve the signed-in account from the Authorization header, or answer 401 and return null. */
export async function requireUser(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const claims = verifyToken(token);
  if (!claims) { unauthorized(res); return null; }
  const sql = await db();
  const rows = await sql`SELECT id, email, leaderboard FROM accounts WHERE id = ${claims.sub}`;
  if (!rows.length) { unauthorized(res); return null; }
  return rows[0];
}
