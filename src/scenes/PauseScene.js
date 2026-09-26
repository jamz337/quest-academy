import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import { button } from '../ui/Button.js';
import { modal } from '../ui/Modal.js';

/** Overlay shown on top of a paused mini-game. */
export class PauseScene extends BaseScene {
  constructor() { super(SCENES.Pause); }

  create(data) { super.create(data); this.scene.bringToTop(); }

  build() {
    const { w, ui } = this;
    const m = modal(this, { w: 320 * ui, h: 236 * ui, title: 'Paused', accent: THEME.primary, dimAlpha: 0.45 });
    const bw = m.w - 48, bh = 50 * ui;
    button(this, w / 2, m.contentTop + 14 * ui + bh / 2, bw, bh, 'Keep playing', { variant: 'primary', onClick: () => this.resumeGame() });
    button(this, w / 2, m.contentTop + 14 * ui + bh + 12 + bh / 2, bw, bh, 'Quit game', { variant: 'danger', onClick: () => this.quitGame() });
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
