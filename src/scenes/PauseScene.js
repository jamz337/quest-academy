import { BaseScene } from './BaseScene.js';
import { C, SCENES } from '../constants.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, dimmer } from '../ui/Panel.js';

/** Overlay shown on top of a paused mini-game. */
export class PauseScene extends BaseScene {
  constructor() { super(SCENES.Pause); }

  create(data) { super.create(data); this.scene.bringToTop(); }

  build() {
    const { w, h, ui } = this;
    dimmer(this, 0.65);
    const pw = Math.min(w - 40, 320 * ui), ph = 240 * ui;
    panel(this, w / 2 - pw / 2, h / 2 - ph / 2, pw, ph, { color: C.panel, stroke: C.blue });
    text(this, w / 2, h / 2 - ph / 2 + 40 * ui, 'Paused', T.heading(this, C.yellow));
    button(this, w / 2, h / 2 - 10 * ui, pw - 48, 52 * ui, 'Keep playing', { color: C.lime, textColor: C.navy, onClick: () => this.resumeGame() });
    button(this, w / 2, h / 2 + 56 * ui, pw - 48, 52 * ui, 'Quit game', { color: C.red, onClick: () => this.quitGame() });
  }

  resumeGame() {
    const caller = this.sceneData.caller;
    this.scene.stop();
    this.scene.resume(caller);
  }

  quitGame() {
    const caller = this.scene.get(this.sceneData.caller);
    this.scene.stop();
    if (caller && caller.abort) caller.abort();
  }
}
