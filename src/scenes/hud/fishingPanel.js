// Fishing: wait for the float to tug, then pull in time. The state lives on hud.state.fishing so a
// resize simply redraws the current phase. `hud` is the HudScene.
import { THEME } from '../../ui/theme.js';
import { T, text } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { readable } from '../../ui/ReadableText.js';
import { modal } from '../../ui/Modal.js';
import { Sfx } from '../../systems/Audio.js';
import { fireworks } from '../../ui/Fireworks.js';
import { FISH_WAIT_MS, FISH_BITE_MS, rollFish } from '../../data/world/encounters.js';

/** { onCatch(loot) -> message|null } */
export function showFishing(hud, opts) {
  hud.state.fishing = { phase: 'wait', loot: null, msg: null, onCatch: opts.onCatch || null };
  if (hud.joystick) hud.joystick.release();
  hud.rebuild();
  const [lo, hi] = FISH_WAIT_MS;
  hud.fishTimer = hud.time.delayedCall(lo + Math.random() * (hi - lo), () => {
    const f = hud.state.fishing;
    if (!f || f.phase !== 'wait') return;
    f.phase = 'bite'; Sfx.pop(); hud.rebuild();
    hud.fishTimer = hud.time.delayedCall(FISH_BITE_MS, () => { const g = hud.state.fishing; if (g && g.phase === 'bite') endFishing(hud, null, 'It got away! Pull as soon as the float tugs.'); });
  });
}

export function pullLine(hud) {
  const f = hud.state.fishing;
  if (!f || f.phase === 'done') return;
  if (hud.fishTimer) { hud.fishTimer.remove(false); hud.fishTimer = null; }
  if (f.phase === 'wait') return endFishing(hud, null, 'Too soon! Wait for the float to tug.');
  const loot = rollFish(Math.random);
  const message = f.onCatch ? f.onCatch(loot) : null;
  endFishing(hud, loot, loot.coins ? `You caught ${loot.name}!  +${loot.coins} coins` : `You caught ${loot.name}. Better luck next cast!`, message);
  if (loot.coins >= 8) fireworks(hud, hud.w / 2, hud.h * 0.3, { bursts: 2, spread: hud.w * 0.25 });
}

export function endFishing(hud, loot, msg, message = null) {
  const f = hud.state.fishing;
  if (!f) return;
  f.phase = 'done'; f.loot = loot; f.msg = msg; f.message = message;
  if (loot && loot.coins) Sfx.correct(); else Sfx.wrong();
  hud.rebuild();
}

export function closeFishing(hud) {
  if (hud.fishTimer) { hud.fishTimer.remove(false); hud.fishTimer = null; }
  hud.state.fishing = null;
  hud.rebuild();
}

export function buildFishing(hud, f) {
  const { w, ui } = hud;
  const m = modal(hud, { w: 400 * ui, h: (f.phase === 'done' && f.message ? 400 : 330) * ui, title: 'Gone fishing', accent: THEME.subjects.code.accent, depth: 600, dimAlpha: 0.4 });
  const pond = hud.add.graphics().setDepth(603);
  const px = m.x + 24, py = m.contentTop, pw = m.w - 48, ph = 130 * ui;
  pond.fillStyle(0x4aa8ff, 1); pond.fillRoundedRect(px, py, pw, ph, 16);
  pond.fillStyle(0xc5e8ff, 0.7); for (let i = 0; i < 5; i++) pond.fillRoundedRect(px + 16 + i * (pw / 5), py + 20 + (i % 2) * 40, 26, 4, 2);
  if (f.phase !== 'done') {
    const bob = hud.add.image(m.x + m.w / 2, py + ph * 0.5, 'bobber').setDisplaySize(30 * ui, 30 * ui).setDepth(604);
    if (f.phase === 'wait') hud.tweens.add({ targets: bob, y: bob.y + 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    else {
      hud.tweens.add({ targets: bob, y: bob.y + 18, duration: 90, yoyo: true, repeat: -1 });
      text(hud, m.x + m.w / 2, py + 22 * ui, '!', T.at(hud, 34, THEME.danger, { fontStyle: '700' })).setDepth(604);
    }
    text(hud, w / 2, py + ph + 24 * ui, f.phase === 'wait' ? 'Wait for the float to tug…' : 'PULL NOW!', T.bodyBold(hud, f.phase === 'wait' ? THEME.ink2 : THEME.danger)).setDepth(603);
    button(hud, w / 2, m.y + m.h - 40 * ui, Math.min(m.w - 48, 220 * ui), 50 * ui, 'Pull!', { variant: f.phase === 'bite' ? 'danger' : 'primary', fontSize: 20, onClick: () => pullLine(hud) }).setDepth(603);
  } else {
    const big = hud.add.text(m.x + m.w / 2, py + ph * 0.5, f.loot ? f.loot.emoji : '💧', { fontSize: Math.round(56 * ui) + 'px' }).setOrigin(0.5).setDepth(604);
    if (f.loot) hud.tweens.add({ targets: big, scale: 1.15, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const msgText = readable(hud, w / 2, py + ph + 20 * ui, f.msg, T.bodyBold(hud, f.loot && f.loot.coins ? THEME.successDark : THEME.ink2), { width: m.w - 48 }).setOrigin(0.5, 0).setDepth(603);
    hud.autoRead(msgText);
    if (f.message) readable(hud, w / 2, py + ph + 24 * ui + msgText.height + 12 * ui, f.message, T.small(hud, THEME.ink), { width: m.w - 48 }).setOrigin(0.5, 0).setDepth(603);
    button(hud, w / 2, m.y + m.h - 40 * ui, Math.min(m.w - 48, 220 * ui), 46 * ui, 'Done', { variant: 'primary', onClick: () => closeFishing(hud) }).setDepth(603);
  }
}
