// The pause menu and its pages: the zone's quest checklist and the full map. `hud` is the HudScene.
import { SCENES } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import { T, text } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { modal } from '../../ui/Modal.js';
import { Sfx } from '../../systems/Audio.js';
import * as Store from '../../systems/Store.js';
import { ZONE_NAMES } from '../../data/world/map.js';
import { zoneQuests, activeZone, ZONE_ORDER, bossReady } from '../../data/world/quests.js';
import { bossForZone } from '../../data/world/bosses.js';
import { errandLine } from '../../data/world/errands.js';
import { ensureExplored, exploredStats } from '../../data/world/explore.js';
import { Minimap, paintMinimap } from '../../ui/Minimap.js';

export function buildMenu(hud) {
  if (hud.state.menuPage === 'quests') return buildQuests(hud);
  if (hud.state.menuPage === 'map') return buildMapPage(hud);
  const { w, ui } = hud;
  const m = modal(hud, { w: 320 * ui, h: 424 * ui, title: 'Paused', accent: THEME.primary, depth: 600, dimAlpha: 0.45 });
  const bw = m.w - 48, bh = 50 * ui;
  let y = m.contentTop + 12 * ui + bh / 2;
  const page = (p) => { Sfx.click(); hud.state.menuPage = p; hud.rebuild(); };
  button(hud, w / 2, y, bw, bh, 'Resume', { variant: 'primary', onClick: () => hud.closeMenu() }).setDepth(603); y += bh + 12;
  button(hud, w / 2, y, bw, bh, 'Quests', { variant: 'warning', onClick: () => page('quests') }).setDepth(603); y += bh + 12;
  button(hud, w / 2, y, bw, bh, 'Map', { variant: 'success', onClick: () => page('map') }).setDepth(603); y += bh + 12;
  button(hud, w / 2, y, bw, bh, 'Challenge Mode', { variant: 'subject', subject: 'code', onClick: () => hud.leaveTo(SCENES.ChallengeMenu) }).setDepth(603); y += bh + 12;
  button(hud, w / 2, y, bw, bh, 'Home', { variant: 'secondary', onClick: () => hud.leaveTo(SCENES.ModeSelect) }).setDepth(603);
}

/** Checklist for the zone the player stands in (or the next one to clear), with the boss last. */
export function buildQuests(hud) {
  const { w, ui } = hud;
  const profile = Store.getProfile() || {};
  const zone = ZONE_ORDER.includes(hud.state.zoneId) ? hud.state.zoneId : activeZone(profile);
  const quests = zoneQuests(profile, zone);
  const errand = errandLine(profile);
  if (errand) quests.push({ id: 'errand', title: errand, count: 0, total: 1, done: false });   // sized into the modal below
  const boss = bossForZone(zone);
  const rowH = 34 * ui;
  const m = modal(hud, { w: 400 * ui, h: 180 * ui + quests.length * rowH, title: `${ZONE_NAMES[zone]} quests`, accent: THEME.warning, depth: 600, dimAlpha: 0.45 });
  let y = m.contentTop + 6 * ui;
  const ready = boss && bossReady(profile, zone);
  const done = quests.every((q) => q.done);
  const sub = done ? 'Zone cleared! Explore the next land.' : ready ? `${boss.name} is waiting. Go and fight!` : 'Finish these to wake the boss.';
  text(hud, w / 2, y, sub, T.small(hud, THEME.ink2)).setDepth(603); y += 24 * ui;
  quests.forEach((q) => {
    const cy = y + rowH / 2;
    const mark = q.done ? '✓' : q.id === 'boss' && !ready ? '🔒' : q.id === 'errand' ? '📜' : '○';
    text(hud, m.x + 26, cy, mark, T.bodyBold(hud, q.done ? THEME.successDark : THEME.ink3)).setDepth(603);
    text(hud, m.x + 48, cy, q.title, { ...T.body(hud, q.done ? THEME.ink2 : THEME.ink), wordWrap: { width: m.w - 130 } }).setOrigin(0, 0.5).setDepth(603);
    text(hud, m.x + m.w - 24, cy, `${q.count}/${q.total}`, T.small(hud, q.done ? THEME.successDark : THEME.ink2)).setOrigin(1, 0.5).setDepth(603);
    y += rowH;
  });
  button(hud, w / 2, m.y + m.h - 36 * ui, Math.min(m.w - 48, 200 * ui), 44 * ui, 'Back', { variant: 'secondary', onClick: () => { hud.state.menuPage = 'menu'; hud.rebuild(); } }).setDepth(603);
}

/** The whole map, as far as it has been explored, with a legend. */
export function buildMapPage(hud) {
  const { w, h, ui } = hud;
  const map = hud.worldMap();
  const profile = Store.getProfile();
  const m = modal(hud, { w: Math.min(w - 16, 560 * ui), h: Math.min(h - 16, 520 * ui), title: 'Map', accent: THEME.success, depth: 600, dimAlpha: 0.5 });
  if (!map || !profile) {
    text(hud, w / 2, m.contentTop + 40, 'The map is drawn as you explore.', T.body(hud, THEME.ink2)).setDepth(603);
  } else {
    const explored = ensureExplored(profile);
    paintMinimap(hud, map, explored);
    const legendH = 54 * ui, footH = 56 * ui;
    const availW = m.w - 32, availH = m.h - (m.contentTop - m.y) - legendH - footH;
    const scale = Math.max(1, Math.floor(Math.min(availW / map.width, availH / map.height)));
    const big = new Minimap(hud, m.x + (m.w - map.width * scale) / 2, m.contentTop + 4, map, { scale });
    big.setDepth(603);
    big.update({ ...(hud.lastMinimap || {}), markers: (hud.lastMinimap && hud.lastMinimap.markers) || [] });
    let y = m.contentTop + 4 + map.height * scale + 16 * ui;
    text(hud, w / 2, y, `Explored ${Math.round(exploredStats(explored).share * 100)}% of Quest Academy`, T.small(hud, THEME.ink2)).setDepth(603);
    y += 20 * ui;
    text(hud, w / 2, y, '● you     ★ errand     ■ boss castle     ● home', T.small(hud, THEME.ink3)).setDepth(603);
  }
  button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 44 * ui, 'Back', { variant: 'secondary', onClick: () => { hud.state.menuPage = 'menu'; hud.rebuild(); } }).setDepth(603);
}
