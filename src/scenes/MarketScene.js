import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { T, text } from '../ui/TextStyles.js';
import { background, stripe } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button, iconButton } from '../ui/Button.js';
import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { enter, pulse } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { safeArea } from '../systems/Layout.js';
import { resolveLook } from '../data/avatars.js';
import { lookSpriteTexture, IDLE_FRAMES } from '../systems/Textures.js';
import { checkBadges } from '../systems/Progression.js';
import { getBadge } from '../data/badges.js';
import { TABS, getItem, itemsOfKind, LOOK_KINDS } from '../data/market/items.js';
import { HOUSE_ROOMS } from '../data/social/house.js';
import { ensureInventory, owns, equipped, buy, equip, applyDecor, roomDecor, outfitOf, outfitId, cardSets, isStackable, snackCount, buyBlock } from '../systems/Market.js';

/**
 * The Cheapside market: three tabs (looks, house, cards), a live preview of the player wearing what is chosen,
 * and one button per item that buys, wears or uses it. Opened over the world or the house, which is resumed
 * with a 'market:done' event when the player leaves.
 */
export class MarketScene extends BaseScene {
  constructor() { super(SCENES.Market); this.fade = true; }

  init(data) {
    this.returnTo = (data && data.returnTo) || null;
    this.state = { tab: (data && data.tab) || 'looks', selected: null, room: null, fact: null, badges: [] };
    Store.updateProfile((p) => { ensureInventory(p).visited = true; });
  }

  create(data) { super.create(data); this.scene.bringToTop(); }
  enterKey() { const s = this.state; return `${s.tab}-${s.fact ? 'f' : ''}${s.room ? 'r' : ''}`; }

  build() {
    const { w, h, ui } = this;
    const s = this.state, p = Store.getProfile();
    if (!p) return this.close();
    background(this, { accent: THEME.warning, accent2: THEME.pink, dots: false });
    const sa = safeArea();
    const cy = sa.top + 28 * ui + 2;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, '←', { onClick: () => this.close() });
    text(this, w / 2, cy, '🧺 Cheapside Market', T.heading(this));
    chip(this, w - 12 - sa.right, cy, { text: String(p.coins), icon: 'coin', originX: 1, textColor: THEME.warningDark, height: 32 * ui, fontSize: 15 });
    // Tabs.
    let y = sa.top + 64 * ui;
    const tabW = Math.min((w - 32 - 16) / TABS.length, 150 * ui), tabH = 38 * ui;
    const x0 = w / 2 - ((TABS.length - 1) * (tabW + 8)) / 2;
    TABS.forEach((t, i) => button(this, x0 + i * (tabW + 8), y + tabH / 2, tabW, tabH, `${t.icon} ${t.title}`, { variant: t.id === s.tab ? 'warning' : 'secondary', fontSize: 14, onClick: () => { Sfx.click(); s.tab = t.id; s.selected = null; this.rebuild(); } }));
    y += tabH + 12 * ui;
    const area = { x: 14 + sa.left, y, w: w - 28 - sa.left - sa.right, h: h - y - 14 - sa.bottom };
    if (s.tab === 'looks') this.buildLooks(area, p);
    else if (s.tab === 'house') this.buildHouse(area, p);
    else if (s.tab === 'snacks') this.buildSnacks(area, p);
    else this.buildCards(area, p);
    if (s.fact) this.buildFact(s.fact);
    if (s.room) this.buildRoomPicker(s.room, p);
  }

  // ---- Looks: preview on the left (or top), items in a grid ---------------------------------------

  /** The player's character wearing the current outfit with the selected item tried on. */
  preview(x, y, size, p) {
    const s = this.state;
    const outfit = outfitOf(p);
    const sel = getItem(s.selected);
    if (sel && LOOK_KINDS.includes(sel.kind)) outfit[sel.kind] = sel.style;
    const tryOn = sel && LOOK_KINDS.includes(sel.kind) ? `try:${sel.id}` : '';
    const key = lookSpriteTexture(this, resolveLook(p), outfit, outfitId(p) + (tryOn ? ':' + tryOn : ''));
    const k = card(this, x, y, size, size, { color: THEME.warningSoft, stroke: THEME.warning });
    const img = this.add.image(x, y + size * 0.04, key, IDLE_FRAMES.down).setDisplaySize(size * 0.86, size * 0.86);
    enter(this, img, { from: 'pop' });
    this.previewImage = img;
    return k;
  }

  buildLooks(area, p) {
    const { ui } = this, s = this.state;
    const wide = area.w >= 560;
    const pv = Math.min(wide ? area.h * 0.6 : area.w * 0.42, 220 * ui);
    const px = wide ? area.x + pv / 2 : area.x + area.w / 2, py = area.y + pv / 2;
    this.preview(px, py, pv, p);
    const sel = getItem(s.selected);
    const cap = sel ? `${sel.name}: ${sel.desc}` : 'Tap an item to try it on';
    text(this, px, py + pv / 2 + 14 * ui, cap, { ...T.small(this, THEME.ink2), wordWrap: { width: wide ? pv + 20 : area.w - 20 }, align: 'center' }).setOrigin(0.5, 0);
    const grid = wide ? { x: area.x + pv + 16, y: area.y, w: area.w - pv - 16, h: area.h } : { x: area.x, y: py + pv / 2 + 54 * ui, w: area.w, h: area.h - pv - 54 * ui };
    const items = TABS[0].kinds.flatMap((k) => itemsOfKind(k));
    this.itemGrid(grid, items, p, (it) => { s.selected = it.id; Sfx.pop(); this.rebuild(); });
  }

  /** Cards in a grid with one action button each. */
  itemGrid(grid, items, p, onTap) {
    const { ui } = this, s = this.state;
    const cols = grid.w >= 520 ? 3 : 2, gap = 8;
    const cw = (grid.w - gap * (cols - 1)) / cols, ch = Math.min(112 * ui, (grid.h - gap * 2) / 3);
    const rows = Math.ceil(items.length / cols);
    const visible = Math.max(1, Math.floor((grid.h + gap) / (ch + gap)));
    // Pages when the grid does not fit.
    const perPage = visible * cols, pages = Math.ceil(items.length / perPage);
    s.page = Math.min(s.page | 0, pages - 1);
    const shown = items.slice(s.page * perPage, (s.page + 1) * perPage);
    const cards = shown.map((it, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = grid.x + col * (cw + gap) + cw / 2, cy = grid.y + row * (ch + gap) + ch / 2;
      const stack = isStackable(it), count = stack ? snackCount(p, it.id) : 0;
      const owned = !stack && owns(p, it.id), worn = LOOK_KINDS.includes(it.kind) && equipped(p, it.kind) === it.id, selected = s.selected === it.id;
      const k = card(this, cx, cy, cw, ch, { stroke: selected ? THEME.warning : owned ? THEME.success : THEME.line, strokeWidth: selected ? 3 : 2, onTap: onTap ? () => onTap(it) : null });
      k.add(this.add.text(-cw / 2 + 12, -ch / 2 + 22 * ui, it.icon, { fontSize: Math.round(22 * ui) + 'px' }).setOrigin(0, 0.5));
      // The name sits beside the icon; an owned item wears a small tick chip at the top right, and the name leaves room for it.
      k.add(this.add.text(-cw / 2 + 12 + 30 * ui, -ch / 2 + 22 * ui, it.name, { ...T.at(this, 13, THEME.ink, { fontStyle: '700' }), wordWrap: { width: cw - 30 * ui - 24 - (owned ? 30 * ui : 0) } }).setOrigin(0, 0.5));
      if (owned) k.add(chip(this, cw / 2 - 8, -ch / 2 + 20 * ui, { text: worn ? '✓ on' : '✓', originX: 1, color: THEME.successSoft, textColor: THEME.successDark, fontSize: 11, height: 20 * ui, shadow: 'none' }));
      if (count) k.add(chip(this, cw / 2 - 8, -ch / 2 + 20 * ui, { text: `×${count}`, originX: 1, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 11, height: 20 * ui, shadow: 'none' }));
      const bw = cw - 24, bh = 30 * ui, by = ch / 2 - 22 * ui;
      if (!owned) {
        const can = !buyBlock(p, it.id);
        k.add(button(this, 0, by, bw, bh, `Buy · ${it.price} 🪙`, { variant: can ? 'warning' : 'ghost', fontSize: 13, disabled: !can, onClick: () => this.buyItem(it) }));
      } else if (LOOK_KINDS.includes(it.kind)) {
        k.add(button(this, 0, by, bw, bh, worn ? 'Take off' : 'Wear', { variant: worn ? 'secondary' : 'success', fontSize: 13, onClick: () => this.wear(it, !worn) }));
      } else if (it.kind === 'paint' || it.kind === 'floor') {
        k.add(button(this, 0, by, bw, bh, 'Use in a room…', { variant: 'success', fontSize: 13, onClick: () => { Sfx.click(); s.room = it.id; this.rebuild(); } }));
      } else if (it.kind === 'card') {
        k.add(button(this, 0, by, bw, bh, 'Read the card', { variant: 'secondary', fontSize: 13, onClick: () => { Sfx.click(); s.fact = it.id; this.rebuild(); } }));
      }
      return k;
    });
    enter(this, cards, { from: 'up', stagger: 20 });
    if (pages > 1) {
      const py = grid.y + Math.min(rows, visible) * (ch + gap) + 6 * ui;
      button(this, grid.x + grid.w / 2 - 70 * ui, py + 16 * ui, 60 * ui, 30 * ui, '◀', { variant: 'secondary', fontSize: 14, disabled: s.page === 0, onClick: () => { s.page -= 1; this.rebuild(); } });
      text(this, grid.x + grid.w / 2, py + 16 * ui, `${s.page + 1} / ${pages}`, T.small(this, THEME.ink2));
      button(this, grid.x + grid.w / 2 + 70 * ui, py + 16 * ui, 60 * ui, 30 * ui, '▶', { variant: 'secondary', fontSize: 14, disabled: s.page >= pages - 1, onClick: () => { s.page += 1; this.rebuild(); } });
    }
  }

  // ---- House and cards ------------------------------------------------------------------------------

  /** Treats for duels; each can be bought again and again, up to a bag of nine. */
  buildSnacks(area, p) {
    const { ui } = this;
    text(this, area.x + area.w / 2, area.y + 18 * ui, 'Treats for duels. Eat them from the Items menu when a villager challenges you!', { ...T.small(this, THEME.ink2), wordWrap: { width: area.w - 24 } });
    this.itemGrid({ x: area.x, y: area.y + 44 * ui, w: area.w, h: area.h - 44 * ui }, itemsOfKind('snack'), p, null);
  }

  buildHouse(area, p) {
    const { ui } = this;
    text(this, area.x + area.w / 2, area.y + 10 * ui, 'Paint and floors for the rooms of your house. Buy one, then choose the room.', { ...T.small(this, THEME.ink2), wordWrap: { width: area.w - 20 }, align: 'center' }).setOrigin(0.5, 0);
    this.itemGrid({ x: area.x, y: area.y + 44 * ui, w: area.w, h: area.h - 44 * ui }, TABS[1].kinds.flatMap((k) => itemsOfKind(k)), p, null);
  }

  buildCards(area, p) {
    const { ui } = this;
    const sets = cardSets(p);
    // One chip per set with its progress.
    const chips = sets.map((st) => chip(this, 0, area.y + 18 * ui, { text: `${st.icon} ${st.name.replace('National ', '').replace('The ', '')} ${st.owned}/${st.total}${st.done ? ' ✓' : ''}`, color: st.done ? THEME.successSoft : THEME.surface, textColor: st.done ? THEME.successDark : THEME.ink2, fontSize: 12, height: 26 * ui, shadow: 'none', stroke: THEME.line }));
    const total = chips.reduce((n, c) => n + c.w, 0) + 8 * (chips.length - 1);
    let cxp = area.x + area.w / 2 - total / 2;
    for (const c of chips) { c.x = cxp; cxp += c.w + 8; }
    this.itemGrid({ x: area.x, y: area.y + 40 * ui, w: area.w, h: area.h - 40 * ui }, itemsOfKind('card'), p, null);
  }

  /** A bought card's fact, big. */
  buildFact(id) {
    const { w, ui } = this, it = getItem(id);
    if (!it) { this.state.fact = null; return; }
    const m = modal(this, { w: 420 * ui, h: 300 * ui, title: `${it.icon} ${it.name}`, accent: THEME.warning, depth: 600, dimAlpha: 0.5 });
    text(this, w / 2, m.contentTop + 20 * ui, it.desc, { ...T.body(this, THEME.ink), wordWrap: { width: m.w - 56 }, align: 'center' }).setOrigin(0.5, 0).setDepth(603);
    button(this, w / 2, m.y + m.h - 40 * ui, Math.min(m.w - 48, 200 * ui), 44 * ui, 'Close', { variant: 'primary', onClick: () => { this.state.fact = null; this.rebuild(); } }).setDepth(603);
  }

  /** Which room gets the paint or floor. */
  buildRoomPicker(itemId, p) {
    const { w, ui } = this, it = getItem(itemId);
    const rooms = HOUSE_ROOMS.filter((r) => r.id !== 'corridor');
    const m = modal(this, { w: 360 * ui, h: (120 + rooms.length * 46) * ui, title: `${it.icon} ${it.name}`, accent: THEME.success, depth: 600, dimAlpha: 0.5 });
    let y = m.contentTop + 8 * ui;
    text(this, w / 2, y, 'Use it in which room?', T.small(this, THEME.ink2)).setDepth(603); y += 26 * ui;
    for (const r of rooms) {
      const cur = roomDecor(p, r.id);
      const inUse = (it.kind === 'paint' ? p.inventory?.decor?.[r.id]?.wall : p.inventory?.decor?.[r.id]?.floor) === itemId;
      button(this, w / 2, y + 20 * ui, m.w - 48, 40 * ui, inUse ? `${r.name}  ✓` : r.name, { variant: inUse ? 'success' : 'secondary', fontSize: 15, onClick: () => this.useDecor(r.id, itemId) }).setDepth(603);
      y += 46 * ui;
      void cur;
    }
    button(this, w / 2, m.y + m.h - 34 * ui, Math.min(m.w - 48, 160 * ui), 40 * ui, 'Cancel', { variant: 'ghost', onClick: () => { this.state.room = null; this.rebuild(); } }).setDepth(603);
  }

  // ---- Actions -------------------------------------------------------------------------------------

  buyItem(it) {
    let result = null, badges = [];
    Store.updateProfile((p) => { result = buy(p, it.id); if (result.ok) badges = checkBadges(p); });
    if (!result || !result.ok) { Sfx.wrong(); toast(this, result && result.reason === 'coins' ? 'Not enough coins yet. Play a game to earn more!' : result && result.reason === 'full' ? 'Your bag is full of those!' : 'You already have that.', { accent: THEME.danger }); return; }
    Sfx.coin();
    this.state.selected = it.id;
    this.state.badges = badges;
    if (it.kind === 'card') this.state.fact = it.id;
    this.rebuild();
    toast(this, `${it.icon} ${it.name} is yours!`, { icon: 'coin', accent: THEME.success });
    if (this.previewImage) pulse(this, this.previewImage, 1.1);
    badges.forEach((id, i) => this.time.delayedCall(1200 + i * 1400, () => { const b = getBadge(id); if (b) { Sfx.unlock(); toast(this, `New badge: ${b.title}`, { icon: 'star', accent: THEME.brand }); } }));
  }

  wear(it, on) {
    Store.updateProfile((p) => equip(p, it.kind, on ? it.id : null));
    Sfx.pop();
    this.state.selected = on ? it.id : null;
    this.rebuild();
  }

  useDecor(roomId, itemId) {
    Store.updateProfile((p) => applyDecor(p, roomId, itemId));
    Sfx.correct();
    this.state.room = null;
    this.rebuild();
    const r = HOUSE_ROOMS.find((x) => x.id === roomId);
    toast(this, `Done! Have a look in the ${r ? r.name.toLowerCase() : 'room'}.`, { accent: THEME.success });
  }

  /** Back to the world or the house, which redraws the player in the new outfit. */
  close() {
    if (this.closing) return;
    this.closing = true;
    const mgr = this.scene, to = this.returnTo;
    mgr.stop(SCENES.Market);
    if (!to) { mgr.start(SCENES.ModeSelect); return; }
    if (mgr.isSleeping(SCENES.Hud)) mgr.wake(SCENES.Hud);
    const caller = mgr.get(to);
    if (caller) caller.events.emit('market:done', {});
    if (mgr.isPaused(to)) mgr.resume(to);
    else if (!mgr.isActive(to)) mgr.start(to);
  }
}
