// Wandering critters (a sheep and a bunny): they amble about the grass, bolt from the player and pay a few
// coins when caught, a limited number of times a day. Functions take the WorldScene as `w`.
import Phaser from 'phaser';
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import { CRITTER_CELL, CRITTER_WORLD_SCALE } from '../../ui/Critters.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { grassSpots, dayKey, CRITTERS, CRITTER_MAX_PER_DAY } from '../../data/world/encounters.js';


export function createCritters(w) {
  w.critters = [];
  w.critterTimer = w.time.addEvent({ delay: 400, loop: true, callback: () => crittersThink(w) });
  for (const def of CRITTERS) spawnCritter(w, def);
}

/** Put a critter on a random grass tile well away from the player. */
export function spawnCritter(w, def) {
  if (!w.player || !w.player.body) return;
  const far = grassSpots(w.map).filter((s) => Phaser.Math.Distance.Between((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, w.player.x, w.player.y) > 10 * TILE);
  const s = Phaser.Utils.Array.GetRandom(far.length ? far : grassSpots(w.map));
  if (!s) return;
  const c = w.physics.add.sprite((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, def.key, 0).setScale(CRITTER_WORLD_SCALE).setDepth(9);
  c.body.setSize(CRITTER_CELL * 0.62, CRITTER_CELL * 0.5).setOffset(CRITTER_CELL * 0.19, CRITTER_CELL * 0.44);
  c.setCollideWorldBounds(true);
  w.physics.add.collider(c, w.layer);
  w.physics.add.collider(c, w.treeLayer);
  w.physics.add.overlap(w.player, c, () => catchCritter(w, c));
  c.def = def; c.moveUntil = 0;
  w.critters.push(c);
}

/** Every 400ms: each critter bolts away from a nearby player, otherwise ambles about or rests. */
export function crittersThink(w) {
  if (!w.player || !w.player.body) return;
  const hud = w.hud();
  for (const c of w.critters) {
    if (!c.body) continue;
    const def = c.def;
    if (hud && hud.blocking) { c.setVelocity(0, 0); c.anims.stop(); continue; }
    const d = Phaser.Math.Distance.Between(w.player.x, w.player.y, c.x, c.y);
    let vx = 0, vy = 0;
    if (d < def.fleeDist) {
      const a = Phaser.Math.Angle.Between(w.player.x, w.player.y, c.x, c.y);
      vx = Math.cos(a) * def.fleeSpeed; vy = Math.sin(a) * def.fleeSpeed;
      c.moveUntil = 0;
    } else if (Date.now() >= c.moveUntil) {
      if (Math.random() >= 0.4) { const a = Math.random() * Math.PI * 2; vx = Math.cos(a) * def.wanderSpeed; vy = Math.sin(a) * def.wanderSpeed; }
      c.moveUntil = Date.now() + 800 + Math.random() * 1200;
    } else continue;
    c.setVelocity(vx, vy);
    if (vx) c.setFlipX(vx > 0);
    if (vx || vy) c.anims.play(`${def.key}-walk`, true); else { c.anims.stop(); c.setFrame(0); }
  }
}

export function catchCritter(w, c) {
  if (!c || !c.active) return;
  const hud = w.hud();
  if (hud && hud.blocking) return;
  const def = c.def;
  w.critters = w.critters.filter((x) => x !== c);
  c.destroy();
  const day = dayKey();
  let coins = 0;
  Store.updateProfile((p) => {
    if (!p.world.critters || p.world.critters.day !== day) p.world.critters = { day, caught: 0 };
    if (p.world.critters.caught < CRITTER_MAX_PER_DAY) { p.world.critters.caught += 1; coins = def.coins; p.coins += coins; }
  });
  if (coins) w.say(`${def.cry} You caught the ${def.name}: +${coins} coins`, { icon: 'coin' });
  else { Sfx.pop(); w.say(`${def.cry} The critters are out of coins for today.`, { accent: THEME.ink3 }); }
  if (hud) { hud.setCoins(Store.getProfile().coins); if (coins) hud.awardCoins(coins); }
  w.time.delayedCall(def.respawnMs, () => spawnCritter(w, def));
}
