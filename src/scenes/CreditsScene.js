import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { background } from '../ui/Panel.js';
import { topBar } from '../ui/TopBar.js';
import { card } from '../ui/Card.js';
import { creditLines } from '../ui/Credits.js';

/** Who drew the characters: reachable from the home screen and the pause menu. */
export class CreditsScene extends BaseScene {
  constructor() { super(SCENES.Credits); this.fade = true; }

  build() {
    const { w, h, ui } = this;
    background(this, { accent: THEME.brand, accent2: THEME.pink });
    const bar = topBar(this, { title: 'Art credits', onBack: () => this.go(SCENES.ModeSelect) });
    const cw = Math.min(w - 24, 560 * ui), x = (w - cw) / 2, y = bar.bottom + 12 * ui;
    const ch = Math.min(h - y - 12, 620 * ui);
    card(this, x + cw / 2, y + ch / 2, cw, ch);
    creditLines(this, x + 20, y + 18 * ui, cw - 40, 0, y + ch - 12 * ui);
  }
}
