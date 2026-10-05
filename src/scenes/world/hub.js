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
  const { x, y } = centreOf(b), g = w.add.graphics().setDepth(3);
  g.fillStyle(0x000000, 0.16); g.fillEllipse(x, y + 13, 30, 6);
  g.fillStyle(0x6e4a28, 1); g.fillRect(x - 12, y - 4, 3, 17); g.fillRect(x + 9, y - 4, 3, 17);          // legs
  g.fillStyle(0x6e4a28, 1); g.fillRoundedRect(x - 16, y - 22, 32, 24, 3);                                // frame
  g.fillStyle(0xc99a62, 1); g.fillRoundedRect(x - 14, y - 20, 28, 20, 2);                                // cork
  g.fillStyle(0x8f6238, 1); g.fillTriangle(x - 18, y - 21, x, y - 30, x + 18, y - 21);                   // little roof
  g.fillStyle(0xffffff, 1); g.fillRect(x - 11, y - 17, 9, 11); g.fillRect(x + 1, y - 18, 10, 8);         // notices
  g.fillStyle(0xffe08a, 1); g.fillRect(x + 2, y - 8, 8, 6);
  g.fillStyle(0x9aa0b4, 1); for (let i = 0; i < 3; i++) g.fillRect(x - 9.5, y - 14.5 + i * 3, 6, 1);
  g.fillStyle(0x4c8df6, 1); g.fillRect(x + 2.5, y - 16, 7, 1); g.fillStyle(0xe8623f, 1); g.fillRect(x + 2.5, y - 13.5, 5, 1);
  g.fillStyle(0xe8623f, 1); g.fillCircle(x - 6.5, y - 17, 1.2); g.fillStyle(0x249762, 1); g.fillCircle(x + 6, y - 18, 1.2);   // pins
  w.add.image(x + 6, y - 5, 'star').setDisplaySize(5, 5).setDepth(3.1);
  w.questBoard = { x, y };
}

/** Is the player close enough to read the board? */
export function boardNear(w, dist = 46) {
  const b = w.questBoard;
  return !!b && !!w.player && Math.hypot(w.player.x - b.x, w.player.y - (b.y + 8)) < dist;
}

/** What the board says today: the goal, the stars in each land, and where the footprints lead. */
export function boardLines(profile, map) {
  const goal = profile.goal, game = goal ? getGame(goal.gameId) : null;
  const lines = [];
  if (goal && game) {
    lines.push(goal.done ? `🎯 Today's goal is done: ${'★'.repeat(goal.stars)} in ${game.title}. Well played!`
      : `🎯 Today's goal: earn ${'★'.repeat(goal.stars)} in ${game.title}. It pays ${GOAL_BONUS} coins!`);
  }
  lines.push('Stars so far:\n' + JEWELS.map((j) => { const s = landStars(profile, j.zone); return `${ZONE_NAMES[j.zone]}  ★ ${s.stars}/${s.total}`; }).join('\n'));
  const next = nextGame(profile, map);
  lines.push(next ? `👣 Next: follow the footprints to ${next.title} in ${ZONE_NAMES[next.subject]}.` : '🏆 Every star is yours. The whole Academy is proud of you!');
  return lines;
}

export function readBoard(w) {
  const hud = w.hud();
  if (!hud || hud.blocking) return;
  if (!Store.getProfile().goal) Store.updateProfile((p) => { dailyGoal(p); });
  w.stopPlayer();
  hud.showDialog({ name: 'Quest board', lines: boardLines(Store.getProfile(), w.map) });
}
