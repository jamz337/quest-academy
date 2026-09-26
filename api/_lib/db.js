// Neon Postgres over HTTP (works in Vercel serverless functions). Tables are created on first use.
import { neon } from '@neondatabase/serverless';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS saves (
  account_id BIGINT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS results (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  band TEXT,
  stars INT NOT NULL DEFAULT 0,
  correct INT,
  total INT,
  xp INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  time_ms INT,
  missed_skills TEXT[] NOT NULL DEFAULT '{}',
  level_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS results_account_created ON results (account_id, created_at DESC);
ALTER TABLE results ADD COLUMN IF NOT EXISTS question_log JSONB;
`;

let sqlClient = null;
let schemaReady = null;

export function configured() { return !!process.env.DATABASE_URL; }

/** Tagged-template query function: await sql\`SELECT ...\`. Throws CLOUD_NOT_CONFIGURED without DATABASE_URL. */
export async function db() {
  if (!configured()) { const e = new Error('DATABASE_URL is not set'); e.code = 'CLOUD_NOT_CONFIGURED'; throw e; }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await sqlClient.query(stmt);
    })().catch((e) => { schemaReady = null; throw e; });
  }
  await schemaReady;
  return sqlClient;
}
