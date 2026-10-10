import { BaseScene } from './BaseScene.js';
import { SCENES, SUBJECTS } from '../constants.js';
import { THEME, lighten, shadeRoundedRect } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { gamesForGrade } from '../data/minigames.js';
import { gradeLabel } from '../data/grades.js';
import { mastery, effectiveGrade, MASTERY_LABEL } from '../systems/Progression.js';
import { grid } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { background, panel } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button } from '../ui/Button.js';
import { topBar } from '../ui/TopBar.js';
import { StarRow } from '../ui/StarRow.js';
import { enter } from '../ui/motion.js';
import { icon, hasIcon } from '../ui/Icons.js';

/** Challenge mode: every game on one screen, grouped in a frosted panel per land, each with its best star rating. */
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
    const who = `${p.name} · ${gradeLabel(p.grade)}`;
    const wide = w >= 640;
    const bar = topBar(this, {
      title: 'Challenge Mode', onBack: () => this.go(SCENES.ModeSelect),
      // A phone's top bar is narrow: the short label keeps the button clear of the title.
      right: (x, y) => button(this, x - (wide ? 62 : 46) * ui, y, (wide ? 124 : 92) * ui, 40 * ui, wide ? 'My skills' : 'Skills', { variant: 'silver', fontSize: 14, icon: icon(this, 'bars', THEME.ink), onClick: () => this.go(SCENES.Skills) }),
      subtitle: who
    });

    const subjects = Object.values(SUBJECTS);
    const areaTop = bar.bottom + 6 * ui, areaH = h - areaTop - 12;
    // Six lands in one column would squash the cards: on a wide screen the panels sit two abreast.
    const cols = subjects.length > 4 && w >= 900 ? 2 : 1, rowsN = Math.ceil(subjects.length / cols);
    const sectionH = areaH / rowsN, colW = (w - 16) / cols;
    const labelH = Math.min(34 * ui, sectionH * 0.26);
    const cards = [];
    subjects.forEach((s, si) => {
      // One frosted panel per land, with a glossy header in the land's colour.
      const col = si % cols, row = Math.floor(si / cols);
      const sy = areaTop + row * sectionH, px = 8 + col * colW, pw = colW - (cols > 1 ? 8 : 0), ph = sectionH - 8;
      panel(this, px, sy, pw, ph, { color: 0xffffff, alpha: 0.72, radius: 20, stroke: 0xffffff, strokeWidth: 1.5 });
      const hx = px + 8, hy = sy + 6, hw = pw - 16, hh = labelH, hr = Math.min(14, hh / 2);
      const head = this.add.graphics();
      head.fillStyle(s.accent, 0.22); head.fillRoundedRect(hx - 1, hy + 2, hw + 2, hh + 2, hr + 1);
      shadeRoundedRect(head, hx, hy, hw, hh, hr, [lighten(s.accent, 0.12), s.dark]);
      head.lineStyle(1.5, 0xffffff, 0.5); head.strokeRoundedRect(hx + 0.75, hy + 0.75, hw - 1.5, hh - 1.5, hr);
      text(this, hx + 14, hy + hh / 2, s.zone || s.title, T.at(this, Math.min(18, (hh / ui) * 0.56), 0xffffff, { fontStyle: '800' })).setOrigin(0, 0.5);
      // Pace (mastery) and the grade this subject's questions are at for the profile.
      const lvl = mastery(p, s.id).level, eg = effectiveGrade(p, s.id);
      chip(this, hx + hw - 8, hy + hh / 2, {
        text: `${MASTERY_LABEL[lvl]} · ${gradeLabel(eg)}`, height: Math.min(22 * ui, hh - 8), fontSize: 12, originX: 1,
        color: 0xffffff, textColor: THEME.ink, shadow: 'none'
      });
      const games = gamesForGrade(s.id, p.grade);
      const cells = grid({ x: px + 8, y: hy + hh + 6, w: pw - 16, h: ph - hh - 20 }, games.length, 1, 8);
      games.forEach((g, gi) => cards.push(this.card(g, cells[gi], s, p)));
    });
    enter(this, cards, { from: 'up', stagger: 35 });
  }

  card(g, c, subject, profile) {
    const { ui } = this;
    const rec = profile.games[g.id];
    const h = Math.min(c.h, 150 * ui);
    const k = card(this, c.x, c.y, c.w, h, { stroke: 0xffffff, radius: 16, shadow: 'sm', onTap: () => this.play(g) });
    const compact = h < 110 * ui;
    if (compact && c.w >= 150 * ui) {
      // Short but wide (a landscape screen): icon, title and stars in one row.
      const r = Math.min(13 * ui, h * 0.3), ix = -c.w / 2 + 12 + r, starSize = Math.min(14 * ui, h * 0.36);
      k.add([this.iconBlock(ix, 0, r, subject), this.gameIcon(ix, 0, r, g)]);
      const starsW = 3 * (starSize + 4), titleW = c.w - (r * 2 + 20) - starsW - 16;
      k.add(this.add.text(ix + r + 8, 0, g.title, { ...T.at(this, g.title.length > 14 ? 11 : 13, THEME.ink), wordWrap: { width: titleW }, align: 'left' }).setOrigin(0, 0.5));
      k.add(new StarRow(this, c.w / 2 - 12 - starsW / 2, 0, rec ? rec.bestStars : 0, starSize));
      return k;
    }
    if (compact) {
      // Short and narrow (four games per subject on a phone): icon on top, a small title, stars underneath.
      const r = 13 * ui, iy = -h / 2 + r + 6 * ui;
      k.add([this.iconBlock(0, iy, r, subject), this.gameIcon(0, iy, r, g)]);
      k.add(this.add.text(0, iy + r + 8 * ui, g.title, { ...T.at(this, c.w < 96 || g.title.length > 14 ? 10 : 12, THEME.ink), wordWrap: { width: c.w - 8 } }).setOrigin(0.5, 0));
      k.add(new StarRow(this, 0, h / 2 - 10 * ui, rec ? rec.bestStars : 0, Math.min(12 * ui, (c.w - 12) / 3.6)));
      return k;
    }
    const iy = -h / 2 + 32 * ui;
    k.add(this.iconBlock(0, iy, 24 * ui, subject));
    k.add(this.gameIcon(0, iy, 24 * ui, g));
    // The title starts under the icon block and shrinks until it fits above the stars (two-line names on a phone).
    const titleTop = iy + 24 * ui + 6 * ui, room = h / 2 - 34 * ui - titleTop;
    let title = null;
    for (const size of [16, 14, 13, 12]) {
      if (title) title.destroy();
      title = this.add.text(0, titleTop, g.title, T.at(this, size, THEME.ink, { wordWrap: { width: c.w - 10 }, lineSpacing: -2 })).setOrigin(0.5, 0);
      if ((title.height || 0) <= room) break;
    }
    k.add(title);
    k.add(new StarRow(this, 0, h / 2 - 20 * ui, rec ? rec.bestStars : 0, 20 * ui));
    return k;
  }

  /** A game's drawn white icon for a block of half-size r (its emoji, should a game have no drawing yet). */
  gameIcon(x, y, r, g) {
    const name = `game-${g.id}`;
    if (!hasIcon(name)) return this.add.text(x, y, g.icon, { fontSize: Math.round(r * 1.1) + 'px' }).setOrigin(0.5);
    return this.add.image(x, y, icon(this, name, 0xffffff)).setDisplaySize(r * 1.3, r * 1.3);
  }

  /** A glossy rounded block in the land's colour behind a game's icon (centre x, y; half-size r). */
  iconBlock(x, y, r, subject) {
    const g = this.add.graphics();
    g.fillStyle(subject.accent, 0.25); g.fillRoundedRect(x - r - 1, y - r + 2, r * 2 + 2, r * 2 + 2, r * 0.45);
    shadeRoundedRect(g, x - r, y - r, r * 2, r * 2, r * 0.42, [lighten(subject.accent, 0.14), subject.dark]);
    g.lineStyle(1.5, 0xffffff, 0.5); g.strokeRoundedRect(x - r + 0.75, y - r + 0.75, r * 2 - 1.5, r * 2 - 1.5, r * 0.4);
    return g;
  }

  play(g) {
    if (g.usesLevels) return this.go(SCENES.LevelSelect, { gameId: g.id });
    Launcher.launch(this, g.id, { source: 'challenge' });
  }
}
