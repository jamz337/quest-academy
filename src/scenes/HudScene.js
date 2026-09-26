import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { safeArea, grid, viewport } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button, iconButton, speakButton } from '../ui/Button.js';
import { readable } from '../ui/ReadableText.js';
import { rateFor } from '../systems/Speech.js';
import { explainQuestion } from '../data/explanations.js';
import { panel } from '../ui/Panel.js';
import { chip } from '../ui/Chip.js';
import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { VirtualJoystick } from '../systems/VirtualJoystick.js';
import * as Store from '../systems/Store.js';
import { ZONE_NAMES } from '../data/world/map.js';
import { zoneQuests, activeZone, ZONE_ORDER, bossReady } from '../data/world/quests.js';
import { bossForZone } from '../data/world/bosses.js';
import { errandLine, errandsDone } from '../data/world/errands.js';
import { FISH_WAIT_MS, FISH_BITE_MS, rollFish } from '../data/world/encounters.js';
import { getBadge } from '../data/badges.js';
import { levelFromXp } from '../systems/SaveSystem.js';
import { currentStreak } from '../systems/Streak.js';
import { houseStars } from '../systems/Progression.js';
import { MINIGAMES } from '../data/minigames.js';
import { fireworks } from '../ui/Fireworks.js';
import { SCENES as S } from '../constants.js';
import { flyCoins } from '../ui/Coins.js';

/**
 * Overlay on top of the World scene: joystick, action button, coin counter, zone label, menu and the
 * NPC dialog box. Everything is drawn from `this.state` so a resize simply rebuilds it.
 */
export class HudScene extends BaseScene {
  constructor() { super(SCENES.Hud); }

  create(data) {
    this.state = { coins: 0, zone: '', zoneId: null, carry: null, dialog: null, encounter: null, home: false, fishing: null, menuOpen: false, menuPage: 'menu' };
    this.actionFlag = false;
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
    });
  }

  beforeRebuild() {
    if (this.joystick) { this.joystick.destroy(); this.joystick = null; }
  }

  /** Dialog and menu animate in when they open; everything else redraws quietly. */
  enterKey() {
    const s = this.state;
    return (s.dialog ? 'd' + s.dialog.idx : '') + (s.menuOpen ? 'm' + s.menuPage : '') + (s.encounter ? 'e' + s.encounter.kind + (s.encounter.picked ?? '') : '') + (s.home ? 'h' : '') + (s.fishing ? 'f' + s.fishing.phase : '');
  }

  get dialogOpen() { return !!this.state.dialog; }
  get menuOpen() { return this.state.menuOpen; }
  /** True while the world should stand still. */
  get blocking() { return this.dialogOpen || this.menuOpen || !!this.state.encounter || this.state.home || !!this.state.fishing; }

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

    // Top-right: menu
    iconButton(this, w - 10 - sa.right - 22 * ui, top + chipH / 2, 44 * ui, '☰', { onClick: () => this.openMenu() });

    // Bottom-right: round action button
    if (!this.blocking) this.buildActionButton(w - 56 * ui - sa.right, h - 56 * ui - sa.bottom, 72 * ui);

    if (s.dialog) this.buildDialog(s.dialog);
    if (s.encounter) this.buildEncounter(s.encounter);
    if (s.home) this.buildHome();
    if (s.fishing) this.buildFishing(s.fishing);
    if (s.menuOpen) this.buildMenu();
  }

  // ---- Read aloud ---------------------------------------------------------------------------

  get speechRate() { return rateFor(Store.getProfile()?.grade); }
  /** In "read everything" mode, a new dialog line or question is read as soon as it appears. */
  autoRead(readableText, how = {}) {
    if (!readableText || !this.animateEnter || Store.getProfile()?.readAloud !== 'auto') return;
    this.time.delayedCall(350, () => { if (readableText.active) readableText.read({ rate: this.speechRate, ...how }); });
  }

  // ---- The player's house ----------------------------------------------------------------------

  showHome() { this.state.home = true; if (this.joystick) this.joystick.release(); this.rebuild(); }
  closeHome() { this.state.home = false; this.rebuild(); }

  /** Trophy room: level, streak, house stars, bosses, errands and badges, plus a shortcut to the look editor. */
  buildHome() {
    const { w, ui } = this;
    const p = Store.getProfile();
    if (!p) return;
    const badges = (p.badges || []).map((id) => getBadge(id)).filter(Boolean);
    const rows = Math.min(badges.length, 6);
    const m = modal(this, { w: 420 * ui, h: (300 + rows * 24) * ui, title: `${p.name}'s house`, accent: THEME.pink, depth: 600, dimAlpha: 0.45 });
    let y = m.contentTop + 4 * ui;
    const stars = MINIGAMES.reduce((sum, g) => sum + houseStars(p, g.id), 0);
    const bosses = Object.values(p.world.bosses || {}).filter((b) => b.defeated).length;
    const streak = currentStreak(p);
    const line = (label, value) => {
      text(this, m.x + 24, y, label, T.body(this, THEME.ink2)).setOrigin(0, 0.5).setDepth(603);
      text(this, m.x + m.w - 24, y, value, T.bodyBold(this)).setOrigin(1, 0.5).setDepth(603);
      y += 26 * ui;
    };
    line('Level', `${levelFromXp(p.xp)}  (${p.xp} XP)`);
    line('Coins', String(p.coins));
    line('Streak', streak > 1 ? `🔥 ${streak} days` : 'none yet');
    line('House stars', `⭐ ${stars} of ${MINIGAMES.length * 3}`);
    line('Bosses beaten', `${bosses} of 4`);
    line('Errands done', `${errandsDone(p)} of 12`);
    y += 4 * ui;
    text(this, m.x + 24, y, badges.length ? 'BADGES' : 'No badges yet — play a game to earn your first!', T.caption(this)).setOrigin(0, 0.5).setDepth(603); y += 22 * ui;
    badges.slice(0, 6).forEach((b) => { text(this, m.x + 24, y, `🏅 ${b.title}${m.w > 380 ? ` — ${b.desc}` : ''}`, T.small(this, THEME.ink2)).setOrigin(0, 0.5).setDepth(603); y += 24 * ui; });
    if (badges.length > 6) { text(this, m.x + 24, y, `…and ${badges.length - 6} more`, T.small(this, THEME.ink3)).setOrigin(0, 0.5).setDepth(603); }
    const bw = Math.min((m.w - 72) / 2, 180 * ui), bh = 46 * ui, by = m.y + m.h - 36 * ui;
    button(this, w / 2 - bw / 2 - 8, by, bw, bh, 'Change my look', { variant: 'secondary', fontSize: 15, onClick: () => { this.state.home = false; this.scene.stop(S.World); this.scene.start(S.Profile, { edit: p.id }); } }).setDepth(603);
    button(this, w / 2 + bw / 2 + 8, by, bw, bh, 'Back outside', { variant: 'primary', fontSize: 15, onClick: () => this.closeHome() }).setDepth(603);
  }

  // ---- Fishing ---------------------------------------------------------------------------------

  /** { onCatch(loot) -> message|null } Wait for the tug, then pull in time. */
  showFishing(opts) {
    this.state.fishing = { phase: 'wait', loot: null, msg: null, onCatch: opts.onCatch || null };
    if (this.joystick) this.joystick.release();
    this.rebuild();
    const [lo, hi] = FISH_WAIT_MS;
    this.fishTimer = this.time.delayedCall(lo + Math.random() * (hi - lo), () => {
      const f = this.state.fishing;
      if (!f || f.phase !== 'wait') return;
      f.phase = 'bite'; Sfx.pop(); this.rebuild();
      this.fishTimer = this.time.delayedCall(FISH_BITE_MS, () => { const g = this.state.fishing; if (g && g.phase === 'bite') this.endFishing(null, 'It got away! Pull as soon as the float tugs.'); });
    });
  }

  pullLine() {
    const f = this.state.fishing;
    if (!f || f.phase === 'done') return;
    if (this.fishTimer) { this.fishTimer.remove(false); this.fishTimer = null; }
    if (f.phase === 'wait') return this.endFishing(null, 'Too soon! Wait for the float to tug.');
    const loot = rollFish(Math.random);
    const message = f.onCatch ? f.onCatch(loot) : null;
    this.endFishing(loot, loot.coins ? `You caught ${loot.name}!  +${loot.coins} coins` : `You caught ${loot.name}. Better luck next cast!`, message);
    if (loot.coins >= 8) fireworks(this, this.w / 2, this.h * 0.3, { bursts: 2, spread: this.w * 0.25 });
  }

  endFishing(loot, msg, message = null) {
    const f = this.state.fishing;
    if (!f) return;
    f.phase = 'done'; f.loot = loot; f.msg = msg; f.message = message;
    if (loot && loot.coins) Sfx.correct(); else Sfx.wrong();
    this.rebuild();
  }

  closeFishing() { if (this.fishTimer) { this.fishTimer.remove(false); this.fishTimer = null; } this.state.fishing = null; this.rebuild(); }

  buildFishing(f) {
    const { w, ui } = this;
    const m = modal(this, { w: 400 * ui, h: (f.phase === 'done' && f.message ? 400 : 330) * ui, title: 'Gone fishing', accent: THEME.subjects.code.accent, depth: 600, dimAlpha: 0.4 });
    const pond = this.add.graphics().setDepth(603);
    const px = m.x + 24, py = m.contentTop, pw = m.w - 48, ph = 130 * ui;
    pond.fillStyle(0x4aa8ff, 1); pond.fillRoundedRect(px, py, pw, ph, 16);
    pond.fillStyle(0xc5e8ff, 0.7); for (let i = 0; i < 5; i++) pond.fillRoundedRect(px + 16 + i * (pw / 5), py + 20 + (i % 2) * 40, 26, 4, 2);
    if (f.phase !== 'done') {
      const bob = this.add.image(m.x + m.w / 2, py + ph * 0.5, 'bobber').setDisplaySize(30 * ui, 30 * ui).setDepth(604);
      if (f.phase === 'wait') this.tweens.add({ targets: bob, y: bob.y + 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      else {
        this.tweens.add({ targets: bob, y: bob.y + 18, duration: 90, yoyo: true, repeat: -1 });
        text(this, m.x + m.w / 2, py + 22 * ui, '!', T.at(this, 34, THEME.danger, { fontStyle: '700' })).setDepth(604);
      }
      text(this, w / 2, py + ph + 24 * ui, f.phase === 'wait' ? 'Wait for the float to tug…' : 'PULL NOW!', T.bodyBold(this, f.phase === 'wait' ? THEME.ink2 : THEME.danger)).setDepth(603);
      button(this, w / 2, m.y + m.h - 40 * ui, Math.min(m.w - 48, 220 * ui), 50 * ui, 'Pull!', { variant: f.phase === 'bite' ? 'danger' : 'primary', fontSize: 20, onClick: () => this.pullLine() }).setDepth(603);
    } else {
      const big = this.add.text(m.x + m.w / 2, py + ph * 0.5, f.loot ? f.loot.emoji : '💧', { fontSize: Math.round(56 * ui) + 'px' }).setOrigin(0.5).setDepth(604);
      if (f.loot) this.tweens.add({ targets: big, scale: 1.15, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const msgText = readable(this, w / 2, py + ph + 20 * ui, f.msg, T.bodyBold(this, f.loot && f.loot.coins ? THEME.successDark : THEME.ink2), { width: m.w - 48 }).setOrigin(0.5, 0).setDepth(603);
      this.autoRead(msgText);
      if (f.message) readable(this, w / 2, py + ph + 24 * ui + msgText.height + 12 * ui, f.message, T.small(this, THEME.ink), { width: m.w - 48 }).setOrigin(0.5, 0).setDepth(603);
      button(this, w / 2, m.y + m.h - 40 * ui, Math.min(m.w - 48, 220 * ui), 46 * ui, 'Done', { variant: 'primary', onClick: () => this.closeFishing() }).setDepth(603);
    }
  }

  // ---- Grass encounters ---------------------------------------------------------------------

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

  buildEncounter(e) {
    const { w, ui } = this;
    const quiz = e.kind === 'quiz';
    const accent = quiz ? THEME.subjects[e.subject]?.accent ?? THEME.primary : e.kind === 'chest' ? THEME.gold : THEME.pink;
    const title = quiz ? 'Pop quiz!' : e.kind === 'chest' ? 'Treasure chest!' : 'Mystery gift!';
    const mw = Math.min(w - 24, 440 * ui);
    const bh = 44 * ui, gap = 8, cols = 2;
    const rows = quiz ? Math.ceil(e.q.choices.length / cols) : 0;
    // Quiz prompts vary from one line to a short program listing, so the modal is sized from the measured text.
    const lines = quiz ? e.q.prompt.split('\n').length : 0;
    const prompt = quiz ? readable(this, 0, 0, e.q.prompt, T.at(this, lines > 6 ? 13 : e.q.prompt.length > 60 || lines > 3 ? 15 : 18, THEME.ink, { fontStyle: '700' }), { width: mw - 48 }).setOrigin(0.5, 0).setDepth(603) : null;
    if (prompt && e.picked === null) this.autoRead(prompt);
    const why = quiz && e.picked !== null && !e.right ? readable(this, 0, 0, explainQuestion(e.q, e.subject), T.at(this, 14, THEME.ink2), { width: mw - 48 }).setOrigin(0.5, 0).setDepth(603) : null;
    const mh = quiz ? 68 * ui + 8 * ui + prompt.height + 20 * ui + rows * bh + (rows - 1) * gap + 14 * ui + 28 * ui + (why ? why.height + 10 * ui : 0) + 74 * ui : 250 * ui;
    const m = modal(this, { w: mw, h: mh, title, accent, depth: 600, dimAlpha: 0.4 });
    let y = m.contentTop;
    if (quiz) {
      const q = e.q;
      prompt.setPosition(w / 2, y + 8 * ui);
      const sb = speakButton(this, m.x + m.w - 34 * ui, m.y + 40 * ui, 40 * ui, prompt, { rate: this.speechRate }); if (sb) sb.setDepth(603);
      y += prompt.height + 20 * ui;
      const cells = grid({ x: m.x + 24, y, w: m.w - 48, h: rows * bh + (rows - 1) * gap }, cols, rows, gap);
      q.choices.forEach((choice, i) => {
        const c = cells[i];
        const opts = { variant: 'secondary', fontSize: choice.length > 14 ? 14 : 17, radius: THEME.radius.sm, onClick: () => this.answerEncounter(i) };
        if (e.picked !== null) { if (choice === q.answer) opts.variant = 'success'; else if (i === e.picked) opts.variant = 'danger'; }
        button(this, c.x, c.y, c.w, c.h, choice, opts).setDepth(603);
      });
      y += rows * bh + (rows - 1) * gap + 14 * ui;
      if (e.picked !== null) {
        const msg = e.right ? `Correct!  +${e.reward.coins} coins  +${e.reward.xp} XP` : `The answer was ${q.answer}. No harm done!`;
        text(this, w / 2, y, msg, T.bodyBold(this, e.right ? THEME.successDark : THEME.ink2)).setDepth(603);
        if (why) { why.setPosition(w / 2, y + 16 * ui); this.autoRead(why); }
      }
    } else {
      const msg = e.kind === 'chest' ? `You found ${e.coins} coins hidden in the grass!` : `${e.gift.title}\n${e.gift.desc}`;
      text(this, w / 2, y + 30 * ui, msg, { ...T.bodyBold(this), align: 'center', wordWrap: { width: m.w - 48 } }).setDepth(603);
    }
    if (!quiz || e.picked !== null) {
      button(this, w / 2, m.y + m.h - 38 * ui, Math.min(m.w - 48, 200 * ui), 46 * ui, 'Continue', { variant: 'primary', onClick: () => this.closeEncounter() }).setDepth(603);
    }
  }

  answerEncounter(i) {
    const e = this.state.encounter;
    if (!e || e.picked !== null) return;
    e.picked = i; e.right = e.q.choices[i] === e.q.answer;
    if (e.right) Sfx.correct(); else Sfx.wrong();
    this.rebuild();
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
    this.state.dialog = { name: d.name, lines: d.lines || [], idx: 0, onPlay: d.onPlay || null, onLater: d.onLater || null, playLabel: d.playLabel || 'Play', prompt: d.prompt || null, voice: d.voice || null, pitch: d.pitch || null, rate: d.rate || null, speaker: d.speaker || null };
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
    const body = readable(this, px + 16, py + 40 * ui, line, T.body(this), { width: pw - 64 * ui, align: 'left' }).setOrigin(0, 0).setDepth(502);
    const how = { rate: this.speechRate * (d.rate || 1), pitch: d.pitch || 1, voice: d.voice || 'female', speaker: d.speaker || d.name };
    const sb = speakButton(this, px + pw - 30 * ui, py + 22 * ui, 40 * ui, body, how); if (sb) sb.setDepth(502);
    this.autoRead(body, how);
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
    this.state.menuOpen = true; this.state.menuPage = 'menu';
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
    if (this.state.menuPage === 'quests') return this.buildQuests();
    const { w, ui } = this;
    const m = modal(this, { w: 320 * ui, h: 362 * ui, title: 'Paused', accent: THEME.primary, depth: 600, dimAlpha: 0.45 });
    const bw = m.w - 48, bh = 50 * ui;
    let y = m.contentTop + 12 * ui + bh / 2;
    button(this, w / 2, y, bw, bh, 'Resume', { variant: 'primary', onClick: () => this.closeMenu() }).setDepth(603); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Quests', { variant: 'warning', onClick: () => { Sfx.click(); this.state.menuPage = 'quests'; this.rebuild(); } }).setDepth(603); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Challenge Mode', { variant: 'subject', subject: 'code', onClick: () => this.leaveTo(SCENES.ChallengeMenu) }).setDepth(603); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Home', { variant: 'secondary', onClick: () => this.leaveTo(SCENES.ModeSelect) }).setDepth(603);
  }

  /** Checklist for the zone the player stands in (or the next one to clear), with the boss last. */
  buildQuests() {
    const { w, ui } = this;
    const profile = Store.getProfile() || {};
    const zone = ZONE_ORDER.includes(this.state.zoneId) ? this.state.zoneId : activeZone(profile);
    const quests = zoneQuests(profile, zone);
    const errand = errandLine(profile);
    if (errand) quests.push({ id: 'errand', title: errand, count: 0, total: 1, done: false });   // sized into the modal below
    const boss = bossForZone(zone);
    const rowH = 34 * ui;
    const m = modal(this, { w: 400 * ui, h: 180 * ui + quests.length * rowH, title: `${ZONE_NAMES[zone]} quests`, accent: THEME.warning, depth: 600, dimAlpha: 0.45 });
    let y = m.contentTop + 6 * ui;
    const ready = boss && bossReady(profile, zone);
    const done = quests.every((q) => q.done);
    const sub = done ? 'Zone cleared! Explore the next land.' : ready ? `${boss.name} is waiting. Go and fight!` : 'Finish these to wake the boss.';
    text(this, w / 2, y, sub, T.small(this, THEME.ink2)).setDepth(603); y += 24 * ui;
    quests.forEach((q) => {
      const cy = y + rowH / 2;
      const mark = q.done ? '✓' : q.id === 'boss' && !ready ? '🔒' : q.id === 'errand' ? '📜' : '○';
      text(this, m.x + 26, cy, mark, T.bodyBold(this, q.done ? THEME.successDark : THEME.ink3)).setDepth(603);
      text(this, m.x + 48, cy, q.title, { ...T.body(this, q.done ? THEME.ink2 : THEME.ink), wordWrap: { width: m.w - 130 } }).setOrigin(0, 0.5).setDepth(603);
      text(this, m.x + m.w - 24, cy, `${q.count}/${q.total}`, T.small(this, q.done ? THEME.successDark : THEME.ink2)).setOrigin(1, 0.5).setDepth(603);
      y += rowH;
    });
    button(this, w / 2, m.y + m.h - 36 * ui, Math.min(m.w - 48, 200 * ui), 44 * ui, 'Back', { variant: 'secondary', onClick: () => { this.state.menuPage = 'menu'; this.rebuild(); } }).setDepth(603);
  }

  /** Stop the world (which saves its position on shutdown) and this Hud, then start another screen. */
  leaveTo(key) {
    this.state.menuOpen = false;
    this.scene.stop(SCENES.World);
    this.scene.start(key);
  }
}
