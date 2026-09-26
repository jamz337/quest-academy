import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { safeArea } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button, iconButton } from '../ui/Button.js';
import { panel } from '../ui/Panel.js';
import { chip } from '../ui/Chip.js';
import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { VirtualJoystick } from '../systems/VirtualJoystick.js';

/**
 * Overlay on top of the World scene: joystick, action button, coin counter, zone label, menu and the
 * NPC dialog box. Everything is drawn from `this.state` so a resize simply rebuilds it.
 */
export class HudScene extends BaseScene {
  constructor() { super(SCENES.Hud); }

  create(data) {
    this.state = { coins: 0, zone: '', dialog: null, menuOpen: false };
    this.actionFlag = false;
    super.create(data);
    this.scene.bringToTop();
    const onWake = () => {
      // The world may have been rotated while a mini-game was up; the size check keeps rebuilds rare.
      if (this.vp && (this.vp.w !== this.scale.width || this.vp.h !== this.scale.height)) this.rebuild();
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
    });
  }

  beforeRebuild() {
    if (this.joystick) { this.joystick.destroy(); this.joystick = null; }
  }

  /** Dialog and menu animate in when they open; everything else redraws quietly. */
  enterKey() { return (this.state.dialog ? 'd' + this.state.dialog.idx : '') + (this.state.menuOpen ? 'm' : ''); }

  get dialogOpen() { return !!this.state.dialog; }
  get menuOpen() { return this.state.menuOpen; }
  /** True while the world should stand still. */
  get blocking() { return this.dialogOpen || this.menuOpen; }

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

    // Top-right: menu
    iconButton(this, w - 10 - sa.right - 22 * ui, top + chipH / 2, 44 * ui, '☰', { onClick: () => this.openMenu() });

    // Bottom-right: round action button
    if (!s.dialog && !s.menuOpen) this.buildActionButton(w - 56 * ui - sa.right, h - 56 * ui - sa.bottom, 72 * ui);

    if (s.dialog) this.buildDialog(s.dialog);
    if (s.menuOpen) this.buildMenu();
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
  setZone(name) {
    this.state.zone = name || '';
    if (this.zoneChip && this.zoneChip.active) { this.zoneChip.setText(this.state.zone); this.zoneChip.setVisible(!!this.state.zone); }
  }
  addCoins(n) { this.setCoins(this.state.coins + n); }

  /** Short banner (zone entered, unlock...). */
  banner(msg, opts = {}) { if (!this.scene.isActive()) return; toast(this, msg, { accent: THEME.success, y: 74 * this.ui + 20 + safeArea().top, ...opts }); }
  notify(msg, opts = {}) { if (!this.scene.isActive()) return; toast(this, msg, opts); }

  // ---- Dialog ------------------------------------------------------------------------------

  /** { name, lines, onPlay?, onLater?, playLabel? } Play/Later appear after the last line. */
  showDialog(d) {
    this.state.dialog = { name: d.name, lines: d.lines || [], idx: 0, onPlay: d.onPlay || null, onLater: d.onLater || null, playLabel: d.playLabel || 'Play', prompt: d.prompt || null };
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
    if (last) { if (!d.onPlay) this.closeDialog(); return; }
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
    const showButtons = last && !!d.onPlay;
    const pw = Math.min(w - 20, 520 * ui), ph = (showButtons ? 176 : 124) * ui;
    const px = (w - pw) / 2, py = h - ph - 14 - safeArea().bottom;
    const g = panel(this, px, py, pw, ph, { shadow: 'lg', radius: THEME.radius.xl });
    g.setDepth(500);
    const zone = this.add.zone(px, py, pw, ph).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(501);
    zone.on('pointerup', () => { if (!showButtons) this.advanceDialog(); });
    const name = chip(this, px + 16, py + 20 * ui, { text: d.name, color: THEME.primarySoft, textColor: THEME.primaryDark, fontSize: 13, height: 26 * ui, shadow: 'none' }).setDepth(502);
    const line = last && d.prompt ? `${d.lines[d.idx]}\n${d.prompt}` : d.lines[d.idx] || '';
    const body = text(this, px + 16, py + 40 * ui, line, { ...T.body(this), align: 'left', wordWrap: { width: pw - 32 } }).setOrigin(0, 0).setDepth(502);
    if (!showButtons) {
      const hint = last ? 'Tap to close' : 'Tap to continue  ▼';
      this.add.text(px + pw - 14, py + ph - 10, hint, T.small(this, THEME.ink3)).setOrigin(1, 1).setDepth(502);
    } else {
      const bw = Math.min((pw - 48) / 2, 180 * ui), bh = 46 * ui, by = py + ph - 34 * ui;
      button(this, px + pw / 2 - bw / 2 - 8, by, bw, bh, 'Later', { variant: 'ghost', fontSize: 17, onClick: () => this.closeDialog() }).setDepth(502);
      button(this, px + pw / 2 + bw / 2 + 8, by, bw, bh, d.playLabel, { variant: 'primary', fontSize: 17, onClick: () => this.play() }).setDepth(502);
    }
    enter(this, [g, name, body], { from: 'up', distance: 16, stagger: 0 });
  }

  play() {
    const d = this.state.dialog;
    this.state.dialog = null;
    this.rebuild();
    if (d && d.onPlay) d.onPlay();
  }

  // ---- Menu --------------------------------------------------------------------------------

  openMenu() {
    if (this.state.menuOpen) return;
    this.state.menuOpen = true;
    if (this.joystick) this.joystick.release();
    if (this.scene.isActive(SCENES.World)) this.scene.pause(SCENES.World);
    this.rebuild();
  }

  closeMenu() {
    this.state.menuOpen = false;
    this.rebuild();
    if (this.scene.isPaused(SCENES.World)) this.scene.resume(SCENES.World);
  }

  buildMenu() {
    const { w, ui } = this;
    const m = modal(this, { w: 320 * ui, h: 300 * ui, title: 'Paused', accent: THEME.primary, depth: 600, dimAlpha: 0.45 });
    const bw = m.w - 48, bh = 50 * ui;
    let y = m.contentTop + 12 * ui + bh / 2;
    button(this, w / 2, y, bw, bh, 'Resume', { variant: 'primary', onClick: () => this.closeMenu() }).setDepth(603); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Challenge Mode', { variant: 'subject', subject: 'code', onClick: () => this.leaveTo(SCENES.ChallengeMenu) }).setDepth(603); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Home', { variant: 'secondary', onClick: () => this.leaveTo(SCENES.ModeSelect) }).setDepth(603);
  }

  /** Stop the world (which saves its position on shutdown) and this Hud, then start another screen. */
  leaveTo(key) {
    this.state.menuOpen = false;
    this.scene.stop(SCENES.World);
    this.scene.start(key);
  }
}
