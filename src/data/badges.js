import { MINIGAMES, gamesForSubject } from './minigames.js';

const bestStars = (profile, id) => profile.games[id]?.bestStars || 0;
const subjectStars = (profile, subject) => gamesForSubject(subject).reduce((s, g) => s + bestStars(profile, g.id), 0);

/** Badges are checked after every result. `test` receives the updated profile and the latest result. */
export const BADGES = [
  { id: 'first-win', title: 'First Steps', desc: 'Finish your first game', test: (p) => Object.keys(p.games).length >= 1 },
  { id: 'perfect', title: 'Perfect!', desc: 'Get every answer right in a game', test: (p, r) => r && !r.aborted && r.total > 0 && r.correct === r.total },
  { id: 'math-star', title: 'Math Star', desc: '3 stars in every Math game', test: (p) => subjectStars(p, 'math') >= 9 },
  { id: 'word-wizard', title: 'Word Wizard', desc: '3 stars in every English game', test: (p) => subjectStars(p, 'words') >= 9 },
  { id: 'code-captain', title: 'Code Captain', desc: '3 stars in every Coding game', test: (p) => subjectStars(p, 'code') >= 9 },
  { id: 'explorer', title: 'Explorer', desc: 'Unlock every zone', test: (p) => (p.world.unlockedZones || []).length >= 3 },
  { id: 'rich', title: 'Coin Collector', desc: 'Hold 200 coins', test: (p) => p.coins >= 200 },
  { id: 'all-rounder', title: 'All-Rounder', desc: 'Play all 9 games', test: (p) => MINIGAMES.every((g) => p.games[g.id]) },
  { id: 'coder-10', title: 'Ten Mazes', desc: 'Solve 10 Robo Maze levels', test: (p) => Object.values(p.coding.levels).filter((l) => l.stars > 0).length >= 10 },
  { id: 'boss-1', title: 'Boss Buster', desc: 'Defeat your first boss', test: (p) => Object.values(p.world.bosses || {}).some((b) => b.defeated) },
  { id: 'flawless', title: 'Flawless Fight', desc: 'Beat a boss without losing a heart', test: (p, r) => !!(r && r.won && r.heartsLeft === 3) },
  { id: 'champion', title: 'Academy Champion', desc: 'Defeat every boss', test: (p) => ['math', 'words', 'code'].every((z) => p.world.bosses?.[z]?.defeated) },
  { id: 'master', title: 'Master Mind', desc: 'Reach Master level in any subject', test: (p) => Object.values(p.mastery || {}).some((m) => (m.level | 0) >= 3) }
];

export const getBadge = (id) => BADGES.find((b) => b.id === id);
