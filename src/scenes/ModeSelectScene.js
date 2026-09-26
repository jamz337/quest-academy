import { BaseScene } from './BaseScene.js';
import { C, SCENES } from '../constants.js';
import * as Store from '../systems/Store.js';
import { levelFromXp, xpForLevel } from '../systems/SaveSystem.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { ProgressBar } from '../ui/ProgressBar.js';

/** Home screen: profile summary and the two big mode buttons. */
export class ModeSelectScene extends BaseScene {
  constructor() { super(SCENES.ModeSelect); }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    background(this);
    text(this, w / 2, 36 * ui + 8, 'Quest Academy', T.title(this));

    // Profile chip
    const chipW = Math.min(w - 32, 420 * ui), chipH = 74 * ui, chipY = 36 * ui + 8 + 46 * ui;
    panel(this, w / 2 - chipW / 2, chipY, chipW, chipH, { color: C.panel, stroke: C.blue });
    this.add.image(w / 2 - chipW / 2 + 40 * ui, chipY + chipH / 2, 'avatar', p.avatar).setDisplaySize(52 * ui, 52 * ui);
    const lvl = levelFromXp(p.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1);
    text(this, w / 2 - chipW / 2 + 80 * ui, chipY + 20 * ui, `${p.name}  ·  Grade ${p.grade}`, T.bodyBold(this)).setOrigin(0, 0.5);
    text(this, w / 2 - chipW / 2 + 80 * ui, chipY + 42 * ui, `Level ${lvl}`, T.small(this, C.grey)).setOrigin(0, 0.5);
    new ProgressBar(this, w / 2 - chipW / 2 + 200 * ui, chipY + 42 * ui, 100 * ui, 10 * ui, { value: (p.xp - lo) / (hi - lo), color: C.lime });
    this.add.image(w / 2 + chipW / 2 - 60 * ui, chipY + chipH / 2, 'coin').setDisplaySize(22 * ui, 22 * ui);
    text(this, w / 2 + chipW / 2 - 44 * ui, chipY + chipH / 2, String(p.coins), T.bodyBold(this, C.yellow)).setOrigin(0, 0.5);

    // Mode buttons
    const areaTop = chipY + chipH + 24 * ui, areaBottom = h - 80 * ui;
    const areaH = areaBottom - areaTop;
    const bw = Math.min(this.portrait ? w - 40 : (w - 64) / 2, this.portrait ? 360 * ui : 300 * ui);
    const bh = Math.min(this.portrait ? areaH / 2 - 12 : areaH, 150 * ui);
    const positions = this.portrait
      ? [{ x: w / 2, y: areaTop + areaH / 2 - bh / 2 - 8 }, { x: w / 2, y: areaTop + areaH / 2 + bh / 2 + 8 }]
      : [{ x: w / 2 - bw / 2 - 12, y: areaTop + areaH / 2 }, { x: w / 2 + bw / 2 + 12, y: areaTop + areaH / 2 }];
    button(this, positions[0].x, positions[0].y, bw, bh, 'Explore the World\nWalk around, meet friends, play games', {
      color: C.green, fontSize: 20, wrap: true, onClick: () => { Store.setSetting('lastMode', 'roam'); this.scene.start(SCENES.World); }
    });
    button(this, positions[1].x, positions[1].y, bw, bh, 'Challenge Mode\nPick any game and earn stars', {
      color: C.orange, textColor: C.navy, fontSize: 20, wrap: true, onClick: () => { Store.setSetting('lastMode', 'challenge'); this.scene.start(SCENES.ChallengeMenu); }
    });

    // Bottom row
    const sw = Math.min(170 * ui, (w - 48) / 2), sh = 44 * ui, sy = h - 40 * ui;
    button(this, w / 2 - sw / 2 - 8, sy, sw, sh, 'Switch player', { color: C.lavender, fontSize: 16, onClick: () => this.scene.start(SCENES.Profile) });
    const sound = Store.settings().sound;
    button(this, w / 2 + sw / 2 + 8, sy, sw, sh, sound ? 'Sound: on' : 'Sound: off', {
      color: sound ? C.blue : C.dark, fontSize: 16, onClick: (b) => { const on = !Store.settings().sound; Store.setSetting('sound', on); b.setLabel(on ? 'Sound: on' : 'Sound: off').setColor(on ? C.blue : C.dark); }
    });
  }
}
