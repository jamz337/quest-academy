import { BaseScene } from './BaseScene.js';
import { C, SCENES, hex } from '../constants.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, dimmer } from '../ui/Panel.js';
import { toast } from '../ui/Toast.js';
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

  get dialogOpen() { return !!this.state.dialog; }
  get menuOpen() { return this.state.menuOpen; }
  /** True while the world should stand still. */
  get blocking() { return this.dialogOpen || this.menuOpen; }

  /** Returns true once per press of the action button (or a tap on the dialog). */
  takeAction() { const a = this.actionFlag; this.actionFlag = false; return a; }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    this.joystick = new VirtualJoystick(this, { enabled: () => !this.blocking });

    // Top-left: coins and zone
    const chipW = 150 * ui, chipH = 34 * ui;
    panel(this, 10, 10, chipW, chipH, { color: C.panelDark, alpha: 0.85, radius: 12 });
    this.add.image(10 + 20 * ui, 10 + chipH / 2, 'coin').setDisplaySize(22 * ui, 22 * ui);
    this.coinText = text(this, 10 + 36 * ui, 10 + chipH / 2, String(s.coins), T.bodyBold(this, C.yellow)).setOrigin(0, 0.5);
    this.zoneText = text(this, 10, 10 + chipH + 14 * ui, s.zone, { ...T.small(this, C.white), stroke: hex(C.navy), strokeThickness: 4 }).setOrigin(0, 0.5);

    // Top-right: menu
    button(this, w - 10 - 40 * ui, 10 + chipH / 2, 80 * ui, chipH, 'Menu', { color: C.panelDark, fontSize: 15, onClick: () => this.openMenu() });

    // Bottom-right: round action button
    if (!s.dialog && !s.menuOpen) this.buildActionButton(w - 56 * ui, h - 56 * ui, 72 * ui);

    if (s.dialog) this.buildDialog(s.dialog);
    if (s.menuOpen) this.buildMenu();
  }

  buildActionButton(x, y, size) {
    const r = size / 2;
    const c = this.add.container(x, y).setDepth(300);
    const shadow = this.add.circle(0, 4, r, 0x000000, 0.35);
    const face = this.add.circle(0, 0, r, C.red, 1).setStrokeStyle(3, C.white, 0.8);
    const label = text(this, 0, 0, 'A', { ...T.heading(this, C.white), fontSize: Math.round(r * 0.9) + 'px' });
    c.add([shadow, face, label]);
    c.setSize(size, size);
    c.setInteractive();
    c.on('pointerdown', () => { if (this.blocking) return; this.actionFlag = true; face.setFillStyle(C.purple, 1); c.setScale(0.92); });
    const up = () => { face.setFillStyle(C.red, 1); c.setScale(1); };
    c.on('pointerup', up); c.on('pointerout', up);
    this.actionButton = c;
  }

  // ---- Coins / zone -------------------------------------------------------------------------

  setCoins(n) { this.state.coins = n; if (this.coinText && this.coinText.active) this.coinText.setText(String(n)); }
  setZone(name) { this.state.zone = name || ''; if (this.zoneText && this.zoneText.active) this.zoneText.setText(this.state.zone); }
  addCoins(n) { this.setCoins(this.state.coins + n); }

  /** Short banner (zone entered, unlock...). */
  banner(msg, opts = {}) { if (!this.scene.isActive()) return; toast(this, msg, { bg: C.green, y: 74 * this.ui + 20, ...opts }); }
  notify(msg, opts = {}) { if (!this.scene.isActive()) return; toast(this, msg, opts); }

  // ---- Dialog ------------------------------------------------------------------------------

  /** { name, lines, onPlay?, onLater?, playLabel? } — Play/Later appear after the last line. */
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
    const pw = Math.min(w - 20, 520 * ui), ph = (showButtons ? 168 : 120) * ui;
    const px = (w - pw) / 2, py = h - ph - 14;
    const g = panel(this, px, py, pw, ph, { color: C.panel, alpha: 0.96, stroke: C.yellow });
    g.setDepth(500);
    const zone = this.add.zone(px, py, pw, ph).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(501);
    zone.on('pointerup', () => { if (!showButtons) this.advanceDialog(); });
    text(this, px + 16, py + 18 * ui, d.name, T.bodyBold(this, C.yellow)).setOrigin(0, 0.5).setDepth(502);
    const line = last && d.prompt ? `${d.lines[d.idx]}\n${d.prompt}` : d.lines[d.idx] || '';
    text(this, px + 16, py + 36 * ui, line, { ...T.body(this), align: 'left', wordWrap: { width: pw - 32 } }).setOrigin(0, 0).setDepth(502);
    if (!showButtons) {
      const hint = last ? 'Tap to close' : 'Tap to continue  ▼';
      this.add.text(px + pw - 14, py + ph - 10, hint, T.small(this, C.grey)).setOrigin(1, 1).setDepth(502);
    } else {
      const bw = Math.min((pw - 48) / 2, 180 * ui), bh = 44 * ui, by = py + ph - 32 * ui;
      button(this, px + pw / 2 - bw / 2 - 8, by, bw, bh, 'Later', { color: C.dark, fontSize: 17, onClick: () => this.closeDialog() }).setDepth(502);
      button(this, px + pw / 2 + bw / 2 + 8, by, bw, bh, d.playLabel, { color: C.lime, textColor: C.navy, fontSize: 17, onClick: () => this.play() }).setDepth(502);
    }
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
    const { w, h, ui } = this;
    dimmer(this, 0.6).setDepth(600);
    const pw = Math.min(w - 40, 320 * ui), ph = 290 * ui;
    panel(this, w / 2 - pw / 2, h / 2 - ph / 2, pw, ph, { color: C.panel, stroke: C.blue }).setDepth(601);
    text(this, w / 2, h / 2 - ph / 2 + 36 * ui, 'Paused', T.heading(this, C.yellow)).setDepth(602);
    const bw = pw - 48, bh = 50 * ui;
    button(this, w / 2, h / 2 - 40 * ui, bw, bh, 'Resume', { color: C.lime, textColor: C.navy, onClick: () => this.closeMenu() }).setDepth(602);
    button(this, w / 2, h / 2 + 22 * ui, bw, bh, 'Challenge Mode', { color: C.orange, textColor: C.navy, onClick: () => this.leaveTo(SCENES.ChallengeMenu) }).setDepth(602);
    button(this, w / 2, h / 2 + 84 * ui, bw, bh, 'Home', { color: C.red, onClick: () => this.leaveTo(SCENES.ModeSelect) }).setDepth(602);
  }

  /** Stop the world (which saves its position on shutdown) and this Hud, then start another screen. */
  leaveTo(key) {
    this.state.menuOpen = false;
    this.scene.stop(SCENES.World);
    this.scene.start(key);
  }
}
