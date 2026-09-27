import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { generateAllTextures } from '../systems/Textures.js';
import * as Store from '../systems/Store.js';
import * as Cloud from '../systems/Cloud.js';
import { allLayerPaths, LPC_BASE } from '../ui/LpcCharacter.js';

const FONT_WAIT_MS = 1500;

export class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.Boot); }

  /** The Liberated Pixel Cup layers every character is built from. */
  preload() {
    for (const p of allLayerPaths()) this.load.image('lpc:' + p, LPC_BASE + p);
  }

  create() {
    // Text is rasterised into canvases, so the display font must be ready before the first scene draws.
    Promise.race([fontsReady(), new Promise((r) => setTimeout(r, FONT_WAIT_MS))]).then(() => this.launch());
  }

  launch() {
    generateAllTextures(this);
    Store.init();
    Cloud.init();
    const p = Store.getProfile();
    this.scene.start(p ? SCENES.ModeSelect : SCENES.Profile);
    hideSplash();
  }
}

/** Fade out and remove the CSS loading screen from index.html. */
function hideSplash() {
  try {
    const el = typeof document !== 'undefined' && document.getElementById('splash');
    if (!el) return;
    el.classList.add('hide');
    setTimeout(() => el.remove(), 350);
  } catch { /* ignore */ }
}

function fontsReady() {
  try {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 20px Fredoka`))).catch(() => null);
  } catch { return Promise.resolve(); }
}
