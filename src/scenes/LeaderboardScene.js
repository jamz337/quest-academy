import { BaseScene } from './BaseScene.js';
import { C, SCENES } from '../constants.js';
import * as Cloud from '../systems/Cloud.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { levelFromXp } from '../systems/SaveSystem.js';

const MEDALS = [C.yellow, C.grey, C.orange];

/** Top players across the whole site: this week (XP earned) and all time. First names and avatars only. */
export class LeaderboardScene extends BaseScene {
  constructor() { super(SCENES.Leaderboard); }

  init() { this.state = { tab: 'week', data: null, error: null, loading: true }; }

  create(data) {
    super.create(data);
    Cloud.fetchLeaderboard()
      .then((d) => { this.state.data = d; this.state.loading = false; })
      .catch((e) => { this.state.error = e.code || 'network'; this.state.loading = false; })
      .finally(() => { if (this.scene.isActive()) this.rebuild(); });
  }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    background(this, C.navy, C.panelDark, C.purple);
    const topH = 56 * ui;
    button(this, 40 * ui, topH / 2 + 4, 64 * ui, 40 * ui, '←', { color: C.panelDark, fontSize: 20, onClick: () => this.scene.start(SCENES.ModeSelect) });
    text(this, w / 2, topH / 2 + 4, 'Leaderboard', T.heading(this, C.yellow));

    const tabW = Math.min(160 * ui, (w - 40) / 2), tabH = 40 * ui, tabY = topH + 8 + tabH / 2;
    [['week', 'This week'], ['allTime', 'All time']].forEach(([id, label], i) => {
      const active = s.tab === id;
      button(this, w / 2 + (i - 0.5) * (tabW + 8), tabY, tabW, tabH, label, {
        color: active ? C.purple : C.panel, fontSize: 15, onClick: () => { s.tab = id; this.rebuild(); }
      });
    });

    const top = tabY + tabH / 2 + 12;
    const pw = Math.min(w - 24, 520 * ui), px = (w - pw) / 2, ph = h - top - 12;
    panel(this, px, top, pw, ph, { color: C.panel, stroke: C.purple });

    if (s.loading) return text(this, w / 2, top + ph / 2, 'Loading…', T.body(this, C.grey));
    if (s.error) {
      const msg = s.error === 'cloud-not-configured' ? 'The leaderboard is not switched on for this site yet.' : 'Could not load the leaderboard. Check your connection.';
      return text(this, w / 2, top + ph / 2, msg, { ...T.body(this, C.grey), wordWrap: { width: pw - 40 } });
    }
    const rows = (s.data && s.data[s.tab]) || [];
    if (!rows.length) return text(this, w / 2, top + ph / 2, s.tab === 'week' ? 'Nobody has played this week yet.\nBe the first!' : 'No players yet.', T.body(this, C.grey));

    const rowH = Math.min(46 * ui, (ph - 16) / Math.max(rows.length, 1));
    rows.slice(0, 20).forEach((r, i) => {
      const y = top + 8 + rowH * i + rowH / 2;
      const medal = MEDALS[i];
      if (i % 2 === 0) { const g = this.add.graphics(); g.fillStyle(0xffffff, 0.04); g.fillRoundedRect(px + 8, y - rowH / 2 + 2, pw - 16, rowH - 4, 8); }
      text(this, px + 30 * ui, y, String(i + 1), T.bodyBold(this, medal || C.grey));
      this.add.image(px + 62 * ui, y, 'avatar', Math.max(0, Math.min(7, r.avatar | 0))).setDisplaySize(rowH * 0.78, rowH * 0.78);
      text(this, px + 86 * ui, y, r.name || 'Player', T.bodyBold(this)).setOrigin(0, 0.5);
      const right = s.tab === 'week' ? `${r.xp} XP · ${r.games} ${r.games === 1 ? 'game' : 'games'}` : `Lv ${levelFromXp(r.xp)} · ${r.xp} XP · ${r.stars} ★`;
      text(this, px + pw - 16, y, right, T.small(this, C.yellow)).setOrigin(1, 0.5);
    });
    if (!Cloud.isSignedIn()) {
      text(this, w / 2, h - 6, '', T.small(this, C.grey));
    }
  }
}
