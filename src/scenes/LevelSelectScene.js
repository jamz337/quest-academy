import { BaseScene } from './BaseScene.js';
import { C, SCENES } from '../constants.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { bandFor, BANDS, BAND_LABEL } from '../data/grades.js';
import { levelsForBand } from '../data/coding/levels.js';
import { grid } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { StarRow } from '../ui/StarRow.js';
import { Sfx } from '../systems/Audio.js';

/** Robo Maze level picker: tabs per band, 12 level cards with earned stars. Every level is playable. */
export class LevelSelectScene extends BaseScene {
  constructor() { super(SCENES.LevelSelect); }

  init(data) {
    this.sceneData = data || {};
    const p = Store.getProfile();
    this.band = bandFor(p ? p.grade : 3);
  }

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
    button(this, 40 * ui, topH / 2 + 4, 64 * ui, 40 * ui, '←', { color: C.panelDark, fontSize: 20, onClick: () => this.scene.start(SCENES.ChallengeMenu) });
    text(this, w / 2, topH / 2 + 4, 'Robo Maze', T.heading(this, C.yellow));

    // band tabs
    const tabW = Math.min(150 * ui, (w - 40) / 3), tabH = 40 * ui, tabY = topH + 8 + tabH / 2;
    BANDS.forEach((b, i) => {
      const active = b === this.band;
      button(this, w / 2 + (i - 1) * (tabW + 8), tabY, tabW, tabH, `${b} · ${BAND_LABEL[b]}`, {
        color: active ? C.orange : C.panel, textColor: active ? C.navy : C.white, fontSize: 13,
        onClick: () => { this.band = b; this.rebuild(); }
      });
    });

    const levels = levelsForBand(this.band);
    const solved = levels.filter((l) => (p.coding.levels[l.id]?.stars || 0) > 0).length;
    const stars = levels.reduce((s, l) => s + (p.coding.levels[l.id]?.stars || 0), 0);
    text(this, w / 2, tabY + tabH / 2 + 14 * ui, `${solved} / ${levels.length} solved · ${stars} ★`, T.small(this, C.grey));

    const top = tabY + tabH / 2 + 28 * ui;
    const cols = this.portrait ? 3 : 6, rows = Math.ceil(levels.length / cols);
    const cells = grid({ x: 12, y: top, w: w - 24, h: h - top - 12 }, cols, rows, 8);
    levels.forEach((lv, i) => this.card(lv, cells[i], p));
  }

  card(lv, c, profile) {
    const { ui } = this;
    const rec = profile.coding.levels[lv.id];
    const stars = rec ? rec.stars : 0;
    const h = Math.min(c.h, 120 * ui), w = c.w;
    panel(this, c.x - w / 2, c.y - h / 2, w, h, { color: stars ? C.panel : C.panelDark, stroke: stars === 3 ? C.yellow : C.orange, strokeWidth: 2 });
    const compact = h < 90 * ui;
    text(this, c.x, c.y - h / 2 + (compact ? 16 : 22) * ui, lv.id, { ...T.bodyBold(this, C.yellow), fontSize: Math.round((compact ? 14 : 18) * ui) + 'px' });
    text(this, c.x, c.y - h / 2 + (compact ? 36 : 48) * ui, lv.title, { ...T.small(this, C.white), fontSize: Math.round((compact ? 11 : 13) * ui) + 'px', wordWrap: { width: w - 10 } });
    new StarRow(this, c.x, c.y + h / 2 - (compact ? 12 : 18) * ui, stars, (compact ? 14 : 18) * ui);
    const zone = this.add.zone(c.x, c.y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { Sfx.click(); this.play(lv); });
  }

  play(lv) {
    Launcher.launch(this, 'code-maze', { source: 'challenge', context: { levelId: lv.id } });
  }
}
