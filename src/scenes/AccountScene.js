import { BaseScene } from './BaseScene.js';
import { C, hex, SCENES } from '../constants.js';
import * as Cloud from '../systems/Cloud.js';
import { T, text, FONT } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { Sfx } from '../systems/Audio.js';

const ERRORS = {
  'invalid-email': 'That email address does not look right.',
  'password-too-short': 'Use a password with at least 8 characters.',
  'email-taken': 'There is already an account with that email. Try signing in.',
  'wrong-email-or-password': 'Wrong email or password.',
  'cloud-not-configured': 'Cloud saves are not switched on for this site yet.',
  'sign-in-required': 'Please sign in again.'
};
const describe = (code) => ERRORS[code] || 'Could not reach the server. Check your connection and try again.';

/** Parent account: sign in / create account, sync status, leaderboard opt-in and a link to the dashboard. */
export class AccountScene extends BaseScene {
  constructor() { super(SCENES.Account); }

  init() { this.state = { email: '', password: '', error: null, busy: false, notice: null }; }

  create(data) {
    super.create(data);
    this.unsub = Cloud.subscribe(() => { if (!this.state.busy) this.rebuild(); });
    this.events.once('shutdown', () => { if (this.unsub) this.unsub(); });
  }

  build() {
    const { w, h, ui } = this;
    background(this, C.navy, C.panelDark, C.pink);
    const topH = 56 * ui;
    button(this, 40 * ui, topH / 2 + 4, 64 * ui, 40 * ui, '←', { color: C.panelDark, fontSize: 20, onClick: () => this.scene.start(SCENES.ModeSelect) });
    text(this, w / 2, topH / 2 + 4, 'Family account', T.heading(this, C.yellow));
    if (Cloud.isSignedIn()) this.buildSignedIn(topH); else this.buildForm(topH);
  }

  buildSignedIn(topH) {
    const { w, h, ui } = this;
    const c = Cloud.info();
    const pw = Math.min(w - 24, 480 * ui), ph = Math.min(h - topH - 24, 440 * ui);
    const px = (w - pw) / 2, py = topH + 12;
    panel(this, px, py, pw, ph, { color: C.panel, stroke: C.pink });
    let y = py + 36 * ui;
    text(this, w / 2, y, c.email || '', T.bodyBold(this)); y += 30 * ui;
    text(this, w / 2, y, this.statusLine(c), T.small(this, c.status === 'offline' || c.status === 'unavailable' ? C.orange : C.grey)); y += 26 * ui;
    if (this.state.notice) { text(this, w / 2, y, this.state.notice, T.small(this, C.lime)); }
    y += 30 * ui;
    text(this, w / 2, y, 'Progress for every player on this device is saved to your account\nand comes back on any device where you sign in.', { ...T.small(this, C.grey), wordWrap: { width: pw - 40 } }); y += 56 * ui;
    const bw = pw - 48, bh = 48 * ui;
    button(this, w / 2, y, bw, bh, this.state.busy ? 'Syncing…' : 'Sync now', { color: C.blue, disabled: this.state.busy, onClick: () => this.sync() }); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Open parent dashboard', { color: C.lime, textColor: C.navy, onClick: () => window.open(Cloud.dashboardUrl(), '_blank') }); y += bh + 12;
    button(this, w / 2, y, bw, bh, c.leaderboard ? 'Leaderboard: shown' : 'Leaderboard: hidden', {
      color: c.leaderboard ? C.purple : C.dark, fontSize: 17,
      onClick: () => Cloud.setLeaderboard(!c.leaderboard).catch((e) => { this.state.error = e.code; this.rebuild(); })
    }); y += bh + 12;
    text(this, w / 2, y, 'The leaderboard only ever shows first names and avatars.', T.small(this, C.grey)); y += 26 * ui;
    button(this, w / 2, y + 10, bw, 44 * ui, 'Sign out', { color: C.red, fontSize: 16, onClick: () => { Cloud.signOut(); this.rebuild(); } });
    if (this.state.error) text(this, w / 2, py + ph - 20 * ui, describe(this.state.error), { ...T.small(this, C.orange), wordWrap: { width: pw - 40 } });
  }

  statusLine(c) {
    if (c.status === 'syncing') return 'Syncing…';
    if (c.status === 'synced' && c.lastSync) return 'Synced ' + ago(c.lastSync);
    if (c.status === 'offline') return 'Offline: changes will sync when you are back online';
    if (c.status === 'unavailable') return describe('cloud-not-configured');
    return 'Signed in';
  }

  buildForm(topH) {
    const { w, h, ui } = this;
    const s = this.state;
    const pw = Math.min(w - 24, 480 * ui), ph = Math.min(h - topH - 24, 470 * ui);
    const px = (w - pw) / 2, py = topH + 12;
    panel(this, px, py, pw, ph, { color: C.panel, stroke: C.pink });
    let y = py + 28 * ui;
    text(this, w / 2, y, 'Save progress online so it follows your children\nto any phone, tablet or computer.', { ...T.small(this, C.grey), wordWrap: { width: pw - 40 } });
    y += 44 * ui;
    const field = (label, type, value, onInput, placeholder) => {
      text(this, px + 24, y, label, T.small(this, C.grey)).setOrigin(0, 0.5);
      y += 24 * ui;
      const input = document.createElement('input');
      input.type = type; input.value = value; input.placeholder = placeholder; input.maxLength = 200;
      input.autocapitalize = 'none'; input.autocomplete = type === 'email' ? 'email' : 'current-password';
      Object.assign(input.style, {
        width: (pw - 48) + 'px', height: (42 * ui) + 'px', fontSize: Math.round(17 * ui) + 'px', borderRadius: '10px',
        border: '3px solid ' + hex(C.pink), padding: '0 12px', boxSizing: 'border-box', fontFamily: FONT,
        fontWeight: '600', color: hex(C.navy), background: hex(C.white), outline: 'none'
      });
      input.addEventListener('input', () => onInput(input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.submit('signIn'); });
      this.add.dom(w / 2, y + 21 * ui, input);
      y += 42 * ui + 18 * ui;
    };
    field('Parent email', 'email', s.email, (v) => { s.email = v; }, 'you@example.com');
    field('Password (8+ characters)', 'password', s.password, (v) => { s.password = v; }, '••••••••');
    if (s.error) { text(this, w / 2, y, describe(s.error), { ...T.small(this, C.orange), wordWrap: { width: pw - 40 } }); }
    y += 30 * ui;
    const bw = Math.min((pw - 72) / 2, 200 * ui), bh = 48 * ui;
    button(this, w / 2 - bw / 2 - 8, y, bw, bh, 'Sign in', { color: C.blue, disabled: s.busy, onClick: () => this.submit('signIn') });
    button(this, w / 2 + bw / 2 + 8, y, bw, bh, 'Create account', { color: C.lime, textColor: C.navy, fontSize: 17, disabled: s.busy, onClick: () => this.submit('register') });
    y += bh + 20 * ui;
    text(this, w / 2, y, s.busy ? 'Please wait…' : 'You can keep playing without an account. Progress then stays on this device only.', { ...T.small(this, C.grey), wordWrap: { width: pw - 40 } });
  }

  async submit(kind) {
    const s = this.state;
    if (s.busy) return;
    s.error = null; s.busy = true; this.rebuild();
    try {
      await (kind === 'register' ? Cloud.register(s.email, s.password) : Cloud.signIn(s.email, s.password));
      Sfx.correct();
      s.busy = false; s.password = ''; s.notice = kind === 'register' ? 'Account created. Your progress is now backed up.' : 'Welcome back!';
      this.scene.start(SCENES.ModeSelect);
    } catch (e) {
      Sfx.wrong();
      s.busy = false; s.error = e.code || 'network';
      this.rebuild();
    }
  }

  async sync() {
    this.state.busy = true; this.state.error = null; this.rebuild();
    const ok = await Cloud.syncNow();
    this.state.busy = false;
    this.state.notice = ok ? 'Everything is up to date.' : null;
    if (!ok) this.state.error = Cloud.info().error;
    this.rebuild();
  }
}

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return s + ' seconds ago';
  const m = Math.round(s / 60);
  if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m / 60);
  return h + (h === 1 ? ' hour ago' : ' hours ago');
}
