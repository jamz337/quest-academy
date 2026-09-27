// Pure helpers shared by the dashboard and leaderboard endpoints (unit-tested in tests/cloud.test.js).
import { reviewable, dueAt } from '../../src/systems/Review.js';
import { ROOMS } from '../../src/data/social/barbados.js';
import { marketSummary } from '../../src/systems/Market.js';

export const levelFromXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
const DAY = 86400000;
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

/**
 * Per-skill accuracy from the question logs of recent results: the last 7 days against the 3 weeks before,
 * so a parent can see what is improving. [{ skill, right, total, prevRight, prevTotal }], most-asked first.
 */
export function skillTrend(results, now = Date.now()) {
  const by = {};
  for (const r of results) {
    const log = Array.isArray(r.question_log) ? r.question_log : [];
    const age = now - new Date(r.created_at).getTime();
    if (age > 28 * DAY) continue;
    const recent = age <= 7 * DAY;
    for (const q of log) {
      if (!q || !q.skill) continue;
      const s = (by[q.skill] ||= { skill: q.skill, right: 0, total: 0, prevRight: 0, prevTotal: 0 });
      if (recent) { s.total += 1; if (q.right) s.right += 1; } else { s.prevTotal += 1; if (q.right) s.prevRight += 1; }
    }
  }
  return Object.values(by).sort((a, b) => (b.total + b.prevTotal) - (a.total + a.prevTotal)).slice(0, 12);
}

/** Spelling progress: words learned (spelled right three times from hearing), practised, and the tricky ones. */
export function spellingSummary(p) {
  const words = Object.entries(p.spelling?.words || {});
  const learned = words.filter(([, s]) => (s.heardRight | 0) >= 3).map(([w]) => w);
  const tricky = words.filter(([, s]) => s.wrong > 0 && s.wrong >= s.right).map(([w]) => w).slice(0, 10);
  const tests = (p.spelling?.tests || []).slice(-8).reverse().map((t) => ({ listId: t.listId, correct: t.correct, total: t.total, at: t.at }));
  return { practised: words.length, learned: learned.length, tricky, sessions: p.spelling?.sessions | 0, tests };
}

/** Social studies in the house: each Barbados room's story read, quiz plays and best stars. */
export function socialSummary(p) {
  const rooms = ROOMS.map((r) => { const rec = p.social?.rooms?.[r.id] || {}; return { id: r.id, title: r.title, item: r.item, read: !!rec.read, plays: rec.plays | 0, best: rec.best | 0, lastCorrect: rec.lastCorrect ?? null, lastTotal: rec.lastTotal ?? null }; });
  return { rooms, read: rooms.filter((r) => r.read).length, total: rooms.length, stars: rooms.reduce((n, r) => n + r.best, 0), maxStars: rooms.length * 3 };
}

/** Games, stars and minutes per day for the last `n` days, oldest first (empty days included). */
export function dailyActivity(results, n = 14, now = Date.now()) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push({ day: dayKey(now - i * DAY), plays: 0, stars: 0, minutes: 0 });
  const idx = Object.fromEntries(days.map((d, i) => [d.day, i]));
  for (const r of results) {
    const d = days[idx[dayKey(new Date(r.created_at).getTime())]];
    if (!d) continue;
    d.plays += 1; d.stars += r.stars || 0; d.minutes += (r.time_ms || 0) / 60000;
  }
  for (const d of days) d.minutes = Math.round(d.minutes);
  return days;
}

/** Total best stars across every game record of a profile. */
export function totalStars(profile) {
  return Object.values(profile.games || {}).reduce((s, g) => s + (g.bestStars || 0), 0);
}

/**
 * Build the parent dashboard view: one card per profile with stars per game, badges and the skills that
 * came up most often as "missed" in recent results.
 */
export function summarize(save, results = [], now = Date.now()) {
  const profiles = Object.values((save && save.profiles) || {});
  const byProfile = {};
  for (const r of results) (byProfile[r.profile_id] ||= []).push(r);
  return profiles
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((p) => {
      const rs = byProfile[p.id] || [];
      const recent = rs.filter((r) => now - new Date(r.created_at).getTime() < 30 * 86400000);
      const missed = {};
      for (const r of recent) for (const s of r.missed_skills || []) missed[s] = (missed[s] || 0) + 1;
      const practise = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([skill, count]) => ({ skill, count }));
      const minutes = Math.round(rs.reduce((s, r) => s + (r.time_ms || 0), 0) / 60000);
      const week = rs.filter((r) => now - new Date(r.created_at).getTime() < 7 * 86400000);
      const weak = Object.entries(p.skills || {}).filter(([, r]) => r.missed > 0 && r.sinceMiss < 3).map(([id]) => id);
      const misses = p.recentMisses || [];
      return {
        id: p.id, name: p.name, avatar: p.avatar, look: p.look || null, grade: p.grade,
        week: { plays: week.length, stars: week.reduce((s, r) => s + (r.stars || 0), 0), xp: week.reduce((s, r) => s + (r.xp || 0), 0), minutes: Math.round(week.reduce((s, r) => s + (r.time_ms || 0), 0) / 60000) },
        weakSkills: weak, recentMisses: misses.slice(0, 10), mastery: p.mastery || {},
        reviewDue: misses.filter((m) => reviewable(m) && dueAt(m) <= now).length, reviewQueue: misses.filter(reviewable).length,
        spelling: spellingSummary(p), social: socialSummary(p), market: marketSummary(p),
        skillTrend: skillTrend(rs, now), days: dailyActivity(rs, 14, now),
        xp: p.xp || 0, level: levelFromXp(p.xp || 0), coins: p.coins || 0, stars: totalStars(p),
        badges: p.badges || [], games: p.games || {},
        codingLevels: Object.values(p.coding?.levels || {}).filter((l) => l.stars > 0).length,
        plays: rs.length, minutes, practise,
        lastPlayed: p.updatedAt || null,
        recent: rs.slice(0, 15).map((r) => ({
          gameId: r.game_id, stars: r.stars, correct: r.correct, total: r.total, xp: r.xp, levelId: r.level_id, at: r.created_at
        }))
      };
    });
}

/** Rows for the all-time board from saves: [{ name, avatar, look, xp, stars, grade }]. */
export function allTimeBoard(saves, limit = 20) {
  const rows = [];
  for (const s of saves) for (const p of Object.values(s.profiles || {})) {
    rows.push({ name: p.name, avatar: p.avatar ?? 0, look: p.look || null, grade: p.grade, xp: p.xp || 0, stars: totalStars(p) });
  }
  return rows.sort((a, b) => b.xp - a.xp || b.stars - a.stars).slice(0, limit);
}
