import { BaseScene } from './BaseScene.js';
import { SCENES, SUBJECTS } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { gamesForSubject } from '../data/minigames.js';
import { bandFor, BAND_LABEL } from '../data/grades.js';
import { mastery, effectiveGrade, MASTERY_LABEL } from '../systems/Progression.js';
import { grid } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button } from '../ui/Button.js';
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
      right: (x, y) => button(this, x - 62 * ui, y, 124 * ui, 40 * ui, '📊 My skills', { variant: 'secondary', fontSize: 14, onClick: () => this.go(SCENES.Skills) }),
      subtitle: who
    });

    const subjects = Object.values(SUBJECTS);
    const areaTop = bar.bottom + 6 * ui, areaH = h - areaTop - 12;
    const sectionH = areaH / subjects.length;
    const labelH = 26 * ui;
    const cards = [];
    subjects.forEach((s, si) => {
      const sy = areaTop + si * sectionH;
      this.add.circle(22, sy + labelH / 2, 5 * ui, s.accent);
      const title = text(this, 34, sy + labelH / 2, s.title, T.bodyBold(this, s.dark)).setOrigin(0, 0.5);
      // Pace (mastery) and the grade this subject's questions are at for the profile.
      const lvl = mastery(p, s.id).level, eg = effectiveGrade(p, s.id);
      chip(this, title.x + title.width + 10, sy + labelH / 2, {
        text: `${MASTERY_LABEL[lvl]} · Grade ${eg}`, height: 22 * ui, fontSize: 12,
        color: lvl ? s.soft : THEME.sunken, textColor: lvl ? s.dark : THEME.ink2, shadow: 'none'
      });
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
    if (compact) {
      // Short cards (four subjects on a small screen): icon beside the title, stars underneath.
      const ty = -h * 0.2, r = 14 * ui;
      const title = this.add.text(0, ty, g.title, T.at(this, 14, THEME.ink)).setOrigin(0, 0.5);
      const ix = -(r * 2 + 8 + title.width) / 2 + r;
      title.setX(ix + r + 8);
      k.add([this.add.circle(ix, ty, r, subject.soft), this.add.text(ix, ty, g.icon, { fontSize: Math.round(16 * ui) + 'px' }).setOrigin(0.5), title]);
      k.add(new StarRow(this, 0, h / 2 - 16 * ui, rec ? rec.bestStars : 0, 16 * ui));
      return k;
    }
    const iy = -h / 2 + 32 * ui;
    k.add(this.add.circle(0, iy, 24 * ui, subject.soft));
    k.add(this.add.text(0, iy, g.icon, { fontSize: Math.round(26 * ui) + 'px' }).setOrigin(0.5));
    k.add(this.add.text(0, -h / 2 + 66 * ui, g.title, T.at(this, 16, THEME.ink, { wordWrap: { width: c.w - 12 } })).setOrigin(0.5));
    k.add(new StarRow(this, 0, h / 2 - 20 * ui, rec ? rec.bestStars : 0, 20 * ui));
    return k;
  }

  play(g) {
    if (g.usesLevels) return this.go(SCENES.LevelSelect, { gameId: g.id });
    Launcher.launch(this, g.id, { source: 'challenge' });
  }
}
