// What makes the Academy Hub the heart of the world: the Star Fountain in the middle of the plaza, which shows
// how far the player has come in each land, and the quest board beside Signpost Sam, which says what to do next.
// Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import { FONT } from '../../ui/TextStyles.js';
import * as Store from '../../systems/Store.js';
import { ZONE_NAMES } from '../../data/world/map.js';
import { getGame } from '../../data/minigames.js';
import { dailyGoal, GOAL_BONUS } from '../../systems/Goals.js';
import { landStars, nextGame } from './guide.js';
import { openRequests } from '../../data/world/requests.js';
import { NPCS } from '../../data/world/npcs.js';

// Each land's jewel sits on the side of the fountain that faces its land.
const JEWELS = [{ zone: 'math', a: Math.PI }, { zone: 'words', a: -Math.PI / 2 }, { zone: 'bible', a: 0 }, { zone: 'code', a: Math.PI / 2 }];
const STONE = 0xb9b3c6, STONE_LIGHT = 0xe2deeb, STONE_DARK = 0x8f89a1, DULL = 0xa7a3b5;

const centreOf = (r) => ({ x: (r.tx + (r.w || 1) / 2) * TILE, y: (r.ty + (r.h || 1) / 2) * TILE });

/** Stars earned across all four lands: { stars, total }. */
export function allStars(profile) {
  return JEWELS.reduce((sum, j) => { const s = landStars(profile, j.zone); return { stars: sum.stars + s.stars, total: sum.total + s.total }; }, { stars: 0, total: 0 });
}

// ---- The Star Fountain -----------------------------------------------------------------------------------

export function createFountain(w) {
  const f = w.map.fountain;
  if (!f) return;
  const { x, y } = centreOf(f), g = w.add.graphics().setDepth(3);
  g.fillStyle(0x000000, 0.16); g.fillEllipse(x + 2, y + 5, 94, 90);
  g.fillStyle(STONE_DARK, 1); g.fillCircle(x, y + 2, 45);
  g.fillStyle(STONE, 1); g.fillCircle(x, y, 45);
  g.fillStyle(STONE_LIGHT, 1); g.fillCircle(x, y - 1, 41);
  g.fillStyle(0x3d8be0, 1); g.fillCircle(x, y, 36);
  g.fillStyle(0x5aa9f5, 1); g.fillCircle(x, y - 1, 34);
  g.fillStyle(0x8cc6ff, 0.7); g.fillCircle(x, y - 1, 22);
  g.lineStyle(1, 0xffffff, 0.55); g.strokeCircle(x, y, 28); g.strokeCircle(x, y, 15);   // ripples
  g.fillStyle(STONE_DARK, 1); g.fillCircle(x, y + 1.5, 10);
  g.fillStyle(STONE_LIGHT, 1); g.fillCircle(x, y, 10);
  g.fillStyle(0x8cc6ff, 1); g.fillCircle(x, y, 6.5);
  // The ripples breathe, so the water never looks still.
  const ring = w.add.circle(x, y, 18).setStrokeStyle(1.2, 0xffffff, 0.7).setDepth(3.1);
  w.tweens.add({ targets: ring, scale: 1.9, alpha: 0, duration: 2200, repeat: -1, ease: 'Sine.Out' });
  w.fountain = { x, y, jewels: w.add.graphics().setDepth(3.2), drops: [], star: w.add.image(x, y, 'star').setDisplaySize(11, 11).setDepth(3.4),
    count: w.add.text(x, y - 54, '', { fontFamily: FONT, fontSize: '7px', color: '#1e1b4b', fontStyle: '700', backgroundColor: '#ffffff', padding: { x: 4, y: 1.5 } }).setOrigin(0.5).setDepth(12).setResolution(6) };
  refreshFountain(w);
}

/** Redraw the jewels and jets from the stars earned in each land (after a game). */
export function refreshFountain(w) {
  const ft = w.fountain, p = Store.getProfile();
  if (!ft || !p) return;
  const { x, y, jewels: g } = ft;
  ft.drops.forEach((d) => { w.tweens.killTweensOf(d); d.destroy(); });
  ft.drops = [];
  g.clear();
  for (const j of JEWELS) {
    const col = THEME.subjects[j.zone], s = landStars(p, j.zone), share = s.total ? s.stars / s.total : 0;
    const jx = x + Math.cos(j.a) * 43, jy = y + Math.sin(j.a) * 43;
    // The jewel fills like a pie as the land's stars are earned, and glows gold when the land is complete.
    if (share >= 1) { g.fillStyle(0xffc531, 0.9); g.fillCircle(jx, jy, 9.5); }
    g.fillStyle(STONE_DARK, 1); g.fillCircle(jx, jy, 7.5);
    g.fillStyle(DULL, 1); g.fillCircle(jx, jy, 6);
    if (share > 0) { g.fillStyle(col.accent, 1); g.slice(jx, jy, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, share), false); g.fillPath(); }
    g.fillStyle(0xffffff, 0.55); g.fillCircle(jx - 2, jy - 2, 1.6);
    // Its jet of water reaches further across the pool the more stars there are.
    const reach = 9 + 24 * share;
    for (let i = 0; i < 3; i++) {
      const d = w.add.circle(x, y, share > 0 ? 2 : 1.4, share > 0 ? col.accent : 0xffffff, 1).setDepth(3.3);
      w.tweens.add({ targets: d, x: x + Math.cos(j.a) * reach, y: y + Math.sin(j.a) * reach, alpha: { from: 1, to: 0.15 }, scale: { from: 1, to: 0.6 }, duration: 900, delay: i * 300, repeat: -1, ease: 'Quad.Out' });
      ft.drops.push(d);
    }
  }
  const all = allStars(p);
  ft.star.setAlpha(all.stars >= all.total ? 1 : 0.45);
  ft.count.setText(`★ ${all.stars}/${all.total}`);
}

// ---- The quest board -------------------------------------------------------------------------------------

export function createQuestBoard(w) {
  const b = w.map.questBoard;
  if (!b) return;
  const { x } = centreOf(b), y = centreOf(b).y, g = w.add.graphics().setDepth(3);
  const top = y - 46, bw = 50, bh = 42;   // a tall glossy board on two posts, with a gold star on top
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 13, 46, 7);
  g.fillStyle(0x3b3550, 1); g.fillRoundedRect(x - 19, y - 8, 4, 21, 2); g.fillRoundedRect(x + 15, y - 8, 4, 21, 2);          // posts
  g.fillStyle(0x12103a, 1); g.fillRoundedRect(x - bw / 2, top + 2, bw, bh, 7);                                              // the board's shadow edge
  g.fillStyle(0x1e1b4b, 1); g.fillRoundedRect(x - bw / 2, top, bw, bh, 7);
  g.fillStyle(0xfffaf2, 1); g.fillRoundedRect(x - bw / 2 + 3, top + 3, bw - 6, bh - 6, 5);                                   // the page
  g.fillStyle(0xffc531, 1); g.fillRoundedRect(x - bw / 2 + 3, top + 3, bw - 6, 9, { tl: 5, tr: 5, bl: 0, br: 0 });           // gold header
  g.fillStyle(0xffffff, 0.5); g.fillRoundedRect(x - bw / 2 + 6, top + 4.5, bw - 12, 1.5, 0.7);
  // Four little progress bars in the lands' colours.
  ['math', 'words', 'code', 'bible'].forEach((zone, i) => {
    const col = THEME.subjects[zone], by = top + 16 + i * 5.6;
    g.fillStyle(col.soft, 1); g.fillRoundedRect(x - 18, by, 36, 3.6, 1.8);
    g.fillStyle(col.accent, 1); g.fillRoundedRect(x - 18, by, 14 + ((i * 7) % 4) * 6, 3.6, 1.8);
  });
  g.fillStyle(0xcf8a00, 1); g.fillCircle(x, top - 1, 8.5);
  g.fillStyle(0xffc531, 1); g.fillCircle(x, top - 2.5, 8.5);
  w.add.image(x, top - 2.5, 'star').setDisplaySize(11, 11).setDepth(3.1);
  const tag = w.add.text(x, y + 19, 'Quest board', { fontFamily: FONT, fontSize: '6px', color: '#1e1b4b', fontStyle: '700', backgroundColor: '#ffffff', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(3.1).setResolution(6);
  void tag;
  w.questBoard = { x, y, top: top - 14 };
}

/** Is the player close enough to read the board? */
export function boardNear(w, dist = 46) {
  const b = w.questBoard;
  return !!b && !!w.player && Math.hypot(w.player.x - b.x, w.player.y - (b.y + 8)) < dist;
}

/** What the board shows today: the goal, the stars in each land, and where the footprints lead. */
export function boardFacts(profile, map) {
  const goal = profile.goal, game = goal ? getGame(goal.gameId) : null, next = nextGame(profile, map);
  return {
    goal: goal && game ? { title: game.title, stars: goal.stars, done: !!goal.done, bonus: GOAL_BONUS } : null,
    lands: ['math', 'words', 'code', 'bible'].map((zone) => ({ zone, name: ZONE_NAMES[zone], ...landStars(profile, zone) })),
    next: next ? { title: next.title, land: ZONE_NAMES[next.subject], zone: next.subject } : null,
    // Villagers with an order still open today (see data/world/requests.js).
    orders: openRequests(profile).map((r) => ({ emoji: r.emoji, name: (NPCS.find((n) => n.id === r.npc) || {}).name || 'A villager' }))
  };
}

export function readBoard(w) {
  const hud = w.hud();
  if (!hud || hud.blocking) return;
  if (!Store.getProfile().goal) Store.updateProfile((p) => { dailyGoal(p); });
  w.stopPlayer();
  hud.showBoard(boardFacts(Store.getProfile(), w.map));
}
