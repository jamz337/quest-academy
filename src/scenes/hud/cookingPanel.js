// Cooking on the kitchen stove: pick a Bajan dish, then add its ingredients one at a time from a choice of
// three. The state lives on hud.state.cooking so a resize redraws the current step. `hud` is the HudScene.
import { THEME } from '../../ui/theme.js';
import { T, text } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { chip } from '../../ui/Chip.js';
import { card } from '../../ui/Card.js';
import { modal } from '../../ui/Modal.js';
import { readable } from '../../ui/ReadableText.js';
import { speakButton } from '../../ui/Button.js';
import { enter, shake } from '../../ui/motion.js';
import { Sfx } from '../../systems/Audio.js';
import { fireworks } from '../../ui/Fireworks.js';
import * as Store from '../../systems/Store.js';
import { RECIPES, COOK_COINS, stepChoices } from '../../data/social/recipes.js';
import { cookedToday, recordCooked } from '../../systems/Social.js';

export function showCooking(hud) {
  hud.state.cooking = { phase: 'menu', recipe: null, step: 0, choices: [], wrong: false, coins: 0 };
  if (hud.joystick) hud.joystick.release();
  hud.rebuild();
}

export function closeCooking(hud) { hud.state.cooking = null; hud.rebuild(); }

function startRecipe(hud, recipe) {
  const c = hud.state.cooking;
  c.recipe = recipe; c.step = 0; c.phase = 'step'; c.wrong = false;
  c.choices = stepChoices(recipe, 0, Math.random);
  Sfx.pop();
  hud.rebuild();
}

function pickIngredient(hud, i) {
  const c = hud.state.cooking;
  if (!c || c.phase !== 'step') return;
  const choice = c.choices[i];
  if (!choice.right) { c.wrong = true; Sfx.wrong(); hud.rebuild(); return; }
  c.wrong = false; c.step += 1; Sfx.correct();
  if (c.step >= c.recipe.steps.length) {
    c.phase = 'done';
    const first = !cookedToday(Store.getProfile(), c.recipe.id);
    c.coins = first ? COOK_COINS : 0;
    Store.updateProfile((p) => { recordCooked(p, c.recipe.id); if (first) p.coins += COOK_COINS; });
    Sfx.fanfare();
    hud.rebuild();
    if (first) { hud.awardCoins(COOK_COINS); hud.time.delayedCall(300, () => fireworks(hud, hud.w / 2, hud.h * 0.3, { bursts: 2, spread: hud.w * 0.25 })); }
    return;
  }
  c.choices = stepChoices(c.recipe, c.step, Math.random);
  hud.rebuild();
}

/** The pot on the stove with what has gone in so far. */
function drawPot(hud, cx, cy, size, recipe, step, bubbling) {
  const g = hud.add.graphics().setDepth(603);
  const w = size, h = size * 0.7;
  g.fillStyle(0x000000, 0.12); g.fillEllipse(cx, cy + h / 2 + 6, w * 1.1, 10);
  g.fillStyle(0x9aa3ad, 1); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
  g.fillStyle(0x6c7580, 1); g.fillRoundedRect(cx - w / 2 - 12, cy - h * 0.3, 12, 8, 4); g.fillRoundedRect(cx + w / 2, cy - h * 0.3, 12, 8, 4);
  g.fillStyle(step > 0 ? 0xffc531 : 0x3d8bff, 1); g.fillRoundedRect(cx - w / 2 + 6, cy - h / 2 + 6, w - 12, h - 12, 8);
  if (bubbling) { g.fillStyle(0xffffff, 0.7); for (let i = 0; i < 4; i++) g.fillCircle(cx - w * 0.3 + i * w * 0.2, cy - h * 0.1 + (i % 2) * 8, 4); }
  // The ingredients added so far float in the pot.
  recipe.steps.slice(0, step).forEach(([, pic], i) => hud.add.text(cx - w * 0.28 + i * w * 0.28, cy + 2, pic, { fontSize: Math.round(size * 0.28) + 'px' }).setOrigin(0.5).setDepth(604));
  return g;
}

export function buildCooking(hud, c) {
  const { w, h, ui } = hud;
  const p = Store.getProfile();
  if (c.phase === 'menu') {
    const m = modal(hud, { w: 440 * ui, h: Math.min(h - 24, (150 + RECIPES.length * 58) * ui), title: '🍳 The stove', accent: THEME.warning, depth: 600, dimAlpha: 0.45 });
    let y = m.contentTop + 6 * ui;
    text(hud, w / 2, y, 'What shall we cook today?', T.body(hud, THEME.ink2)).setDepth(603); y += 30 * ui;
    // The recipe buttons share whatever height is left above the Close button (short landscape windows).
    const room = m.y + m.h - 60 * ui - y, gap = 10 * ui;
    const bw = Math.min(m.w - 48, 360 * ui), bh = Math.max(34 * ui, Math.min(48 * ui, (room - gap * (RECIPES.length - 1)) / RECIPES.length));
    const rows = RECIPES.map((r) => {
      const done = cookedToday(p, r.id);
      const b = button(hud, w / 2, y + bh / 2, bw, bh, `${r.pic}  ${r.name}`, { variant: done ? 'secondary' : 'warning', fontSize: 15, onClick: () => startRecipe(hud, r) }).setDepth(603);
      if (done) chip(hud, w / 2 + bw / 2 - 6, y + bh / 2, { text: 'cooked ✓', originX: 1, color: THEME.successSoft, textColor: THEME.successDark, fontSize: 11, height: 22 * ui, shadow: 'none' }).setDepth(604);
      y += bh + gap;
      return b;
    });
    enter(hud, rows, { from: 'up', stagger: 40 });
    button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 42 * ui, 'Close', { variant: 'ghost', onClick: () => closeCooking(hud) }).setDepth(603);
    return;
  }
  const r = c.recipe;
  if (c.phase === 'step') {
    const m = modal(hud, { w: 460 * ui, h: Math.min(h - 24, 470 * ui), title: `${r.pic} ${r.name}`, accent: THEME.warning, depth: 600, dimAlpha: 0.45 });
    let y = m.contentTop + 4 * ui;
    text(hud, w / 2, y + 8 * ui, `Step ${c.step + 1} of ${r.steps.length}`, T.small(hud, THEME.ink3)).setDepth(603);
    y += 26 * ui;
    drawPot(hud, w / 2, y + 40 * ui, Math.min(150 * ui, m.w * 0.42), r, c.step, c.step > 0);
    y += 108 * ui;
    const ask = readable(hud, w / 2, y, c.wrong ? 'Not that one! What goes in the pot next?' : 'What goes in the pot next?', T.at(hud, 17, c.wrong ? THEME.danger : THEME.ink, { fontStyle: '700' }), { width: m.w - 100 * ui });
    ask.setDepth(603);
    const sb = speakButton(hud, m.x + m.w - 30 * ui, y, 36 * ui, ask, { rate: hud.speechRate }); if (sb) sb.setDepth(603);
    y += 34 * ui;
    const gap = 8 * ui, cw = Math.min((m.w - 48 - gap * 2) / 3, 120 * ui), ch = 96 * ui;
    const cards = c.choices.map((choice, i) => {
      const cx = w / 2 + (i - 1) * (cw + gap);
      const k = card(hud, cx, y + ch / 2, cw, ch, { stroke: THEME.line, onTap: () => pickIngredient(hud, i) });
      k.setDepth(603);
      k.add(hud.add.text(0, -14 * ui, choice.pic, { fontSize: Math.round(36 * ui) + 'px' }).setOrigin(0.5));
      k.add(hud.add.text(0, 28 * ui, choice.name, { ...T.small(hud, THEME.ink), wordWrap: { width: cw - 12 }, align: 'center' }).setOrigin(0.5));
      return k;
    });
    enter(hud, cards, { from: 'pop', stagger: 50 });
    if (c.wrong) hud.time.delayedCall(20, () => cards.forEach((k) => { if (k.active) shake(hud, k, 4); }));
    button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 42 * ui, 'Stop cooking', { variant: 'ghost', onClick: () => closeCooking(hud) }).setDepth(603);
    return;
  }
  // Done: the dish, what it is, and the coins.
  const m = modal(hud, { w: 440 * ui, h: Math.min(h - 24, 380 * ui), title: 'Dinner is ready!', accent: THEME.success, depth: 600, dimAlpha: 0.45 });
  let y = m.contentTop + 10 * ui;
  const dish = hud.add.text(w / 2, y + 30 * ui, r.pic, { fontSize: Math.round(64 * ui) + 'px' }).setOrigin(0.5).setDepth(603);
  enter(hud, dish, { from: 'pop' });
  y += 76 * ui;
  text(hud, w / 2, y, `You cooked ${r.name}!`, T.heading(hud)).setDepth(603); y += 30 * ui;
  const about = readable(hud, w / 2, y, r.about, T.small(hud, THEME.ink2), { width: m.w - 48 }); about.setDepth(603);
  y += 56 * ui;
  text(hud, w / 2, y, c.coins ? `+${c.coins} coins for cooking a Bajan dish` : 'Already cooked today: no coins this time, but delicious!', T.bodyBold(hud, THEME.warningDark)).setDepth(603);
  const bw = Math.min((m.w - 72) / 2, 180 * ui), bh = 44 * ui, by = m.y + m.h - 34 * ui;
  button(hud, w / 2 - bw / 2 - 8, by, bw, bh, 'Cook more', { variant: 'secondary', onClick: () => { c.phase = 'menu'; c.recipe = null; hud.rebuild(); } }).setDepth(603);
  button(hud, w / 2 + bw / 2 + 8, by, bw, bh, 'Close', { variant: 'primary', onClick: () => closeCooking(hud) }).setDepth(603);
}
