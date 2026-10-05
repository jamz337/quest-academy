// Finding the way: the four gateways out of the Academy Hub, and the "next step" trail.
// A gateway is an arch in its land's colours with the land's name and how many stars have been earned there; the
// road beyond it is tinted for a few steps. The next-step trail is a line of footprints on the ground from the
// player towards the game worth playing next (today's goal, then the game with the fewest stars), with a pointer
// at the edge of the screen while that house is out of sight. Nothing is locked: the trail only suggests.
// Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME, hex } from '../../ui/theme.js';
import { FONT } from '../../ui/TextStyles.js';
import * as Store from '../../systems/Store.js';
import { TID, ZONE_NAMES, isWalkable } from '../../data/world/map.js';
import { MINIGAMES, gamesForSubject, getGame } from '../../data/minigames.js';
import { houseStars, HOUSE_LEVELS } from '../../systems/Progression.js';
import { dailyGoal } from '../../systems/Goals.js';

/** Where each land's gateway stands and which way the road leaves the hub through it. */
export const GATEWAYS = [
  { zone: 'math', tx: 16, ty: 20, dx: -1, dy: 0 },
  { zone: 'words', tx: 36, ty: 13, dx: 0, dy: -1 },
  { zone: 'code', tx: 24, ty: 28, dx: 0, dy: 1 },
  { zone: 'bible', tx: 37, ty: 17, dx: 1, dy: 0 }
];

/** Stars earned in a land's games, and the most there are: { stars, total }. */
export function landStars(profile, zone) {
  const games = gamesForSubject(zone);
  return { stars: games.reduce((n, g) => n + houseStars(profile, g.id), 0), total: games.length * HOUSE_LEVELS };
}

// ---- Gateways ------------------------------------------------------------------------------------------

export function createGateways(w) {
  const tint = w.add.graphics().setDepth(1.2), g = w.add.graphics().setDepth(12);
  w.gateLabels = {};
  for (const gate of GATEWAYS) {
    const col = THEME.subjects[gate.zone], cx = (gate.tx + 0.5) * TILE, cy = (gate.ty + 0.5) * TILE;
    // Arrowheads in the land's colour are painted on the road for its first steps, pointing the way in.
    for (let i = 1; i <= 3; i++) {
      const tx = gate.tx + gate.dx * i, ty = gate.ty + gate.dy * i;
      if (!w.map.data[ty] || w.map.data[ty][tx] !== TID.path) continue;
      const mx = (tx + 0.5) * TILE, my = (ty + 0.5) * TILE, fx = gate.dx, fy = gate.dy, sx = -fy, sy = fx;   // forward and sideways
      tint.lineStyle(3.5, col.accent, 0.85 - i * 0.2);
      tint.beginPath();
      tint.moveTo(mx - fx * 4 + sx * 8, my - fy * 4 + sy * 8); tint.lineTo(mx + fx * 5, my + fy * 5); tint.lineTo(mx - fx * 4 - sx * 8, my - fy * 4 - sy * 8);
      tint.strokePath();
    }
    // Two pillars either side of the road (above and below it where the road runs east to west).
    const across = gate.dx !== 0;
    for (const side of [-1, 1]) {
      const px = across ? cx : cx + side * 14, py = across ? cy + side * 28 : cy;
      g.fillStyle(0x000000, 0.18); g.fillEllipse(px + 1, py + 13, 12, 4);
      g.fillStyle(col.dark, 1); g.fillRoundedRect(px - 4, py - 14, 8, 27, 3);
      g.fillStyle(col.accent, 1); g.fillRoundedRect(px - 4, py - 14, 5, 27, 3);
      g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(px - 3, py - 12, 1.5, 22, 1);
      g.fillStyle(0xffc531, 1); g.fillCircle(px, py - 15, 3.2);                                   // a gold ball on top
    }
    // The banner across the top: the land's name, and its stars on a tag beneath.
    const by = cy - (across ? 52 : 30), bw = 62;
    g.fillStyle(0x000000, 0.18); g.fillRoundedRect(cx - bw / 2 + 1, by - 6, bw, 14, 5);
    g.fillStyle(col.dark, 1); g.fillRoundedRect(cx - bw / 2, by - 8, bw, 14, 5);
    g.fillStyle(col.accent, 1); g.fillRoundedRect(cx - bw / 2, by - 8, bw, 11.5, 5);
    g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(cx - bw / 2 + 3, by - 6.5, bw - 6, 2, 1);
    w.add.text(cx, by - 1.5, ZONE_NAMES[gate.zone], { fontFamily: FONT, fontSize: '7px', color: '#ffffff', fontStyle: '700' }).setOrigin(0.5).setDepth(12.1).setResolution(6);
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(cx - 15, by + 6.5, 30, 9, 4.5);
    g.lineStyle(1, col.accent, 1); g.strokeRoundedRect(cx - 15, by + 6.5, 30, 9, 4.5);
    w.gateLabels[gate.zone] = w.add.text(cx, by + 11, '', { fontFamily: FONT, fontSize: '6px', color: hex(col.dark), fontStyle: '700' }).setOrigin(0.5).setDepth(12.1).setResolution(6);
  }
  refreshGateways(w);
}

/** Bring each gateway's star count up to date (after a game). */
export function refreshGateways(w) {
  const p = Store.getProfile();
  if (!p || !w.gateLabels) return;
  for (const gate of GATEWAYS) {
    const t = w.gateLabels[gate.zone], s = landStars(p, gate.zone);
    if (t && t.active) t.setText(`★ ${s.stars}/${s.total}`);
  }
}

// ---- The next-step trail ---------------------------------------------------------------------------------

/** The game to suggest next: today's goal until it is done, then the game with the fewest stars. Null when all are full. */
export function nextGame(profile, map) {
  const here = (g) => g && g.npc && map.npcSpots[g.npc];
  const goal = profile.goal && !profile.goal.done ? getGame(profile.goal.gameId) : null;
  if (here(goal)) return goal;
  const open = MINIGAMES.filter((g) => here(g) && houseStars(profile, g.id) < HOUSE_LEVELS);
  open.sort((a, b) => houseStars(profile, a.id) - houseStars(profile, b.id));
  return open[0] || null;
}

const ROAD_COST = 1, GROUND_COST = 12;   // the trail keeps to the roads where it can

/** Walking cost from every tile to `target`: an Int32Array (width * height), -1 where there is no way. */
export function routeField(map, target) {
  const W = map.width, H = map.height, dist = new Int32Array(W * H).fill(-1);
  const buckets = [[target.ty * W + target.tx]];
  dist[target.ty * W + target.tx] = 0;
  for (let d = 0; d < buckets.length; d++) {
    for (const at of buckets[d] || []) {
      if (dist[at] !== d) continue;
      const x = at % W, y = (at - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !isWalkable(map.data[ny][nx])) continue;
        const id = map.data[ny][nx], nd = d + (id === TID.path || id === TID.gateOpen ? ROAD_COST : GROUND_COST), k = ny * W + nx;
        if (dist[k] !== -1 && dist[k] <= nd) continue;
        dist[k] = nd;
        (buckets[nd] ||= []).push(k);
      }
    }
  }
  return dist;
}

/** The next `n` tiles to walk from (tx, ty) down the field towards its target: [{ tx, ty }]. */
export function stepsFrom(field, map, tx, ty, n = 8) {
  const W = map.width, out = [];
  let x = tx, y = ty;
  for (let i = 0; i < n; i++) {
    const here = field[y * W + x];
    if (here <= 0) break;
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, d = nx < 0 || ny < 0 || nx >= W || ny >= map.height ? -1 : field[ny * W + nx];
      if (d >= 0 && d < here && (!best || d < best.d)) best = { tx: nx, ty: ny, d };
    }
    if (!best) break;
    out.push({ tx: best.tx, ty: best.ty });
    x = best.tx; y = best.ty;
  }
  return out;
}

const PRINTS = 7, NEAR_TILES = 3;

export function createGuide(w) {
  const prints = [];
  for (let i = 0; i < PRINTS; i++) {
    const p = w.add.ellipse(0, 0, 4, 6.5, 0xffc531, 1).setStrokeStyle(0.8, 0xffffff, 1).setDepth(1.7).setVisible(false);
    w.tweens.add({ targets: p, alpha: { from: 0.95, to: 0.25 }, duration: 620, delay: i * 130, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    prints.push(p);
  }
  // The pointer at the screen's edge: an arrowhead and the game's name on a tag.
  const arrow = w.add.triangle(0, 0, -5, -4, 5, 0, -5, 4, 0xffc531, 1).setStrokeStyle(1, 0x1e1b4b, 1).setDepth(30).setVisible(false);
  const tag = w.add.text(0, 0, '', { fontFamily: FONT, fontSize: '7px', color: '#1e1b4b', fontStyle: '700', backgroundColor: '#ffffff', padding: { x: 3, y: 1.5 } }).setOrigin(0.5).setDepth(30).setResolution(6).setVisible(false);
  w.guide = { prints, arrow, tag, game: null, field: null, target: null, tile: null };
  const follow = () => pointerTick(w);
  w.events.on('update', follow);
  w.events.once('shutdown', () => { w.events.off('update', follow); w.guide = null; });
  retargetGuide(w);
}

/** Choose the game to lead to (again after each game, when the suggestion may have changed). */
export function retargetGuide(w) {
  const gd = w.guide, p = Store.getProfile();
  if (!gd || !p) return;
  if (!p.goal) Store.updateProfile((q) => { dailyGoal(q); });
  const game = nextGame(Store.getProfile(), w.map);
  gd.game = game; gd.tile = null;
  gd.target = game ? w.map.npcSpots[game.npc] : null;
  gd.field = gd.target ? routeField(w.map, gd.target) : null;
  const col = game ? THEME.subjects[game.subject] : null;
  if (col) { gd.prints.forEach((pr) => pr.setFillStyle(col.accent, 1)); gd.arrow.setFillStyle(col.accent, 1); gd.tag.setText(game.title); }
}

const hidden = (w) => { const hud = w.hud(); return !w.guide || !w.guide.field || w.introRunning || !!w.lesson || (hud && hud.blocking); };

/** Called from the world's tick with the player's tile: lay the footprints along the next few steps. */
export function guideTick(w, tx, ty) {
  const gd = w.guide;
  if (!gd) return;
  const tile = `${tx},${ty}`, off = hidden(w);
  if (tile === gd.tile && off === gd.off) return;
  gd.tile = tile; gd.off = off;
  const steps = off ? [] : stepsFrom(gd.field, w.map, tx, ty, PRINTS + 1);
  const left = off ? 0 : Math.abs(gd.target.tx - tx) + Math.abs(gd.target.ty - ty);
  gd.ahead = steps.length ? steps[Math.min(3, steps.length - 1)] : null;   // where the pointer aims: along the trail, not across country
  let px = tx, py = ty;
  gd.prints.forEach((pr, i) => {
    const s = steps[i];
    // No prints on the last step (the villager stands there) or once the house is a few steps away.
    if (!s || i >= steps.length - 1 || left <= NEAR_TILES) { pr.setVisible(false); return; }
    const dx = s.tx - px, dy = s.ty - py, side = i % 2 ? 1 : -1;   // left foot, right foot
    pr.setPosition((s.tx + 0.5) * TILE + -dy * side * 3.5, (s.ty + 0.5) * TILE + dx * side * 3.5).setAngle(dx ? 90 : 0).setVisible(true);
    px = s.tx; py = s.ty;
  });
}

/** Every frame: while the house is off the screen, the pointer sits at the screen's edge on the way to it. */
function pointerTick(w) {
  const gd = w.guide;
  if (!gd || !w.player) return;
  const view = w.cameras.main.worldView, t = gd.target;
  const tx = t ? (t.tx + 0.5) * TILE : 0, ty = t ? (t.ty + 0.5) * TILE : 0;
  const show = !hidden(w) && !!t && !view.contains(tx, ty);
  gd.arrow.setVisible(show); gd.tag.setVisible(show);
  if (!show) return;
  // Along the line from the player to the house, as far as the screen allows (clear of the top bar and the buttons).
  const padX = view.width * 0.12, top = view.y + view.height * 0.2, bottom = view.bottom - view.height * 0.24;
  const ox = w.player.x, oy = w.player.y, aim = gd.ahead || t;
  const dx = ((aim.tx + 0.5) * TILE - ox) * 40, dy = ((aim.ty + 0.5) * TILE - oy) * 40;   // far along that line, so it reaches the edge
  const kx = dx > 0 ? (view.right - padX - ox) / dx : dx < 0 ? (view.x + padX - ox) / dx : Infinity;
  const ky = dy > 0 ? (bottom - oy) / dy : dy < 0 ? (top - oy) / dy : Infinity;
  const k = Math.max(0, Math.min(kx, ky, 1));
  const x = ox + dx * k, y = oy + dy * k, a = Math.atan2(dy, dx);
  gd.arrow.setPosition(x + Math.cos(a) * 3, y + Math.sin(a) * 3 + Math.sin(w.time.now / 240) * 0.8).setRotation(a);
  const back = 7 + Math.abs(Math.cos(a)) * gd.tag.width / 2 + Math.abs(Math.sin(a)) * gd.tag.height / 2;   // the tag sits just behind the arrowhead
  gd.tag.setPosition(x - Math.cos(a) * back, y - Math.sin(a) * back);
}
