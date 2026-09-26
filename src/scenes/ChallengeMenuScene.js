import { BaseScene } from './BaseScene.js';
import { C, SCENES, SUBJECTS } from '../constants.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { MINIGAMES, gamesForSubject } from '../data/minigames.js';
import { bandFor, BAND_LABEL } from '../data/grades.js';
import { grid } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { StarRow } from '../ui/StarRow.js';
import { Sfx } from '../systems/Audio.js';

/** Challenge mode: every game on one screen with its best star rating. */
export class ChallengeMenuScene extends BaseScene {
  constructor() { super(SCENES.ChallengeMenu); }

  create(data) {
    super.create(data);
    this.events.on('resume', () => this.rebuild());
  }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    background(this);
    const topH = 56 * ui;
    button(this, 40 * ui, topH / 2 + 4, 64 * ui, 40 * ui, '←', { color: C.panelDark, fontSize: 20, onClick: () => this.scene.start(SCENES.ModeSelect) });
    text(this, w / 2, topH / 2 + 4, 'Challenge Mode', T.heading(this, C.yellow));
    const who = `${p.name} · ${BAND_LABEL[bandFor(p.grade)]}`;
    if (w >= 640) text(this, w - 16, topH / 2 + 4, who, T.small(this, C.grey)).setOrigin(1, 0.5);
    else text(this, w / 2, topH + 6, who, T.small(this, C.grey));

    const subjects = Object.values(SUBJECTS);
    const areaTop = topH + (w >= 640 ? 8 : 20 * ui), areaH = h - areaTop - 12;
    const sectionH = areaH / subjects.length;
    const labelH = 24 * ui;
    subjects.forEach((s, si) => {
      const sy = areaTop + si * sectionH;
      text(this, 16, sy + labelH / 2, s.title, T.bodyBold(this, s.color)).setOrigin(0, 0.5);
      const games = gamesForSubject(s.id);
      const cells = grid({ x: 12, y: sy + labelH, w: w - 24, h: sectionH - labelH - 10 }, games.length, 1, 10);
      games.forEach((g, gi) => this.card(g, cells[gi], s, p));
    });
  }

  card(g, c, subject, profile) {
    const { ui } = this;
    const rec = profile.games[g.id];
    const h = Math.min(c.h, 150 * ui);
    const y = c.y;
    panel(this, c.x - c.w / 2, y - h / 2, c.w, h, { color: C.panel, stroke: subject.color });
    const compact = h < 110 * ui;
    text(this, c.x, y - h / 2 + (compact ? 22 : 30) * ui, g.icon, { fontSize: Math.round((compact ? 22 : 30) * ui) + 'px' });
    text(this, c.x, y - h / 2 + (compact ? 48 : 64) * ui, g.title, { ...T.bodyBold(this), fontSize: Math.round((compact ? 14 : 16) * ui) + 'px', wordWrap: { width: c.w - 12 } });
    new StarRow(this, c.x, y + h / 2 - 20 * ui, rec ? rec.bestStars : 0, 20 * ui);
    const zone = this.add.zone(c.x, y, c.w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { Sfx.click(); this.play(g); });
  }

  play(g) {
    if (g.usesLevels) return this.scene.start(SCENES.LevelSelect, { gameId: g.id });
    Launcher.launch(this, g.id, { source: 'challenge' });
  }
}
