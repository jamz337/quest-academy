import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { generateAllTextures } from '../systems/Textures.js';
import * as Store from '../systems/Store.js';

const FONT_WAIT_MS = 1500;

export class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.Boot); }

  create() {
    // Text is rasterised into canvases, so the display font must be ready before the first scene draws.
    Promise.race([fontsReady(), new Promise((r) => setTimeout(r, FONT_WAIT_MS))]).then(() => this.launch());
  }

  launch() {
    generateAllTextures(this);
    Store.init();
    const p = Store.getProfile();
    this.scene.start(p ? SCENES.ModeSelect : SCENES.Profile);
  }
}

function fontsReady() {
  try {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 20px Fredoka`))).catch(() => null);
  } catch { return Promise.resolve(); }
}
