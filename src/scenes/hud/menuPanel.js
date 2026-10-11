// The pause menu and its pages: the zone's quest checklist and the full map. `hud` is the HudScene.
import { SCENES } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import { T, text } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { modal } from '../../ui/Modal.js';
import { Sfx } from '../../systems/Audio.js';
import * as Store from '../../systems/Store.js';
import { ZONE_NAMES } from '../../data/world/map.js';
import { ZONE_ORDER, bossDefeated } from '../../data/world/quests.js';
import { storyState, chapterFor, chapterMissions, chapterNumber, bellPieces, CHAPTERS } from '../../data/world/story.js';
import { errandLine } from '../../data/world/errands.js';
import { ensureExplored, exploredStats } from '../../data/world/explore.js';
import { Minimap, paintMinimap } from '../../ui/Minimap.js';
import { creditLines } from '../../ui/Credits.js';
import { card } from '../../ui/Card.js';
import { snacksOf } from '../../systems/Market.js';
import { heartsOf, HEARTS_MAX } from '../../systems/Hearts.js';
import { drinkNow } from '../world/drink.js';

export function buildMenu(hud) {
  if (hud.state.menuPage === 'quests') return buildQuests(hud);
  if (hud.state.menuPage === 'map') return buildMapPage(hud);
  if (hud.state.menuPage === 'credits') return buildCreditsPage(hud);
  if (hud.state.menuPage === 'bag') return buildBag(hud);
  const { w, ui } = hud;
  const m = modal(hud, { look: 'storybook', w: 320 * ui, h: 528 * ui, title: 'Paused', accent: THEME.primary, depth: 600, dimAlpha: 0.45 });
  // Seven buttons and the credits link, spaced to fit the panel (a short landscape screen squeezes them).
  const room = m.y + m.h - m.contentTop - 52 * ui, gap = Math.min(12, room * 0.025);
  const bw = m.w - 48, bh = Math.min(50 * ui, (room - gap * 7) / 7);
  let y = m.contentTop + 8 * ui + bh / 2;
  const page = (p) => { Sfx.click(); hud.state.menuPage = p; hud.rebuild(); };
  const opts = { compact: true, fontSize: Math.min(17, (bh / ui) * 0.36) };
  button(hud, w / 2, y, bw, bh, 'Resume', { ...opts, variant: 'primary', onClick: () => hud.closeMenu() }).setDepth(603); y += bh + gap;
  button(hud, w / 2, y, bw, bh, '🔔 Journal', { ...opts, variant: 'warning', onClick: () => page('quests') }).setDepth(603); y += bh + gap;
  button(hud, w / 2, y, bw, bh, 'Map', { ...opts, variant: 'success', onClick: () => page('map') }).setDepth(603); y += bh + gap;
  button(hud, w / 2, y, bw, bh, '🧺 Market', { ...opts, variant: 'warning', onClick: () => { Sfx.click(); hud.openMarket(); } }).setDepth(603); y += bh + gap;
  button(hud, w / 2, y, bw, bh, '🎒 My bag', { ...opts, variant: 'secondary', onClick: () => page('bag') }).setDepth(603); y += bh + gap;
  button(hud, w / 2, y, bw, bh, 'Challenge Mode', { ...opts, variant: 'subject', subject: 'code', onClick: () => hud.leaveTo(SCENES.ChallengeMenu) }).setDepth(603); y += bh + gap;
  button(hud, w / 2, y, bw, bh, 'Home', { ...opts, variant: 'secondary', onClick: () => hud.leaveTo(SCENES.ModeSelect) }).setDepth(603); y += bh / 2 + 4;
  button(hud, w / 2, y + 16 * ui, bw, 30 * ui, 'Art credits', { variant: 'ghost', fontSize: 13, compact: true, onClick: () => page('credits') }).setDepth(603);
}

/** The bag: the snacks the player carries (drinks can be drunk here), and what else they own. */
export function buildBag(hud) {
  const { w, h, ui } = hud;
  const profile = Store.getProfile() || {};
  const snacks = snacksOf(profile), hearts = heartsOf(profile);
  const charms = Object.keys(profile.charms || {}).length, owned = (profile.inventory && profile.inventory.owned ? profile.inventory.owned.length : 0);
  const rowH = 54 * ui, rows = Math.max(1, snacks.length);
  const m = modal(hud, { look: 'storybook', w: Math.min(w - 16, 420 * ui), h: Math.min(h - 16, (196 + rows * 54) * ui), title: '🎒 My bag', accent: THEME.warning, depth: 600, dimAlpha: 0.5 });
  let y = m.contentTop + 6 * ui;
  text(hud, m.x + m.w / 2, y + 8 * ui, `♥ ${hearts}/${HEARTS_MAX} hearts  ·  ${profile.coins | 0} coins`, T.small(hud, THEME.ink2)).setDepth(603);
  y += 28 * ui;
  if (!snacks.length) {
    text(hud, m.x + m.w / 2, y + rowH / 2, 'No snacks yet. ' + 'Auntie Vee sells them at the market by the fountain!', { ...T.body(hud, THEME.ink2), align: 'center', wordWrap: { width: m.w - 48 } }).setDepth(603);
    y += rowH;
  }
  for (const { item, count } of snacks) {
    const k = card(hud, m.x + m.w / 2, y + rowH / 2, m.w - 40, rowH - 6, { stroke: THEME.line, shadow: 'none' });
    k.setDepth(602);
    k.add(hud.add.text(-m.w / 2 + 32, -8 * ui, `${item.icon}  ${item.name}  ×${count}`, T.at(hud, 15, THEME.ink, { fontStyle: '700' })).setOrigin(0, 0.5));
    k.add(hud.add.text(-m.w / 2 + 32, 10 * ui, item.desc, T.at(hud, 11, THEME.ink2)).setOrigin(0, 0.5));
    if (item.drink) {
      const full = hearts >= HEARTS_MAX;
      const b = button(hud, m.w / 2 - 20 - 46 * ui, 0, 84 * ui, 34 * ui, full ? 'Full' : 'Drink', { variant: full ? 'ghost' : 'success', fontSize: 13, disabled: full, compact: true,
        onClick: () => { const roam = hud.scene.get(hud.roamKey); hud.closeMenu(); if (roam) drinkNow(roam, item, 100); } });
      k.add(b);
    }
    y += rowH;
  }
  y += 6 * ui;
  text(hud, m.x + m.w / 2, y + 8 * ui, `${owned} thing${owned === 1 ? '' : 's'} bought at the market  ·  ${charms} charm${charms === 1 ? '' : 's'}`, T.small(hud, THEME.ink3)).setDepth(603);
  button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 42 * ui, 'Back', { variant: 'secondary', onClick: () => { hud.state.menuPage = 'menu'; hud.rebuild(); } }).setDepth(603);
}

/** Who drew the characters (the pack's licences ask for this to be easy to find). */
export function buildCreditsPage(hud) {
  const { w, h, ui } = hud;
  const m = modal(hud, { look: 'storybook', w: Math.min(w - 16, 520 * ui), h: Math.min(h - 16, 560 * ui), title: 'Art credits', accent: THEME.brand, depth: 600, dimAlpha: 0.5 });
  creditLines(hud, m.x + 20, m.contentTop + 4 * ui, m.w - 40, 603, m.y + m.h - 64 * ui);
  button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 42 * ui, 'Back', { variant: 'secondary', onClick: () => { hud.state.menuPage = 'menu'; hud.rebuild(); } }).setDepth(603);
}

/** Checklist for the zone the player stands in (or the next one to clear), with the boss last. */
export function buildQuests(hud) {
  const { w, h, ui } = hud;
  const profile = Store.getProfile() || {};
  const st = storyState(profile);
  // The chapter shown: the land the player is standing in, else the one the story is on.
  const zone = ZONE_ORDER.includes(hud.state.zoneId) ? hud.state.zoneId : st.zone;
  const ch = chapterFor(zone);
  const missions = chapterMissions(profile, zone);
  const compact = h < 720 * ui;   // short windows: tighter rows
  const m = modal(hud, { look: 'storybook', w: 440 * ui, h: Math.min(h - 16, (250 + missions.length * (compact ? 27 : 31)) * ui), title: '🔔 The Academy Bell', accent: THEME.warning, depth: 600, dimAlpha: 0.5 });
  let y = m.contentTop + 4 * ui;
  // The bell: one slot per piece, lit as the bosses give them back.
  const pieces = bellPieces(profile);
  CHAPTERS.forEach((c, i) => {
    const cx = w / 2 + (i - (CHAPTERS.length - 1) / 2) * 34 * ui, have = pieces.includes(c.piece);
    hud.add.circle(cx, y + 12 * ui, 13 * ui, have ? THEME.warningSoft : THEME.sunken, 1).setStrokeStyle(2, have ? THEME.warning : THEME.line).setDepth(603);
    text(hud, cx, y + 12 * ui, have ? '🔔' : String(i + 1), have ? { fontSize: Math.round(14 * ui) + 'px' } : T.small(hud, THEME.ink3)).setDepth(604);
  });
  y += 32 * ui;
  const headline = !st.started ? 'Headmistress Hope, by your house, has a tale for you.' : st.complete ? 'Every piece is home. The bell rings again!' : `${st.pieces} of ${CHAPTERS.length} pieces found`;
  text(hud, w / 2, y, headline, T.small(hud, THEME.ink2)).setDepth(603); y += 22 * ui;
  text(hud, w / 2, y, `Chapter ${chapterNumber(zone)}: ${ch ? ch.title : ZONE_NAMES[zone]}  ·  ${ZONE_NAMES[zone]}`, T.bodyBold(hud)).setDepth(603); y += 22 * ui;
  const zoneDone = bossDefeated(profile, zone);
  const next = zoneDone ? null : missions.find((q) => !q.done);
  const sub = zoneDone ? (st.complete ? 'The Academy Bell is whole again. Explore as you please!' : 'This chapter is finished. On to the next land!') : next && next.id === 'boss' ? (ch ? ch.lines.ready : 'The castle is open!') : next ? `Next: ${next.title.toLowerCase()}` : '';
  if (sub) text(hud, w / 2, y, sub, { ...T.small(hud, THEME.warningDark), wordWrap: { width: m.w - 48 }, align: 'center' }).setDepth(603);
  y += 26 * ui;
  // Rows share the space left above the Back button, so the list never runs into it.
  const rowH = Math.max(20 * ui, Math.min((compact ? 27 : 31) * ui, (m.y + m.h - 70 * ui - y) / Math.max(1, missions.length)));
  missions.forEach((q) => {
    const cy = y + rowH / 2;
    const current = q === next;
    if (current) hud.add.rectangle(m.x + m.w / 2, cy, m.w - 24, rowH - 3 * ui, THEME.warningSoft, 1).setDepth(602);
    const mark = q.done ? '✓' : current ? '▶' : q.available ? '○' : '🔒';
    text(hud, m.x + 26, cy, mark, T.bodyBold(hud, q.done ? THEME.successDark : current ? THEME.warningDark : THEME.ink3)).setDepth(603);
    const label = text(hud, m.x + 48, cy, q.title, T.at(hud, compact ? 13 : 14, q.done ? THEME.ink2 : q.available ? THEME.ink : THEME.ink3, { fontStyle: current ? '700' : '500' })).setOrigin(0, 0.5).setDepth(603);
    // A title too wide for the row is trimmed rather than wrapped, so every row stays one line.
    const maxW = m.w - 124;
    for (let t = q.title; label.width > maxW && t.length > 8; t = t.slice(0, -1)) label.setText(t.trimEnd().slice(0, -1) + '…');
    text(hud, m.x + m.w - 24, cy, `${q.count}/${q.total}`, T.small(hud, q.done ? THEME.successDark : THEME.ink2)).setOrigin(1, 0.5).setDepth(603);
    y += rowH;
  });
  const carrying = errandLine(profile);
  if (carrying) text(hud, w / 2, y + 8 * ui, `📜 ${carrying}`, { ...T.small(hud, THEME.ink2), wordWrap: { width: m.w - 48 }, align: 'center' }).setDepth(603);
  button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 42 * ui, 'Back', { variant: 'secondary', onClick: () => { hud.state.menuPage = 'menu'; hud.rebuild(); } }).setDepth(603);
}

/** The whole map, as far as it has been explored, with a legend. */
export function buildMapPage(hud) {
  const { w, h, ui } = hud;
  const map = hud.worldMap();
  const profile = Store.getProfile();
  const m = modal(hud, { look: 'storybook', w: Math.min(w - 16, 560 * ui), h: Math.min(h - 16, 520 * ui), title: 'Map', accent: THEME.success, depth: 600, dimAlpha: 0.5 });
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
    text(hud, w / 2, y, '● you     ★ errand     ★ boss castle     ● home', T.small(hud, THEME.ink3)).setDepth(603);
  }
  button(hud, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 200 * ui), 44 * ui, 'Back', { variant: 'secondary', onClick: () => { hud.state.menuPage = 'menu'; hud.rebuild(); } }).setDepth(603);
}
