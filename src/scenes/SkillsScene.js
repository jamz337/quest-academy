import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { skillProgress } from '../systems/Practice.js';
import { skillLabel } from '../data/skills.js';
import { T, text } from '../ui/TextStyles.js';
import { background, panel } from '../ui/Panel.js';
import { topBar } from '../ui/TopBar.js';
import { chip } from '../ui/Chip.js';
import { enter } from '../ui/motion.js';

/** My skills: every skill the player has met, with dots for how often they get it right and a "practise" tag. */
export class SkillsScene extends BaseScene {
  constructor() { super(SCENES.Skills); this.fade = true; }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    background(this, { accent: THEME.brand, accent2: THEME.primary });
    const bar = topBar(this, { title: 'My skills', onBack: () => this.go(SCENES.ChallengeMenu), subtitle: 'Dots show how often you get each skill right. Practise the ones marked!' });
    const rows = skillProgress(p);
    const top = bar.bottom + 8 * ui;
    const pw = Math.min(w - 24, 560 * ui), px = (w - pw) / 2, ph = h - top - 12;
    const board = panel(this, px, top, pw, ph, { shadow: 'lg' });
    enter(this, board, { from: 'up', distance: 12 });
    if (!rows.length) return text(this, w / 2, top + ph / 2, 'Play a few games and your skills will show up here.', { ...T.body(this, THEME.ink2), wordWrap: { width: pw - 40 } });
    const rowH = Math.min(40 * ui, (ph - 16) / Math.max(rows.length, 1));
    const shown = rows.slice(0, Math.floor((ph - 16) / rowH));
    const made = [];
    shown.forEach((r, i) => {
      const y = top + 8 + rowH * i + rowH / 2;
      const c = this.add.container(0, y);
      if (i % 2 === 0) { const g = this.add.graphics(); g.fillStyle(THEME.surfaceAlt, 1); g.fillRoundedRect(px + 8, -rowH / 2 + 2, pw - 16, rowH - 4, 10); c.add(g); }
      c.add(this.add.text(px + 20, 0, skillLabel(r.id), T.bodyBold(this, r.weak ? THEME.warningDark : THEME.ink)).setOrigin(0, 0.5));
      const dots = '●'.repeat(r.dots) + '○'.repeat(5 - r.dots);
      c.add(this.add.text(px + pw - (r.weak ? 120 * ui : 20), 0, dots, T.at(this, 16, r.weak ? THEME.warning : THEME.success)).setOrigin(1, 0.5));
      if (r.weak) c.add(chip(this, px + pw - 16, 0, { text: 'practise', originX: 1, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 12, height: 22 * ui, shadow: 'none' }));
      made.push(c);
    });
    enter(this, made, { from: 'up', distance: 10, delay: 80, stagger: 20 });
  }
}
