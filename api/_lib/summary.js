// Pure helpers shared by the dashboard and leaderboard endpoints (unit-tested in tests/cloud.test.js).

export const levelFromXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;

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
      return {
        id: p.id, name: p.name, avatar: p.avatar, grade: p.grade,
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

/** Rows for the all-time board from saves: [{ name, avatar, xp, stars, grade }]. */
export function allTimeBoard(saves, limit = 20) {
  const rows = [];
  for (const s of saves) for (const p of Object.values(s.profiles || {})) {
    rows.push({ name: p.name, avatar: p.avatar ?? 0, grade: p.grade, xp: p.xp || 0, stars: totalStars(p) });
  }
  return rows.sort((a, b) => b.xp - a.xp || b.stars - a.stars).slice(0, limit);
}
