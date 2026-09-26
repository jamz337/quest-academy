import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Cloud from '../systems/Cloud.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { background } from '../ui/Panel.js';
import { modal } from '../ui/Modal.js';
import { chip } from '../ui/Chip.js';
import { topBar } from '../ui/TopBar.js';
import { textInput } from '../ui/Input.js';
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
  constructor() { super(SCENES.Account); this.fade = true; }

  init() { this.state = { email: '', password: '', error: null, busy: false, notice: null }; }

  create(data) {
    super.create(data);
    this.unsub = Cloud.subscribe(() => { if (!this.state.busy) this.rebuild(); });
    this.events.once('shutdown', () => { if (this.unsub) this.unsub(); });
  }

  build() {
    background(this, { accent: THEME.pink, accent2: THEME.brand });
    const bar = topBar(this, { title: 'Family account', onBack: () => this.go(SCENES.ModeSelect) });
    if (Cloud.isSignedIn()) this.buildSignedIn(bar.bottom); else this.buildForm(bar.bottom);
  }

  buildSignedIn(top) {
    const { w, ui } = this;
    const c = Cloud.info();
    const m = modal(this, { w: 480 * ui, h: 470 * ui, y: top + 8, accent: THEME.pink, dim: false });
    let y = m.y + 40 * ui;
    text(this, w / 2, y, c.email || '', T.bodyBold(this)); y += 32 * ui;
    const offline = c.status === 'offline' || c.status === 'unavailable';
    chip(this, w / 2, y, {
      text: this.statusLine(c), originX: 0.5, shadow: 'none', fontSize: 13,
      color: offline ? THEME.warningSoft : THEME.successSoft, textColor: offline ? THEME.warningDark : THEME.successDark
    }); y += 30 * ui;
    if (this.state.notice) text(this, w / 2, y, this.state.notice, T.small(this, THEME.successDark));
    y += 28 * ui;
    text(this, w / 2, y, 'Progress for every player on this device is saved to your account\nand comes back on any device where you sign in.', { ...T.small(this, THEME.ink2), wordWrap: { width: m.w - 40 } }); y += 56 * ui;
    const bw = m.w - 48, bh = 48 * ui;
    button(this, w / 2, y, bw, bh, this.state.busy ? 'Syncing…' : 'Sync now', { variant: 'primary', disabled: this.state.busy, onClick: () => this.sync() }); y += bh + 12;
    button(this, w / 2, y, bw, bh, 'Open parent dashboard', { variant: 'secondary', onClick: () => window.open(Cloud.dashboardUrl(), '_blank') }); y += bh + 12;
    button(this, w / 2, y, bw, bh, c.leaderboard ? 'Leaderboard: shown' : 'Leaderboard: hidden', {
      variant: 'secondary', selected: !!c.leaderboard, selectedAccent: THEME.brand, fontSize: 16,
      onClick: () => Cloud.setLeaderboard(!c.leaderboard).catch((e) => { this.state.error = e.code; this.rebuild(); })
    }); y += bh + 10;
    text(this, w / 2, y, 'The leaderboard only ever shows first names and avatars.', T.small(this, THEME.ink2)); y += 26 * ui;
    button(this, w / 2, y + 8, bw, 44 * ui, 'Sign out', { variant: 'ghost', textColor: THEME.danger, fontSize: 16, onClick: () => { Cloud.signOut(); this.rebuild(); } });
    if (this.state.error) text(this, w / 2, m.y + m.h - 18 * ui, describe(this.state.error), { ...T.small(this, THEME.danger), wordWrap: { width: m.w - 40 } });
  }

  statusLine(c) {
    if (c.status === 'syncing') return 'Syncing…';
    if (c.status === 'synced' && c.lastSync) return 'Synced ' + ago(c.lastSync);
    if (c.status === 'offline') return 'Offline: changes will sync when you are back online';
    if (c.status === 'unavailable') return describe('cloud-not-configured');
    return 'Signed in';
  }

  buildForm(top) {
    const { w, ui } = this;
    const s = this.state;
    const m = modal(this, { w: 480 * ui, h: 480 * ui, y: top + 8, accent: THEME.pink, dim: false });
    let y = m.y + 34 * ui;
    text(this, w / 2, y, 'Save progress online so it follows your children\nto any phone, tablet or computer.', { ...T.small(this, THEME.ink2), wordWrap: { width: m.w - 40 } });
    y += 44 * ui;
    const field = (label, type, value, onInput, placeholder) => {
      text(this, m.x + 24, y, label, T.caption(this)).setOrigin(0, 0.5);
      y += 22 * ui;
      textInput(this, w / 2, y + 22 * ui, m.w - 48, 44 * ui, {
        value, placeholder, type, accent: THEME.pink, autocomplete: type === 'email' ? 'email' : 'current-password',
        onInput, onEnter: () => this.submit('signIn')
      });
      y += 44 * ui + 18 * ui;
    };
    field('PARENT EMAIL', 'email', s.email, (v) => { s.email = v; }, 'you@example.com');
    field('PASSWORD (8+ CHARACTERS)', 'password', s.password, (v) => { s.password = v; }, '••••••••');
    if (s.error) { text(this, w / 2, y, describe(s.error), { ...T.small(this, THEME.danger), wordWrap: { width: m.w - 40 } }); }
    y += 30 * ui;
    const bw = Math.min((m.w - 72) / 2, 200 * ui), bh = 48 * ui;
    button(this, w / 2 - bw / 2 - 8, y, bw, bh, 'Sign in', { variant: 'primary', disabled: s.busy, onClick: () => this.submit('signIn') });
    button(this, w / 2 + bw / 2 + 8, y, bw, bh, 'Create account', { variant: 'secondary', fontSize: 16, disabled: s.busy, onClick: () => this.submit('register') });
    y += bh + 22 * ui;
    text(this, w / 2, y, s.busy ? 'Please wait…' : 'You can keep playing without an account. Progress then stays on this device only.', { ...T.small(this, THEME.ink2), wordWrap: { width: m.w - 40 } });
  }

  async submit(kind) {
    const s = this.state;
    if (s.busy) return;
    s.error = null; s.busy = true; this.rebuild();
    try {
      await (kind === 'register' ? Cloud.register(s.email, s.password) : Cloud.signIn(s.email, s.password));
      Sfx.correct();
      s.busy = false; s.password = ''; s.notice = kind === 'register' ? 'Account created. Your progress is now backed up.' : 'Welcome back!';
      this.go(SCENES.ModeSelect);
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
