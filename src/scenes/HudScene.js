import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { safeArea, viewport } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button, iconButton, speakButton } from '../ui/Button.js';
import { readable } from '../ui/ReadableText.js';
import { rateFor } from '../systems/Speech.js';
import { panel } from '../ui/Panel.js';
import { chip } from '../ui/Chip.js';
import { toast } from '../ui/Toast.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { cheer, oops } from './FxScene.js';
import { VirtualJoystick } from '../systems/VirtualJoystick.js';
import * as Store from '../systems/Store.js';
import { flyCoins } from '../ui/Coins.js';
import { Minimap, paintMinimap } from '../ui/Minimap.js';
import { ensureExplored } from '../data/world/explore.js';
import { buildHome } from './hud/homePanel.js';
import * as FishingPanel from './hud/fishingPanel.js';
import { buildBoard } from './hud/boardPanel.js';
import * as CookingPanel from './hud/cookingPanel.js';
import { buildEncounter } from './hud/encounterPanel.js';
import { buildMenu } from './hud/menuPanel.js';

/**
 * Overlay on top of the World scene: joystick, action button, coin counter, zone label, minimap, menu and
 * the NPC dialog box. Everything is drawn from `this.state` so a resize simply rebuilds it. The bigger
 * panels (home, fishing, encounters, menu pages) live in scenes/hud/.
 */
export class HudScene extends BaseScene {
  constructor() { super(SCENES.Hud); }

  create(data) {
    this.state = { coins: 0, zone: '', zoneId: null, carry: null, dialog: null, encounter: null, board: null, home: false, fishing: null, cooking: null, hint: null, menuOpen: false, menuPage: 'menu' };
    this.actionFlag = false;
    this.lastMinimap = null;
    super.create(data);
    this.scene.bringToTop();
    const onWake = () => {
      // The world may have been rotated while a mini-game was up; the size check keeps rebuilds rare.
      const now = viewport(this);
      if (this.vp && (this.vp.w !== now.w || this.vp.h !== now.h)) this.rebuild();
      this.actionFlag = false;
      if (this.joystick) this.joystick.release();
    };
    const onSleep = () => { if (this.joystick) this.joystick.release(); };
    this.events.on('wake', onWake);
    this.events.on('sleep', onSleep);
    // Scene event listeners outlive a stop/start cycle, so drop them explicitly.
    this.events.once('shutdown', () => {
      this.events.off('wake', onWake); this.events.off('sleep', onSleep);
      if (this.joystick) { this.joystick.destroy(); this.joystick = null; }
      this.minimap = null;
    });
  }

  beforeRebuild() {
    if (this.joystick) { this.joystick.destroy(); this.joystick = null; }
    this.minimap = null;
  }

  /** Dialog and menu animate in when they open; everything else redraws quietly. */
  enterKey() {
    const s = this.state;
    return (s.dialog ? 'd' + s.dialog.idx : '') + (s.menuOpen ? 'm' + s.menuPage : '') + (s.encounter ? 'e' + s.encounter.kind + (s.encounter.picked ?? '') : '') + (s.home ? 'h' : '') + (s.board ? 'b' : '') + (s.fishing ? 'f' + s.fishing.phase : '') + (s.cooking ? 'c' + s.cooking.phase + s.cooking.step : '');
  }

  get dialogOpen() { return !!this.state.dialog; }
  get menuOpen() { return this.state.menuOpen; }
  /** True while the world should stand still. */
  get blocking() { return this.dialogOpen || this.menuOpen || !!this.state.encounter || !!this.state.board || this.state.home || !!this.state.fishing || !!this.state.cooking; }

  /** Returns true once per press of the action button (or a tap on the dialog). */
  takeAction() { const a = this.actionFlag; this.actionFlag = false; return a; }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    const sa = safeArea();
    this.joystick = new VirtualJoystick(this, { enabled: () => !this.blocking });

    // Top-left: coins and zone
    const chipH = 34 * ui, top = 10 + sa.top, left = 10 + sa.left;
    this.coinChip = chip(this, left, top + chipH / 2, { text: String(s.coins), icon: 'coin', height: chipH, textColor: THEME.warningDark, fontSize: 15 });
    this.zoneChip = chip(this, left, top + chipH + 8 + 13 * ui, { text: s.zone, height: 26 * ui, fontSize: 12, textColor: THEME.ink2, shadow: 'none', stroke: THEME.line });
    this.zoneChip.setVisible(!!s.zone);
    // What the player is carrying for an errand
    if (s.carry) chip(this, left, top + chipH + 8 + 26 * ui + 8 + 13 * ui, { text: s.carry, height: 26 * ui, fontSize: 12, color: THEME.warningSoft, textColor: THEME.warningDark, shadow: 'none' });

    // Top-right: menu, with the minimap tucked underneath it
    iconButton(this, w - 10 - sa.right - 22 * ui, top + chipH / 2, 44 * ui, '☰', { onClick: () => this.openMenu() });
    this.buildMinimap(w - 14 - sa.right, top + chipH + 14);

    // Bottom-right: round action button
    if (!this.blocking) this.buildActionButton(w - 56 * ui - sa.right, h - 56 * ui - sa.bottom, 72 * ui);
    // The first-steps hint, pulsing above the joystick.
    if (s.hint && !this.blocking) {
      const c = chip(this, w / 2, h - 118 * ui - sa.bottom, { text: s.hint, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 14, height: 34 * ui, stroke: THEME.warning });
      c.x = w / 2 - c.w / 2;
      c.setDepth(310);
      this.tweens.add({ targets: c, scaleX: 1.04, scaleY: 1.04, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    if (s.dialog) this.buildDialog(s.dialog);
    if (s.encounter) buildEncounter(this, s.encounter);
    if (s.board) buildBoard(this, s.board);
    if (s.home) buildHome(this);
    if (s.fishing) FishingPanel.buildFishing(this, s.fishing);
    if (s.cooking) CookingPanel.buildCooking(this, s.cooking);
    if (s.menuOpen) buildMenu(this);
  }

  // ---- Minimap -------------------------------------------------------------------------------

  /** The roaming scene under this Hud: the player's house when they are inside it, else the world. */
  get roamKey() { return this.scene.isActive(SCENES.House) || this.scene.isPaused(SCENES.House) ? SCENES.House : SCENES.World; }

  /** The overworld's map, when the world is running (inside the house there is no minimap). */
  worldMap() {
    if (this.roamKey !== SCENES.World) return null;
    const world = this.scene.get(SCENES.World);
    return world && world.map && (this.scene.isActive(SCENES.World) || this.scene.isPaused(SCENES.World)) ? world.map : null;
  }

  buildMinimap(right, top) {
    const map = this.worldMap(), profile = Store.getProfile();
    if (!map || !profile) return;
    const scale = Math.max(1.5, Math.min(2, (this.w - 40) / (map.width * 3)));   // never wider than a third of a phone screen
    paintMinimap(this, map, ensureExplored(profile));
    this.minimap = new Minimap(this, right - map.width * scale, top, map, { scale, onTap: () => this.openMenu('map') });
    this.minimap.setDepth(200);
    if (this.lastMinimap) this.minimap.update(this.lastMinimap);
  }

  /** From the world every 200ms: { tx, ty, explored, repaint, markers }. */
  updateMinimap(info) {
    this.lastMinimap = { tx: info.tx, ty: info.ty, markers: info.markers || [] };
    if (this.minimap) this.minimap.update(info);
  }

  // ---- Read aloud ---------------------------------------------------------------------------

  get speechRate() { return rateFor(Store.getProfile()?.grade); }
  /** In "read everything" mode, a new dialog line or question is read as soon as it appears. */
  autoRead(readableText, how = {}) {
    if (!readableText || !this.animateEnter || Store.getProfile()?.readAloud !== 'auto') return;
    this.time.delayedCall(350, () => { if (readableText.active) readableText.read({ rate: this.speechRate, ...how }); });
  }

  // ---- The player's house, fishing and encounters (panels in scenes/hud/) ----------------------

  showHome() { this.state.home = true; if (this.joystick) this.joystick.release(); this.rebuild(); }
  closeHome() { this.state.home = false; this.rebuild(); }

  showFishing(opts) { FishingPanel.showFishing(this, opts); }
  pullLine() { FishingPanel.pullLine(this); }
  closeFishing() { FishingPanel.closeFishing(this); }

  /** The kitchen stove (see hud/cookingPanel.js). */
  showCooking() { CookingPanel.showCooking(this); }
  closeCooking() { CookingPanel.closeCooking(this); }

  /** The quest board's page (see hud/boardPanel.js for the shape of `b`). */
  showBoard(b) { this.state.board = b; this.actionFlag = false; if (this.joystick) this.joystick.release(); this.rebuild(); }
  closeBoard() { this.state.board = null; this.rebuild(); }

  /** { kind: 'quiz'|'chest'|'gift', q?, coins?, gift?, subject?, onAnswer?(right), onClose? } */
  showEncounter(e) {
    this.state.encounter = { ...e, picked: null, right: null };
    this.actionFlag = false;
    if (this.joystick) this.joystick.release();
    this.rebuild();
  }

  closeEncounter() {
    const e = this.state.encounter;
    this.state.encounter = null;
    this.rebuild();
    if (e && e.onClose) e.onClose();
  }

  answerEncounter(i) {
    const e = this.state.encounter;
    if (!e || e.picked !== null) return;
    e.picked = i; e.right = e.q.choices[i] === e.q.answer;
    if (e.right) Sfx.correct(); else { Sfx.wrong(); if (this.cameras && this.cameras.main) this.cameras.main.shake(120, 0.004); }
    this.rebuild();
    if (e.right) cheer(this); else oops(this);   // the same stars and streak banner as the games
    if (e.onAnswer) e.onAnswer(e.right);   // after the rebuild so its coin animation is not wiped
  }

  buildActionButton(x, y, size) {
    const r = size / 2;
    const c = this.add.container(x, y).setDepth(300);
    const shadow = this.add.circle(0, 5, r, THEME.shadow.color, 0.18);
    const face = this.add.circle(0, 0, r, THEME.primary, 1).setStrokeStyle(4, 0xffffff, 0.9);
    const label = text(this, 0, 0, 'A', { ...T.heading(this, THEME.onAccent), fontSize: Math.round(r * 0.9) + 'px', fontStyle: '700' });
    c.add([shadow, face, label]);
    c.setSize(size, size);
    c.setInteractive();
    c.on('pointerdown', () => { if (this.blocking) return; this.actionFlag = true; face.setFillStyle(THEME.primaryDark, 1); c.setScale(0.92); });
    const up = () => { face.setFillStyle(THEME.primary, 1); c.setScale(1); };
    c.on('pointerup', up); c.on('pointerout', up);
    this.actionButton = c;
  }

  // ---- Coins / zone -------------------------------------------------------------------------

  setCoins(n) { this.state.coins = n; if (this.coinChip && this.coinChip.active) this.coinChip.setText(String(n)); }
  setCarry(text) { if (this.state.carry !== text) { this.state.carry = text || null; this.rebuild(); } }

  /** Coins fly from `from` (CSS px; default: screen centre) into the coin counter, which counts up as they land. */
  awardCoins(amount, from = null) {
    if (!amount || !this.scene.isActive()) return;
    const target = this.state.coins;
    this.setCoins(target - amount);
    // Start after any rebuild triggered in the same tick (a modal opening or updating), which would destroy the
    // coin sprites; and whatever happens to the flight, the counter shows the true total soon after.
    this.time.delayedCall(40, () => {
      if (!this.scene.isActive()) return;
      const to = this.coinChip ? { x: this.coinChip.x + 16, y: this.coinChip.y } : { x: 30, y: 30 };
      flyCoins(this, from || { x: this.w / 2, y: this.h / 2 }, to, amount, {
        onLand: (v) => this.setCoins(Math.min(target, this.state.coins + v)),
        onDone: () => { this.setCoins(target); if (this.coinChip && this.coinChip.active) this.tweens.add({ targets: this.coinChip, scale: 1.2, yoyo: true, duration: 120 }); }
      });
    });
    this.time.delayedCall(1800, () => { if (this.state.coins < target) this.setCoins(target); });
  }
  /** A persistent hint for the first-steps lesson; null clears it. */
  setHint(text) { const t = text || null; if (this.state.hint !== t) { this.state.hint = t; this.rebuild(); } }

  setZone(name, id = null) {
    this.state.zone = name || ''; this.state.zoneId = id;
    if (this.zoneChip && this.zoneChip.active) { this.zoneChip.setText(this.state.zone); this.zoneChip.setVisible(!!this.state.zone); }
  }
  addCoins(n) { this.setCoins(this.state.coins + n); }

  /** Short banner (zone entered, unlock...). */
  banner(msg, opts = {}) { if (!this.scene.isActive()) return; toast(this, msg, { accent: THEME.success, y: 74 * this.ui + 20 + safeArea().top, ...opts }); }
  notify(msg, opts = {}) { if (!this.scene.isActive()) return; toast(this, msg, opts); }

  // ---- Dialog ------------------------------------------------------------------------------

  /** { name, lines, onPlay?, onLater?, playLabel? } Play/Later appear after the last line. */
  showDialog(d) {
    this.state.dialog = { name: d.name, lines: d.lines || [], idx: 0, onPlay: d.onPlay || null, onLater: d.onLater || null, playLabel: d.playLabel || 'Play', prompt: d.prompt || null, voice: d.voice || null, pitch: d.pitch || null, rate: d.rate || null, speaker: d.speaker || null,
      secondary: d.secondary && d.secondary.onClick ? { label: d.secondary.label || 'Duel', onClick: d.secondary.onClick } : null };
    this.actionFlag = false;
    if (this.joystick) this.joystick.release();
    this.rebuild();
  }

  closeDialog() {
    const d = this.state.dialog;
    this.state.dialog = null;
    this.rebuild();
    if (d && d.onLater) d.onLater();
  }

  advanceDialog() {
    const d = this.state.dialog;
    if (!d) return;
    const last = d.idx >= d.lines.length - 1;
    if (last) { if (!d.onPlay && !d.secondary) this.closeDialog(); return; }
    d.idx += 1;
    Sfx.pop();
    this.rebuild();
  }

  /** Keyboard "action" while a dialog is open: next line, or Play on the last one. */
  confirmDialog() {
    const d = this.state.dialog;
    if (!d) return;
    if (d.idx >= d.lines.length - 1 && d.onPlay) { Sfx.click(); this.play(); } else this.advanceDialog();
  }

  buildDialog(d) {
    const { w, h, ui } = this;
    const last = d.idx >= d.lines.length - 1;
    const showButtons = last && !!(d.onPlay || d.secondary);
    const pw = Math.min(w - 20, 520 * ui), ph = (showButtons ? 176 : 124) * ui;
    const px = (w - pw) / 2, py = h - ph - 14 - safeArea().bottom;
    const g = panel(this, px, py, pw, ph, { shadow: 'lg', radius: THEME.radius.xl });
    g.setDepth(500);
    const zone = this.add.zone(px, py, pw, ph).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(501);
    zone.on('pointerup', () => { if (!showButtons) this.advanceDialog(); });
    const name = chip(this, px + 16, py + 20 * ui, { text: d.name, color: THEME.primarySoft, textColor: THEME.primaryDark, fontSize: 13, height: 26 * ui, shadow: 'none' }).setDepth(502);
    const line = last && d.prompt ? `${d.lines[d.idx]}\n${d.prompt}` : d.lines[d.idx] || '';
    const body = readable(this, px + 16, py + 40 * ui, line, T.body(this), { width: pw - 64 * ui, align: 'left' }).setOrigin(0, 0).setDepth(502);
    const how = { rate: this.speechRate * (d.rate || 1), pitch: d.pitch || 1, voice: d.voice || 'female', speaker: d.speaker || d.name };
    const sb = speakButton(this, px + pw - 30 * ui, py + 22 * ui, 40 * ui, body, how); if (sb) sb.setDepth(502);
    this.autoRead(body, how);
    if (!showButtons) {
      const hint = last ? 'Tap to close' : 'Tap to continue  ▼';
      this.add.text(px + pw - 14, py + ph - 10, hint, T.small(this, THEME.ink3)).setOrigin(1, 1).setDepth(502);
    } else {
      const bh = 46 * ui, by = py + ph - 34 * ui;
      if (d.secondary) {
        // Three choices: Later, the second action (a duel), and the game.
        const bw = Math.min((pw - 56) / 3, 150 * ui);
        button(this, px + pw / 2 - bw - 8, by, bw, bh, 'Later', { variant: 'ghost', fontSize: 15, onClick: () => this.closeDialog() }).setDepth(502);
        button(this, px + pw / 2, by, bw, bh, d.secondary.label, { variant: 'brand', fontSize: 15, emoji: '⚔️', onClick: () => this.secondaryAction() }).setDepth(502);
        button(this, px + pw / 2 + bw + 8, by, bw, bh, d.playLabel, { variant: 'primary', fontSize: 15, disabled: !d.onPlay, onClick: () => this.play() }).setDepth(502);
      } else {
        const bw = Math.min((pw - 48) / 2, 180 * ui);
        button(this, px + pw / 2 - bw / 2 - 8, by, bw, bh, 'Later', { variant: 'ghost', fontSize: 17, onClick: () => this.closeDialog() }).setDepth(502);
        button(this, px + pw / 2 + bw / 2 + 8, by, bw, bh, d.playLabel, { variant: 'primary', fontSize: 17, onClick: () => this.play() }).setDepth(502);
      }
    }
    enter(this, [g, name, body], { from: 'up', distance: 16, stagger: 0 });
  }

  play() {
    const d = this.state.dialog;
    this.state.dialog = null;
    this.rebuild();
    if (d && d.onPlay) d.onPlay();
  }

  /** The dialog's second action (a duel). */
  secondaryAction() {
    const d = this.state.dialog;
    this.state.dialog = null;
    this.rebuild();
    if (d && d.secondary) d.secondary.onClick();
  }

  // ---- Menu --------------------------------------------------------------------------------

  openMenu(page = 'menu') {
    if (this.state.menuOpen || this.blocking) return;
    this.state.menuOpen = true; this.state.menuPage = page;
    if (this.joystick) this.joystick.release();
    const roam = this.roamKey;
    if (this.scene.isActive(roam)) this.scene.pause(roam);
    this.rebuild();
  }

  closeMenu() {
    this.state.menuOpen = false;
    this.rebuild();
    const roam = this.roamKey;
    if (this.scene.isPaused(roam)) this.scene.resume(roam);
  }

  /** Open the market over the world or house: pause it, sleep this Hud, and come back on 'market:done'. */
  openMarket() {
    const roam = this.roamKey;
    this.state.menuOpen = false;
    const scene = this.scene.get(roam);
    if (scene && scene.savePosition) scene.savePosition();
    if (this.scene.isActive(roam)) this.scene.pause(roam);
    this.scene.sleep();
    this.scene.launch(SCENES.Market, { returnTo: roam });
  }

  /** Stop the world or house (the world saves its position on shutdown) and this Hud, then start another screen. */
  leaveTo(key) {
    this.state.menuOpen = false;
    this.scene.stop(this.roamKey);
    this.scene.start(key);
  }
}
