import { NPCS } from './world/npcs.js';
import { ERRANDS } from './world/errands.js';
import { MINIGAMES, gamesForSubject } from './minigames.js';
import { ZONE_ORDER } from './world/quests.js';
import { SPELLING_LISTS, listWords } from './spelling/lists.js';
import { isLearned, totalRight } from '../systems/Spelling.js';
import { socialProgress } from '../systems/Social.js';
import { purchases, anySetComplete } from '../systems/Market.js';

const bestStars = (profile, id) => profile.games[id]?.bestStars || 0;
const subjectStars = (profile, subject) => gamesForSubject(subject).reduce((s, g) => s + bestStars(profile, g.id), 0);
const allStars = (subject) => gamesForSubject(subject).length * 3;

/** Badges are checked after every result. `test` receives the updated profile and the latest result. */
export const BADGES = [
  { id: 'first-win', title: 'First Steps', desc: 'Finish your first game', test: (p) => Object.keys(p.games).length >= 1 },
  { id: 'perfect', title: 'Perfect!', desc: 'Get every answer right in a game', test: (p, r) => r && !r.aborted && r.total > 0 && r.correct === r.total },
  { id: 'math-star', title: 'Math Star', desc: '3 stars in every Math game', test: (p) => subjectStars(p, 'math') >= allStars('math') },
  { id: 'word-wizard', title: 'Word Wizard', desc: '3 stars in every English game', test: (p) => subjectStars(p, 'words') >= allStars('words') },
  { id: 'code-captain', title: 'Code Captain', desc: '3 stars in every Coding game', test: (p) => subjectStars(p, 'code') >= allStars('code') },
  { id: 'bible-scholar', title: 'Bible Scholar', desc: '3 stars in every Bible game', test: (p) => subjectStars(p, 'bible') >= allStars('bible') },
  { id: 'science-star', title: 'Young Scientist', desc: '3 stars in every Science game', test: (p) => subjectStars(p, 'science') >= allStars('science') },
  { id: 'history-star', title: 'Harbour Historian', desc: '3 stars in every History game', test: (p) => subjectStars(p, 'history') >= allStars('history') },
  { id: 'music-star', title: 'Market Maestro', desc: '3 stars in every Music game', test: (p) => subjectStars(p, 'music') >= allStars('music') },
  { id: 'studio-star', title: 'Summit Artist', desc: '3 stars in every Art game', test: (p) => subjectStars(p, 'studio') >= allStars('studio') },
  { id: 'explorer', title: 'Explorer', desc: 'Say hello to someone in every village', test: (p) => ZONE_ORDER.every((z) => NPCS.some((n) => n.zone === z && (p.world.npcsTalked || []).includes(n.id))) },
  { id: 'rich', title: 'Coin Collector', desc: 'Hold 200 coins', test: (p) => p.coins >= 200 },
  { id: 'all-rounder', title: 'All-Rounder', desc: 'Play every game', test: (p) => MINIGAMES.every((g) => p.games[g.id]) },
  { id: 'coder-10', title: 'Ten Mazes', desc: 'Solve 10 Robo Maze levels', test: (p) => Object.values(p.coding.levels).filter((l) => l.stars > 0).length >= 10 },
  { id: 'boss-1', title: 'Boss Buster', desc: 'Defeat your first boss', test: (p) => Object.values(p.world.bosses || {}).some((b) => b.defeated) },
  { id: 'flawless', title: 'Flawless Fight', desc: 'Beat a boss without losing a heart', test: (p, r) => !!(r && r.won && r.heartsLeft === 3) },
  { id: 'champion', title: 'Academy Champion', desc: 'Defeat every boss', test: (p) => ZONE_ORDER.every((z) => p.world.bosses?.[z]?.defeated) },
  { id: 'helper', title: 'Helping Hand', desc: 'Finish 5 errands for the villagers', test: (p) => Object.values(p.world.errands || {}).filter((s) => s === 'done').length >= 5 },
  { id: 'errand-hero', title: 'Errand Hero', desc: 'Finish every errand', test: (p) => Object.values(p.world.errands || {}).filter((s) => s === 'done').length >= ERRANDS.length },
  { id: 'house-3', title: 'Three Stars', desc: 'Pass all three levels at a house', test: (p) => Object.values(p.games).some((g) => (g.gradeUp | 0) > 0 || (g.levels && [1, 2, 3].every((n) => (g.levels[n] || 0) >= 1))) },
  { id: 'duelist', title: 'Duelist', desc: 'Win your first duel', test: (p) => Object.values(p.world?.duels || {}).some((d) => d && d.won) },
  { id: 'duel-master', title: 'Duel Master', desc: 'Beat every villager in a duel', test: (p) => { const ids = Object.entries(p.world?.duels || {}).filter(([, d]) => d && d.won).map(([id]) => id); return ids.length >= NPCS.filter((n) => n.gameId).length; } },
  { id: 'master', title: 'Master Mind', desc: 'Reach Master level in any subject', test: (p) => Object.values(p.mastery || {}).some((m) => (m.level | 0) >= 3) },
  { id: 'spelling-bee', title: 'Spelling Bee', desc: 'Learn every word on a spelling list', test: (p) => Object.values(SPELLING_LISTS).flat().some((l) => listWords(l).every((e) => isLearned(p, e.w))) },
  { id: 'on-fire', title: 'On Fire', desc: 'Spell 5 words right in a row', test: (p, r) => !!(r && (r.spellingCombo | 0) >= 5) },
  { id: 'honey-hunter', title: 'Honey Hunter', desc: 'Spell 100 words right', test: (p) => totalRight(p) >= 100 },
  { id: 'bajan-reader', title: 'Bajan Reader', desc: 'Read the story in every room of your house', test: (p) => { const s = socialProgress(p); return s.total > 0 && s.read >= s.total; } },
  { id: 'shopper', title: 'Market Day', desc: 'Buy something at the Cheapside market', test: (p) => purchases(p) >= 1 },
  { id: 'collector', title: 'Card Collector', desc: 'Complete a set of Barbados cards', test: (p) => anySetComplete(p) },
  { id: 'bell-ringer', title: 'Bell Ringer', desc: 'Bring back every piece of the Academy Bell', test: (p) => !!p.story?.finale },
  { id: 'bajan-scholar', title: 'Bajan Scholar', desc: '3 stars in every room of your house', test: (p) => { const s = socialProgress(p); return s.total > 0 && s.mastered >= s.total; } }
];

export const getBadge = (id) => BADGES.find((b) => b.id === id);
