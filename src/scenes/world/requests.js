// Villagers' orders in the world (see data/world/requests.js): a little bubble with what they need floats over
// the head of each villager who has an order today, and filling it after their game brings thanks and a reward.
// Functions take the WorldScene as `w`.
import { THEME } from '../../ui/theme.js';
import * as Store from '../../systems/Store.js';
import { Sfx } from '../../systems/Audio.js';
import { fireworks } from '../../ui/Fireworks.js';
import { pendingRequest, fillRequest, REQUEST_STARS } from '../../data/world/requests.js';

/** Put (or refresh) the order bubbles over the villagers' heads. */
export function refreshRequestBubbles(w) {
  const p = Store.getProfile();
  (w.requestBubbles || []).forEach((b) => { w.tweens.killTweensOf(b); b.destroy(); });
  w.requestBubbles = [];
  if (!p) return;
  for (const s of w.npcs || []) {
    if (!s.npc) continue;
    const r = pendingRequest(p, s.npc.id);
    if (!r) continue;
    const b = w.add.text(s.x + 12, s.y - 24, r.emoji, { fontSize: '8px', backgroundColor: '#ffffff', padding: { x: 2.5, y: 1.5 } }).setOrigin(0.5).setDepth(11).setResolution(6);
    w.tweens.add({ targets: b, y: b.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    w.requestBubbles.push(b);
  }
}

/** The line a villager opens with when they have an order, or null. */
export function requestLine(npcId) {
  const r = pendingRequest(Store.getProfile(), npcId);
  return r ? `${r.emoji} ${r.ask}` : null;
}

/** After a game at a villager's house: fill their order if the play was good enough. */
export function requestAfterGame(w, payload, result) {
  const npcId = payload && payload.context && payload.context.npcId;
  if (!npcId || !result || result.aborted) return;
  let out = null;
  Store.updateProfile((p) => { out = fillRequest(p, npcId, result.stars); });
  if (!out) return;
  const s = (w.npcs || []).find((x) => x.npc && x.npc.id === npcId), name = s ? s.npc.name : 'The villager';
  if (!out.done) {
    w.time.delayedCall(2600, () => w.say(`${out.request.emoji} ${name} still needs ${'★'.repeat(REQUEST_STARS)} to fill the order. Have another go!`, { accent: THEME.ink3 }));
    return;
  }
  refreshRequestBubbles(w);
  const hud = w.hud();
  w.time.delayedCall(2600, () => {
    Sfx.unlock();
    if (hud) { hud.setCoins(Store.getProfile().coins); hud.awardCoins(out.coins); }
    w.say(`${out.request.emoji} ${name}: ${out.request.thanks}  +${out.coins} coins`, { icon: 'star', accent: THEME.success });
    const sc = hud && hud.scene.isActive() ? hud : null;
    if (sc) fireworks(sc, sc.w / 2, sc.h * 0.35, { bursts: 2, spread: sc.w * 0.25 });
    if (s && s.active) w.tweens.add({ targets: s, y: s.y - 6, duration: 140, yoyo: true, repeat: 2 });   // a happy hop
  });
}
