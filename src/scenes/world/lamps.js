// Stars light the way: every land has a row of lamp posts along its roads, and one more lights up for each star
// earned in that land's games, starting at the gateway and spreading inwards. A land with all its stars is lit from
// end to end. The lamps are scenery (they can be walked past). Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import * as Store from '../../systems/Store.js';
import { TID, isWalkable, zoneAt } from '../../data/world/map.js';
import { GATEWAYS, landStars } from './guide.js';

const SPACING = 2;   // a lamp every other step of road (Word Woods has little open ground)

/**
 * Where a land's lamps stand, nearest the gateway first: beside the road, on open ground, never where a villager
 * or a building is. At most `max` (one per star the land can give).
 */
export function lampSpots(map, zone, max = 12) {
  const gate = GATEWAYS.find((g) => g.zone === zone);
  if (!gate) return [];
  const key = (x, y) => `${x},${y}`;
  const taken = new Set([...Object.values(map.npcSpots || {}), ...Object.values(map.bossSpots || {}), ...(map.trail || []), ...(map.coins || [])].map((s) => key(s.tx, s.ty)));
  if (map.fishSign) taken.add(key(map.fishSign.tx, map.fishSign.ty));
  const road = (x, y) => map.data[y] && (map.data[y][x] === TID.path || map.data[y][x] === TID.gateOpen);
  const out = [], seen = new Set([key(gate.tx, gate.ty)]), queue = [[gate.tx, gate.ty]];
  let steps = 0;
  while (queue.length && out.length < max) {
    const [x, y] = queue.shift();
    const inside = zoneAt(map, x, y) === zone;
    if (inside && steps++ % SPACING === 0) {
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const lx = x + dx, ly = y + dy, id = map.data[ly] && map.data[ly][lx];
        if (id === undefined || road(lx, ly) || !isWalkable(id) || id === TID.plinth || taken.has(key(lx, ly)) || zoneAt(map, lx, ly) !== zone) continue;
        // Not right in front of a door or a villager's spot.
        if ([[0, -1], [0, 1], [-1, 0], [1, 0]].some(([ax, ay]) => taken.has(key(lx + ax, ly + ay)) && !road(lx + ax, ly + ay))) continue;
        taken.add(key(lx, ly)); out.push({ tx: lx, ty: ly });
        break;
      }
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (seen.has(key(nx, ny)) || !road(nx, ny)) continue;
      if (zoneAt(map, nx, ny) !== zone && zoneAt(map, x, y) === zone) continue;   // do not wander back out of the land
      seen.add(key(nx, ny)); queue.push([nx, ny]);
    }
  }
  return out;
}

export function createLamps(w) {
  const g = w.add.graphics().setDepth(3);
  w.lamps = {};
  for (const { zone } of GATEWAYS) {
    const col = THEME.subjects[zone];
    w.lamps[zone] = lampSpots(w.map, zone).map((s) => {
      const x = (s.tx + 0.5) * TILE, y = (s.ty + 0.5) * TILE;
      g.fillStyle(0x000000, 0.16); g.fillEllipse(x, y + 11, 10, 3);
      g.fillStyle(0x2a2238, 1); g.fillRoundedRect(x - 2, y - 8.6, 4, 20.2, 1.6); g.fillRoundedRect(x - 3.8, y + 7.8, 7.6, 4, 1.5); g.fillRoundedRect(x - 4.8, y - 10.8, 9.6, 3.6, 1.5);
      g.fillStyle(0x5a5470, 1); g.fillRoundedRect(x - 1.1, y - 8, 2.2, 19, 1); g.fillRoundedRect(x - 3, y + 8.6, 6, 2.4, 1); g.fillRoundedRect(x - 4, y - 10, 8, 2, 1);
      const glow = w.add.circle(x, y - 13, 13, col.accent, 0.28).setDepth(3.05).setVisible(false);
      const bulb = w.add.circle(x, y - 13, 4, 0x8f89a1, 1).setStrokeStyle(1.4, 0x2a2238, 1).setDepth(3.1);
      w.tweens.add({ targets: glow, scale: 1.25, alpha: 0.12, duration: 1100 + ((s.tx * 7 + s.ty * 13) % 5) * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      return { bulb, glow, lit: false, col };
    });
  }
  refreshLamps(w, false);
}

/** Light one lamp per star earned in each land. With `sparkle`, lamps that have just come on flash. */
export function refreshLamps(w, sparkle = true) {
  const p = Store.getProfile();
  if (!p || !w.lamps) return;
  for (const { zone } of GATEWAYS) {
    const lamps = w.lamps[zone] || [], s = landStars(p, zone);
    const lit = s.total ? Math.round((s.stars / s.total) * lamps.length) : 0;
    lamps.forEach((l, i) => {
      const on = i < lit;
      if (on === l.lit || !l.bulb.active) return;
      l.lit = on;
      l.bulb.setFillStyle(on ? 0xfff1a6 : 0x8f89a1, 1).setStrokeStyle(1.4, on ? l.col.dark : 0x2a2238, 1);
      l.glow.setVisible(on);
      if (on && sparkle) {
        const ring = w.add.circle(l.bulb.x, l.bulb.y, 5).setStrokeStyle(2, 0xffc531, 1).setDepth(3.2);
        w.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 700, delay: i * 90, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      }
    });
  }
}
