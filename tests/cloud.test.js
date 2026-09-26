import { describe, it, expect } from 'vitest';
import { mergeSaves, newProfile, defaultSave } from '../src/systems/SaveSystem.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../api/_lib/auth.js';
import { summarize, allTimeBoard, totalStars } from '../api/_lib/summary.js';

const KEY = Buffer.alloc(32, 7);

function saveWith(...profiles) {
  const s = defaultSave();
  for (const p of profiles) s.profiles[p.id] = p;
  s.activeProfileId = profiles[0]?.id || null;
  return s;
}

describe('mergeSaves', () => {
  it('unions profiles from both sides', () => {
    const a = newProfile({ name: 'A' }), b = newProfile({ name: 'B' });
    const m = mergeSaves(saveWith(a), saveWith(b));
    expect(Object.keys(m.profiles).sort()).toEqual([a.id, b.id].sort());
    expect(m.activeProfileId).toBe(b.id);
  });

  it('keeps the newer copy of the same profile', () => {
    const p = newProfile({ name: 'Kid' });
    const older = { ...p, xp: 10, updatedAt: 100 }, newer = { ...p, xp: 50, updatedAt: 200 };
    expect(mergeSaves(saveWith(older), saveWith(newer)).profiles[p.id].xp).toBe(50);
    expect(mergeSaves(saveWith(newer), saveWith(older)).profiles[p.id].xp).toBe(50);
  });

  it('honours delete tombstones from either side', () => {
    const p = { ...newProfile({ name: 'Gone' }), updatedAt: 100 };
    const local = defaultSave(); local.deleted[p.id] = 150;
    const m = mergeSaves(saveWith(p), local);
    expect(m.profiles[p.id]).toBeUndefined();
    expect(m.deleted[p.id]).toBe(150);
    // A profile edited after the delete comes back (it was recreated / kept on purpose)
    const revived = { ...p, updatedAt: 300 };
    expect(mergeSaves(local, saveWith(revived)).profiles[p.id]).toBeTruthy();
  });

  it('falls back to a live profile when the incoming active one is gone', () => {
    const a = newProfile({ name: 'A' });
    const incoming = defaultSave(); incoming.activeProfileId = 'p_missing';
    expect(mergeSaves(saveWith(a), incoming).activeProfileId).toBe(a.id);
  });
});

describe('auth primitives', () => {
  it('hashes and verifies passwords with a per-user salt', () => {
    const h1 = hashPassword('correct horse'), h2 = hashPassword('correct horse');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('correct horse', h1)).toBe(true);
    expect(verifyPassword('wrong', h1)).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
  });

  it('signs and verifies tokens, rejecting tampering and expiry', () => {
    const t = signToken({ sub: 42, email: 'a@b.c' }, KEY, 1_000_000_000_000);
    expect(verifyToken(t, KEY, 1_000_000_000_000).sub).toBe(42);
    expect(verifyToken(t, Buffer.alloc(32, 8), 1_000_000_000_000)).toBeNull();
    const [body, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 1, exp: 9e12 })).toString('base64url') + '.' + sig;
    expect(verifyToken(forged, KEY)).toBeNull();
    expect(verifyToken(body + '.' + sig, KEY, 1_000_000_000_000 + 31 * 86400 * 1000)).toBeNull();
    expect(verifyToken(undefined, KEY)).toBeNull();
  });
});

describe('dashboard summary', () => {
  it('summarises profiles with stars, level and skills to practise', () => {
    const p = { ...newProfile({ name: 'Zed', grade: 5 }), xp: 450, coins: 20, updatedAt: 5,
      games: { 'math-dash': { bestStars: 2 }, 'eng-match': { bestStars: 3 } }, badges: ['first-win'], coding: { levels: { A1: { stars: 3 }, A2: { stars: 0 } } } };
    const now = Date.now();
    const results = [
      { profile_id: p.id, game_id: 'math-dash', stars: 2, correct: 7, total: 10, xp: 100, time_ms: 60000, missed_skills: ['mult', 'div'], created_at: new Date(now - 1000).toISOString() },
      { profile_id: p.id, game_id: 'math-dash', stars: 1, correct: 5, total: 10, xp: 50, time_ms: 60000, missed_skills: ['mult'], created_at: new Date(now - 2000).toISOString() },
      { profile_id: 'other', game_id: 'math-dash', stars: 3, xp: 1, missed_skills: ['sub'], created_at: new Date(now).toISOString() }
    ];
    const [card] = summarize(saveWith(p), results, now);
    expect(card.name).toBe('Zed');
    expect(card.stars).toBe(5);
    expect(card.level).toBe(3);
    expect(card.codingLevels).toBe(1);
    expect(card.plays).toBe(2);
    expect(card.minutes).toBe(2);
    expect(card.practise[0]).toEqual({ skill: 'mult', count: 2 });
    expect(card.recent).toHaveLength(2);
    expect(totalStars(p)).toBe(5);
  });

  it('ranks the all-time board by xp then stars', () => {
    const a = { ...newProfile({ name: 'A' }), xp: 100 }, b = { ...newProfile({ name: 'B' }), xp: 300 };
    const c = { ...newProfile({ name: 'C' }), xp: 100, games: { x: { bestStars: 3 } } };
    const board = allTimeBoard([saveWith(a), saveWith(b, c)]);
    expect(board.map((r) => r.name)).toEqual(['B', 'C', 'A']);
    expect(board[0]).not.toHaveProperty('id');
  });
});
