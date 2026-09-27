// Errands in the world: a villager asks for something from another land; the item bobs on its tile until the
// player walks over it, then it is carried back. Functions take the WorldScene as `w`.
import { TILE } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { fireworks } from '../../ui/Fireworks.js';
import { NPCS } from '../../data/world/npcs.js';
import { ZONE_NAMES } from '../../data/world/map.js';
import { getBadge } from '../../data/badges.js';
import { checkBadges } from '../../systems/Progression.js';
import { errandFor, errandState, activeErrand, acceptErrand, pickUpErrand, deliverErrand, errandLine } from '../../data/world/errands.js';

/** Errand talk: hand over what is carried, or offer this villager's errand. True when it handled the talk. */
export function errandTalk(w, npc, hud) {
  const e = errandFor(npc.id);
  if (!e) return false;
  const profile = Store.getProfile();
  const st = errandState(profile, e.id);
  if (st === 'carrying') {
    let reward = null, badges = [];
    Store.updateProfile((p) => { reward = deliverErrand(p, e.id); badges = checkBadges(p); });
    hud.setCarry(null);
    hud.showDialog({ name: npc.name, voice: npc.voice, pitch: npc.pitch, rate: npc.rate, speaker: npc.id, lines: [e.thanks, `Here, take ${reward.coins} coins and ${reward.xp} XP for your trouble!`] });
    hud.setCoins(Store.getProfile().coins);
    hud.awardCoins(reward.coins);
    Sfx.unlock();
    fireworks(hud, hud.w / 2, hud.h * 0.35, { bursts: 3, spread: hud.w * 0.3 });
    badges.forEach((id, i) => w.time.delayedCall(1500 + i * 1400, () => w.say(`New badge: ${getBadge(id)?.title || id}`, { icon: 'star', accent: THEME.brand })));
    return true;
  }
  if (st === 'available' && !activeErrand(profile) && !(w.errandDeclined && w.errandDeclined[npc.id])) {
    hud.showDialog({
      name: npc.name, voice: npc.voice, pitch: npc.pitch, rate: npc.rate, speaker: npc.id, lines: [e.ask], prompt: 'Will you help?', playLabel: 'Sure!',
      onPlay: () => {
        Store.updateProfile((p) => acceptErrand(p, e.id));
        createErrandItem(w, Store.getProfile());
        hud.setCarry(errandLine(Store.getProfile()));
        w.say(`${e.emoji} Find the ${e.item} in ${ZONE_NAMES[e.zone]}`, { accent: THEME.warning });
      },
      onLater: () => { w.errandDeclined = { ...(w.errandDeclined || {}), [npc.id]: true }; }
    });
    return true;
  }
  return false;
}

/** The item of the active errand, bobbing on its tile until the player walks over it. */
export function createErrandItem(w, profile) {
  if (w.errandItem) { w.errandItem.destroy(); w.errandItem = null; }
  const e = activeErrand(profile);
  if (!e || errandState(profile, e.id) !== 'active') return;
  const t = w.add.text((e.tx + 0.5) * TILE, (e.ty + 0.5) * TILE, e.emoji, { fontSize: '18px' }).setOrigin(0.5).setDepth(4);
  w.tweens.add({ targets: t, y: t.y - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  t.errand = e;
  w.errandItem = t;
}

export function pickUpItem(w) {
  const e = w.errandItem.errand;
  w.errandItem.destroy(); w.errandItem = null;
  Store.updateProfile((p) => pickUpErrand(p, e.id));
  Sfx.unlock();
  const hud = w.hud();
  if (hud) hud.setCarry(errandLine(Store.getProfile()));
  const giver = NPCS.find((n) => n.id === e.npc);
  w.say(`${e.emoji} You found the ${e.item}! Take it to ${giver ? giver.name : 'the villager'}.`, { accent: THEME.success });
}

/** Where the minimap should point for the errand in progress: the item, or the villager waiting for it. */
export function errandTarget(map, profile) {
  const e = activeErrand(profile);
  if (!e) return null;
  if (errandState(profile, e.id) === 'active') return { tx: e.tx, ty: e.ty };
  const spot = map.npcSpots[e.npc];
  return spot ? { tx: spot.tx, ty: spot.ty } : null;
}
