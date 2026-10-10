import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { generateAllTextures } from '../systems/Textures.js';
import * as Store from '../systems/Store.js';
import * as Cloud from '../systems/Cloud.js';
import { allLayerPaths, LPC_BASE } from '../ui/LpcCharacter.js';
import { MANGO_IMAGES, MANGO_BASE } from '../ui/FlatCharacter.js';
import { HERO_SHEETS, HERO_CELL } from '../ui/Hero.js';
import { VILLAGER_SHEETS, VILLAGER_CELL, villagerKey } from '../ui/Villagers.js';
import { ANIMAL_FILES, ANIMAL_BASE, animalKey } from '../ui/AnimalArt.js';
import { isMuted, onMuted } from '../systems/Audio.js';

const FONT_WAIT_MS = 1500;

export class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.Boot); }

  /** The Liberated Pixel Cup layers every character is built from. */
  preload() {
    for (const p of allLayerPaths()) this.load.image('lpc:' + p, LPC_BASE + p);
    for (const k of MANGO_IMAGES) this.load.image(k, `${MANGO_BASE}${k}.png`);   // Mango's sprite cells and badge
    for (const [key, file] of Object.entries(HERO_SHEETS)) this.load.spritesheet(key, file, { frameWidth: HERO_CELL, frameHeight: HERO_CELL });   // the players' hand-drawn heroes
    for (const [who, file] of Object.entries(VILLAGER_SHEETS)) this.load.spritesheet(villagerKey(who), file, { frameWidth: VILLAGER_CELL, frameHeight: VILLAGER_CELL });
    // The Pre-K ark: animal faces (Kenney's pack) and their recorded calls.
    for (const k of ANIMAL_FILES) { this.load.image(animalKey(k), `${ANIMAL_BASE}${k}.png`); this.load.audio(`call-${k}`, `sounds/animals/${k}.mp3`); }
    this.load.audio('call-lion', 'sounds/animals/lion.mp3');
    this.load.image('ark-backdrop', 'sprites/ark/backdrop.jpg');   // the Pre-K ark's painted shore
    this.load.image('ark-noah', 'sprites/ark/noah.png');
  }

  create() {
    // Text is rasterised into canvases, so the display font must be ready before the first scene draws.
    Promise.race([fontsReady(), new Promise((r) => setTimeout(r, FONT_WAIT_MS))]).then(() => this.launch());
  }

  launch() {
    generateAllTextures(this);
    // Recorded sounds play through Phaser's sound manager, which follows the game's own mute switch.
    if (this.sound) { this.sound.mute = isMuted(); onMuted((m) => { if (this.sound) this.sound.mute = m; }); }
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
    return Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 20px Outfit`))).catch(() => null);
  } catch { return Promise.resolve(); }
}
