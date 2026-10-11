// The quest board's page: today's goal, a progress bar for each land and where to go next, in one panel.
// `hud` is the HudScene; the page's facts are hud.state.board =
// { goal: { title, stars, done, bonus } | null, lands: [{ zone, name, stars, total }], next: { title, land, zone } | null }.
import { THEME, hex } from '../../ui/theme.js';
import { FONT, WEIGHT } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { modal } from '../../ui/Modal.js';
import { icon } from '../../ui/Icons.js';

export function buildBoard(hud, b) {
  const { w, h, ui } = hud;
  const D = 603;
  // Everything is sized from one factor, so the whole page shrinks to fit a short (landscape) screen.
  const orders = b.orders || [];
  const rows = b.lands.length, need = (86 + (b.goal ? 86 : 0) + 26 + rows * 40 + 10 + (orders.length ? 44 : 0) + 62 + 66) * ui;
  const f = ui * Math.min(1, (h - 24) / need);
  const mw = Math.min(w - 24, 470 * f), mh = need * (f / ui);
  const m = modal(hud, { look: 'storybook', w: mw, h: mh, accent: THEME.gold, depth: 600, dimAlpha: 0.45 });
  const g = hud.add.graphics().setDepth(602);
  const font = (size, color, weight = WEIGHT.heavy) => ({ fontFamily: FONT, fontSize: Math.round(size * f) + 'px', color: hex(color), fontStyle: weight });
  const put = (x, y, str, style, ox = 0, oy = 0.5) => hud.add.text(x, y, str, style).setOrigin(ox, oy).setDepth(D);
  const left = m.x + 22 * f, right = m.x + m.w - 22 * f, inner = right - left;

  // Heading: a gold star badge and the title.
  let y = m.y + 46 * f;
  g.fillStyle(THEME.warningDark, 1); g.fillCircle(left + 19 * f, y + 2 * f, 19 * f);
  g.fillStyle(THEME.gold, 1); g.fillCircle(left + 19 * f, y, 19 * f);
  hud.add.image(left + 19 * f, y, icon(hud, 'trophy', 0xffffff)).setDisplaySize(22 * f, 22 * f).setDepth(D);
  put(left + 48 * f, y - 8 * f, 'Quest board', font(24, THEME.ink));
  put(left + 48 * f, y + 13 * f, 'What to do next, and how far you have come', font(12.5, THEME.ink2, WEIGHT.bold));
  y += 40 * f;

  // Today's goal on a warm card.
  if (b.goal) {
    const ch = 74 * f, done = b.goal.done;
    g.fillStyle(done ? THEME.successSoft : THEME.warningSoft, 1); g.fillRoundedRect(left, y, inner, ch, 16 * f);
    g.lineStyle(2, done ? THEME.success : THEME.warning, 1); g.strokeRoundedRect(left, y, inner, ch, 16 * f);
    put(left + 16 * f, y + 17 * f, done ? "TODAY'S GOAL · DONE" : "TODAY'S GOAL", font(11.5, done ? THEME.successDark : THEME.warningDark));
    put(left + 16 * f, y + 43 * f, b.goal.title, font(20, THEME.ink));
    for (let i = 0; i < 3; i++) hud.add.image(right - 96 * f + i * 26 * f, y + 30 * f, i < b.goal.stars ? 'star' : 'star-off').setDisplaySize(24 * f, 24 * f).setDepth(D);
    put(right - 16 * f, y + 58 * f, done ? 'Well played!' : `Pays ${b.goal.bonus} coins`, font(12.5, done ? THEME.successDark : THEME.warningDark, WEIGHT.bold), 1);
    y += ch + 12 * f;
  }

  // A bar for each land, in its own colour.
  put(left, y + 8 * f, 'STARS IN EACH LAND', font(11.5, THEME.ink2));
  y += 26 * f;
  const nameW = 140 * f, countW = 62 * f, barX = left + nameW, barW = inner - nameW - countW, barH = 14 * f;
  for (const land of b.lands) {
    const col = THEME.subjects[land.zone], cy = y + 16 * f, share = land.total ? Math.min(1, land.stars / land.total) : 0;
    g.fillStyle(col.accent, 1); g.fillCircle(left + 7 * f, cy, 7 * f);
    put(left + 22 * f, cy, land.name, font(15, THEME.ink, WEIGHT.bold));
    g.fillStyle(col.soft, 1); g.fillRoundedRect(barX, cy - barH / 2, barW, barH, barH / 2);
    if (share > 0) {
      const fw = Math.max(barH, barW * share);
      g.fillStyle(col.dark, 1); g.fillRoundedRect(barX, cy - barH / 2, fw, barH, barH / 2);
      g.fillStyle(col.accent, 1); g.fillRoundedRect(barX, cy - barH / 2, fw, barH * 0.78, barH / 2);
      g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(barX + 4 * f, cy - barH / 2 + 2 * f, Math.max(2, fw - 8 * f), 2.5 * f, 1.2 * f);
    }
    put(right, cy, `★ ${land.stars}/${land.total}`, font(14, col.dark), 1);
    y += 40 * f;
  }
  y += 10 * f;

  // Villagers with an order today.
  if (orders.length) {
    put(left, y + 6 * f, "TODAY'S ORDERS", font(11.5, THEME.ink2));
    put(left, y + 26 * f, orders.map((o) => `${o.emoji} ${o.name}`).join('   '), { ...font(13, THEME.ink, WEIGHT.bold), wordWrap: { width: inner } });
    y += 44 * f;
  }

  // Where the footprints lead.
  const nh = 50 * f, nc = b.next ? THEME.subjects[b.next.zone] : { accent: THEME.gold, dark: THEME.warningDark, soft: THEME.warningSoft };
  g.fillStyle(nc.soft, 1); g.fillRoundedRect(left, y, inner, nh, 14 * f);
  put(left + 16 * f, y + nh / 2, b.next ? '👣' : '🏆', { fontSize: Math.round(22 * f) + 'px' });
  put(left + 50 * f, y + nh / 2, b.next ? `Next: ${b.next.title}\nFollow the footprints to ${b.next.land}` : 'Every star is yours.\nThe whole Academy is proud of you!',
    { ...font(13.5, nc.dark, WEIGHT.bold), lineSpacing: 2, wordWrap: { width: inner - 62 * f } });
  y += nh + 12 * f;

  button(hud, w / 2, m.y + m.h - 34 * f, Math.min(inner, 220 * f), 46 * f, b.next ? "Let's go!" : 'Close', { variant: 'go', compact: true, fontSize: 18 * (f / ui), onClick: () => hud.closeBoard() }).setDepth(D);
}
