import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Cloud from '../systems/Cloud.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { topBar } from '../ui/TopBar.js';
import { enter } from '../ui/motion.js';
import { levelFromXp } from '../systems/SaveSystem.js';

const MEDALS = [THEME.warningDark, THEME.ink3, THEME.subjects.code.dark];

/** Top players across the whole site: this week (XP earned) and all time. First names and avatars only. */
export class LeaderboardScene extends BaseScene {
  constructor() { super(SCENES.Leaderboard); this.fade = true; }

  init() { this.state = { tab: 'week', data: null, error: null, loading: true }; }

  create(data) {
    super.create(data);
    Cloud.fetchLeaderboard()
      .then((d) => { this.state.data = d; this.state.loading = false; })
      .catch((e) => { this.state.error = e.code || 'network'; this.state.loading = false; })
      .finally(() => { if (this.scene.isActive()) { this.buildCount = 0; this.rebuild(); } });
  }

  enterKey() { return this.state.tab; }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    background(this, { accent: THEME.brand, accent2: THEME.pink });
    const bar = topBar(this, { title: 'Leaderboard', onBack: () => this.go(SCENES.ModeSelect) });

    const tabW = Math.min(160 * ui, (w - 40) / 2), tabH = 40 * ui, tabY = bar.bottom + 8 + tabH / 2;
    [['week', 'This week'], ['allTime', 'All time']].forEach(([id, label], i) => {
      button(this, w / 2 + (i - 0.5) * (tabW + 8), tabY, tabW, tabH, label, {
        variant: 'secondary', selected: s.tab === id, selectedAccent: THEME.brand, fontSize: 15, radius: THEME.radius.sm,
        onClick: () => { s.tab = id; this.rebuild(); }
      });
    });

    const top = tabY + tabH / 2 + 14;
    const pw = Math.min(w - 24, 520 * ui), px = (w - pw) / 2, ph = h - top - 12;
    const board = panel(this, px, top, pw, ph, { shadow: 'lg' });
    enter(this, board, { from: 'up', distance: 12 });

    if (s.loading) return text(this, w / 2, top + ph / 2, 'Loading…', T.body(this, THEME.ink2));
    if (s.error) {
      const msg = s.error === 'cloud-not-configured' ? 'The leaderboard is not switched on for this site yet.' : 'Could not load the leaderboard. Check your connection.';
      return text(this, w / 2, top + ph / 2, msg, { ...T.body(this, THEME.ink2), wordWrap: { width: pw - 40 } });
    }
    const rows = (s.data && s.data[s.tab]) || [];
    if (!rows.length) return text(this, w / 2, top + ph / 2, s.tab === 'week' ? 'Nobody has played this week yet.\nBe the first!' : 'No players yet.', T.body(this, THEME.ink2));

    const rowH = Math.min(48 * ui, (ph - 16) / Math.max(rows.length, 1));
    const made = [];
    rows.slice(0, 20).forEach((r, i) => {
      const y = top + 8 + rowH * i + rowH / 2;
      const medal = MEDALS[i];
      const c = this.add.container(0, y);
      if (i % 2 === 0) { const g = this.add.graphics(); g.fillStyle(THEME.surfaceAlt, 1); g.fillRoundedRect(px + 8, -rowH / 2 + 2, pw - 16, rowH - 4, 10); c.add(g); }
      c.add(this.add.text(px + 30 * ui, 0, String(i + 1), T.bodyBold(this, medal || THEME.ink3)).setOrigin(0.5));
      c.add(this.add.circle(px + 62 * ui, 0, rowH * 0.42, i < 3 ? THEME.brandSoft : THEME.sunken));
      c.add(this.add.image(px + 62 * ui, 0, 'avatar', Math.max(0, Math.min(7, r.avatar | 0))).setDisplaySize(rowH * 0.74, rowH * 0.74));
      c.add(this.add.text(px + 86 * ui, 0, r.name || 'Player', T.bodyBold(this)).setOrigin(0, 0.5));
      const right = s.tab === 'week' ? `${r.xp} XP · ${r.games} ${r.games === 1 ? 'game' : 'games'}` : `Lv ${levelFromXp(r.xp)} · ${r.xp} XP · ${r.stars} ★`;
      c.add(this.add.text(px + pw - 16, 0, right, T.small(this, THEME.ink2)).setOrigin(1, 0.5));
      made.push(c);
    });
    enter(this, made, { from: 'up', distance: 10, delay: 80, stagger: 25 });
  }
}
