// Surprises in the grass: today's sparkles (a pop quiz, a chest or a gift each) and the odd quiz that springs
// from tall grass. Functions take the WorldScene as `w`; the HUD shows the encounter itself.
import { TILE, SUBJECTS } from '../../constants.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { Rng } from '../../systems/Rng.js';
import { zoneAt } from '../../data/world/map.js';
import { sparkleSpots, daySeed, dayKey, rollEncounter, chestCoins, pickGift, GRASS, SURPRISE_CHANCE, SURPRISE_COOLDOWN_MS, QUIZ_REWARD } from '../../data/world/encounters.js';
import { bossQuestions } from '../../generators/boss.js';
import { effectiveGrade } from '../../systems/Progression.js';
import { weakSkills } from '../../systems/Practice.js';

/** Today's sparkles: the ones not yet found glint on the grass and trigger an encounter when stepped on. */
export function createSparkles(w, profile) {
  const day = dayKey();
  const rec = profile.world.sparkles;
  const found = rec && rec.day === day ? rec.found || [] : [];
  w.sparkleGroup = w.physics.add.staticGroup();
  sparkleSpots(w.map, daySeed(profile.id, day)).forEach((s, i) => {
    if (found.includes(i)) return;
    const img = w.sparkleGroup.create((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, 'sparkle');
    img.setScale(0.45).setDepth(3).refreshBody();
    img.body.setSize(14, 14);
    img.setData('idx', i);
    w.tweens.add({ targets: img, alpha: 0.35, scale: 0.3, duration: 600 + (i % 3) * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    w.tweens.add({ targets: img, angle: 360, duration: 6000, repeat: -1 });
  });
  w.physics.add.overlap(w.player, w.sparkleGroup, (_p, sp) => onSparkle(w, sp));
  w.nextSurprise = Date.now() + 15000;   // a little grace after arriving
  w.lastTile = null;
}

export function onSparkle(w, sp) {
  if (!sp.active) return;
  const hud = w.hud();
  if (hud && hud.blocking) return;
  const idx = sp.getData('idx');
  sp.destroy();
  const day = dayKey();
  Store.updateProfile((p) => {
    if (!p.world.sparkles || p.world.sparkles.day !== day) p.world.sparkles = { day, found: [] };
    if (!p.world.sparkles.found.includes(idx)) p.world.sparkles.found.push(idx);
  });
  Sfx.unlock();
  startEncounter(w, rollEncounter(() => Math.random()));
}

/** Called from tick(): now and then the tall grass springs a quiz on the walker. */
export function maybeSurprise(w, tx, ty) {
  const tile = `${tx},${ty}`;
  if (tile === w.lastTile) return;
  w.lastTile = tile;
  const hud = w.hud();
  if (!hud || hud.blocking || Date.now() < w.nextSurprise) return;
  if (!GRASS.has(w.map.data[ty]?.[tx])) return;
  if (Math.random() >= SURPRISE_CHANCE) return;
  w.nextSurprise = Date.now() + SURPRISE_COOLDOWN_MS;
  Sfx.pop();
  startEncounter(w, 'quiz');
}

export function startEncounter(w, kind) {
  const hud = w.hud();
  if (!hud) return;
  w.stopPlayer();
  const profile = Store.getProfile();
  const rng = new Rng();
  if (kind === 'quiz') {
    const tx = Math.floor(w.player.x / TILE), ty = Math.floor(w.player.y / TILE);
    const subject = zoneAt(w.map, tx, ty) || rng.pick(Object.keys(SUBJECTS));
    const sub = SUBJECTS[subject] ? subject : rng.pick(Object.keys(SUBJECTS));
    // A handful of candidates so a skill the player has been missing can be revisited (spaced practice).
    const weak = new Set(weakSkills(profile));
    const cands = bossQuestions(sub, effectiveGrade(profile, sub), rng, 8);
    const q = cands.find((c) => weak.has(c.skill)) || cands[0];
    hud.showEncounter({ kind, subject: sub, q, reward: QUIZ_REWARD, onAnswer: (right) => { if (right) reward(w, QUIZ_REWARD); } });
  } else if (kind === 'chest') {
    const coins = chestCoins(() => rng.float());
    reward(w, { coins });
    hud.showEncounter({ kind, coins });
  } else {
    const gift = pickGift(() => rng.float());
    if (gift.charm) Store.updateProfile((p) => { p.charms ||= {}; p.charms[gift.charm] = true; });
    else reward(w, gift);
    hud.showEncounter({ kind, gift });
  }
}

export function reward(w, { coins = 0, xp = 0 }) {
  Store.updateProfile((p) => { p.coins += coins; p.xp += xp; });
  const hud = w.hud();
  if (hud) { hud.setCoins(Store.getProfile().coins); if (coins) hud.awardCoins(coins); }
}
