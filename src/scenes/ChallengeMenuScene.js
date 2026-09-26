import { BaseScene } from './BaseScene.js';
import { SCENES, SUBJECTS } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { gamesForSubject } from '../data/minigames.js';
import { bandFor, BAND_LABEL } from '../data/grades.js';
import { grid } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { topBar } from '../ui/TopBar.js';
import { StarRow } from '../ui/StarRow.js';
import { enter } from '../ui/motion.js';

/** Challenge mode: every game on one screen with its best star rating. */
export class ChallengeMenuScene extends BaseScene {
  constructor() { super(SCENES.ChallengeMenu); this.fade = true; }

  create(data) {
    super.create(data);
    this.events.on('resume', () => this.rebuild());
  }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    background(this, { accent: THEME.subjects.math.accent, accent2: THEME.subjects.code.accent });
    const who = `${p.name} · ${BAND_LABEL[bandFor(p.grade)]}`;
    const wide = w >= 640;
    const bar = topBar(this, {
      title: 'Challenge Mode', onBack: () => this.go(SCENES.ModeSelect),
      right: wide ? (x, y) => chip(this, x, y, { text: who, originX: 1, textColor: THEME.ink2 }) : null,
      subtitle: wide ? null : who
    });

    const subjects = Object.values(SUBJECTS);
    const areaTop = bar.bottom + 6 * ui, areaH = h - areaTop - 12;
    const sectionH = areaH / subjects.length;
    const labelH = 26 * ui;
    const cards = [];
    subjects.forEach((s, si) => {
      const sy = areaTop + si * sectionH;
      this.add.circle(22, sy + labelH / 2, 5 * ui, s.accent);
      text(this, 34, sy + labelH / 2, s.title, T.bodyBold(this, s.dark)).setOrigin(0, 0.5);
      const games = gamesForSubject(s.id);
      const cells = grid({ x: 12, y: sy + labelH, w: w - 24, h: sectionH - labelH - 10 }, games.length, 1, 10);
      games.forEach((g, gi) => cards.push(this.card(g, cells[gi], s, p)));
    });
    enter(this, cards, { from: 'up', stagger: 35 });
  }

  card(g, c, subject, profile) {
    const { ui } = this;
    const rec = profile.games[g.id];
    const h = Math.min(c.h, 150 * ui);
    const k = card(this, c.x, c.y, c.w, h, { stroke: subject.soft, onTap: () => this.play(g) });
    const compact = h < 110 * ui;
    const iy = -h / 2 + (compact ? 24 : 32) * ui;
    k.add(this.add.circle(0, iy, (compact ? 18 : 24) * ui, subject.soft));
    k.add(this.add.text(0, iy, g.icon, { fontSize: Math.round((compact ? 20 : 26) * ui) + 'px' }).setOrigin(0.5));
    k.add(this.add.text(0, -h / 2 + (compact ? 50 : 66) * ui, g.title, T.at(this, compact ? 14 : 16, THEME.ink, { wordWrap: { width: c.w - 12 } })).setOrigin(0.5));
    k.add(new StarRow(this, 0, h / 2 - 20 * ui, rec ? rec.bestStars : 0, 20 * ui));
    return k;
  }

  play(g) {
    if (g.usesLevels) return this.go(SCENES.LevelSelect, { gameId: g.id });
    Launcher.launch(this, g.id, { source: 'challenge' });
  }
}
