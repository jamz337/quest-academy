// What makes the Academy Hub the heart of the world: the Star Fountain in the middle of the plaza, which shows
// how far the player has come in each land, and the quest board beside Signpost Sam, which says what to do next.
// Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import { FONT } from '../../ui/TextStyles.js';
import * as Store from '../../systems/Store.js';
import { ZONE_NAMES } from '../../data/world/map.js';
import { getGame } from '../../data/minigames.js';
import { dailyGoal, GOAL_BONUS, weekKey } from '../../systems/Goals.js';
import { Sfx } from '../../systems/Audio.js';
import { landStars, nextGame } from './guide.js';
import { openRequests } from '../../data/world/requests.js';
import { NPCS } from '../../data/world/npcs.js';
import { ZONE_ORDER } from '../../data/world/quests.js';

// Each land's jewel sits on the side of the fountain that faces its land.
const JEWELS = [{ zone: 'math', a: Math.PI }, { zone: 'science', a: -Math.PI * 0.75 }, { zone: 'words', a: -Math.PI / 4 }, { zone: 'bible', a: 0 }, { zone: 'code', a: Math.PI / 2 }, { zone: 'history', a: Math.PI * 0.75 }];
const STONE = 0xb9b3c6, STONE_LIGHT = 0xe2deeb, STONE_DARK = 0x8f89a1, DULL = 0xa7a3b5;

const centreOf = (r) => ({ x: (r.tx + (r.w || 1) / 2) * TILE, y: (r.ty + (r.h || 1) / 2) * TILE });

/** Stars earned across all the lands: { stars, total }. */
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

/**
 * Redraw the jewels and jets from the stars earned in each land. Each jet is a column of water that rises with the
 * land's stars; a land that just gained a star gets a tall burst in its colour once the fountain is in view.
 */
export function refreshFountain(w) {
  const ft = w.fountain, p = Store.getProfile();
  if (!ft || !p) return;
  const { x, y, jewels: g } = ft;
  ft.drops.forEach((d) => { w.tweens.killTweensOf(d); d.destroy(); });
  ft.drops = [];
  g.clear();
  ft.known ||= {};
  for (const j of JEWELS) {
    const col = THEME.subjects[j.zone], s = landStars(p, j.zone), share = s.total ? s.stars / s.total : 0;
    const jx = x + Math.cos(j.a) * 43, jy = y + Math.sin(j.a) * 43;
    // The jewel fills like a pie as the land's stars are earned, and glows gold when the land is complete.
    if (share >= 1) { g.fillStyle(0xffc531, 0.9); g.fillCircle(jx, jy, 9.5); }
    g.fillStyle(STONE_DARK, 1); g.fillCircle(jx, jy, 7.5);
    g.fillStyle(DULL, 1); g.fillCircle(jx, jy, 6);
    if (share > 0) { g.fillStyle(col.accent, 1); g.slice(jx, jy, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, share), false); g.fillPath(); }
    g.fillStyle(0xffffff, 0.55); g.fillCircle(jx - 2, jy - 2, 1.6);
    // Its jet: a column of water in the pool beside the jewel, as tall as the land's stars (a bubble when none).
    const bx = x + Math.cos(j.a) * 24, by = y + Math.sin(j.a) * 24, h = 6 + 44 * share;
    const jet = makeJet(w, bx, by, h, share > 0 ? col.accent : 0xffffff);
    ft.drops.push(jet);
    ft.jets ||= {}; ft.jets[j.zone] = { jet, h, col: col.accent, x: bx, y: by };
    // A star earned since the last look: the fountain cheers once it is on screen.
    if (ft.known[j.zone] !== undefined && s.stars > ft.known[j.zone]) ft.pending = j.zone;
    ft.known[j.zone] = s.stars;
  }
  const all = allStars(p);
  ft.star.setAlpha(all.stars >= all.total ? 1 : 0.45);
  ft.count.setText(`★ ${all.stars}/${all.total}`);
}

/** A column of water `h` tall rising from (x, y): a tapered spout with a white core and a splash crown, swaying. */
function makeJet(w, x, y, h, colour) {
  const c = w.add.container(x, y).setDepth(3.3), g = w.add.graphics();
  g.fillStyle(colour, 0.55); g.fillTriangle(-3.5, 0, 3.5, 0, 0, -h);
  g.fillStyle(0xffffff, 0.75); g.fillTriangle(-1.4, 0, 1.4, 0, 0, -h * 0.92);
  g.fillStyle(0xffffff, 0.9); g.fillEllipse(0, -h, 6 + h * 0.08, 3);
  for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.8); g.fillCircle(-5 - i * 2 + (i % 2) * 12, -h + 3 + i * 4, 1.3); }
  c.add(g);
  w.tweens.add({ targets: c, scaleY: 1.08, scaleX: 0.92, duration: 520 + (h % 7) * 60, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return c;
}

/** Each tick: a cheer still owed (a star earned while away) plays once the fountain is on screen. */
export function fountainTick(w) {
  const ft = w.fountain;
  if (!ft || !ft.pending || !w.cameras || !w.cameras.main.worldView.contains(ft.x, ft.y)) return;
  const zone = ft.pending; ft.pending = null;
  fountainCheer(w, zone);
}

/** A tall burst from one land's jet in its colour, with sparkles, for a star just earned there. */
export function fountainCheer(w, zone) {
  const ft = w.fountain, j = ft && ft.jets && ft.jets[zone];
  if (!j || !j.jet.active) return;
  Sfx.unlock();
  w.tweens.add({ targets: j.jet, scaleY: 2.6, scaleX: 1.3, duration: 420, yoyo: true, hold: 900, ease: 'Quad.Out' });
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i - 4.5) * 0.22, d = 30 + (i % 3) * 10;
    const s = w.add.image(j.x, j.y - j.h, 'sparkle').setDisplaySize(7, 7).setDepth(3.5).setTint(j.col);
    w.tweens.add({ targets: s, x: j.x + Math.cos(a) * d, y: j.y - j.h - 40 + Math.sin(a) * d + 30, alpha: 0, angle: 180, duration: 900, delay: 300 + i * 40, ease: 'Cubic.Out', onComplete: () => s.destroy() });
  }
}

// ---- Tossing a coin --------------------------------------------------------------------------------------

export const TOSS_WISH_EVERY = 5, TOSS_WISH_COINS = 10;

/** Is the player standing at the fountain's rim (close, but not in it)? */
export function fountainNear(w) {
  const ft = w.fountain;
  return !!ft && !!w.player && Math.hypot(w.player.x - ft.x, w.player.y - ft.y) < 78;
}

/** Tosses so far this week: { week, tosses }. */
const tossRecord = (p, week = weekKey()) => (p.world && p.world.fountain && p.world.fountain.week === week ? p.world.fountain : { week, tosses: 0 });

/**
 * Toss a coin into the fountain: it arcs from the player into the pool with a plink and a splash. Every fifth
 * toss in a week is a wish: a rainbow over the water, a tall burst from every jet and a few coins back.
 */
export function tossCoin(w) {
  const ft = w.fountain, hud = w.hud(), p = Store.getProfile();
  if (!ft || !p || !w.player || w.tossing || (hud && hud.blocking)) return false;
  if ((p.coins | 0) < 1) { w.say('🪙 You need a coin to toss. Play a game to earn some!', { accent: THEME.ink3 }); return false; }
  let rec = null;
  Store.updateProfile((q) => { q.coins -= 1; q.world ||= {}; rec = tossRecord(q); rec.tosses += 1; q.world.fountain = rec; });
  if (hud) hud.setCoins(Store.getProfile().coins);
  w.tossing = true;
  w.stopPlayer();
  const coin = w.add.image(w.player.x, w.player.y - 10, 'coin').setDisplaySize(9, 9).setDepth(12);
  Sfx.lift();
  w.tweens.add({ targets: coin, x: ft.x, duration: 520, ease: 'Sine.InOut' });
  w.tweens.add({ targets: coin, y: Math.min(w.player.y, ft.y) - 46, duration: 260, yoyo: true, ease: 'Quad.Out' });
  w.tweens.add({ targets: coin, angle: 540, duration: 520, onComplete: () => {
    coin.destroy(); w.tossing = false;
    Sfx.coin();
    const splash = w.add.circle(ft.x, ft.y - 2, 4).setStrokeStyle(2, 0xffffff, 0.9).setDepth(3.35);
    w.tweens.add({ targets: splash, scale: 5, alpha: 0, duration: 600, ease: 'Cubic.Out', onComplete: () => splash.destroy() });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, d = w.add.circle(ft.x, ft.y - 2, 1.6, 0xffffff, 0.9).setDepth(3.35); w.tweens.add({ targets: d, x: ft.x + Math.cos(a) * 14, y: ft.y - 14 + Math.sin(a) * 8, alpha: 0, duration: 450, ease: 'Quad.Out', onComplete: () => d.destroy() }); }
    if (rec && rec.tosses % TOSS_WISH_EVERY === 0) makeWish(w);
  } });
  return true;
}

/** A wish comes true: a rainbow arcs over the fountain, every jet bursts and a few coins come back. */
function makeWish(w) {
  const ft = w.fountain, hud = w.hud();
  if (!ft) return;
  Sfx.fanfare();
  for (const zone of Object.keys(ft.jets || {})) w.time.delayedCall(Object.keys(ft.jets).indexOf(zone) * 120, () => fountainCheer(w, zone));
  const bow = w.add.graphics().setDepth(3.6).setAlpha(0);
  [0xff5c6c, 0xff9a3c, 0xffd75e, 0x2ec46a, 0x4c8df6, 0x8566ee].forEach((col, i) => { bow.lineStyle(3, col, 0.85); bow.beginPath(); bow.arc(ft.x, ft.y - 10, 56 - i * 3.2, Math.PI * 1.05, Math.PI * 1.95); bow.strokePath(); });
  w.tweens.add({ targets: bow, alpha: 1, duration: 500 });
  w.tweens.add({ targets: bow, alpha: 0, duration: 1200, delay: 4500, onComplete: () => bow.destroy() });
  Store.updateProfile((p) => { p.coins += TOSS_WISH_COINS; });
  if (hud) { hud.setCoins(Store.getProfile().coins); hud.awardCoins(TOSS_WISH_COINS); }
  w.say(`🌈 A wish! The fountain gives you ${TOSS_WISH_COINS} coins back.`, { icon: 'star', accent: THEME.success });
}

/** A coin bobbing over the player's head while they stand at the rim with a coin to toss. */
export function fountainCueTick(w) {
  if (!w.fountain) return;
  if (!w.tossCue) {
    w.tossCue = w.add.image(0, 0, 'coin').setDisplaySize(9, 9).setDepth(20).setVisible(false);
    const follow = () => { const c = w.tossCue; if (c && c.active && c.visible && w.player) c.setPosition(w.player.x + 9, w.player.y - 24 + Math.sin(w.time.now / 260) * 1.5); };
    w.events.on('update', follow);
    w.events.once('shutdown', () => { w.events.off('update', follow); w.tossCue = null; });
  }
  const hud = w.hud(), p = Store.getProfile();
  w.tossCue.setVisible(fountainNear(w) && !w.nearNpc && !(hud && hud.blocking) && !!p && (p.coins | 0) > 0);
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
  // A little progress bar per land, in its colour.
  ZONE_ORDER.forEach((zone, i) => {
    const col = THEME.subjects[zone], by = top + 15 + i * 4.5;
    g.fillStyle(col.soft, 1); g.fillRoundedRect(x - 18, by, 36, 3, 1.5);
    g.fillStyle(col.accent, 1); g.fillRoundedRect(x - 18, by, 14 + ((i * 7) % 4) * 6, 3, 1.5);
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
    lands: ZONE_ORDER.map((zone) => ({ zone, name: ZONE_NAMES[zone], ...landStars(profile, zone) })),
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
