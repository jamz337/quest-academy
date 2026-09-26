import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { bandFor, BANDS, BAND_LABEL } from '../data/grades.js';
import { gameGrade } from '../systems/Progression.js';
import { levelsForBand } from '../data/coding/levels.js';
import { grid } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { topBar } from '../ui/TopBar.js';
import { StarRow } from '../ui/StarRow.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';

const CODE = THEME.subjects.code;

/** Robo Maze level picker: tabs per band, 12 level cards with earned stars. Every level is playable. */
export class LevelSelectScene extends BaseScene {
  constructor() { super(SCENES.LevelSelect); this.fade = true; }

  init(data) {
    this.sceneData = data || {};
    const p = Store.getProfile();
    this.band = bandFor(gameGrade(p, 'code-maze'));   // the player's grade plus Robo Maze's earned grade-ups
  }

  create(data) {
    super.create(data);
    this.events.on('resume', () => this.rebuild());
  }

  enterKey() { return this.band; }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    background(this, { accent: CODE.accent, accent2: THEME.brand });
    const bar = topBar(this, { title: 'Robo Maze', onBack: () => this.go(SCENES.ChallengeMenu) });

    // band tabs
    const tabW = Math.min(150 * ui, (w - 40) / 3), tabH = 40 * ui, tabY = bar.bottom + 8 + tabH / 2;
    BANDS.forEach((b, i) => {
      button(this, w / 2 + (i - 1) * (tabW + 8), tabY, tabW, tabH, `${b} · ${BAND_LABEL[b]}`, {
        variant: 'secondary', selected: b === this.band, selectedAccent: CODE.accent, fontSize: 13, radius: THEME.radius.sm,
        onClick: () => { this.band = b; this.rebuild(); }
      });
    });

    const levels = levelsForBand(this.band);
    const solved = levels.filter((l) => (p.coding.levels[l.id]?.stars || 0) > 0).length;
    const stars = levels.reduce((s, l) => s + (p.coding.levels[l.id]?.stars || 0), 0);
    chip(this, w / 2, tabY + tabH / 2 + 22 * ui, { text: `${solved} / ${levels.length} solved  ·  ${stars} ★`, originX: 0.5, textColor: THEME.ink2, shadow: 'none', stroke: THEME.line });

    const top = tabY + tabH / 2 + 44 * ui;
    const cols = this.portrait ? 3 : 6, rows = Math.ceil(levels.length / cols);
    const cells = grid({ x: 12, y: top, w: w - 24, h: h - top - 12 }, cols, rows, 8);
    const cards = levels.map((lv, i) => this.card(lv, cells[i], p));
    enter(this, cards, { from: 'up', stagger: 25 });
  }

  card(lv, c, profile) {
    const { ui } = this;
    const rec = profile.coding.levels[lv.id];
    const stars = rec ? rec.stars : 0;
    const h = Math.min(c.h, 120 * ui), w = c.w;
    const k = card(this, c.x, c.y, w, h, {
      color: stars ? CODE.soft : THEME.surface, stroke: stars === 3 ? THEME.gold : stars ? CODE.accent : THEME.line, strokeWidth: stars ? 3 : 2, shadow: 'sm'
    });
    const compact = h < 90 * ui;
    text(this, c.x, c.y - h / 2 + (compact ? 16 : 22) * ui, lv.id, T.at(this, compact ? 14 : 18, CODE.dark));
    text(this, c.x, c.y - h / 2 + (compact ? 36 : 48) * ui, lv.title, T.at(this, compact ? 11 : 13, THEME.ink2, { fontStyle: '500', wordWrap: { width: w - 10 } }));
    new StarRow(this, c.x, c.y + h / 2 - (compact ? 12 : 18) * ui, stars, (compact ? 14 : 18) * ui);
    const zone = this.add.zone(c.x, c.y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { Sfx.click(); this.play(lv); });
    return k;
  }

  play(lv) {
    Launcher.launch(this, 'code-maze', { source: 'challenge', context: { levelId: lv.id } });
  }
}
